import { create } from 'zustand'
import type {
  ApiErrorResponse,
  AgreementTopicResponse,
  CreateWeddingExpenseRequest,
  CreateWeddingTaskRequest,
  CreateAgreementTopicRequest,
  MarriageNodeHistoryResponse,
  MarriageNodeKey,
  MarriageNodeResponse,
  MarriageProcessResponse,
  UpdateWeddingExpenseRequest,
  UpdateWeddingTaskRequest,
  UpdateAgreementTopicRequest,
  UpdateMarriageNodeRequest,
  UpdateMarriageSettingsRequest,
  UpsertWeddingBudgetRequest,
  PutMarriageProcessRequest,
  WeddingBudgetResponse,
  WeddingExpenseQueryParams,
  WeddingExpenseResponse,
  WeddingOverviewResponse,
  WeddingTaskQueryParams,
  WeddingTaskResponse,
  WeddingTimelineResponse,
} from '@xiaowoniu/shared'
import { weddingService } from '@/services/wedding.service'

interface WeddingDataState {
  process: MarriageProcessResponse | null
  nodes: MarriageNodeResponse[]
  agreements: AgreementTopicResponse[]
  nodeHistory: Record<string, MarriageNodeHistoryResponse[]>
  tasks: WeddingTaskResponse[]
  expenses: WeddingExpenseResponse[]
  budget: WeddingBudgetResponse | null
  overview: WeddingOverviewResponse | null
  timeline: WeddingTimelineResponse | null
  tasksHasMore: boolean
  expensesHasMore: boolean
  loading: boolean
  error: string | null
}

interface WeddingActions {
  fetchDashboard: () => Promise<void>
  fetchProcess: () => Promise<void>
  createProcess: (data: PutMarriageProcessRequest) => Promise<void>
  updateProcessSettings: (data: UpdateMarriageSettingsRequest) => Promise<void>
  updateNode: (nodeKey: MarriageNodeKey, data: UpdateMarriageNodeRequest) => Promise<void>
  fetchNodeHistory: (nodeKey: MarriageNodeKey) => Promise<void>
  createAgreement: (data: CreateAgreementTopicRequest) => Promise<void>
  updateAgreement: (id: string, data: UpdateAgreementTopicRequest) => Promise<void>
  archiveAgreement: (id: string) => Promise<void>
  fetchTasks: (params?: WeddingTaskQueryParams) => Promise<void>
  fetchExpenses: (params?: WeddingExpenseQueryParams) => Promise<void>
  createTask: (data: CreateWeddingTaskRequest) => Promise<void>
  updateTask: (id: string, data: UpdateWeddingTaskRequest) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  createExpense: (data: CreateWeddingExpenseRequest) => Promise<void>
  updateExpense: (id: string, data: UpdateWeddingExpenseRequest) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  upsertBudget: (data: UpsertWeddingBudgetRequest) => Promise<void>
  clearError: () => void
  reset: () => void
}

export type WeddingState = WeddingDataState & WeddingActions

export const initialWeddingState: WeddingDataState = {
  process: null,
  nodes: [],
  agreements: [],
  nodeHistory: {},
  tasks: [],
  expenses: [],
  budget: null,
  overview: null,
  timeline: null,
  tasksHasMore: true,
  expensesHasMore: true,
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
  return value instanceof Error ? value.message : '备婚数据操作失败'
}

const refreshFailureMessage = '操作已成功，但数据刷新失败'
type Resource = 'process' | 'nodes' | 'agreements' | 'tasks' | 'expenses' | 'budget' | 'overview' | 'timeline'
type RequestToken = { generation: number; version: number; resource: Resource }
const resources: Resource[] = ['process', 'nodes', 'agreements', 'tasks', 'expenses', 'budget', 'overview', 'timeline']

const firstPage = { limit: 50, offset: 0 }

export const useWeddingStore = create<WeddingState>((set, get) => {
  let generation = 0
  let activeActions = 0
  const versions: Record<Resource, number> = {
    process: 0,
    nodes: 0,
    agreements: 0,
    tasks: 0,
    expenses: 0,
    budget: 0,
    overview: 0,
    timeline: 0,
  }

  const nextToken = (resource: Resource): RequestToken => ({
    generation,
    resource,
    version: ++versions[resource],
  })

  const isCurrent = (token: RequestToken): boolean =>
    token.generation === generation && token.version === versions[token.resource]

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

  const refreshTasks = async (): Promise<void> => {
    const token = nextToken('tasks')
    await refresh([{
      token,
      request: weddingService.getTasks(firstPage),
      apply: (value) => set({ tasks: value as WeddingTaskResponse[], tasksHasMore: (value as WeddingTaskResponse[]).length >= firstPage.limit }),
    }])
  }

  const refreshProcess = async (): Promise<void> => {
    const processToken = nextToken('process')
    const process = await weddingService.getProcess()
    const agreements = process ? await weddingService.getAgreements() : []
    if (isCurrent(processToken)) set({ process, nodes: process?.nodes ?? [], agreements: agreements ?? [] })
  }

  const refreshExpenses = async (): Promise<void> => {
    const token = nextToken('expenses')
    await refresh([{
      token,
      request: weddingService.getExpenses(firstPage),
      apply: (value) => set({ expenses: value as WeddingExpenseResponse[], expensesHasMore: (value as WeddingExpenseResponse[]).length >= firstPage.limit }),
    }])
  }

  const refreshOverview = async (): Promise<void> => {
    const token = nextToken('overview')
    await refresh([{
      token,
      request: weddingService.getOverview(),
      apply: (value) => set({ overview: value as WeddingOverviewResponse }),
    }])
  }

  const refreshBudget = async (): Promise<void> => {
    const token = nextToken('budget')
    await refresh([{
      token,
      request: weddingService.getBudget(),
      apply: (value) => set({ budget: value as WeddingBudgetResponse | null }),
    }])
  }

  const refreshTimeline = async (): Promise<void> => {
    const token = nextToken('timeline')
    await refresh([{
      token,
      request: weddingService.getTimeline(),
      apply: (value) => set({ timeline: value as WeddingTimelineResponse }),
    }])
  }

  const refreshAfterTaskMutation = async (): Promise<void> => {
    await Promise.all([
      refreshProcess(),
      refreshTasks(),
      refreshExpenses(),
      refreshOverview(),
      refreshTimeline(),
    ])
  }

  const refreshAfterExpenseMutation = async (): Promise<void> => {
    await Promise.all([
      refreshExpenses(),
      refreshOverview(),
    ])
  }

  const refreshAfterBudgetMutation = async (): Promise<void> => {
    await Promise.all([
      refreshBudget(),
      refreshOverview(),
      refreshTimeline(),
      refreshProcess(),
    ])
  }

  const refreshAfterProcessMutation = async (): Promise<void> => {
    await Promise.all([
      refreshTasks(),
      refreshExpenses(),
      refreshOverview(),
      refreshTimeline(),
    ])
  }

  return {
    ...initialWeddingState,

    fetchDashboard: () => {
      const processToken = nextToken('process')
      const tasksToken = nextToken('tasks')
      const expensesToken = nextToken('expenses')
      const budgetToken = nextToken('budget')
      const overviewToken = nextToken('overview')
      const timelineToken = nextToken('timeline')
      return runAction(async () => {
        const process = await weddingService.getProcess()
        const [tasks, expenses, budget, overview, timeline] = await Promise.all([
          weddingService.getTasks(firstPage),
          weddingService.getExpenses(firstPage),
          weddingService.getBudget(),
          weddingService.getOverview(),
          weddingService.getTimeline(),
        ])
        if (isCurrent(processToken)) set({ process, nodes: process?.nodes ?? [], agreements: process?.agreements ?? [] })
        if (isCurrent(tasksToken)) set({ tasks, tasksHasMore: tasks.length >= firstPage.limit })
        if (isCurrent(expensesToken)) set({ expenses, expensesHasMore: expenses.length >= firstPage.limit })
        if (isCurrent(budgetToken)) set({ budget })
        if (isCurrent(overviewToken)) set({ overview })
        if (isCurrent(timelineToken)) set({ timeline })
      }, () => [tasksToken, expensesToken, budgetToken, overviewToken, timelineToken].every(isCurrent))
    },

    fetchProcess: () => runAction(async () => {
      const process = await weddingService.getProcess()
      const agreements = process ? process.agreements : await weddingService.getAgreements().catch(() => [])
      set({ process, nodes: process?.nodes ?? [], agreements })
    }),

    createProcess: (data) => runAction(async () => {
      const process = await weddingService.createProcess(data)
      set({ process, nodes: process.nodes, agreements: process.agreements })
      await refreshAfterProcessMutation()
    }),

    updateProcessSettings: (data) => runAction(async () => {
      const process = await weddingService.updateProcessSettings(data)
      set({ process, nodes: process.nodes, agreements: process.agreements })
      await Promise.all([refreshOverview(), refreshTimeline()])
    }),

    updateNode: (nodeKey, data) => runAction(async () => {
      await weddingService.updateNode(nodeKey, data)
      await refreshProcess()
      await Promise.all([refreshOverview(), refreshTimeline(), refreshTasks(), refreshBudget()])
    }),

    fetchNodeHistory: (nodeKey) => runAction(async () => {
      const history = await weddingService.getNodeHistory(nodeKey)
      set({ nodeHistory: { ...get().nodeHistory, [nodeKey]: history } })
    }),

    createAgreement: (data) => runAction(async () => {
      await weddingService.createAgreement(data)
      await refreshProcess()
      await refreshOverview()
    }),

    updateAgreement: (id, data) => runAction(async () => {
      await weddingService.updateAgreement(id, data)
      await refreshProcess()
      await refreshOverview()
    }),

    archiveAgreement: (id) => runAction(async () => {
      await weddingService.archiveAgreement(id)
      await refreshProcess()
      await refreshOverview()
    }),

    fetchTasks: (params) => {
      const token = nextToken('tasks')
      const requestParams = params ?? firstPage
      const offset = params?.offset ?? 0
      const limit = params?.limit ?? firstPage.limit
      return runAction(async () => {
        const tasks = await weddingService.getTasks(requestParams)
        if (!isCurrent(token)) return
        const current = get().tasks
        set({
          tasks: offset > 0
            ? [...current, ...tasks.filter((item) => !current.some(({ id }) => id === item.id))]
            : tasks,
          tasksHasMore: tasks.length >= limit,
        })
      }, () => isCurrent(token))
    },

    fetchExpenses: (params) => {
      const token = nextToken('expenses')
      const requestParams = params ?? firstPage
      const offset = params?.offset ?? 0
      const limit = params?.limit ?? firstPage.limit
      return runAction(async () => {
        const expenses = await weddingService.getExpenses(requestParams)
        if (!isCurrent(token)) return
        const current = get().expenses
        set({
          expenses: offset > 0
            ? [...current, ...expenses.filter((item) => !current.some(({ id }) => id === item.id))]
            : expenses,
          expensesHasMore: expenses.length >= limit,
        })
      }, () => isCurrent(token))
    },

    createTask: (data) => {
      const token = nextToken('tasks')
      return runAction(async () => {
        const task = await weddingService.createTask(data)
        if (!isCurrent(token)) return
        set({ tasks: [task, ...get().tasks.filter(({ id }) => id !== task.id)] })
        await refreshAfterTaskMutation()
      }, () => isCurrent(token))
    },

    updateTask: (id, data) => {
      const token = nextToken('tasks')
      return runAction(async () => {
        const task = await weddingService.updateTask(id, data)
        if (!isCurrent(token)) return
        const tasks = get().tasks
        set({ tasks: tasks.some((item) => item.id === id)
          ? tasks.map((item) => item.id === id ? task : item)
          : [task, ...tasks.filter(({ id: itemId }) => itemId !== task.id)] })
        await refreshAfterTaskMutation()
      }, () => isCurrent(token))
    },

    deleteTask: (id) => {
      const token = nextToken('tasks')
      return runAction(async () => {
        await weddingService.deleteTask(id)
        if (!isCurrent(token)) return
        set({ tasks: get().tasks.filter((task) => task.id !== id) })
        await refreshAfterTaskMutation()
      }, () => isCurrent(token))
    },

    createExpense: (data) => {
      const token = nextToken('expenses')
      return runAction(async () => {
        const expense = await weddingService.createExpense(data)
        if (!isCurrent(token)) return
        set({ expenses: [expense, ...get().expenses.filter(({ id }) => id !== expense.id)] })
        await refreshAfterExpenseMutation()
      }, () => isCurrent(token))
    },

    updateExpense: (id, data) => {
      const token = nextToken('expenses')
      return runAction(async () => {
        const expense = await weddingService.updateExpense(id, data)
        if (!isCurrent(token)) return
        const expenses = get().expenses
        set({ expenses: expenses.some((item) => item.id === id)
          ? expenses.map((item) => item.id === id ? expense : item)
          : [expense, ...expenses.filter(({ id: itemId }) => itemId !== expense.id)] })
        await refreshAfterExpenseMutation()
      }, () => isCurrent(token))
    },

    deleteExpense: (id) => {
      const token = nextToken('expenses')
      return runAction(async () => {
        await weddingService.deleteExpense(id)
        if (!isCurrent(token)) return
        set({ expenses: get().expenses.filter((expense) => expense.id !== id) })
        await refreshAfterExpenseMutation()
      }, () => isCurrent(token))
    },

    upsertBudget: (data) => {
      const token = nextToken('budget')
      return runAction(async () => {
        const budget = await weddingService.upsertBudget(data)
        if (!isCurrent(token)) return
        set({ budget })
        await refreshAfterBudgetMutation()
      }, () => isCurrent(token))
    },

    clearError: () => set({ error: null }),

    reset: () => {
      generation += 1
      activeActions = 0
      resources.forEach((resource) => { versions[resource] = 0 })
      set(initialWeddingState)
    },
  }
})
