import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExpenseCategory, PaymentMethod } from '@xiaowoniu/shared'
import { financeService } from '@/services/finance.service'
import { initialFinanceState, useFinanceStore } from './finance.store'

vi.mock('@/services/finance.service', () => ({
  financeService: {
    getExpenses: vi.fn(),
    createExpense: vi.fn(),
    updateExpense: vi.fn(),
    deleteExpense: vi.fn(),
    getSummary: vi.fn(),
    getBudget: vi.fn(),
    upsertBudget: vi.fn(),
    getSavingPlans: vi.fn(),
    createSavingPlan: vi.fn(),
    updateSavingPlan: vi.fn(),
    deleteSavingPlan: vi.fn(),
  },
}))

const service = vi.mocked(financeService)
const expense = {
  id: 'expense-1', userId: 'user-1', date: '2026-07-12', amount: 42.5,
  category: ExpenseCategory.FOOD, paymentMethod: PaymentMethod.CARD, notes: null,
  createdAt: 'created', updatedAt: 'updated',
}
const summary = {
  month: '2026-07', totalExpense: 42.5, expenseCount: 1, budget: null,
  categoryBreakdown: [], dailyBreakdown: [],
}
const budget = {
  id: 'budget-1', month: '2026-07', amount: 1000,
  createdAt: 'created', updatedAt: 'updated',
}
const savingPlan = {
  id: 'plan-1', userId: 'user-1', name: '旅行', targetAmount: 2000, currentAmount: 500,
  targetDate: '2026-12-31', progressPercentage: 25, remainingAmount: 1500,
  isCompleted: false, createdAt: 'created', updatedAt: 'updated',
}

const setDefaultResponses = () => {
  service.getExpenses.mockResolvedValue([expense])
  service.getSummary.mockResolvedValue(summary)
  service.getBudget.mockResolvedValue(budget)
  service.getSavingPlans.mockResolvedValue([savingPlan])
}

describe('useFinanceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFinanceStore.getState().reset()
    setDefaultResponses()
  })

  it('fetches the dashboard resources concurrently for the selected month', async () => {
    await useFinanceStore.getState().fetchDashboard('2026-07')

    expect(service.getExpenses).toHaveBeenCalledWith({
      startDate: '2026-07-01', endDate: '2026-07-31', limit: 100, offset: 0,
    })
    expect(service.getSummary).toHaveBeenCalledWith('2026-07')
    expect(service.getBudget).toHaveBeenCalledWith('2026-07')
    expect(service.getSavingPlans).toHaveBeenCalledOnce()
    expect(useFinanceStore.getState()).toMatchObject({
      selectedMonth: '2026-07', expenses: [expense], summary, budget, savingPlans: [savingPlan],
      loading: false, error: null,
    })
  })

  it('replaces the first expense page and appends later pages without duplicates', async () => {
    const secondExpense = { ...expense, id: 'expense-2', date: '2026-07-11' }
    await useFinanceStore.getState().fetchExpenses({ offset: 0, limit: 2 })
    service.getExpenses.mockResolvedValue([expense, secondExpense])
    await useFinanceStore.getState().fetchExpenses({ offset: 2, limit: 2 })

    expect(useFinanceStore.getState().expenses).toEqual([expense, secondExpense])
  })

  it('ignores an older month response after the selected month changes', async () => {
    let resolveOld!: (value: typeof summary) => void
    let resolveNew!: (value: typeof summary) => void
    service.getSummary
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNew = resolve }))

    const oldRequest = useFinanceStore.getState().fetchSummary('2026-06')
    const newRequest = useFinanceStore.getState().fetchSummary('2026-07')
    resolveNew(summary)
    await newRequest
    resolveOld({ ...summary, month: '2026-06', totalExpense: 1 })
    await oldRequest

    expect(useFinanceStore.getState()).toMatchObject({ selectedMonth: '2026-07', summary })
  })

  it('updates the month and invalidates old dashboard requests', async () => {
    let resolveOld!: (value: typeof expense[]) => void
    service.getExpenses.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
    service.getSummary.mockImplementationOnce(() => new Promise(() => undefined))
    service.getBudget.mockImplementationOnce(() => new Promise(() => undefined))
    service.getSavingPlans.mockImplementationOnce(() => new Promise(() => undefined))

    const pending = useFinanceStore.getState().fetchDashboard('2026-06')
    useFinanceStore.getState().setMonth('2026-07')
    resolveOld([expense])
    await Promise.resolve()

    expect(useFinanceStore.getState()).toMatchObject({
      selectedMonth: '2026-07', expenses: [], summary: null, budget: null,
    })
    expect(pending).toBeInstanceOf(Promise)
  })

  it('optimistically updates an expense and refreshes expenses and summary', async () => {
    const created = { ...expense, id: 'expense-2' }
    service.createExpense.mockResolvedValue(created)
    service.getExpenses.mockResolvedValue([created])
    service.getSummary.mockResolvedValue({ ...summary, totalExpense: 84.5, expenseCount: 2 })

    await useFinanceStore.getState().createExpense({
      date: created.date, amount: created.amount, category: created.category,
      paymentMethod: created.paymentMethod,
    })

    expect(service.getExpenses).toHaveBeenCalledWith({
      startDate: '2026-07-01', endDate: '2026-07-31', limit: 100, offset: 0,
    })
    expect(service.getSummary).toHaveBeenCalledWith('2026-07')
    expect(useFinanceStore.getState()).toMatchObject({ expenses: [created], summary: { totalExpense: 84.5 } })
  })

  it('keeps a successful expense mutation when the background refresh fails', async () => {
    const created = { ...expense, id: 'expense-2' }
    service.createExpense.mockResolvedValue(created)
    service.getExpenses.mockRejectedValue(new Error('refresh failed'))
    service.getSummary.mockRejectedValue(new Error('refresh failed'))

    await expect(useFinanceStore.getState().createExpense({
      date: created.date, amount: created.amount, category: created.category,
      paymentMethod: created.paymentMethod,
    })).resolves.toBeUndefined()
    expect(useFinanceStore.getState()).toMatchObject({
      expenses: [created], error: '操作已成功，但数据刷新失败', loading: false,
    })
  })

  it('rethrows primary API errors and exposes their message', async () => {
    const failure = { response: { data: { error: { message: '预算金额无效' } } } }
    service.upsertBudget.mockRejectedValue(failure)

    await expect(useFinanceStore.getState().upsertBudget({ month: '2026-07', amount: 0 })).rejects.toBe(failure)
    expect(useFinanceStore.getState()).toMatchObject({ loading: false, error: '预算金额无效' })
  })

  it('keeps loading true until concurrent actions all finish', async () => {
    let resolveExpenses!: (value: typeof expense[]) => void
    let resolvePlans!: (value: typeof savingPlan[]) => void
    service.getExpenses.mockImplementation(() => new Promise((resolve) => { resolveExpenses = resolve }))
    service.getSavingPlans.mockImplementation(() => new Promise((resolve) => { resolvePlans = resolve }))

    const expensesRequest = useFinanceStore.getState().fetchExpenses()
    const plansRequest = useFinanceStore.getState().fetchSavingPlans()
    resolveExpenses([expense])
    await expensesRequest
    expect(useFinanceStore.getState().loading).toBe(true)
    resolvePlans([savingPlan])
    await plansRequest
    expect(useFinanceStore.getState().loading).toBe(false)
  })

  it('reset prevents an in-flight request from writing back', async () => {
    let resolve!: (value: typeof expense[]) => void
    service.getExpenses.mockImplementation(() => new Promise((innerResolve) => { resolve = innerResolve }))

    const pending = useFinanceStore.getState().fetchExpenses()
    useFinanceStore.getState().reset()
    resolve([expense])
    await pending

    expect(useFinanceStore.getState()).toMatchObject(initialFinanceState)
  })

  it('refreshes budget and saving plans after their mutations', async () => {
    const updatedBudget = { ...budget, amount: 1200 }
    service.upsertBudget.mockResolvedValue(updatedBudget)
    service.createSavingPlan.mockResolvedValue(savingPlan)
    await useFinanceStore.getState().upsertBudget({ month: '2026-07', amount: 1200 })
    await useFinanceStore.getState().createSavingPlan({
      name: savingPlan.name, targetAmount: savingPlan.targetAmount,
      currentAmount: savingPlan.currentAmount, targetDate: savingPlan.targetDate,
    })

    expect(service.getBudget).toHaveBeenCalledWith('2026-07')
    expect(service.getSummary).toHaveBeenCalledWith('2026-07')
    expect(service.getSavingPlans).toHaveBeenCalledOnce()
  })
})
