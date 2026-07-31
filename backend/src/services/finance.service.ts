import { Prisma } from '@prisma/client'
import {
  CreateBudgetRequest,
  CreateExpenseRequest,
  CreateSavingPlanRequest,
  ExpenseCategory,
  ExpenseResponse,
  FinanceExpenseQueryParams,
  FinanceSummaryResponse,
  MonthlyBudgetResponse,
  SavingPlanResponse,
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

export const utcDate = (value: string) => new Date(`${value}T00:00:00.000Z`)
export const formatDate = (value: Date) => value.toISOString().slice(0, 10)

const numberValue = (value: Prisma.Decimal | number) => typeof value === 'number' ? value : value.toNumber()
const decimalValue = (value: Prisma.Decimal | number | string) => new Prisma.Decimal(value)
const clamp = (value: number) => Math.min(100, Math.max(0, value))

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
    month: formatDate(record.month),
    amount: numberValue(record.amount),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function toSavingPlanResponse(record: any): SavingPlanResponse {
  const targetAmount = decimalValue(record.targetAmount)
  const currentAmount = decimalValue(record.currentAmount)
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
    progressPercentage,
    remainingAmount: targetAmount.sub(currentAmount).toNumber(),
    isCompleted: currentAmount.gte(targetAmount),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
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
        amount: data.amount,
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
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.category !== undefined) updateData.category = data.category
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null

    const record = await prisma.expense.update({ where: { id, userId } as any, data: updateData })
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
      create: { userId, month: start, amount: data.amount },
      update: { amount: data.amount },
    })
    return toBudgetResponse(record)
  }

  async getSavingPlans(userId: string): Promise<SavingPlanResponse[]> {
    const records = await prisma.savingPlan.findMany({
      where: { userId },
      orderBy: [{ targetDate: 'asc' }, { createdAt: 'asc' }],
    })
    return records.map(toSavingPlanResponse)
  }

  async createSavingPlan(userId: string, data: CreateSavingPlanRequest): Promise<SavingPlanResponse> {
    const targetAmount = decimalValue(data.targetAmount)
    const currentAmount = decimalValue(data.currentAmount ?? 0)
    if (currentAmount.gt(targetAmount)) {
      throw new FinanceConflictError('当前金额不能超过目标金额')
    }

    const record = await prisma.savingPlan.create({
      data: {
        userId,
        name: data.name.trim(),
        targetAmount,
        currentAmount,
        targetDate: utcDate(data.targetDate),
      },
    })
    return toSavingPlanResponse(record)
  }

  async updateSavingPlan(userId: string, id: string, data: UpdateSavingPlanRequest): Promise<SavingPlanResponse> {
    const existing = await prisma.savingPlan.findFirst({ where: { id, userId } })
    if (!existing) throw new FinanceNotFoundError('储蓄计划不存在')

    const targetAmount = data.targetAmount === undefined
      ? decimalValue(existing.targetAmount)
      : decimalValue(data.targetAmount)
    const currentAmount = data.currentAmount === undefined
      ? decimalValue(existing.currentAmount)
      : decimalValue(data.currentAmount)
    if (targetAmount.lt(currentAmount)) {
      throw new FinanceConflictError('目标金额不能低于当前金额')
    }

    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.targetAmount !== undefined) updateData.targetAmount = targetAmount
    if (data.currentAmount !== undefined) updateData.currentAmount = currentAmount
    if (data.targetDate !== undefined) updateData.targetDate = utcDate(data.targetDate)

    const record = await prisma.savingPlan.update({ where: { id, userId } as any, data: updateData })
    return toSavingPlanResponse(record)
  }

  async deleteSavingPlan(userId: string, id: string): Promise<void> {
    const result = await prisma.savingPlan.deleteMany({ where: { id, userId } })
    if (result.count === 0) throw new FinanceNotFoundError('储蓄计划不存在')
  }
}

export default new FinanceService()
