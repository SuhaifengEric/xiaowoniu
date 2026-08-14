import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'
import { ExpenseCategory, PaymentMethod } from '@xiaowoniu/shared'

const prisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  expense: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  monthlyBudget: { findUnique: vi.fn(), upsert: vi.fn() },
  savingPlan: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  savingDeposit: { findMany: vi.fn(), groupBy: vi.fn(), aggregate: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
}))

const transactionClient = vi.hoisted(() => ({
  savingPlan: { findFirst: vi.fn(), update: vi.fn() },
  savingDeposit: { aggregate: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
}))

vi.mock('../config/database', () => ({ default: prisma }))

import financeService, { FinanceConflictError, FinanceNotFoundError, FinanceValidationError } from '../services/finance.service'

const decimal = (value: string | number) => new Prisma.Decimal(value)
const createdAt = new Date('2026-07-30T08:00:00.000Z')
const updatedAt = new Date('2026-07-30T09:00:00.000Z')

const expense = {
  id: 'e1', userId: 'u1', date: new Date('2026-07-30T00:00:00.000Z'), amount: decimal('12.50'),
  category: ExpenseCategory.FOOD, paymentMethod: PaymentMethod.ALIPAY, notes: null, createdAt, updatedAt,
}

const budget = {
  id: 'b1', userId: 'u1', month: new Date('2026-07-01T00:00:00.000Z'), amount: decimal('30'), createdAt, updatedAt,
}

const savingPlan = {
  id: 'p1', userId: 'u1', name: '旅行', targetAmount: decimal('100'), currentAmount: decimal('0'),
  targetDate: new Date('2026-12-31T00:00:00.000Z'), createdAt, updatedAt,
}

const savingDeposit = {
  id: 'd1', savingPlanId: 'p1', amount: decimal('33.33'), date: new Date('2026-08-14T00:00:00.000Z'),
  notes: '本周固定存入', source: 'manual', createdAt, updatedAt,
}

beforeEach(() => {
  vi.clearAllMocks()
  prisma.$transaction.mockImplementation(async (callback: (tx: typeof transactionClient) => unknown) => callback(transactionClient))
  prisma.savingDeposit.aggregate.mockResolvedValue({ _sum: { amount: null }, _count: { _all: 0 } })
  transactionClient.savingDeposit.aggregate.mockResolvedValue({ _sum: { amount: decimal('33.33') }, _count: { _all: 1 } })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('finance expenses', () => {
  it('returns explicit DTO values and inclusive user/date filters with converted pagination', async () => {
    prisma.expense.findMany.mockResolvedValue([expense])

    const result = await financeService.getExpenses('u1', {
      startDate: '2026-07-01', endDate: '2026-07-31', category: ExpenseCategory.FOOD,
      paymentMethod: PaymentMethod.ALIPAY, limit: '2', offset: '3',
    } as any)

    expect(prisma.expense.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'u1',
        date: { gte: new Date('2026-07-01T00:00:00.000Z'), lte: new Date('2026-07-31T00:00:00.000Z') },
        category: ExpenseCategory.FOOD,
        paymentMethod: PaymentMethod.ALIPAY,
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 2,
      skip: 3,
    })
    expect(result[0]).toEqual({
      id: 'e1', userId: 'u1', date: '2026-07-30', amount: 12.5,
      category: ExpenseCategory.FOOD, paymentMethod: PaymentMethod.ALIPAY, notes: null,
      createdAt: '2026-07-30T08:00:00.000Z', updatedAt: '2026-07-30T09:00:00.000Z',
    })
  })

  it('writes trimmed notes or null and limits updates by user', async () => {
    prisma.expense.create.mockResolvedValue(expense)
    await financeService.createExpense('u1', {
      date: '2026-07-30', amount: 12.5, category: ExpenseCategory.FOOD,
      paymentMethod: PaymentMethod.ALIPAY, notes: '   ',
    })
    expect(prisma.expense.create).toHaveBeenCalledWith({ data: {
      userId: 'u1', date: new Date('2026-07-30T00:00:00.000Z'), amount: decimal('12.5'),
      category: ExpenseCategory.FOOD, paymentMethod: PaymentMethod.ALIPAY, notes: null,
    } })
    const createExpenseData = prisma.expense.create.mock.calls[0][0].data
    expect(createExpenseData.amount).toBeInstanceOf(Prisma.Decimal)
    expect(createExpenseData.amount.toString()).toBe('12.5')

    prisma.expense.findFirst.mockResolvedValue(expense)
    prisma.expense.update.mockResolvedValue({ ...expense, notes: null })
    await financeService.updateExpense('u1', 'e1', { notes: '  revised note  ' })
    expect(prisma.expense.update).toHaveBeenCalledWith({
      where: { id: 'e1' }, data: { notes: 'revised note' },
    })
    await financeService.updateExpense('u1', 'e1', { notes: '   ' })
    expect(prisma.expense.update).toHaveBeenLastCalledWith({
      where: { id: 'e1' }, data: { notes: null },
    })

    prisma.expense.findFirst.mockResolvedValue(expense)
    prisma.expense.update.mockResolvedValue({ ...expense, amount: decimal('9.25'), notes: null })
    await financeService.updateExpense('u1', 'e1', { amount: 9.25 })
    expect(prisma.expense.findFirst).toHaveBeenCalledWith({ where: { id: 'e1', userId: 'u1' } })
    expect(prisma.expense.update).toHaveBeenCalledWith({
      where: { id: 'e1' }, data: { amount: decimal('9.25') },
    })
    const updateExpenseData = prisma.expense.update.mock.calls.at(-1)![0].data
    expect(updateExpenseData.amount).toBeInstanceOf(Prisma.Decimal)
    expect(updateExpenseData.amount.toString()).toBe('9.25')
  })


  it('returns one not-found error for cross-user updates and deletes', async () => {
    prisma.expense.findFirst.mockResolvedValue(null)
    await expect(financeService.updateExpense('u1', 'e-other', { amount: 1 }))
      .rejects.toBeInstanceOf(FinanceNotFoundError)
    expect(prisma.expense.findFirst).toHaveBeenCalledWith({ where: { id: 'e-other', userId: 'u1' } })

    prisma.expense.deleteMany.mockResolvedValue({ count: 0 })
    await expect(financeService.deleteExpense('u1', 'e-other')).rejects.toBeInstanceOf(FinanceNotFoundError)
    expect(prisma.expense.deleteMany).toHaveBeenCalledWith({ where: { id: 'e-other', userId: 'u1' } })
  })
})

describe('finance summary and budgets', () => {
  it('uses an exclusive next-month bound and exactly sums category and daily Decimal amounts', async () => {
    prisma.expense.findMany.mockResolvedValue([
      { ...expense, date: new Date('2026-07-01T00:00:00.000Z'), amount: decimal('12.50') },
      { ...expense, id: 'e2', date: new Date('2026-07-02T00:00:00.000Z'), amount: decimal('7.50'), category: ExpenseCategory.TRANSPORT },
      { ...expense, id: 'e3', date: new Date('2026-08-01T00:00:00.000Z'), amount: decimal('99.99') },
    ])
    prisma.monthlyBudget.findUnique.mockResolvedValue(budget)

    const result = await financeService.getSummary('u1', '2026-07')

    expect(prisma.expense.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'u1', date: {
        gte: new Date('2026-07-01T00:00:00.000Z'), lt: new Date('2026-08-01T00:00:00.000Z'),
      } },
    }))
    expect(prisma.monthlyBudget.findUnique).toHaveBeenCalledWith({
      where: { userId_month: { userId: 'u1', month: new Date('2026-07-01T00:00:00.000Z') } },
    })
    expect(result.totalExpense).toBe(20)
    expect(result.expenseCount).toBe(2)
    expect(result.categoryBreakdown.map(({ category }) => category)).toEqual(Object.values(ExpenseCategory))
    expect(result.categoryBreakdown.find(({ category }) => category === ExpenseCategory.FOOD)).toMatchObject({ amount: 12.5, count: 1 })
    expect(result.categoryBreakdown.find(({ category }) => category === ExpenseCategory.TRANSPORT)).toMatchObject({ amount: 7.5, count: 1 })
    expect(result.categoryBreakdown.find(({ category }) => category === ExpenseCategory.OTHER)).toMatchObject({ amount: 0, count: 0 })
    expect(result.dailyBreakdown).toHaveLength(31)
    expect(result.dailyBreakdown[0]).toEqual({ date: '2026-07-01', amount: 12.5, count: 1 })
    expect(result.dailyBreakdown[1]).toEqual({ date: '2026-07-02', amount: 7.5, count: 1 })
    expect(result.dailyBreakdown[2]).toEqual({ date: '2026-07-03', amount: 0, count: 0 })
    expect(result.dailyBreakdown[30]).toEqual({ date: '2026-07-31', amount: 0, count: 0 })
    expect(result.budget).toMatchObject({ amount: 30, spent: 20, remaining: 10, usedPercentage: 66 })
  })

  it('keeps a zero budget valid and reports zero usage percentage', async () => {
    prisma.expense.findMany.mockResolvedValue([{ ...expense, amount: decimal('10') }])
    prisma.monthlyBudget.findUnique.mockResolvedValue({ ...budget, amount: decimal('0') })
    const result = await financeService.getSummary('u1', '2026-07')
    expect(result.budget).toMatchObject({ amount: 0, spent: 10, remaining: -10, usedPercentage: 0 })
  })

  it('returns null when the requested budget is absent', async () => {
    prisma.monthlyBudget.findUnique.mockResolvedValue(null)
    await expect(financeService.getBudget('u1', '2026-07')).resolves.toBeNull()
    expect(prisma.monthlyBudget.findUnique).toHaveBeenCalledWith({
      where: { userId_month: { userId: 'u1', month: new Date('2026-07-01T00:00:00.000Z') } },
    })
  })

  it('uses the user/month compound key for budget reads and upserts', async () => {
    prisma.monthlyBudget.findUnique.mockResolvedValue(budget)
    await expect(financeService.getBudget('u1', '2026-07')).resolves.toMatchObject({
      id: 'b1', month: '2026-07', amount: 30,
    })
    expect(prisma.monthlyBudget.findUnique).toHaveBeenCalledWith({
      where: { userId_month: { userId: 'u1', month: new Date('2026-07-01T00:00:00.000Z') } },
    })

    prisma.monthlyBudget.upsert.mockResolvedValue({ ...budget, amount: decimal('0') })
    await expect(financeService.upsertBudget('u1', { month: '2026-07', amount: 0 })).resolves.toMatchObject({
      id: 'b1', month: '2026-07', amount: 0,
    })
    expect(prisma.monthlyBudget.upsert).toHaveBeenCalledWith({
      where: { userId_month: { userId: 'u1', month: new Date('2026-07-01T00:00:00.000Z') } },
      create: { userId: 'u1', month: new Date('2026-07-01T00:00:00.000Z'), amount: decimal('0') },
      update: { amount: decimal('0') },
    })
    const budgetWrite = prisma.monthlyBudget.upsert.mock.calls[0][0]
    expect(budgetWrite.create.amount).toBeInstanceOf(Prisma.Decimal)
    expect(budgetWrite.create.amount.toString()).toBe('0')
    expect(budgetWrite.update.amount).toBeInstanceOf(Prisma.Decimal)
    expect(budgetWrite.update.amount.toString()).toBe('0')
  })
})

describe('saving plans and deposits', () => {
  it('derives plan progress and count from one grouped deposit query', async () => {
    prisma.savingPlan.findMany.mockResolvedValue([savingPlan, {
      ...savingPlan, id: 'p2', name: '完成', targetAmount: decimal('10'),
    }])
    prisma.savingDeposit.groupBy.mockResolvedValue([
      { savingPlanId: 'p1', _sum: { amount: decimal('33.33') }, _count: { _all: 1 } },
      { savingPlanId: 'p2', _sum: { amount: decimal('10') }, _count: { _all: 1 } },
    ])

    const result = await financeService.getSavingPlans('u1')

    expect(prisma.savingPlan.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: [{ targetDate: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, userId: true, name: true, targetAmount: true, targetDate: true, createdAt: true, updatedAt: true },
    })
    expect(prisma.savingDeposit.groupBy).toHaveBeenCalledWith({
      by: ['savingPlanId'],
      where: { savingPlanId: { in: ['p1', 'p2'] } },
      _sum: { amount: true },
      _count: { _all: true },
    })
    expect(result[0]).toMatchObject({ targetAmount: 100, currentAmount: 33.33, depositCount: 1, remainingAmount: 66.67, progressPercentage: 33, isCompleted: false })
    expect(result[1]).toMatchObject({ currentAmount: 10, depositCount: 1, remainingAmount: 0, progressPercentage: 100, isCompleted: true })
  })

  it('creates a zero-progress plan without accepting a current amount', async () => {
    prisma.savingPlan.create.mockResolvedValue(savingPlan)
    const result = await financeService.createSavingPlan('u1', {
      name: '  旅行  ', targetAmount: 100, targetDate: '2026-12-31',
    })
    const createData = prisma.savingPlan.create.mock.calls[0][0].data
    expect(createData).toMatchObject({
      userId: 'u1', name: '旅行', targetDate: new Date('2026-12-31T00:00:00.000Z'),
    })
    expect(createData.targetAmount).toBeInstanceOf(Prisma.Decimal)
    expect(createData.targetAmount.toString()).toBe('100')
    expect(createData.currentAmount).toBeInstanceOf(Prisma.Decimal)
    expect(createData.currentAmount.toString()).toBe('0')
    expect(result).toMatchObject({ currentAmount: 0, depositCount: 0, remainingAmount: 100 })
  })

  it('validates target changes against the grouped deposit total in a Serializable transaction', async () => {
    transactionClient.savingPlan.findFirst.mockResolvedValue(savingPlan)
    transactionClient.savingDeposit.aggregate.mockResolvedValue({ _sum: { amount: decimal('33.33') }, _count: { _all: 1 } })
    transactionClient.savingPlan.update.mockResolvedValue({ ...savingPlan, name: '新名字' })

    await financeService.updateSavingPlan('u1', 'p1', { name: ' 新名字 ' })
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    })
    expect(transactionClient.savingDeposit.aggregate).toHaveBeenCalledWith({
      where: { savingPlanId: 'p1' }, _sum: { amount: true }, _count: { _all: true },
    })
    expect(transactionClient.savingPlan.update).toHaveBeenCalledWith({
      where: { id: 'p1' }, data: { name: '新名字' },
    })

    await expect(financeService.updateSavingPlan('u1', 'p1', { targetAmount: 20 }))
      .rejects.toBeInstanceOf(FinanceConflictError)
    expect(transactionClient.savingPlan.update).toHaveBeenCalledTimes(1)
  })

  it('lists deposits in stable date order with pagination and user-scoped plan lookup', async () => {
    prisma.savingPlan.findFirst.mockResolvedValue({ id: 'p1' })
    prisma.savingDeposit.findMany.mockResolvedValue([savingDeposit])
    const result = await financeService.getSavingDeposits('u1', 'p1', { limit: '2', offset: '3' } as any)

    expect(prisma.savingPlan.findFirst).toHaveBeenCalledWith({ where: { id: 'p1', userId: 'u1' }, select: { id: true } })
    expect(prisma.savingDeposit.findMany).toHaveBeenCalledWith({
      where: { savingPlanId: 'p1' },
      orderBy: [{ date: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }, { id: 'desc' }],
      take: 2,
      skip: 3,
    })
    expect(result[0]).toMatchObject({ id: 'd1', amount: 33.33, date: '2026-08-14', source: 'manual' })
  })

  it('creates deposits with trimmed notes and rejects future dates and over-target totals', async () => {
    vi.useFakeTimers({ now: new Date('2026-08-14T12:00:00.000Z') })
    transactionClient.savingPlan.findFirst.mockResolvedValue(savingPlan)
    transactionClient.savingDeposit.aggregate.mockResolvedValue({ _sum: { amount: decimal('33.33') }, _count: { _all: 1 } })
    transactionClient.savingDeposit.create.mockResolvedValue(savingDeposit)

    await expect(financeService.createSavingDeposit('u1', 'p1', {
      amount: 10, date: '2026-08-14', notes: '  固定存入  ',
    })).resolves.toMatchObject({ id: 'd1', amount: 33.33 })
    expect(transactionClient.savingDeposit.create).toHaveBeenCalledWith({
      data: {
        savingPlanId: 'p1', amount: decimal('10'), date: new Date('2026-08-14T00:00:00.000Z'), notes: '固定存入',
      },
    })

    await expect(financeService.createSavingDeposit('u1', 'p1', {
      amount: 1, date: '2026-08-15',
    })).rejects.toBeInstanceOf(FinanceValidationError)
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)

    transactionClient.savingDeposit.aggregate.mockResolvedValue({ _sum: { amount: decimal('99') }, _count: { _all: 1 } })
    await expect(financeService.createSavingDeposit('u1', 'p1', {
      amount: 2, date: '2026-08-14',
    })).rejects.toBeInstanceOf(FinanceConflictError)
    expect(transactionClient.savingDeposit.create).toHaveBeenCalledTimes(1)
  })

  it('updates a deposit using the aggregate delta and preserves the separate plan object', async () => {
    transactionClient.savingPlan.findFirst.mockResolvedValue(savingPlan)
    transactionClient.savingDeposit.findFirst.mockResolvedValue(savingDeposit)
    transactionClient.savingDeposit.aggregate.mockResolvedValue({ _sum: { amount: decimal('33.33') }, _count: { _all: 1 } })
    transactionClient.savingDeposit.update.mockResolvedValue({ ...savingDeposit, amount: decimal('40'), notes: '修正' })

    await expect(financeService.updateSavingDeposit('u1', 'p1', 'd1', {
      amount: 40, date: '2026-08-13', notes: '  修正  ',
    })).resolves.toMatchObject({ amount: 40 })
    expect(transactionClient.savingDeposit.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { amount: decimal('40'), date: new Date('2026-08-13T00:00:00.000Z'), notes: '修正' },
    })
  })

  it('maps cross-user and unknown deposit resources to not found and deletes only the nested record', async () => {
    transactionClient.savingPlan.findFirst.mockResolvedValue(null)
    await expect(financeService.updateSavingDeposit('u1', 'p-other', 'd1', { amount: 2 }))
      .rejects.toBeInstanceOf(FinanceNotFoundError)
    expect(transactionClient.savingDeposit.findFirst).not.toHaveBeenCalled()

    transactionClient.savingPlan.findFirst.mockResolvedValue({ id: 'p1' })
    transactionClient.savingDeposit.deleteMany.mockResolvedValue({ count: 0 })
    await expect(financeService.deleteSavingDeposit('u1', 'p1', 'd-other'))
      .rejects.toBeInstanceOf(FinanceNotFoundError)
    expect(transactionClient.savingDeposit.deleteMany).toHaveBeenCalledWith({ where: { id: 'd-other', savingPlanId: 'p1' } })

    prisma.savingPlan.findFirst.mockResolvedValue(null)
    await expect(financeService.getSavingDeposits('u1', 'p-other', {})).rejects.toBeInstanceOf(FinanceNotFoundError)
  })

  it('maps Serializable deposit conflicts to a user-facing FinanceConflictError', async () => {
    const serializationConflict = new Prisma.PrismaClientKnownRequestError('write conflict', {
      code: 'P2034', clientVersion: '5.9.0',
    })
    prisma.$transaction.mockRejectedValueOnce(serializationConflict)
    await expect(financeService.createSavingDeposit('u1', 'p1', {
      amount: 1, date: '2026-08-14',
    })).rejects.toBeInstanceOf(FinanceConflictError)
  })

  it('deletes plans through the existing user-scoped cascade operation', async () => {
    prisma.savingPlan.deleteMany.mockResolvedValue({ count: 0 })
    await expect(financeService.deleteSavingPlan('u1', 'p-other')).rejects.toBeInstanceOf(FinanceNotFoundError)
    expect(prisma.savingPlan.deleteMany).toHaveBeenCalledWith({ where: { id: 'p-other', userId: 'u1' } })
  })
})
