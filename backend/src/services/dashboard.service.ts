import { Prisma } from '@prisma/client'
import { DashboardSummaryResponse, TaskStatus } from '@xiaowoniu/shared'
import prisma from '../config/database'

const dayMilliseconds = 86_400_000

const numberValue = (value: Prisma.Decimal | number | null | undefined) => {
  if (value === null || value === undefined) return 0
  return typeof value === 'number' ? value : value.toNumber()
}

const utcDayStart = (value: Date) => new Date(Date.UTC(
  value.getUTCFullYear(),
  value.getUTCMonth(),
  value.getUTCDate(),
))

const nextUtcDayStart = (value: Date) => {
  const next = new Date(value)
  next.setUTCDate(next.getUTCDate() + 1)
  return next
}

const utcWeekStart = (value: Date) => {
  const start = utcDayStart(value)
  const mondayOffset = (start.getUTCDay() + 6) % 7
  start.setUTCDate(start.getUTCDate() - mondayOffset)
  return start
}

const utcMonthStart = (value: Date) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1))

const formatDate = (value: Date) => value.toISOString().slice(0, 10)

const daysRemaining = (today: Date, target: Date) => Math.floor((
  Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()) - today.getTime()
) / dayMilliseconds)

export class DashboardService {
  async getSummary(userId: string, now = new Date()): Promise<DashboardSummaryResponse> {
    const today = utcDayStart(now)
    const tomorrow = nextUtcDayStart(today)
    const weekStart = utcWeekStart(now)
    const monthStart = utcMonthStart(now)
    const nextMonthStart = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1))

    const [
      todayCheckinCount,
      weeklyCheckinCount,
      fitnessGoal,
      latestWeight,
      activeExam,
      todayStudyHours,
      currentMonthExpenses,
      currentMonthBudget,
      savingPlans,
      weddingBudget,
      weddingExpenses,
      weddingTaskGroups,
    ] = await Promise.all([
      prisma.fitnessCheckin.count({ where: { userId, date: { gte: today, lt: tomorrow } } }),
      prisma.fitnessCheckin.count({ where: { userId, date: { gte: weekStart, lt: tomorrow } } }),
      prisma.fitnessGoal.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' },
        select: { weeklyWorkoutTarget: true },
      }),
      prisma.weightRecord.findFirst({
        where: { userId },
        orderBy: [{ date: 'desc' }, { timeOfDay: 'asc' }, { createdAt: 'desc' }],
        select: { weightKg: true },
      }),
      prisma.examCountdown.findFirst({
        where: { userId, isArchived: false },
        orderBy: [{ examDate: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, examName: true, examDate: true },
      }),
      prisma.studyCheckin.aggregate({
        where: { userId, date: { gte: today, lt: tomorrow } },
        _sum: { studyHours: true },
      }),
      prisma.expense.aggregate({
        where: { userId, date: { gte: monthStart, lt: nextMonthStart } },
        _sum: { amount: true },
      }),
      prisma.monthlyBudget.findUnique({
        where: { userId_month: { userId, month: monthStart } },
        select: { amount: true },
      }),
      prisma.savingPlan.findMany({
        where: { userId },
        select: { id: true, targetAmount: true },
      }),
      prisma.weddingBudget.findUnique({
        where: { userId },
        select: { totalBudget: true, weddingDate: true },
      }),
      prisma.weddingExpense.aggregate({
        where: { userId },
        _sum: { actualAmount: true },
      }),
      prisma.weddingTask.groupBy({
        by: ['status'],
        where: { userId },
        _count: { _all: true },
      }),
    ])

    const learningSubjects = activeExam
      ? await prisma.studySubject.aggregate({
        where: { userId, examId: activeExam.id },
        _sum: { totalChapters: true, currentChapter: true },
      })
      : null

    const savingDepositGroups = savingPlans.length === 0
      ? []
      : await prisma.savingDeposit.groupBy({
        by: ['savingPlanId'],
        where: { savingPlanId: { in: savingPlans.map(({ id }) => id) } },
        _sum: { amount: true },
      })

    const totalChapters = learningSubjects?._sum.totalChapters ?? 0
    const completedChapters = learningSubjects?._sum.currentChapter ?? 0
    const currentMonthExpense = numberValue(currentMonthExpenses._sum.amount)
    const monthBudget = currentMonthBudget ? numberValue(currentMonthBudget.amount) : null
    const weddingSpent = numberValue(weddingExpenses._sum.actualAmount)
    const weddingTotalBudget = weddingBudget ? numberValue(weddingBudget.totalBudget) : null
    const taskCounts = new Map(weddingTaskGroups.map((group) => [group.status, group._count._all]))
    const savingDepositTotals = new Map(savingDepositGroups.map((group) => [group.savingPlanId, group._sum.amount]))

    return {
      generatedAt: now.toISOString(),
      fitness: {
        todayCheckinCount,
        weeklyCheckinCount,
        weeklyTarget: fitnessGoal?.weeklyWorkoutTarget ?? null,
        latestWeightKg: latestWeight ? numberValue(latestWeight.weightKg) : null,
      },
      learning: {
        activeExam: activeExam
          ? {
            id: activeExam.id,
            examName: activeExam.examName,
            daysRemaining: daysRemaining(today, activeExam.examDate),
          }
          : null,
        overallProgressPercentage: activeExam
          ? totalChapters === 0
            ? 0
            : Math.min(100, Math.max(0, Math.floor(completedChapters / totalChapters * 100)))
          : null,
        todayStudyHours: numberValue(todayStudyHours._sum.studyHours),
      },
      finance: {
        currentMonthExpense,
        currentMonthBudget: monthBudget,
        budgetRemaining: monthBudget === null ? null : monthBudget - currentMonthExpense,
        activeSavingPlansCount: savingPlans.filter((plan) => (
          new Prisma.Decimal(savingDepositTotals.get(plan.id) ?? 0).lt(plan.targetAmount)
        )).length,
      },
      wedding: {
        weddingDate: weddingBudget ? formatDate(weddingBudget.weddingDate) : null,
        daysRemaining: weddingBudget ? daysRemaining(today, weddingBudget.weddingDate) : null,
        pendingTasksCount: (taskCounts.get(TaskStatus.PENDING) ?? 0) + (taskCounts.get(TaskStatus.IN_PROGRESS) ?? 0),
        completedTasksCount: taskCounts.get(TaskStatus.COMPLETED) ?? 0,
        budgetRemaining: weddingTotalBudget === null ? null : weddingTotalBudget - weddingSpent,
      },
    }
  }
}

export default new DashboardService()
