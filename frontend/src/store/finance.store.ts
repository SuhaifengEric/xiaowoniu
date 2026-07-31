import { create } from 'zustand'
import type {
  ApiErrorResponse,
  CreateBudgetRequest,
  CreateExpenseRequest,
  CreateSavingPlanRequest,
  ExpenseResponse,
  FinanceExpenseQueryParams,
  FinanceSummaryResponse,
  MonthlyBudgetResponse,
  SavingPlanResponse,
  UpdateExpenseRequest,
  UpdateSavingPlanRequest,
} from '@xiaowoniu/shared'
import { financeService } from '@/services/finance.service'

interface FinanceDataState {
  expenses: ExpenseResponse[]
  summary: FinanceSummaryResponse | null
  budget: MonthlyBudgetResponse | null
  savingPlans: SavingPlanResponse[]
  selectedMonth: string
  loading: boolean
  error: string | null
}

interface FinanceActions {
  fetchDashboard: (month: string) => Promise<void>
  fetchExpenses: (params?: FinanceExpenseQueryParams) => Promise<void>
  fetchSummary: (month: string) => Promise<void>
  fetchBudget: (month: string) => Promise<void>
  fetchSavingPlans: () => Promise<void>
  setMonth: (month: string) => void
  createExpense: (data: CreateExpenseRequest) => Promise<void>
  updateExpense: (id: string, data: UpdateExpenseRequest) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  upsertBudget: (data: CreateBudgetRequest) => Promise<void>
  createSavingPlan: (data: CreateSavingPlanRequest) => Promise<void>
  updateSavingPlan: (id: string, data: UpdateSavingPlanRequest) => Promise<void>
  deleteSavingPlan: (id: string) => Promise<void>
  clearError: () => void
  reset: () => void
}

export type FinanceState = FinanceDataState & FinanceActions

export function formatMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export const initialFinanceState: FinanceDataState = {
  expenses: [],
  summary: null,
  budget: null,
  savingPlans: [],
  selectedMonth: formatMonth(new Date()),
  loading: false,
  error: null,
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getErrorMessage = (value: unknown): string => {
  if (isRecord(value) && isRecord(value.response) && isRecord(value.response.data)) {
    const data = value.response.data as Partial<ApiErrorResponse>
    if (data.error?.message) return data.error.message
  }
  return value instanceof Error ? value.message : '财务数据操作失败'
}

const refreshFailureMessage = '操作已成功，但数据刷新失败'
type Resource = 'expenses' | 'summary' | 'budget' | 'savingPlans'
type RequestToken = { generation: number; version: number; monthVersion: number; resource: Resource }
const resources: Resource[] = ['expenses', 'summary', 'budget', 'savingPlans']

const monthExpenseParams = (month: string): FinanceExpenseQueryParams => {
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(year, monthNumber, 0).getDate()
  return {
    startDate: `${month}-01`,
    endDate: `${month}-${String(lastDay).padStart(2, '0')}`,
    limit: 100,
    offset: 0,
  }
}

const monthFromParams = (params: FinanceExpenseQueryParams | undefined, fallback: string): string => {
  const date = params?.startDate ?? params?.endDate
  return date && /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : fallback
}

export const useFinanceStore = create<FinanceState>((set, get) => {
  let generation = 0
  let monthVersion = 0
  let activeActions = 0
  const versions: Record<Resource, number> = {
    expenses: 0,
    summary: 0,
    budget: 0,
    savingPlans: 0,
  }

  const nextToken = (resource: Resource): RequestToken => ({
    generation,
    resource,
    monthVersion,
    version: ++versions[resource],
  })

  const isCurrent = (token: RequestToken): boolean =>
    token.generation === generation &&
    token.monthVersion === monthVersion &&
    token.version === versions[token.resource]

  const changeMonth = (month: string): void => {
    if (get().selectedMonth === month) return
    monthVersion += 1
    resources.forEach((resource) => { versions[resource] += 1 })
    set({ selectedMonth: month, expenses: [], summary: null, budget: null, error: null })
  }

  const runAction = async (
    action: () => Promise<void>,
    canWriteError: () => boolean = () => true,
  ): Promise<void> => {
    const actionGeneration = generation
    activeActions += 1
    set({ loading: true, error: null })
    try {
      await action()
    } catch (error: unknown) {
      if (actionGeneration === generation && canWriteError()) set({ error: getErrorMessage(error) })
      throw error
    } finally {
      if (actionGeneration === generation) {
        activeActions = Math.max(0, activeActions - 1)
        set({ loading: activeActions > 0 })
      }
    }
  }

  const refresh = async (
    requests: Array<{ token: RequestToken; request: Promise<unknown>; apply: (value: unknown) => void }>,
  ): Promise<void> => {
    const results = await Promise.allSettled(requests.map(({ request }) => request))
    let failed = false
    results.forEach((result, index) => {
      const request = requests[index]
      if (!isCurrent(request.token)) return
      if (result.status === 'fulfilled') request.apply(result.value)
      else failed = true
    })
    if (failed) set({ error: refreshFailureMessage })
  }

  const refreshExpensesAndSummary = async (month: string): Promise<void> => {
    const expensesToken = nextToken('expenses')
    const summaryToken = nextToken('summary')
    await refresh([
      {
        token: expensesToken,
        request: financeService.getExpenses(monthExpenseParams(month)),
        apply: (value) => set({ expenses: value as ExpenseResponse[] }),
      },
      {
        token: summaryToken,
        request: financeService.getSummary(month),
        apply: (value) => set({ summary: value as FinanceSummaryResponse }),
      },
    ])
  }

  const refreshBudgetAndSummary = async (month: string): Promise<void> => {
    const budgetToken = nextToken('budget')
    const summaryToken = nextToken('summary')
    await refresh([
      {
        token: budgetToken,
        request: financeService.getBudget(month),
        apply: (value) => set({ budget: value as MonthlyBudgetResponse | null }),
      },
      {
        token: summaryToken,
        request: financeService.getSummary(month),
        apply: (value) => set({ summary: value as FinanceSummaryResponse }),
      },
    ])
  }

  const refreshSavingPlans = async (): Promise<void> => {
    const token = nextToken('savingPlans')
    await refresh([{
      token,
      request: financeService.getSavingPlans(),
      apply: (value) => set({ savingPlans: value as SavingPlanResponse[] }),
    }])
  }

  return {
    ...initialFinanceState,

    fetchDashboard: (month) => {
      changeMonth(month)
      const expenseToken = nextToken('expenses')
      const summaryToken = nextToken('summary')
      const budgetToken = nextToken('budget')
      const savingPlansToken = nextToken('savingPlans')
      return runAction(async () => {
        const [expenses, summary, budget, savingPlans] = await Promise.all([
          financeService.getExpenses(monthExpenseParams(month)),
          financeService.getSummary(month),
          financeService.getBudget(month),
          financeService.getSavingPlans(),
        ])
        if (isCurrent(expenseToken)) set({ expenses })
        if (isCurrent(summaryToken)) set({ summary })
        if (isCurrent(budgetToken)) set({ budget })
        if (isCurrent(savingPlansToken)) set({ savingPlans })
      }, () => [expenseToken, summaryToken, budgetToken, savingPlansToken].every(isCurrent))
    },

    fetchExpenses: (params) => {
      const requestedMonth = monthFromParams(params, get().selectedMonth)
      changeMonth(requestedMonth)
      const token = nextToken('expenses')
      const requestParams = params ?? monthExpenseParams(requestedMonth)
      const offset = params?.offset ?? 0
      return runAction(async () => {
        const expenses = await financeService.getExpenses(requestParams)
        if (!isCurrent(token)) return
        const current = get().expenses
        set({ expenses: offset > 0
          ? [...current, ...expenses.filter((item) => !current.some(({ id }) => id === item.id))]
          : expenses })
      }, () => isCurrent(token))
    },

    fetchSummary: (month) => {
      changeMonth(month)
      const token = nextToken('summary')
      return runAction(async () => {
        const summary = await financeService.getSummary(month)
        if (isCurrent(token)) set({ summary })
      }, () => isCurrent(token))
    },

    fetchBudget: (month) => {
      changeMonth(month)
      const token = nextToken('budget')
      return runAction(async () => {
        const budget = await financeService.getBudget(month)
        if (isCurrent(token)) set({ budget })
      }, () => isCurrent(token))
    },

    fetchSavingPlans: () => {
      const token = nextToken('savingPlans')
      return runAction(async () => {
        const savingPlans = await financeService.getSavingPlans()
        if (isCurrent(token)) set({ savingPlans })
      }, () => isCurrent(token))
    },

    setMonth: (month) => changeMonth(month),

    createExpense: (data) => {
      const month = get().selectedMonth
      const token = nextToken('expenses')
      return runAction(async () => {
        const expense = await financeService.createExpense(data)
        if (!isCurrent(token)) return
        set({ expenses: [expense, ...get().expenses.filter(({ id }) => id !== expense.id)] })
        await refreshExpensesAndSummary(month)
      }, () => isCurrent(token))
    },

    updateExpense: (id, data) => {
      const month = get().selectedMonth
      const token = nextToken('expenses')
      return runAction(async () => {
        const expense = await financeService.updateExpense(id, data)
        if (!isCurrent(token)) return
        const expenses = get().expenses
        set({ expenses: expenses.some((item) => item.id === id)
          ? expenses.map((item) => item.id === id ? expense : item)
          : [expense, ...expenses.filter(({ id: itemId }) => itemId !== expense.id)] })
        await refreshExpensesAndSummary(month)
      }, () => isCurrent(token))
    },

    deleteExpense: (id) => {
      const month = get().selectedMonth
      const token = nextToken('expenses')
      return runAction(async () => {
        await financeService.deleteExpense(id)
        if (!isCurrent(token)) return
        set({ expenses: get().expenses.filter((expense) => expense.id !== id) })
        await refreshExpensesAndSummary(month)
      }, () => isCurrent(token))
    },

    upsertBudget: (data) => {
      changeMonth(data.month)
      const month = data.month
      const token = nextToken('budget')
      return runAction(async () => {
        const budget = await financeService.upsertBudget(data)
        if (!isCurrent(token)) return
        set({ budget })
        await refreshBudgetAndSummary(month)
      }, () => isCurrent(token))
    },

    createSavingPlan: (data) => {
      const token = nextToken('savingPlans')
      return runAction(async () => {
        const savingPlan = await financeService.createSavingPlan(data)
        if (!isCurrent(token)) return
        set({ savingPlans: [savingPlan, ...get().savingPlans.filter(({ id }) => id !== savingPlan.id)] })
        await refreshSavingPlans()
      }, () => isCurrent(token))
    },

    updateSavingPlan: (id, data) => {
      const token = nextToken('savingPlans')
      return runAction(async () => {
        const savingPlan = await financeService.updateSavingPlan(id, data)
        if (!isCurrent(token)) return
        const savingPlans = get().savingPlans
        set({ savingPlans: savingPlans.some((item) => item.id === id)
          ? savingPlans.map((item) => item.id === id ? savingPlan : item)
          : [savingPlan, ...savingPlans.filter(({ id: itemId }) => itemId !== savingPlan.id)] })
        await refreshSavingPlans()
      }, () => isCurrent(token))
    },

    deleteSavingPlan: (id) => {
      const token = nextToken('savingPlans')
      return runAction(async () => {
        await financeService.deleteSavingPlan(id)
        if (!isCurrent(token)) return
        set({ savingPlans: get().savingPlans.filter((plan) => plan.id !== id) })
        await refreshSavingPlans()
      }, () => isCurrent(token))
    },

    clearError: () => set({ error: null }),

    reset: () => {
      generation += 1
      monthVersion += 1
      activeActions = 0
      resources.forEach((resource) => { versions[resource] = 0 })
      set(initialFinanceState)
    },
  }
})
