import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PaidStatus, TaskStatus, WeddingTaskCategory } from '@xiaowoniu/shared'
import { weddingService } from '@/services/wedding.service'
import { initialWeddingState, useWeddingStore } from './wedding.store'

vi.mock('@/services/wedding.service', () => ({
  weddingService: {
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    getExpenses: vi.fn(),
    createExpense: vi.fn(),
    updateExpense: vi.fn(),
    deleteExpense: vi.fn(),
    getBudget: vi.fn(),
    upsertBudget: vi.fn(),
    getOverview: vi.fn(),
    getTimeline: vi.fn(),
  },
}))

const service = vi.mocked(weddingService)

const task = {
  id: 'task-1', userId: 'user-1', taskName: '确认婚礼场地', category: WeddingTaskCategory.VENUE,
  plannedDate: '2026-10-01', completedDate: null, status: TaskStatus.PENDING, priority: 3,
  notes: null, createdAt: 'created', updatedAt: 'updated',
}
const task2 = {
  ...task, id: 'task-2', taskName: '拍婚纱照', category: WeddingTaskCategory.PHOTO,
}
const expense = {
  id: 'expense-1', userId: 'user-1', taskId: 'task-1', task: { id: 'task-1', taskName: '确认婚礼场地' },
  date: '2026-08-04', itemName: '场地定金', category: WeddingTaskCategory.VENUE,
  plannedAmount: 20000, actualAmount: 18000, paidStatus: PaidStatus.PARTIAL,
  notes: null, createdAt: 'created', updatedAt: 'updated',
}
const expense2 = { ...expense, id: 'expense-2', itemName: '婚纱照定金' }
const budget = {
  id: 'budget-1', totalBudget: 150000, weddingDate: '2026-12-01',
  createdAt: 'created', updatedAt: 'updated',
}
const overview = {
  budget, plannedExpenseTotal: 20000, actualExpenseTotal: 18000, expenseCount: 1,
  remainingBudget: 132000, budgetUsedPercentage: 12, plannedBudgetPercentage: 13.33,
  actualVsPlannedPercentage: 90, daysUntilWedding: 119,
  taskCounts: { pending: 1, inProgress: 0, completed: 0, cancelled: 0, activeTotal: 1, completionPercentage: 0 },
  categoryBreakdown: [],
}
const timeline = {
  weddingDate: '2026-12-01', daysUntilWedding: 119,
  items: [{ taskId: 'task-1', taskName: '确认婚礼场地', category: WeddingTaskCategory.VENUE, status: TaskStatus.PENDING, priority: 3, plannedDate: '2026-10-01', completedDate: null, isOverdue: false }],
}

const setDefaultResponses = () => {
  service.getTasks.mockResolvedValue([task])
  service.getExpenses.mockResolvedValue([expense])
  service.getBudget.mockResolvedValue(budget)
  service.getOverview.mockResolvedValue(overview)
  service.getTimeline.mockResolvedValue(timeline)
}

describe('useWeddingStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useWeddingStore.getState().reset()
    setDefaultResponses()
  })

  it('starts with empty data, null stats, and pagination flags', () => {
    expect(useWeddingStore.getState()).toMatchObject(initialWeddingState)
    expect(useWeddingStore.getState().tasksHasMore).toBe(true)
    expect(useWeddingStore.getState().expensesHasMore).toBe(true)
  })

  it('fetches dashboard resources concurrently with first-page limits', async () => {
    await useWeddingStore.getState().fetchDashboard()

    expect(service.getTasks).toHaveBeenCalledWith({ limit: 50, offset: 0 })
    expect(service.getExpenses).toHaveBeenCalledWith({ limit: 50, offset: 0 })
    expect(service.getBudget).toHaveBeenCalledOnce()
    expect(service.getOverview).toHaveBeenCalledOnce()
    expect(service.getTimeline).toHaveBeenCalledOnce()
    expect(useWeddingStore.getState()).toMatchObject({
      tasks: [task], expenses: [expense], budget, overview, timeline,
      loading: false, error: null,
    })
  })

  it('replaces the first task page and appends later pages without duplicates', async () => {
    await useWeddingStore.getState().fetchTasks({ limit: 1, offset: 0 })
    service.getTasks.mockResolvedValue([task2])
    await useWeddingStore.getState().fetchTasks({ limit: 1, offset: 1 })

    expect(useWeddingStore.getState().tasks).toEqual([task, task2])
  })

  it('updates hasMore based on page size', async () => {
    service.getTasks.mockResolvedValue([task, task2])
    await useWeddingStore.getState().fetchTasks({ limit: 2, offset: 0 })
    expect(useWeddingStore.getState().tasksHasMore).toBe(true)

    service.getTasks.mockResolvedValue([task])
    await useWeddingStore.getState().fetchTasks({ limit: 2, offset: 2 })
    expect(useWeddingStore.getState().tasksHasMore).toBe(false)

    service.getExpenses.mockResolvedValue([expense])
    await useWeddingStore.getState().fetchExpenses({ limit: 2, offset: 0 })
    expect(useWeddingStore.getState().expensesHasMore).toBe(false)
  })

  it('refreshes tasks, expenses, overview and timeline after a task mutation', async () => {
    const created = { ...task2, taskName: '拍婚纱照' }
    service.createTask.mockResolvedValue(created)
    service.getTasks.mockResolvedValue([created, task])
    await useWeddingStore.getState().createTask({
      taskName: '拍婚纱照', category: WeddingTaskCategory.PHOTO,
    })

    expect(service.getTasks).toHaveBeenCalled()
    expect(service.getExpenses).toHaveBeenCalled()
    expect(service.getOverview).toHaveBeenCalled()
    expect(service.getTimeline).toHaveBeenCalled()
    expect(useWeddingStore.getState().tasks.some(({ id }) => id === 'task-2')).toBe(true)
  })

  it('keeps a task mutation and refresh failure message when refresh fails', async () => {
    const created = { ...task2 }
    service.createTask.mockResolvedValue(created)
    service.getTasks.mockRejectedValue(new Error('refresh failed'))

    await expect(useWeddingStore.getState().createTask({
      taskName: '拍婚纱照', category: WeddingTaskCategory.PHOTO,
    })).resolves.toBeUndefined()
    expect(useWeddingStore.getState()).toMatchObject({
      tasks: [created], error: '操作已成功，但数据刷新失败', loading: false,
    })
  })

  it('removes a deleted task and refreshes linked expenses after SetNull', async () => {
    service.deleteTask.mockResolvedValue(null)
    service.getTasks.mockResolvedValue([])
    service.getExpenses.mockResolvedValue([{ ...expense, taskId: null, task: null }])
    await useWeddingStore.getState().deleteTask('task-1')

    expect(useWeddingStore.getState().tasks).toEqual([])
    expect(useWeddingStore.getState().expenses[0]).toMatchObject({ taskId: null, task: null })
  })

  it('refreshes expenses and overview but not timeline after an expense mutation', async () => {
    service.createExpense.mockResolvedValue(expense2)
    service.getExpenses.mockResolvedValue([expense2, expense])
    await useWeddingStore.getState().createExpense({
      date: '2026-08-04', itemName: '婚纱照定金', category: WeddingTaskCategory.PHOTO,
      plannedAmount: 5000, actualAmount: 5000, paidStatus: PaidStatus.PAID,
    })

    expect(service.getExpenses).toHaveBeenCalled()
    expect(service.getOverview).toHaveBeenCalled()
    expect(service.getTimeline).not.toHaveBeenCalled()
  })

  it('refreshes budget, overview and timeline after budget upsert', async () => {
    const updated = { ...budget, totalBudget: 200000 }
    service.upsertBudget.mockResolvedValue(updated)
    service.getBudget.mockResolvedValue(updated)
    service.getOverview.mockResolvedValue({ ...overview, budget: updated, remainingBudget: 182000 })
    await useWeddingStore.getState().upsertBudget({ totalBudget: 200000, weddingDate: '2026-12-01' })

    expect(service.getBudget).toHaveBeenCalledOnce()
    expect(service.getOverview).toHaveBeenCalled()
    expect(service.getTimeline).toHaveBeenCalled()
    expect(useWeddingStore.getState()).toMatchObject({ budget: updated })
  })

  it('ignores an older pagination response after a newer page replaced it', async () => {
    let resolveOld!: (value: typeof task[]) => void
    service.getTasks
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
      .mockResolvedValueOnce([task2])

    const oldPage = useWeddingStore.getState().fetchTasks({ limit: 1, offset: 0 })
    const newPage = useWeddingStore.getState().fetchTasks({ limit: 1, offset: 0 })
    await newPage
    resolveOld([task])
    await oldPage

    expect(useWeddingStore.getState().tasks).toEqual([task2])
  })

  it('reset prevents an in-flight request from writing back', async () => {
    let resolve!: (value: typeof task[]) => void
    service.getTasks.mockImplementation(() => new Promise((innerResolve) => { resolve = innerResolve }))

    const pending = useWeddingStore.getState().fetchTasks({ limit: 50, offset: 0 })
    useWeddingStore.getState().reset()
    resolve([task])
    await pending

    expect(useWeddingStore.getState()).toMatchObject(initialWeddingState)
  })

  it('keeps loading true until concurrent actions finish', async () => {
    let resolveTasks!: (value: typeof task[]) => void
    let resolveExpenses!: (value: typeof expense[]) => void
    service.getTasks.mockImplementation(() => new Promise((resolve) => { resolveTasks = resolve }))
    service.getExpenses.mockImplementation(() => new Promise((resolve) => { resolveExpenses = resolve }))

    const tasksRequest = useWeddingStore.getState().fetchTasks()
    const expensesRequest = useWeddingStore.getState().fetchExpenses()
    resolveTasks([task])
    await tasksRequest
    expect(useWeddingStore.getState().loading).toBe(true)
    resolveExpenses([expense])
    await expensesRequest
    expect(useWeddingStore.getState().loading).toBe(false)
  })

  it('extracts Chinese API error messages and rethrows for forms', async () => {
    const failure = { response: { data: { error: { message: '任务名称无效' } } } }
    service.createTask.mockRejectedValue(failure)

    await expect(useWeddingStore.getState().createTask({
      taskName: 'x', category: WeddingTaskCategory.VENUE,
    })).rejects.toBe(failure)
    expect(useWeddingStore.getState()).toMatchObject({ error: '任务名称无效', loading: false })
  })
})
