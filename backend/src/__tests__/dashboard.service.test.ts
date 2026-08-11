import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'
import { TaskStatus } from '@xiaowoniu/shared'

const prisma = vi.hoisted(() => ({
  fitnessCheckin: { count: vi.fn() },
  fitnessGoal: { findFirst: vi.fn() },
  weightRecord: { findFirst: vi.fn() },
  examCountdown: { findFirst: vi.fn() },
  studyCheckin: { aggregate: vi.fn() },
  studySubject: { aggregate: vi.fn() },
  expense: { aggregate: vi.fn() },
  monthlyBudget: { findUnique: vi.fn() },
  savingPlan: { findMany: vi.fn() },
  weddingBudget: { findUnique: vi.fn() },
  weddingExpense: { aggregate: vi.fn() },
  weddingTask: { groupBy: vi.fn() },
}))

vi.mock('../config/database', () => ({ default: prisma }))

import dashboardService from '../services/dashboard.service'

const decimal = (value: string | number) => new Prisma.Decimal(value)
const now = new Date('2026-08-06T15:30:00.000Z')

function mockEmptySummary() {
  prisma.fitnessCheckin.count.mockResolvedValue(0)
  prisma.fitnessGoal.findFirst.mockResolvedValue(null)
  prisma.weightRecord.findFirst.mockResolvedValue(null)
  prisma.examCountdown.findFirst.mockResolvedValue(null)
  prisma.studyCheckin.aggregate.mockResolvedValue({ _sum: { studyHours: null } })
  prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: null } })
  prisma.monthlyBudget.findUnique.mockResolvedValue(null)
  prisma.savingPlan.findMany.mockResolvedValue([])
  prisma.weddingBudget.findUnique.mockResolvedValue(null)
  prisma.weddingExpense.aggregate.mockResolvedValue({ _sum: { actualAmount: null } })
  prisma.weddingTask.groupBy.mockResolvedValue([])
}

beforeEach(() => {
  vi.clearAllMocks()
  mockEmptySummary()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('dashboard summary service', () => {
  it('returns null-aware empty summaries scoped to the authenticated user', async () => {
    const result = await dashboardService.getSummary('u1', now)

    expect(result).toEqual({
      generatedAt: '2026-08-06T15:30:00.000Z',
      fitness: { todayCheckinCount: 0, weeklyCheckinCount: 0, weeklyTarget: null, latestWeightKg: null },
      learning: { activeExam: null, overallProgressPercentage: null, todayStudyHours: 0 },
      finance: { currentMonthExpense: 0, currentMonthBudget: null, budgetRemaining: null, activeSavingPlansCount: 0 },
      wedding: { weddingDate: null, daysRemaining: null, pendingTasksCount: 0, completedTasksCount: 0, budgetRemaining: null },
    })
    expect(prisma.fitnessCheckin.count).toHaveBeenNthCalledWith(1, {
      where: { userId: 'u1', date: { gte: new Date('2026-08-06T00:00:00.000Z'), lt: new Date('2026-08-07T00:00:00.000Z') } },
    })
    expect(prisma.fitnessCheckin.count).toHaveBeenNthCalledWith(2, {
      where: { userId: 'u1', date: { gte: new Date('2026-08-03T00:00:00.000Z'), lt: new Date('2026-08-07T00:00:00.000Z') } },
    })
    expect(prisma.studySubject.aggregate).not.toHaveBeenCalled()
    expect(prisma.weddingTask.groupBy).toHaveBeenCalledWith({
      by: ['status'], where: { userId: 'u1' }, _count: { _all: true },
    })
  })

  it('derives all module summaries without querying records individually', async () => {
    prisma.fitnessCheckin.count.mockResolvedValueOnce(1).mockResolvedValueOnce(3)
    prisma.fitnessGoal.findFirst.mockResolvedValue({ weeklyWorkoutTarget: 4 })
    prisma.weightRecord.findFirst.mockResolvedValue({ weightKg: decimal('56.8') })
    prisma.examCountdown.findFirst.mockResolvedValue({
      id: 'exam-1', examName: '资格考试', examDate: new Date('2026-08-16T00:00:00.000Z'),
    })
    prisma.studyCheckin.aggregate.mockResolvedValue({ _sum: { studyHours: decimal('2.5') } })
    prisma.studySubject.aggregate.mockResolvedValue({ _sum: { totalChapters: 8, currentChapter: 3 } })
    prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: decimal('120.5') } })
    prisma.monthlyBudget.findUnique.mockResolvedValue({ amount: decimal('100') })
    prisma.savingPlan.findMany.mockResolvedValue([
      { currentAmount: decimal('20'), targetAmount: decimal('100') },
      { currentAmount: decimal('100'), targetAmount: decimal('100') },
      { currentAmount: decimal('160'), targetAmount: decimal('120') },
    ])
    prisma.weddingBudget.findUnique.mockResolvedValue({
      totalBudget: decimal('1000'), weddingDate: new Date('2026-08-01T00:00:00.000Z'),
    })
    prisma.weddingExpense.aggregate.mockResolvedValue({ _sum: { actualAmount: decimal('1300') } })
    prisma.weddingTask.groupBy.mockResolvedValue([
      { status: TaskStatus.PENDING, _count: { _all: 2 } },
      { status: TaskStatus.IN_PROGRESS, _count: { _all: 3 } },
      { status: TaskStatus.COMPLETED, _count: { _all: 4 } },
      { status: TaskStatus.CANCELLED, _count: { _all: 5 } },
    ])

    const result = await dashboardService.getSummary('u1', now)

    expect(result).toMatchObject({
      fitness: { todayCheckinCount: 1, weeklyCheckinCount: 3, weeklyTarget: 4, latestWeightKg: 56.8 },
      learning: {
        activeExam: { id: 'exam-1', examName: '资格考试', daysRemaining: 10 },
        overallProgressPercentage: 37,
        todayStudyHours: 2.5,
      },
      finance: { currentMonthExpense: 120.5, currentMonthBudget: 100, budgetRemaining: -20.5, activeSavingPlansCount: 1 },
      wedding: { weddingDate: '2026-08-01', daysRemaining: -5, pendingTasksCount: 5, completedTasksCount: 4, budgetRemaining: -300 },
    })
    expect(prisma.studySubject.aggregate).toHaveBeenCalledWith({
      where: { userId: 'u1', examId: 'exam-1' },
      _sum: { totalChapters: true, currentChapter: true },
    })
    expect(prisma.expense.aggregate).toHaveBeenCalledWith({
      where: { userId: 'u1', date: { gte: new Date('2026-08-01T00:00:00.000Z'), lt: new Date('2026-09-01T00:00:00.000Z') } },
      _sum: { amount: true },
    })
  })

  it('keeps every aggregate query isolated to its supplied user', async () => {
    await dashboardService.getSummary('u2', now)

    expect(prisma.fitnessGoal.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u2', isActive: true } }))
    expect(prisma.weightRecord.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u2' } }))
    expect(prisma.examCountdown.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u2', isArchived: false } }))
    expect(prisma.studyCheckin.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u2', date: expect.any(Object) } }))
    expect(prisma.monthlyBudget.findUnique).toHaveBeenCalledWith({
      where: { userId_month: { userId: 'u2', month: new Date('2026-08-01T00:00:00.000Z') } },
      select: { amount: true },
    })
    expect(prisma.savingPlan.findMany).toHaveBeenCalledWith({
      where: { userId: 'u2' }, select: { currentAmount: true, targetAmount: true },
    })
    expect(prisma.weddingBudget.findUnique).toHaveBeenCalledWith({ where: { userId: 'u2' }, select: { totalBudget: true, weddingDate: true } })
  })
})
