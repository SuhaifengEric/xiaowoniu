import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PaidStatus, TaskStatus, WeddingTaskCategory } from '@xiaowoniu/shared'
import { weddingService } from './wedding.service'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('./api', () => ({ default: apiMocks }))

const task = {
  id: 'task-1',
  userId: 'user-1',
  taskName: '确认婚礼场地',
  category: WeddingTaskCategory.VENUE,
  plannedDate: '2026-10-01',
  completedDate: null,
  status: TaskStatus.PENDING,
  priority: 3,
  notes: null,
  createdAt: '2026-08-04T01:00:00.000Z',
  updatedAt: '2026-08-04T01:00:00.000Z',
}

const expense = {
  id: 'expense-1',
  userId: 'user-1',
  taskId: 'task-1',
  task: { id: 'task-1', taskName: '确认婚礼场地' },
  date: '2026-08-04',
  itemName: '场地定金',
  category: WeddingTaskCategory.VENUE,
  plannedAmount: 20000,
  actualAmount: 18000,
  paidStatus: PaidStatus.PARTIAL,
  notes: null,
  createdAt: '2026-08-04T01:00:00.000Z',
  updatedAt: '2026-08-04T01:00:00.000Z',
}

const budget = {
  id: 'budget-1',
  totalBudget: 150000,
  weddingDate: '2026-12-01',
  createdAt: '2026-08-04T01:00:00.000Z',
  updatedAt: '2026-08-04T01:00:00.000Z',
}

const overview = {
  budget,
  plannedExpenseTotal: 20000,
  actualExpenseTotal: 18000,
  expenseCount: 1,
  remainingBudget: 132000,
  budgetUsedPercentage: 12,
  plannedBudgetPercentage: 13.33,
  actualVsPlannedPercentage: 90,
  daysUntilWedding: 119,
  taskCounts: { pending: 1, inProgress: 0, completed: 0, cancelled: 0, activeTotal: 1, completionPercentage: 0 },
  categoryBreakdown: [],
}

const timeline = {
  weddingDate: '2026-12-01',
  daysUntilWedding: 119,
  items: [{
    taskId: 'task-1', taskName: '确认婚礼场地', category: WeddingTaskCategory.VENUE,
    status: TaskStatus.PENDING, priority: 3, plannedDate: '2026-10-01', completedDate: null, isOverdue: false,
  }],
}

describe('weddingService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gets tasks with filters and pagination and unwraps data', async () => {
    const params = {
      status: TaskStatus.PENDING,
      category: WeddingTaskCategory.VENUE,
      limit: 50,
      offset: 0,
    }
    apiMocks.get.mockResolvedValue({ data: { success: true, data: [task] } })

    await expect(weddingService.getTasks(params)).resolves.toEqual([task])
    expect(apiMocks.get).toHaveBeenCalledWith('/api/wedding/tasks', { params })
  })

  it('creates, updates and deletes tasks with the expected contract', async () => {
    const createRequest = {
      taskName: '确认婚礼场地',
      category: WeddingTaskCategory.VENUE,
      plannedDate: '2026-10-01',
      status: TaskStatus.PENDING,
      priority: 5,
      notes: '确认档期',
    }
    const updateRequest = { status: TaskStatus.COMPLETED, plannedDate: null }
    apiMocks.post.mockResolvedValue({ data: { success: true, data: task } })
    apiMocks.patch.mockResolvedValue({ data: { success: true, data: task } })
    apiMocks.delete.mockResolvedValue({ data: { success: true, data: null } })

    await expect(weddingService.createTask(createRequest)).resolves.toEqual(task)
    await expect(weddingService.updateTask('task-1', updateRequest)).resolves.toEqual(task)
    await expect(weddingService.deleteTask('task-1')).resolves.toBeNull()

    expect(apiMocks.post).toHaveBeenCalledWith('/api/wedding/tasks', createRequest)
    expect(apiMocks.patch).toHaveBeenCalledWith('/api/wedding/tasks/task-1', updateRequest)
    expect(apiMocks.delete).toHaveBeenCalledWith('/api/wedding/tasks/task-1')
  })

  it('gets expenses with filters and unwraps data', async () => {
    const params = {
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      category: WeddingTaskCategory.VENUE,
      paidStatus: PaidStatus.PARTIAL,
      limit: 10,
      offset: 0,
    }
    apiMocks.get.mockResolvedValue({ data: { success: true, data: [expense] } })

    await expect(weddingService.getExpenses(params)).resolves.toEqual([expense])
    expect(apiMocks.get).toHaveBeenCalledWith('/api/wedding/expenses', { params })
  })

  it('creates, updates and deletes expenses with the expected contract', async () => {
    const createRequest = {
      taskId: 'task-1',
      date: '2026-08-04',
      itemName: '场地定金',
      category: WeddingTaskCategory.VENUE,
      plannedAmount: 20000,
      actualAmount: 18000,
      paidStatus: PaidStatus.PARTIAL,
    }
    const updateRequest = { taskId: null, actualAmount: 18500 }
    apiMocks.post.mockResolvedValue({ data: { success: true, data: expense } })
    apiMocks.patch.mockResolvedValue({ data: { success: true, data: expense } })
    apiMocks.delete.mockResolvedValue({ data: { success: true, data: null } })

    await expect(weddingService.createExpense(createRequest)).resolves.toEqual(expense)
    await expect(weddingService.updateExpense('expense-1', updateRequest)).resolves.toEqual(expense)
    await expect(weddingService.deleteExpense('expense-1')).resolves.toBeNull()

    expect(apiMocks.post).toHaveBeenCalledWith('/api/wedding/expenses', createRequest)
    expect(apiMocks.patch).toHaveBeenCalledWith('/api/wedding/expenses/expense-1', updateRequest)
    expect(apiMocks.delete).toHaveBeenCalledWith('/api/wedding/expenses/expense-1')
  })

  it('uses GET/PUT for the singleton budget and preserves null data', async () => {
    const budgetRequest = { totalBudget: 150000, weddingDate: '2026-12-01' }
    apiMocks.get
      .mockResolvedValueOnce({ data: { success: true, data: null } })
      .mockResolvedValueOnce({ data: { success: true, data: budget } })
    apiMocks.put.mockResolvedValue({ data: { success: true, data: budget } })

    await expect(weddingService.getBudget()).resolves.toBeNull()
    await expect(weddingService.getBudget()).resolves.toEqual(budget)
    await expect(weddingService.upsertBudget(budgetRequest)).resolves.toEqual(budget)

    expect(apiMocks.get).toHaveBeenNthCalledWith(1, '/api/wedding/budget')
    expect(apiMocks.get).toHaveBeenNthCalledWith(2, '/api/wedding/budget')
    expect(apiMocks.put).toHaveBeenCalledWith('/api/wedding/budget', budgetRequest)
  })

  it('gets overview and timeline with exact paths and unwrapped data', async () => {
    apiMocks.get
      .mockResolvedValueOnce({ data: { success: true, data: overview } })
      .mockResolvedValueOnce({ data: { success: true, data: timeline } })

    await expect(weddingService.getOverview()).resolves.toEqual(overview)
    await expect(weddingService.getTimeline()).resolves.toEqual(timeline)

    expect(apiMocks.get).toHaveBeenNthCalledWith(1, '/api/wedding/overview')
    expect(apiMocks.get).toHaveBeenNthCalledWith(2, '/api/wedding/timeline')
  })

  it('does not swallow Axios errors', async () => {
    apiMocks.get.mockRejectedValue(new Error('network down'))
    await expect(weddingService.getTasks()).rejects.toThrow('network down')
  })
})
