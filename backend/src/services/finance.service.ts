import { Prisma } from '@prisma/client'
import {
  CreateBudgetRequest,
  CreateExpenseRequest,
  CreateSavingDepositRequest,
  CreateSavingPlanRequest,
  ExpenseCategory,
  ExpenseResponse,
  FinanceExpenseQueryParams,
  FinanceSummaryResponse,
  MonthlyBudgetResponse,
  SavingDepositQueryParams,
  SavingDepositResponse,
  SavingDepositSource,
  SavingPlanResponse,
  UpdateSavingDepositRequest,
  UpdateExpenseRequest,
  UpdateSavingPlanRequest,
} from '@xiaowoniu/shared'
import prisma from '../config/database'

export class FinanceNotFoundError extends Error {
  constructor(message = '财务记录不存在') {
    super(message)
    this.name = 'FinanceNotFoundError'
  }
}

export class FinanceConflictError extends Error {
  constructor(message = '财务记录存在冲突') {
    super(message)
    this.name = 'FinanceConflictError'
  }
}

export class FinanceValidationError extends Error {
  constructor(message = '财务请求参数无效') {
    super(message)
    this.name = 'FinanceValidationError'
  }
}

export const utcDate = (value: string) => new Date(`${value}T00:00:00.000Z`)
export const formatDate = (value: Date) => value.toISOString().slice(0, 10)
const formatMonth = (value: Date) => formatDate(value).slice(0, 7)

const numberValue = (value: Prisma.Decimal | number) => typeof value === 'number' ? value : value.toNumber()
const decimalValue = (value: Prisma.Decimal | number | string) => new Prisma.Decimal(value)
const clamp = (value: number) => Math.min(100, Math.max(0, value))

function prismaErrorCode(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : undefined
}

function isSavingPlanCheckConflict(error: unknown) {
  if (prismaErrorCode(error) !== 'P2004') return false
  const message = error instanceof Error ? error.message : String(error)
  const meta = typeof error === 'object' && error !== null && 'meta' in error
    ? JSON.stringify((error as { meta?: unknown }).meta)
    : ''
  const details = `${message} ${meta}`.toLowerCase()
  return details.includes('saving_plans') && details.includes('check')
}

type SavingPlanRecord = {
  id: string
  userId: string
  name: string
  targetAmount: Prisma.Decimal
  targetDate: Date
  createdAt: Date
  updatedAt: Date
}

type SavingDepositRecord = {
  id: string
  savingPlanId: string
  amount: Prisma.Decimal
  date: Date | null
  notes: string | null
  source: string
  createdAt: Date
  updatedAt: Date
}

type SavingPlanAggregate = {
  _sum: { amount: Prisma.Decimal | null }
  _count: { _all: number }
}

type SavingRecordClient = Pick<Prisma.TransactionClient, 'savingPlan' | 'savingDeposit'>

const emptySavingPlanAggregate = (): SavingPlanAggregate => ({
  _sum: { amount: null },
  _count: { _all: 0 },
})

async function savingPlanAggregate(client: SavingRecordClient, savingPlanId: string): Promise<SavingPlanAggregate> {
  return client.savingDeposit.aggregate({
    where: { savingPlanId },
    _sum: { amount: true },
    _count: { _all: true },
  })
}

export function monthBounds(month: string): [Date, Date] {
  const start = utcDate(`${month}-01`)
  const next = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))
  return [start, next]
}

function dateFilter(query: Pick<FinanceExpenseQueryParams, 'startDate' | 'endDate'>) {
  const date: { gte?: Date; lte?: Date } = {}
  if (query.startDate) date.gte = utcDate(query.startDate)
  if (query.endDate) date.lte = utcDate(query.endDate)
  return Object.keys(date).length ? date : undefined
}

function safePagination(value: unknown, minimum: number) {
  if (value === undefined || value === null || value === '') return undefined
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= minimum ? number : undefined
}

function pagination(query: Pick<FinanceExpenseQueryParams, 'limit' | 'offset'>) {
  const limit = safePagination(query.limit, 1)
  const offset = safePagination(query.offset, 0)
  return {
    ...(limit === undefined ? {} : { take: limit }),
    ...(offset === undefined ? {} : { skip: offset }),
  }
}

function toExpenseResponse(record: any): ExpenseResponse {
  return {
    id: record.id,
    userId: record.userId,
    date: formatDate(record.date),
    amount: numberValue(record.amount),
    category: record.category,
    paymentMethod: record.paymentMethod,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function toBudgetResponse(record: any): MonthlyBudgetResponse {
  return {
    id: record.id,
    month: formatMonth(record.month),
    amount: numberValue(record.amount),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function toSavingPlanResponse(record: SavingPlanRecord, aggregate: SavingPlanAggregate): SavingPlanResponse {
  const targetAmount = decimalValue(record.targetAmount)
  const currentAmount = decimalValue(aggregate._sum.amount ?? 0)
  const progressPercentage = targetAmount.eq(0)
    ? 0
    : clamp(currentAmount.div(targetAmount).mul(100).floor().toNumber())

  return {
    id: record.id,
    userId: record.userId,
    name: record.name,
    targetAmount: targetAmount.toNumber(),
    currentAmount: currentAmount.toNumber(),
    targetDate: formatDate(record.targetDate),
    depositCount: aggregate._count._all,
    progressPercentage,
    remainingAmount: targetAmount.sub(currentAmount).toNumber(),
    isCompleted: currentAmount.gte(targetAmount),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function toSavingDepositResponse(record: SavingDepositRecord): SavingDepositResponse {
  return {
    id: record.id,
    savingPlanId: record.savingPlanId,
    amount: numberValue(record.amount),
    date: record.date ? formatDate(record.date) : null,
    notes: record.notes,
    source: record.source as SavingDepositSource,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function assertDepositDateIsNotFuture(value: string) {
  if (utcDate(value).getTime() > utcDate(formatDate(new Date())).getTime()) {
    throw new FinanceValidationError('存入日期不能晚于今天')
  }
}

function dayKeys(start: Date, end: Date) {
  const keys: string[] = []
  for (const date = new Date(start); date < end; date.setUTCDate(date.getUTCDate() + 1)) {
    keys.push(formatDate(date))
  }
  return keys
}

export class FinanceService {
  async getExpenses(userId: string, query: FinanceExpenseQueryParams): Promise<ExpenseResponse[]> {
    const date = dateFilter(query)
    const records = await prisma.expense.findMany({
      where: {
        userId,
        ...(date ? { date } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      ...pagination(query),
    })
    return records.map(toExpenseResponse)
  }

  async createExpense(userId: string, data: CreateExpenseRequest): Promise<ExpenseResponse> {
    const record = await prisma.expense.create({
      data: {
        userId,
        date: utcDate(data.date),
        amount: decimalValue(data.amount),
        category: data.category,
        paymentMethod: data.paymentMethod,
        notes: data.notes?.trim() || null,
      },
    })
    return toExpenseResponse(record)
  }

  async updateExpense(userId: string, id: string, data: UpdateExpenseRequest): Promise<ExpenseResponse> {
    const existing = await prisma.expense.findFirst({ where: { id, userId } })
    if (!existing) throw new FinanceNotFoundError('消费记录不存在')

    const updateData: Record<string, unknown> = {}
    if (data.date !== undefined) updateData.date = utcDate(data.date)
    if (data.amount !== undefined) updateData.amount = decimalValue(data.amount)
    if (data.category !== undefined) updateData.category = data.category
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null

    const record = await prisma.expense.update({ where: { id }, data: updateData })
    return toExpenseResponse(record)
  }

  async deleteExpense(userId: string, id: string): Promise<void> {
    const result = await prisma.expense.deleteMany({ where: { id, userId } })
    if (result.count === 0) throw new FinanceNotFoundError('消费记录不存在')
  }

  async getSummary(userId: string, month: string): Promise<FinanceSummaryResponse> {
    const [start, nextMonthStart] = monthBounds(month)
    const [records, budgetRecord] = await Promise.all([
      prisma.expense.findMany({ where: { userId, date: { gte: start, lt: nextMonthStart } } }),
      prisma.monthlyBudget.findUnique({
        where: { userId_month: { userId, month: start } },
      }),
    ])

    const categoryAmounts = new Map<ExpenseCategory, { amount: Prisma.Decimal; count: number }>()
    for (const category of Object.values(ExpenseCategory)) {
      categoryAmounts.set(category, { amount: decimalValue(0), count: 0 })
    }

    const dailyAmounts = new Map<string, { amount: Prisma.Decimal; count: number }>()
    for (const date of dayKeys(start, nextMonthStart)) {
      dailyAmounts.set(date, { amount: decimalValue(0), count: 0 })
    }

    let totalExpense = decimalValue(0)
    let expenseCount = 0
    for (const record of records) {
      if (record.date < start || record.date >= nextMonthStart) continue
      const amount = decimalValue(record.amount)
      totalExpense = totalExpense.add(amount)
      expenseCount += 1

      const category = categoryAmounts.get(record.category as ExpenseCategory)
      if (category) {
        category.amount = category.amount.add(amount)
        category.count += 1
      }

      const date = dailyAmounts.get(formatDate(record.date))
      if (date) {
        date.amount = date.amount.add(amount)
        date.count += 1
      }
    }

    const categoryBreakdown = Object.values(ExpenseCategory).map((category) => {
      const item = categoryAmounts.get(category)!
      return {
        category,
        amount: item.amount.toNumber(),
        percentage: totalExpense.eq(0) ? 0 : item.amount.div(totalExpense).mul(100).toNumber(),
        count: item.count,
      }
    })

    const dailyBreakdown = dayKeys(start, nextMonthStart).map((date) => {
      const item = dailyAmounts.get(date)!
      return { date, amount: item.amount.toNumber(), count: item.count }
    })

    return {
      month,
      totalExpense: totalExpense.toNumber(),
      expenseCount,
      budget: budgetRecord ? {
        ...toBudgetResponse(budgetRecord),
        spent: totalExpense.toNumber(),
        remaining: decimalValue(budgetRecord.amount).sub(totalExpense).toNumber(),
        usedPercentage: decimalValue(budgetRecord.amount).eq(0)
          ? 0
          : clamp(totalExpense.div(decimalValue(budgetRecord.amount)).mul(100).floor().toNumber()),
      } : null,
      categoryBreakdown,
      dailyBreakdown,
    }
  }

  async getBudget(userId: string, month: string): Promise<MonthlyBudgetResponse | null> {
    const [start] = monthBounds(month)
    const record = await prisma.monthlyBudget.findUnique({
      where: { userId_month: { userId, month: start } },
    })
    return record ? toBudgetResponse(record) : null
  }

  async upsertBudget(userId: string, data: CreateBudgetRequest): Promise<MonthlyBudgetResponse> {
    const [start] = monthBounds(data.month)
    const record = await prisma.monthlyBudget.upsert({
      where: { userId_month: { userId, month: start } },
      create: { userId, month: start, amount: decimalValue(data.amount) },
      update: { amount: decimalValue(data.amount) },
    })
    return toBudgetResponse(record)
  }

  async getSavingPlans(userId: string): Promise<SavingPlanResponse[]> {
    const records = await prisma.savingPlan.findMany({
      where: { userId },
      orderBy: [{ targetDate: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        userId: true,
        name: true,
        targetAmount: true,
        targetDate: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (records.length === 0) return []

    const aggregates = await prisma.savingDeposit.groupBy({
      by: ['savingPlanId'],
      where: { savingPlanId: { in: records.map(({ id }) => id) } },
      _sum: { amount: true },
      _count: { _all: true },
    })
    const aggregateByPlan = new Map(aggregates.map((aggregate) => [aggregate.savingPlanId, aggregate]))
    return records.map((record) => toSavingPlanResponse(
      record,
      aggregateByPlan.get(record.id) ?? emptySavingPlanAggregate(),
    ))
  }

  async createSavingPlan(userId: string, data: CreateSavingPlanRequest): Promise<SavingPlanResponse> {
    const targetAmount = decimalValue(data.targetAmount)
    const record = await prisma.savingPlan.create({
      data: {
        userId,
        name: data.name.trim(),
        targetAmount,
        currentAmount: decimalValue(0),
        targetDate: utcDate(data.targetDate),
      },
    })
    return toSavingPlanResponse(record, emptySavingPlanAggregate())
  }

  async updateSavingPlan(userId: string, id: string, data: UpdateSavingPlanRequest): Promise<SavingPlanResponse> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.savingPlan.findFirst({ where: { id, userId } })
        if (!existing) throw new FinanceNotFoundError('储蓄计划不存在')

        const targetAmount = data.targetAmount === undefined
          ? decimalValue(existing.targetAmount)
          : decimalValue(data.targetAmount)
        const aggregate = await savingPlanAggregate(tx, id)
        const currentAmount = decimalValue(aggregate._sum.amount ?? 0)
        if (targetAmount.lt(currentAmount)) {
          throw new FinanceConflictError('目标金额不能低于已存总额')
        }

        const updateData: Record<string, unknown> = {}
        if (data.name !== undefined) updateData.name = data.name.trim()
        if (data.targetAmount !== undefined) updateData.targetAmount = targetAmount
        if (data.targetDate !== undefined) updateData.targetDate = utcDate(data.targetDate)

        const record = await tx.savingPlan.update({ where: { id }, data: updateData })
        return { record, aggregate }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      return toSavingPlanResponse(result.record, result.aggregate)
    } catch (error) {
      if (error instanceof FinanceNotFoundError || error instanceof FinanceConflictError) throw error
      if (prismaErrorCode(error) === 'P2025') throw new FinanceNotFoundError('储蓄计划不存在')
      if (prismaErrorCode(error) === 'P2034' || isSavingPlanCheckConflict(error)) {
        throw new FinanceConflictError('储蓄计划金额在并发更新中发生冲突')
      }
      throw error
    }
  }

  async getSavingDeposits(
    userId: string,
    planId: string,
    query: SavingDepositQueryParams,
  ): Promise<SavingDepositResponse[]> {
    const plan = await prisma.savingPlan.findFirst({
      where: { id: planId, userId },
      select: { id: true },
    })
    if (!plan) throw new FinanceNotFoundError('储蓄计划不存在')

    const records = await prisma.savingDeposit.findMany({
      where: { savingPlanId: planId },
      orderBy: [
        { date: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      ...pagination(query),
    })
    return records.map(toSavingDepositResponse)
  }

  async createSavingDeposit(
    userId: string,
    planId: string,
    data: CreateSavingDepositRequest,
  ): Promise<SavingDepositResponse> {
    assertDepositDateIsNotFuture(data.date)
    try {
      return await prisma.$transaction(async (tx) => {
        const plan = await tx.savingPlan.findFirst({ where: { id: planId, userId } })
        if (!plan) throw new FinanceNotFoundError('储蓄计划不存在')

        const aggregate = await savingPlanAggregate(tx, planId)
        const currentAmount = decimalValue(aggregate._sum.amount ?? 0)
        const amount = decimalValue(data.amount)
        if (currentAmount.add(amount).gt(decimalValue(plan.targetAmount))) {
          throw new FinanceConflictError('存入后将超过目标金额，请先调整目标或修改存入金额')
        }

        const record = await tx.savingDeposit.create({
          data: {
            savingPlanId: planId,
            amount,
            date: utcDate(data.date),
            notes: data.notes?.trim() || null,
          },
        })
        return toSavingDepositResponse(record)
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) {
      if (error instanceof FinanceNotFoundError || error instanceof FinanceConflictError || error instanceof FinanceValidationError) throw error
      if (prismaErrorCode(error) === 'P2025') throw new FinanceNotFoundError('储蓄计划不存在')
      if (prismaErrorCode(error) === 'P2034') {
        throw new FinanceConflictError('计划金额在并发更新中发生变化，请刷新后重试')
      }
      throw error
    }
  }

  async updateSavingDeposit(
    userId: string,
    planId: string,
    depositId: string,
    data: UpdateSavingDepositRequest,
  ): Promise<SavingDepositResponse> {
    if (data.date !== undefined) assertDepositDateIsNotFuture(data.date)
    try {
      return await prisma.$transaction(async (tx) => {
        const plan = await tx.savingPlan.findFirst({ where: { id: planId, userId } })
        if (!plan) throw new FinanceNotFoundError('储蓄计划不存在')
        const existing = await tx.savingDeposit.findFirst({ where: { id: depositId, savingPlanId: planId } })
        if (!existing) throw new FinanceNotFoundError('存入记录不存在')

        const aggregate = await savingPlanAggregate(tx, planId)
        const currentAmount = decimalValue(aggregate._sum.amount ?? 0)
        const nextAmount = data.amount === undefined ? decimalValue(existing.amount) : decimalValue(data.amount)
        const totalAfterUpdate = currentAmount.sub(decimalValue(existing.amount)).add(nextAmount)
        if (totalAfterUpdate.gt(decimalValue(plan.targetAmount))) {
          throw new FinanceConflictError('存入后将超过目标金额，请先调整目标或修改存入金额')
        }

        const updateData: Record<string, unknown> = {}
        if (data.amount !== undefined) updateData.amount = nextAmount
        if (data.date !== undefined) updateData.date = utcDate(data.date)
        if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null
        const record = await tx.savingDeposit.update({ where: { id: depositId }, data: updateData })
        return toSavingDepositResponse(record)
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) {
      if (error instanceof FinanceNotFoundError || error instanceof FinanceConflictError || error instanceof FinanceValidationError) throw error
      if (prismaErrorCode(error) === 'P2025') throw new FinanceNotFoundError('存入记录不存在')
      if (prismaErrorCode(error) === 'P2034') {
        throw new FinanceConflictError('计划金额在并发更新中发生变化，请刷新后重试')
      }
      throw error
    }
  }

  async deleteSavingDeposit(userId: string, planId: string, depositId: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const plan = await tx.savingPlan.findFirst({ where: { id: planId, userId }, select: { id: true } })
        if (!plan) throw new FinanceNotFoundError('储蓄计划不存在')
        const result = await tx.savingDeposit.deleteMany({ where: { id: depositId, savingPlanId: planId } })
        if (result.count === 0) throw new FinanceNotFoundError('存入记录不存在')
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) {
      if (error instanceof FinanceNotFoundError || error instanceof FinanceConflictError) throw error
      if (prismaErrorCode(error) === 'P2034') {
        throw new FinanceConflictError('计划金额在并发更新中发生变化，请刷新后重试')
      }
      throw error
    }
  }

  async deleteSavingPlan(userId: string, id: string): Promise<void> {
    const result = await prisma.savingPlan.deleteMany({ where: { id, userId } })
    if (result.count === 0) throw new FinanceNotFoundError('储蓄计划不存在')
  }
}

export default new FinanceService()
