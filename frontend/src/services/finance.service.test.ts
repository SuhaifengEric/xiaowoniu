import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExpenseCategory, PaymentMethod } from '@xiaowoniu/shared'
import { financeService } from './finance.service'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('./api', () => ({ default: apiMocks }))

const expense = {
  id: 'expense-1',
  userId: 'user-1',
  date: '2026-07-30',
  amount: 42.5,
  category: ExpenseCategory.FOOD,
  paymentMethod: PaymentMethod.ALIPAY,
  notes: 'lunch',
  createdAt: '2026-07-30T01:00:00.000Z',
  updatedAt: '2026-07-30T01:00:00.000Z',
}

const budget = {
  id: 'budget-1',
  month: '2026-07',
  amount: 5000,
  createdAt: '2026-07-01T01:00:00.000Z',
  updatedAt: '2026-07-01T01:00:00.000Z',
}

const summary = {
  month: '2026-07',
  totalExpense: 42.5,
  expenseCount: 1,
  budget: { ...budget, spent: 42.5, remaining: 4957.5, usedPercentage: 0 },
  categoryBreakdown: [],
  dailyBreakdown: [],
}

const savingPlan = {
  id: 'plan-1',
  userId: 'user-1',
  name: '旅行基金',
  targetAmount: 10000,
  currentAmount: 2500,
  depositCount: 2,
  targetDate: '2027-01-01',
  progressPercentage: 25,
  remainingAmount: 7500,
  isCompleted: false,
  createdAt: '2026-07-01T01:00:00.000Z',
  updatedAt: '2026-07-01T01:00:00.000Z',
}

const savingDeposit = {
  id: 'deposit-1',
  savingPlanId: 'plan-1',
  amount: 500,
  date: '2026-08-14',
  notes: '本周固定存入',
  source: 'manual' as const,
  createdAt: '2026-08-14T01:00:00.000Z',
  updatedAt: '2026-08-14T01:00:00.000Z',
}

describe('financeService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gets expenses with filters and pagination and unwraps data', async () => {
    const params = {
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      category: ExpenseCategory.FOOD,
      paymentMethod: PaymentMethod.ALIPAY,
      limit: 20,
      offset: 0,
    }
    apiMocks.get.mockResolvedValue({ data: { success: true, data: [expense] } })

    await expect(financeService.getExpenses(params)).resolves.toEqual([expense])
    expect(apiMocks.get).toHaveBeenCalledWith('/api/finance/expenses', { params })
  })

  it('creates, updates and deletes expenses with the expected contract', async () => {
    const createRequest = {
      date: '2026-07-30',
      amount: 42.5,
      category: ExpenseCategory.FOOD,
      paymentMethod: PaymentMethod.ALIPAY,
      notes: 'lunch',
    }
    const updateRequest = { amount: 45, notes: null }
    apiMocks.post.mockResolvedValue({ data: { success: true, data: expense } })
    apiMocks.patch.mockResolvedValue({ data: { success: true, data: expense } })
    apiMocks.delete.mockResolvedValue({ data: { success: true, data: null } })

    await expect(financeService.createExpense(createRequest)).resolves.toEqual(expense)
    await expect(financeService.updateExpense('expense-1', updateRequest)).resolves.toEqual(expense)
    await expect(financeService.deleteExpense('expense-1')).resolves.toBeNull()

    expect(apiMocks.post).toHaveBeenCalledWith('/api/finance/expenses', createRequest)
    expect(apiMocks.patch).toHaveBeenCalledWith('/api/finance/expenses/expense-1', updateRequest)
    expect(apiMocks.delete).toHaveBeenCalledWith('/api/finance/expenses/expense-1')
  })

  it('sends month through Axios params and unwraps summary and budget data', async () => {
    apiMocks.get
      .mockResolvedValueOnce({ data: { success: true, data: summary } })
      .mockResolvedValueOnce({ data: { success: true, data: budget } })

    await expect(financeService.getSummary('2026-07')).resolves.toEqual(summary)
    await expect(financeService.getBudget('2026-07')).resolves.toEqual(budget)

    expect(apiMocks.get).toHaveBeenNthCalledWith(1, '/api/finance/summary', { params: { month: '2026-07' } })
    expect(apiMocks.get).toHaveBeenNthCalledWith(2, '/api/finance/budgets', { params: { month: '2026-07' } })
  })

  it('uses PUT for the month budget and unwraps its response', async () => {
    const budgetRequest = { month: '2026-07', amount: 5000 }
    apiMocks.put.mockResolvedValue({ data: { success: true, data: budget } })

    await expect(financeService.upsertBudget(budgetRequest)).resolves.toEqual(budget)
    expect(apiMocks.put).toHaveBeenCalledWith('/api/finance/budgets', budgetRequest)
  })

  it('gets and creates saving plans with response data unwrapped', async () => {
    const createRequest = {
      name: '旅行基金',
      targetAmount: 10000,
      targetDate: '2027-01-01',
    }
    apiMocks.get.mockResolvedValue({ data: { success: true, data: [savingPlan] } })
    apiMocks.post.mockResolvedValue({ data: { success: true, data: savingPlan } })

    await expect(financeService.getSavingPlans()).resolves.toEqual([savingPlan])
    await expect(financeService.createSavingPlan(createRequest)).resolves.toEqual(savingPlan)

    expect(apiMocks.get).toHaveBeenCalledWith('/api/finance/saving-plans')
    expect(apiMocks.post).toHaveBeenCalledWith('/api/finance/saving-plans', createRequest)
  })

  it('uses PATCH for saving plan edits and DELETE returns null', async () => {
    const updateRequest = { targetAmount: 12000, name: '旅行基金 2027' }
    apiMocks.patch.mockResolvedValue({ data: { success: true, data: savingPlan } })
    apiMocks.delete.mockResolvedValue({ data: { success: true, data: null } })

    await expect(financeService.updateSavingPlan('plan-1', updateRequest)).resolves.toEqual(savingPlan)
    await expect(financeService.deleteSavingPlan('plan-1')).resolves.toBeNull()

    expect(apiMocks.patch).toHaveBeenCalledWith('/api/finance/saving-plans/plan-1', updateRequest)
    expect(apiMocks.delete).toHaveBeenCalledWith('/api/finance/saving-plans/plan-1')
  })

  it('lists paginated deposits and sends nested plan/deposit endpoints', async () => {
    apiMocks.get.mockResolvedValue({ data: { success: true, data: [savingDeposit] } })
    apiMocks.post.mockResolvedValue({ data: { success: true, data: savingDeposit } })
    apiMocks.patch.mockResolvedValue({ data: { success: true, data: savingDeposit } })
    apiMocks.delete.mockResolvedValue({ data: { success: true, data: null } })

    await expect(financeService.getSavingDeposits('plan-1', { limit: 50, offset: 0 })).resolves.toEqual([savingDeposit])
    await expect(financeService.createSavingDeposit('plan-1', { amount: 500, date: '2026-08-14', notes: '本周固定存入' })).resolves.toEqual(savingDeposit)
    await expect(financeService.updateSavingDeposit('plan-1', 'deposit-1', { amount: 550 })).resolves.toEqual(savingDeposit)
    await expect(financeService.deleteSavingDeposit('plan-1', 'deposit-1')).resolves.toBeNull()

    expect(apiMocks.get).toHaveBeenCalledWith('/api/finance/saving-plans/plan-1/deposits', { params: { limit: 50, offset: 0 } })
    expect(apiMocks.post).toHaveBeenCalledWith('/api/finance/saving-plans/plan-1/deposits', { amount: 500, date: '2026-08-14', notes: '本周固定存入' })
    expect(apiMocks.patch).toHaveBeenCalledWith('/api/finance/saving-plans/plan-1/deposits/deposit-1', { amount: 550 })
    expect(apiMocks.delete).toHaveBeenCalledWith('/api/finance/saving-plans/plan-1/deposits/deposit-1')
  })
})
