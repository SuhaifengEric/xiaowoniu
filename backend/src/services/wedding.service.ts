import { Prisma } from '@prisma/client'
import {
  CreateWeddingExpenseRequest,
  CreateWeddingTaskRequest,
  PaidStatus,
  TaskStatus,
  UpdateWeddingExpenseRequest,
  UpdateWeddingTaskRequest,
  UpsertWeddingBudgetRequest,
  WeddingBudgetResponse,
  WeddingExpenseQueryParams,
  WeddingExpenseResponse,
  WeddingOverviewResponse,
  WeddingTaskCategory,
  WeddingTaskQueryParams,
  WeddingTaskResponse,
  WeddingTimelineResponse,
} from '@xiaowoniu/shared'
import prisma from '../config/database'

export class WeddingNotFoundError extends Error {
  constructor(message = '备婚资源不存在') {
    super(message)
    this.name = 'WeddingNotFoundError'
  }
}

export const utcDate = (value: string) => new Date(`${value}T00:00:00.000Z`)
export const formatDate = (value: Date) => value.toISOString().slice(0, 10)
export const utcToday = () => {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

const numberValue = (value: Prisma.Decimal | number) => typeof value === 'number' ? value : value.toNumber()
const decimalValue = (value: Prisma.Decimal | number | string) => new Prisma.Decimal(value)
const roundPercentage = (value: Prisma.Decimal | number) => {
  const decimal = value instanceof Prisma.Decimal ? value : decimalValue(value)
  return decimal.toDecimalPlaces(2).toNumber()
}

function prismaErrorCode(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : undefined
}

function safePagination(value: unknown, minimum: number) {
  if (value === undefined || value === null || value === '') return undefined
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= minimum ? number : undefined
}

function pagination(query: Pick<WeddingTaskQueryParams, 'limit' | 'offset'>) {
  const limit = safePagination(query.limit, 1)
  const offset = safePagination(query.offset, 0)
  return {
    ...(limit === undefined ? {} : { take: limit }),
    ...(offset === undefined ? {} : { skip: offset }),
  }
}

function toTaskResponse(record: any): WeddingTaskResponse {
  return {
    id: record.id,
    userId: record.userId,
    taskName: record.taskName,
    category: record.category as WeddingTaskCategory,
    plannedDate: record.plannedDate ? formatDate(record.plannedDate) : null,
    completedDate: record.completedDate ? formatDate(record.completedDate) : null,
    status: record.status as TaskStatus,
    priority: record.priority,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function toExpenseResponse(record: any): WeddingExpenseResponse {
  return {
    id: record.id,
    userId: record.userId,
    taskId: record.taskId,
    task: record.task
      ? { id: record.task.id, taskName: record.task.taskName }
      : null,
    date: formatDate(record.date),
    itemName: record.itemName,
    category: record.category as WeddingTaskCategory,
    plannedAmount: numberValue(record.plannedAmount),
    actualAmount: numberValue(record.actualAmount),
    paidStatus: record.paidStatus as PaidStatus,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function toBudgetResponse(record: any): WeddingBudgetResponse {
  return {
    id: record.id,
    totalBudget: numberValue(record.totalBudget),
    weddingDate: formatDate(record.weddingDate),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function signedDayDiff(from: Date, to: Date) {
  const fromUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  const toUtc = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())
  return Math.round((toUtc - fromUtc) / 86_400_000)
}

function taskStatusMachine(currentStatus: TaskStatus, nextStatus: TaskStatus, currentCompletedDate: Date | null, today: Date) {
  if (currentStatus !== TaskStatus.COMPLETED && nextStatus === TaskStatus.COMPLETED) {
    return today
  }
  if (currentStatus === TaskStatus.COMPLETED && nextStatus === TaskStatus.COMPLETED) {
    return currentCompletedDate
  }
  if (currentStatus === TaskStatus.COMPLETED && nextStatus !== TaskStatus.COMPLETED) {
    return null
  }
  return currentCompletedDate
}

function expenseDateFilter(query: Pick<WeddingExpenseQueryParams, 'startDate' | 'endDate'>) {
  const date: { gte?: Date; lte?: Date } = {}
  if (query.startDate) date.gte = utcDate(query.startDate)
  if (query.endDate) date.lte = utcDate(query.endDate)
  return Object.keys(date).length ? date : undefined
}

export class WeddingService {
  async getTasks(userId: string, query: WeddingTaskQueryParams): Promise<WeddingTaskResponse[]> {
    const records = await prisma.weddingTask.findMany({
      where: {
        userId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.category ? { category: query.category } : {}),
      },
      orderBy: [{ priority: 'desc' }, { plannedDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      ...pagination(query),
    })
    return records.map(toTaskResponse)
  }

  async createTask(userId: string, data: CreateWeddingTaskRequest): Promise<WeddingTaskResponse> {
    const status = data.status ?? TaskStatus.PENDING
    const record = await prisma.weddingTask.create({
      data: {
        userId,
        taskName: data.taskName.trim(),
        category: data.category,
        plannedDate: data.plannedDate ? utcDate(data.plannedDate) : null,
        ...(status === TaskStatus.COMPLETED ? { completedDate: utcToday() } : {}),
        status,
        priority: data.priority ?? 3,
        notes: data.notes === undefined || data.notes === null ? null : data.notes.trim() || null,
      },
    })
    return toTaskResponse(record)
  }

  async updateTask(userId: string, id: string, data: UpdateWeddingTaskRequest): Promise<WeddingTaskResponse> {
    try {
      const existing = await prisma.weddingTask.findFirst({ where: { id, userId } })
      if (!existing) throw new WeddingNotFoundError('备婚任务不存在')

      const updateData: Record<string, unknown> = {}
      if (data.taskName !== undefined) updateData.taskName = data.taskName.trim()
      if (data.category !== undefined) updateData.category = data.category
      if (data.plannedDate !== undefined) updateData.plannedDate = data.plannedDate ? utcDate(data.plannedDate) : null
      if (data.priority !== undefined) updateData.priority = data.priority
      if (data.notes !== undefined) updateData.notes = data.notes === null ? null : data.notes.trim() || null
      if (data.status !== undefined) {
        const currentStatus = existing.status as TaskStatus
        const nextStatus = data.status
        updateData.status = nextStatus
        updateData.completedDate = taskStatusMachine(
          currentStatus,
          nextStatus,
          existing.completedDate,
          utcToday(),
        )
      }

      const record = await prisma.weddingTask.update({ where: { id }, data: updateData })
      return toTaskResponse(record)
    } catch (error) {
      if (error instanceof WeddingNotFoundError) throw error
      if (prismaErrorCode(error) === 'P2025') throw new WeddingNotFoundError('备婚任务不存在')
      throw error
    }
  }

  async deleteTask(userId: string, id: string): Promise<void> {
    const result = await prisma.weddingTask.deleteMany({ where: { id, userId } })
    if (result.count === 0) throw new WeddingNotFoundError('备婚任务不存在')
  }

  async getExpenses(userId: string, query: WeddingExpenseQueryParams): Promise<WeddingExpenseResponse[]> {
    const date = expenseDateFilter(query)
    const records = await prisma.weddingExpense.findMany({
      where: {
        userId,
        ...(date ? { date } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.paidStatus ? { paidStatus: query.paidStatus } : {}),
      },
      include: { task: { select: { id: true, taskName: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      ...pagination(query),
    })
    return records.map(toExpenseResponse)
  }

  async createExpense(userId: string, data: CreateWeddingExpenseRequest): Promise<WeddingExpenseResponse> {
    if (data.taskId !== undefined && data.taskId !== null) {
      const task = await prisma.weddingTask.findFirst({ where: { id: data.taskId, userId } })
      if (!task) throw new WeddingNotFoundError('备婚任务不存在')
    }
    const record = await prisma.weddingExpense.create({
      data: {
        userId,
        taskId: data.taskId ?? null,
        date: utcDate(data.date),
        itemName: data.itemName.trim(),
        category: data.category,
        plannedAmount: decimalValue(data.plannedAmount),
        actualAmount: decimalValue(data.actualAmount),
        paidStatus: data.paidStatus,
        notes: data.notes === undefined || data.notes === null ? null : data.notes.trim() || null,
      },
      include: { task: { select: { id: true, taskName: true } } },
    })
    return toExpenseResponse(record)
  }

  async updateExpense(userId: string, id: string, data: UpdateWeddingExpenseRequest): Promise<WeddingExpenseResponse> {
    try {
      const existing = await prisma.weddingExpense.findFirst({ where: { id, userId } })
      if (!existing) throw new WeddingNotFoundError('备婚花费不存在')

      const updateData: Record<string, unknown> = {}
      if (data.taskId !== undefined) {
        if (data.taskId !== null) {
          const task = await prisma.weddingTask.findFirst({ where: { id: data.taskId, userId } })
          if (!task) throw new WeddingNotFoundError('备婚任务不存在')
        }
        updateData.taskId = data.taskId
      }
      if (data.date !== undefined) updateData.date = utcDate(data.date)
      if (data.itemName !== undefined) updateData.itemName = data.itemName.trim()
      if (data.category !== undefined) updateData.category = data.category
      if (data.plannedAmount !== undefined) updateData.plannedAmount = decimalValue(data.plannedAmount)
      if (data.actualAmount !== undefined) updateData.actualAmount = decimalValue(data.actualAmount)
      if (data.paidStatus !== undefined) updateData.paidStatus = data.paidStatus
      if (data.notes !== undefined) updateData.notes = data.notes === null ? null : data.notes.trim() || null

      const record = await prisma.weddingExpense.update({
        where: { id },
        data: updateData,
        include: { task: { select: { id: true, taskName: true } } },
      })
      return toExpenseResponse(record)
    } catch (error) {
      if (error instanceof WeddingNotFoundError) throw error
      if (prismaErrorCode(error) === 'P2025' || prismaErrorCode(error) === 'P2003') {
        throw new WeddingNotFoundError('备婚花费不存在')
      }
      throw error
    }
  }

  async deleteExpense(userId: string, id: string): Promise<void> {
    const result = await prisma.weddingExpense.deleteMany({ where: { id, userId } })
    if (result.count === 0) throw new WeddingNotFoundError('备婚花费不存在')
  }

  async getBudget(userId: string): Promise<WeddingBudgetResponse | null> {
    const record = await prisma.weddingBudget.findUnique({ where: { userId } })
    return record ? toBudgetResponse(record) : null
  }

  async upsertBudget(userId: string, data: UpsertWeddingBudgetRequest): Promise<WeddingBudgetResponse> {
    const record = await prisma.weddingBudget.upsert({
      where: { userId },
      create: {
        userId,
        totalBudget: decimalValue(data.totalBudget),
        weddingDate: utcDate(data.weddingDate),
      },
      update: {
        totalBudget: decimalValue(data.totalBudget),
        weddingDate: utcDate(data.weddingDate),
      },
    })
    return toBudgetResponse(record)
  }

  async getOverview(userId: string): Promise<WeddingOverviewResponse> {
    const [budgetRecord, expenses, taskGroups] = await Promise.all([
      prisma.weddingBudget.findUnique({ where: { userId } }),
      prisma.weddingExpense.findMany({ where: { userId } }),
      prisma.weddingTask.groupBy({
        by: ['status'],
        where: { userId },
        _count: { _all: true },
      }),
    ])

    let plannedExpenseTotal = decimalValue(0)
    let actualExpenseTotal = decimalValue(0)
    const categoryAmounts = new Map<WeddingTaskCategory, { planned: Prisma.Decimal; actual: Prisma.Decimal; count: number }>()
    for (const category of Object.values(WeddingTaskCategory)) {
      categoryAmounts.set(category, { planned: decimalValue(0), actual: decimalValue(0), count: 0 })
    }

    for (const record of expenses) {
      const planned = decimalValue(record.plannedAmount)
      const actual = decimalValue(record.actualAmount)
      plannedExpenseTotal = plannedExpenseTotal.add(planned)
      actualExpenseTotal = actualExpenseTotal.add(actual)
      const item = categoryAmounts.get(record.category as WeddingTaskCategory)
      if (item) {
        item.planned = item.planned.add(planned)
        item.actual = item.actual.add(actual)
        item.count += 1
      }
    }

    const counts: Record<TaskStatus, number> = {
      [TaskStatus.PENDING]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.COMPLETED]: 0,
      [TaskStatus.CANCELLED]: 0,
    }
    for (const group of taskGroups) {
      const status = group.status as TaskStatus
      if (status in counts) counts[status] = group._count._all
    }
    const activeTotal = counts[TaskStatus.PENDING] + counts[TaskStatus.IN_PROGRESS] + counts[TaskStatus.COMPLETED]
    const taskCompletionPercentage = activeTotal === 0
      ? 0
      : roundPercentage(decimalValue(counts[TaskStatus.COMPLETED]).div(activeTotal).mul(100))

    const categoryBreakdown = Object.values(WeddingTaskCategory).map((category) => {
      const item = categoryAmounts.get(category)!
      return {
        category,
        plannedAmount: item.planned.toNumber(),
        actualAmount: item.actual.toNumber(),
        expenseCount: item.count,
        actualPercentage: actualExpenseTotal.eq(0)
          ? 0
          : roundPercentage(item.actual.div(actualExpenseTotal).mul(100)),
      }
    })

    const hasBudget = budgetRecord !== null
    const totalBudget = budgetRecord ? decimalValue(budgetRecord.totalBudget) : null
    const daysUntilWedding = budgetRecord
      ? signedDayDiff(utcToday(), budgetRecord.weddingDate)
      : null

    return {
      budget: budgetRecord ? toBudgetResponse(budgetRecord) : null,
      plannedExpenseTotal: plannedExpenseTotal.toNumber(),
      actualExpenseTotal: actualExpenseTotal.toNumber(),
      expenseCount: expenses.length,
      remainingBudget: totalBudget ? totalBudget.sub(actualExpenseTotal).toNumber() : null,
      budgetUsedPercentage: hasBudget && totalBudget && totalBudget.gt(0)
        ? roundPercentage(actualExpenseTotal.div(totalBudget).mul(100))
        : null,
      plannedBudgetPercentage: hasBudget && totalBudget && totalBudget.gt(0)
        ? roundPercentage(plannedExpenseTotal.div(totalBudget).mul(100))
        : null,
      actualVsPlannedPercentage: plannedExpenseTotal.gt(0)
        ? roundPercentage(actualExpenseTotal.div(plannedExpenseTotal).mul(100))
        : null,
      daysUntilWedding,
      taskCounts: {
        pending: counts[TaskStatus.PENDING],
        inProgress: counts[TaskStatus.IN_PROGRESS],
        completed: counts[TaskStatus.COMPLETED],
        cancelled: counts[TaskStatus.CANCELLED],
        activeTotal,
        completionPercentage: taskCompletionPercentage,
      },
      categoryBreakdown,
    }
  }

  async getTimeline(userId: string): Promise<WeddingTimelineResponse> {
    const [budgetRecord, tasks] = await Promise.all([
      prisma.weddingBudget.findUnique({ where: { userId } }),
      prisma.weddingTask.findMany({
        where: {
          userId,
          status: { not: TaskStatus.CANCELLED },
          plannedDate: { not: null },
        },
        orderBy: [{ plannedDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      }),
    ])

    const today = utcToday()
    const items = tasks.map((record) => ({
      taskId: record.id,
      taskName: record.taskName,
      category: record.category as WeddingTaskCategory,
      status: record.status as TaskStatus,
      priority: record.priority,
      plannedDate: formatDate(record.plannedDate!),
      completedDate: record.completedDate ? formatDate(record.completedDate) : null,
      isOverdue: record.status !== TaskStatus.COMPLETED && record.plannedDate! < today,
    }))

    return {
      weddingDate: budgetRecord ? formatDate(budgetRecord.weddingDate) : null,
      daysUntilWedding: budgetRecord ? signedDayDiff(today, budgetRecord.weddingDate) : null,
      items,
    }
  }
}

export default new WeddingService()
