import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'
import { PaidStatus, TaskStatus, WeddingTaskCategory } from '@xiaowoniu/shared'

const prisma = vi.hoisted(() => ({
  weddingTask: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
  weddingExpense: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  weddingBudget: { findUnique: vi.fn(), upsert: vi.fn() },
}))

vi.mock('../config/database', () => ({ default: prisma }))

import weddingService, { WeddingNotFoundError } from '../services/wedding.service'

const decimal = (value: string | number) => new Prisma.Decimal(value)
const createdAt = new Date('2026-08-04T08:00:00.000Z')
const updatedAt = new Date('2026-08-04T09:00:00.000Z')
const today = new Date('2026-08-04T00:00:00.000Z')

const task = {
  id: 't1', userId: 'u1', taskName: '确认婚礼场地', category: WeddingTaskCategory.VENUE,
  plannedDate: new Date('2026-10-01T00:00:00.000Z'), completedDate: null,
  status: TaskStatus.PENDING, priority: 3, notes: null, createdAt, updatedAt,
}

const expense = {
  id: 'e1', userId: 'u1', taskId: 't1',
  task: { id: 't1', taskName: '确认婚礼场地' },
  date: new Date('2026-08-04T00:00:00.000Z'), itemName: '场地定金',
  category: WeddingTaskCategory.VENUE, plannedAmount: decimal('20000'), actualAmount: decimal('18000'),
  paidStatus: PaidStatus.PARTIAL, notes: null, createdAt, updatedAt,
}

const budget = {
  id: 'b1', userId: 'u1', totalBudget: decimal('150000'),
  weddingDate: new Date('2026-12-01T00:00:00.000Z'), createdAt, updatedAt,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(today)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('wedding tasks', () => {
  it('queries tasks with userId, filters, pagination, and stable ordering with null plannedDate last', async () => {
    prisma.weddingTask.findMany.mockResolvedValue([task])
    const result = await weddingService.getTasks('u1', {
      status: TaskStatus.PENDING, category: WeddingTaskCategory.VENUE, limit: '50', offset: '0',
    } as any)
    expect(prisma.weddingTask.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1', status: TaskStatus.PENDING, category: WeddingTaskCategory.VENUE },
      orderBy: [{ priority: 'desc' }, { plannedDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      take: 50, skip: 0,
    })
    expect(result[0].taskName).toBe('确认婚礼场地')
  })

  it('creates a task with default pending status and priority 3', async () => {
    prisma.weddingTask.create.mockResolvedValue({ ...task, plannedDate: null })
    await weddingService.createTask('u1', { taskName: ' 拍婚纱照 ', category: WeddingTaskCategory.PHOTO })
    expect(prisma.weddingTask.create).toHaveBeenCalledWith({ data: {
      userId: 'u1', taskName: '拍婚纱照', category: WeddingTaskCategory.PHOTO,
      plannedDate: null, status: TaskStatus.PENDING, priority: 3, notes: null,
    } })
  })

  it('sets completedDate to server UTC today when creating a completed task', async () => {
    prisma.weddingTask.create.mockResolvedValue({ ...task, status: TaskStatus.COMPLETED, completedDate: today })
    const result = await weddingService.createTask('u1', {
      taskName: '拍婚纱照', category: WeddingTaskCategory.PHOTO, status: TaskStatus.COMPLETED,
    })
    expect(prisma.weddingTask.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ completedDate: today }),
    }))
    expect(result.completedDate).toBe('2026-08-04')
  })

  it('writes completedDate on first completion, preserves on repeat, clears on leaving, rewrites on re-completion', async () => {
    const existing = { ...task, status: TaskStatus.PENDING, completedDate: null }
    prisma.weddingTask.findFirst.mockResolvedValue(existing)
    prisma.weddingTask.update.mockResolvedValue({ ...existing, status: TaskStatus.COMPLETED, completedDate: today })

    await weddingService.updateTask('u1', 't1', { status: TaskStatus.COMPLETED })
    expect(prisma.weddingTask.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: expect.objectContaining({ completedDate: today }) })

    const completedOn = new Date('2026-08-01T00:00:00.000Z')
    prisma.weddingTask.findFirst.mockResolvedValue({ ...existing, status: TaskStatus.COMPLETED, completedDate: completedOn })
    prisma.weddingTask.update.mockResolvedValue({ ...existing, status: TaskStatus.COMPLETED, completedDate: completedOn })
    await weddingService.updateTask('u1', 't1', { status: TaskStatus.COMPLETED })
    expect(prisma.weddingTask.update).toHaveBeenLastCalledWith({ where: { id: 't1' }, data: expect.objectContaining({ completedDate: completedOn }) })

    prisma.weddingTask.findFirst.mockResolvedValue({ ...existing, status: TaskStatus.COMPLETED, completedDate: completedOn })
    prisma.weddingTask.update.mockResolvedValue({ ...existing, status: TaskStatus.PENDING, completedDate: null })
    await weddingService.updateTask('u1', 't1', { status: TaskStatus.PENDING })
    expect(prisma.weddingTask.update).toHaveBeenLastCalledWith({ where: { id: 't1' }, data: expect.objectContaining({ completedDate: null }) })

    prisma.weddingTask.findFirst.mockResolvedValue({ ...existing, status: TaskStatus.PENDING, completedDate: null })
    prisma.weddingTask.update.mockResolvedValue({ ...existing, status: TaskStatus.COMPLETED, completedDate: today })
    await weddingService.updateTask('u1', 't1', { status: TaskStatus.COMPLETED })
    expect(prisma.weddingTask.update).toHaveBeenLastCalledWith({ where: { id: 't1' }, data: expect.objectContaining({ completedDate: today }) })
  })

  it('gates task update by userId and maps missing or foreign tasks to 404', async () => {
    prisma.weddingTask.findFirst.mockResolvedValue(null)
    await expect(weddingService.updateTask('u1', 'missing', { status: TaskStatus.COMPLETED })).rejects.toBeInstanceOf(WeddingNotFoundError)
    await expect(weddingService.updateTask('u1', 'foreign', { taskName: 'x' })).rejects.toBeInstanceOf(WeddingNotFoundError)
  })

  it('deletes tasks user-scoped and trims notes', async () => {
    prisma.weddingTask.deleteMany.mockResolvedValue({ count: 1 })
    await weddingService.deleteTask('u1', 't1')
    expect(prisma.weddingTask.deleteMany).toHaveBeenCalledWith({ where: { id: 't1', userId: 'u1' } })

    prisma.weddingTask.deleteMany.mockResolvedValue({ count: 0 })
    await expect(weddingService.deleteTask('u1', 't1')).rejects.toBeInstanceOf(WeddingNotFoundError)
  })
})

describe('wedding expenses', () => {
  it('queries expenses with userId, inclusive date bounds, filters, and task reference', async () => {
    prisma.weddingExpense.findMany.mockResolvedValue([expense])
    const result = await weddingService.getExpenses('u1', {
      startDate: '2026-08-01', endDate: '2026-08-31', category: WeddingTaskCategory.VENUE,
      paidStatus: PaidStatus.PARTIAL, limit: '10', offset: '0',
    } as any)
    expect(prisma.weddingExpense.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'u1',
        date: { gte: new Date('2026-08-01T00:00:00.000Z'), lte: new Date('2026-08-31T00:00:00.000Z') },
        category: WeddingTaskCategory.VENUE, paidStatus: PaidStatus.PARTIAL,
      },
      include: { task: { select: { id: true, taskName: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: 10, skip: 0,
    })
    expect(result[0]).toMatchObject({
      id: 'e1', taskId: 't1', task: { id: 't1', taskName: '确认婚礼场地' },
      date: '2026-08-04', plannedAmount: 20000, actualAmount: 18000,
    })
  })

  it('creates an expense with task relation gated by userId', async () => {
    prisma.weddingTask.findFirst.mockResolvedValue(task)
    prisma.weddingExpense.create.mockResolvedValue(expense)
    const result = await weddingService.createExpense('u1', {
      taskId: 't1', date: '2026-08-04', itemName: '场地定金',
      category: WeddingTaskCategory.VENUE, plannedAmount: 20000, actualAmount: 18000,
      paidStatus: PaidStatus.PARTIAL, notes: '   ',
    })
    expect(prisma.weddingTask.findFirst).toHaveBeenCalledWith({ where: { id: 't1', userId: 'u1' } })
    expect(prisma.weddingExpense.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1', taskId: 't1', date: new Date('2026-08-04T00:00:00.000Z'), itemName: '场地定金',
        category: WeddingTaskCategory.VENUE, plannedAmount: decimal('20000'), actualAmount: decimal('18000'),
        paidStatus: PaidStatus.PARTIAL, notes: null,
      },
      include: { task: { select: { id: true, taskName: true } } },
    })
    expect(result.taskId).toBe('t1')
  })

  it('rejects expense task relation to missing or foreign task with 404', async () => {
    prisma.weddingTask.findFirst.mockResolvedValue(null)
    await expect(weddingService.createExpense('u1', {
      taskId: 'missing', date: '2026-08-04', itemName: '定金',
      category: WeddingTaskCategory.VENUE, plannedAmount: 1, actualAmount: 1, paidStatus: PaidStatus.PAID,
    })).rejects.toBeInstanceOf(WeddingNotFoundError)
    await expect(weddingService.createExpense('u2', {
      taskId: 't1', date: '2026-08-04', itemName: '定金',
      category: WeddingTaskCategory.VENUE, plannedAmount: 1, actualAmount: 1, paidStatus: PaidStatus.PAID,
    })).rejects.toBeInstanceOf(WeddingNotFoundError)
  })

  it('unlinks task with taskId null and gates updates by userId', async () => {
    prisma.weddingExpense.findFirst.mockResolvedValue(expense)
    prisma.weddingExpense.update.mockResolvedValue({ ...expense, taskId: null, task: null })
    await weddingService.updateExpense('u1', 'e1', { taskId: null, notes: ' ' })
    expect(prisma.weddingExpense.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { taskId: null, notes: null },
      include: { task: { select: { id: true, taskName: true } } },
    })

    prisma.weddingExpense.findFirst.mockResolvedValue(null)
    await expect(weddingService.updateExpense('u1', 'missing', { itemName: 'x' })).rejects.toBeInstanceOf(WeddingNotFoundError)
  })

  it('maps P2003/P2025 race errors to wedding 404', async () => {
    prisma.weddingExpense.findFirst.mockResolvedValue(expense)
    const p2003 = Object.assign(new Error('fk'), { code: 'P2003' })
    prisma.weddingExpense.update.mockRejectedValueOnce(p2003)
    await expect(weddingService.updateExpense('u1', 'e1', { taskId: 'gone' })).rejects.toBeInstanceOf(WeddingNotFoundError)

    prisma.weddingExpense.findFirst.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'P2025' }))
    await expect(weddingService.updateExpense('u1', 'e1', { itemName: 'x' })).rejects.toBeInstanceOf(WeddingNotFoundError)
  })

  it('deletes expenses user-scoped', async () => {
    prisma.weddingExpense.deleteMany.mockResolvedValue({ count: 1 })
    await weddingService.deleteExpense('u1', 'e1')
    expect(prisma.weddingExpense.deleteMany).toHaveBeenCalledWith({ where: { id: 'e1', userId: 'u1' } })
  })
})

describe('wedding budget', () => {
  it('finds budget by userId and returns null when absent', async () => {
    prisma.weddingBudget.findUnique.mockResolvedValue(null)
    expect(await weddingService.getBudget('u1')).toBeNull()
    expect(prisma.weddingBudget.findUnique).toHaveBeenCalledWith({ where: { userId: 'u1' } })

    prisma.weddingBudget.findUnique.mockResolvedValue(budget)
    const result = await weddingService.getBudget('u1')
    expect(result).toMatchObject({ totalBudget: 150000, weddingDate: '2026-12-01' })
  })

  it('upserts budget by userId key', async () => {
    prisma.weddingBudget.upsert.mockResolvedValue(budget)
    await weddingService.upsertBudget('u1', { totalBudget: 150000, weddingDate: '2026-12-01' })
    expect(prisma.weddingBudget.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      create: { userId: 'u1', totalBudget: decimal('150000'), weddingDate: new Date('2026-12-01T00:00:00.000Z') },
      update: { totalBudget: decimal('150000'), weddingDate: new Date('2026-12-01T00:00:00.000Z') },
    })
  })
})

describe('wedding overview', () => {
  it('returns null budget fields, zero categories, and zero completion when no data', async () => {
    prisma.weddingBudget.findUnique.mockResolvedValue(null)
    prisma.weddingExpense.findMany.mockResolvedValue([])
    prisma.weddingTask.groupBy.mockResolvedValue([])

    const result = await weddingService.getOverview('u1')
    expect(result.budget).toBeNull()
    expect(result.plannedExpenseTotal).toBe(0)
    expect(result.actualExpenseTotal).toBe(0)
    expect(result.remainingBudget).toBeNull()
    expect(result.budgetUsedPercentage).toBeNull()
    expect(result.plannedBudgetPercentage).toBeNull()
    expect(result.actualVsPlannedPercentage).toBeNull()
    expect(result.daysUntilWedding).toBeNull()
    expect(result.taskCounts).toMatchObject({ pending: 0, inProgress: 0, completed: 0, cancelled: 0, activeTotal: 0, completionPercentage: 0 })
    expect(result.categoryBreakdown).toHaveLength(Object.values(WeddingTaskCategory).length)
    for (const item of result.categoryBreakdown) {
      expect(item).toMatchObject({ plannedAmount: 0, actualAmount: 0, expenseCount: 0, actualPercentage: 0 })
    }
  })

  it('computes Decimal totals, remaining, and percentages with budget', async () => {
    prisma.weddingBudget.findUnique.mockResolvedValue(budget)
    prisma.weddingExpense.findMany.mockResolvedValue([expense])
    prisma.weddingTask.groupBy.mockResolvedValue([
      { status: TaskStatus.PENDING, _count: { _all: 1 } },
      { status: TaskStatus.COMPLETED, _count: { _all: 1 } },
    ])

    const result = await weddingService.getOverview('u1')
    expect(result.plannedExpenseTotal).toBe(20000)
    expect(result.actualExpenseTotal).toBe(18000)
    expect(result.expenseCount).toBe(1)
    expect(result.remainingBudget).toBe(132000)
    expect(result.budgetUsedPercentage).toBeCloseTo(12, 5)
    expect(result.plannedBudgetPercentage).toBeCloseTo(13.33, 2)
    expect(result.actualVsPlannedPercentage).toBeCloseTo(90, 5)
    expect(result.daysUntilWedding).toBe(119)
    expect(result.taskCounts).toMatchObject({ pending: 1, completed: 1, activeTotal: 2, completionPercentage: 50 })
  })

  it('returns null percentages when budget is zero and handles over-budget and over-plan', async () => {
    prisma.weddingBudget.findUnique.mockResolvedValue({ ...budget, totalBudget: decimal('0') })
    prisma.weddingExpense.findMany.mockResolvedValue([{ ...expense, plannedAmount: decimal('0'), actualAmount: decimal('100') }])
    prisma.weddingTask.groupBy.mockResolvedValue([])

    const result = await weddingService.getOverview('u1')
    expect(result.remainingBudget).toBe(-100)
    expect(result.budgetUsedPercentage).toBeNull()
    expect(result.plannedBudgetPercentage).toBeNull()
    expect(result.actualVsPlannedPercentage).toBeNull()

    prisma.weddingBudget.findUnique.mockResolvedValue(budget)
    prisma.weddingExpense.findMany.mockResolvedValue([
      { ...expense, plannedAmount: decimal('100'), actualAmount: decimal('200') },
    ])
    const over = await weddingService.getOverview('u1')
    expect(over.remainingBudget).toBe(149800)
    expect(over.budgetUsedPercentage).toBeCloseTo(0.13, 2)
    expect(over.actualVsPlannedPercentage).toBe(200)
  })

  it('excludes cancelled tasks from active total and ignores paid status for totals', async () => {
    prisma.weddingBudget.findUnique.mockResolvedValue(null)
    prisma.weddingExpense.findMany.mockResolvedValue([
      { ...expense, paidStatus: PaidStatus.UNPAID, actualAmount: decimal('500') },
    ])
    prisma.weddingTask.groupBy.mockResolvedValue([
      { status: TaskStatus.CANCELLED, _count: { _all: 3 } },
      { status: TaskStatus.IN_PROGRESS, _count: { _all: 1 } },
    ])

    const result = await weddingService.getOverview('u1')
    expect(result.actualExpenseTotal).toBe(500)
    expect(result.taskCounts).toMatchObject({ cancelled: 3, inProgress: 1, activeTotal: 1, completionPercentage: 0 })
  })
})

describe('wedding timeline', () => {
  it('filters user, cancelled, and null dates; sorts stably; computes overdue and signed countdown', async () => {
    const pastTask = { ...task, id: 't1', plannedDate: new Date('2026-08-01T00:00:00.000Z'), status: TaskStatus.PENDING }
    const futureTask = { ...task, id: 't2', plannedDate: new Date('2026-10-01T00:00:00.000Z'), status: TaskStatus.COMPLETED, completedDate: today }
    prisma.weddingTask.findMany.mockResolvedValue([pastTask, futureTask])

    prisma.weddingBudget.findUnique.mockResolvedValue(budget)
    const result = await weddingService.getTimeline('u1')
    expect(prisma.weddingTask.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1', status: { not: TaskStatus.CANCELLED }, plannedDate: { not: null } },
      orderBy: [{ plannedDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    })
    expect(result.weddingDate).toBe('2026-12-01')
    expect(result.daysUntilWedding).toBe(119)
    expect(result.items).toEqual([
      expect.objectContaining({ taskId: 't1', isOverdue: true, completedDate: null }),
      expect.objectContaining({ taskId: 't2', isOverdue: false, completedDate: '2026-08-04' }),
    ])
  })

  it('returns empty items and null wedding date when no budget', async () => {
    prisma.weddingTask.findMany.mockResolvedValue([])
    prisma.weddingBudget.findUnique.mockResolvedValue(null)
    const result = await weddingService.getTimeline('u1')
    expect(result).toEqual({ weddingDate: null, daysUntilWedding: null, items: [] })
  })

  it('handles leap day and same-day signed countdown', async () => {
    prisma.weddingTask.findMany.mockResolvedValue([])
    prisma.weddingBudget.findUnique.mockResolvedValue({
      ...budget, weddingDate: new Date('2028-02-29T00:00:00.000Z'),
    })
    expect((await weddingService.getTimeline('u1')).daysUntilWedding).toBe(574)

    prisma.weddingBudget.findUnique.mockResolvedValue({
      ...budget, weddingDate: new Date('2026-08-04T00:00:00.000Z'),
    })
    expect((await weddingService.getTimeline('u1')).daysUntilWedding).toBe(0)

    prisma.weddingBudget.findUnique.mockResolvedValue({
      ...budget, weddingDate: new Date('2026-07-30T00:00:00.000Z'),
    })
    expect((await weddingService.getTimeline('u1')).daysUntilWedding).toBe(-5)
  })
})
