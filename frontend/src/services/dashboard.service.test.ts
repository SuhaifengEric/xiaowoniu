import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardService } from './dashboard.service'

const apiMocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('./api', () => ({ default: apiMocks }))

const summary = {
  generatedAt: '2026-08-06T08:00:00.000Z',
  fitness: { todayCheckinCount: 1, weeklyCheckinCount: 3, weeklyTarget: 4, latestWeightKg: 61.2 },
  learning: { activeExam: null, overallProgressPercentage: null, todayStudyHours: 0 },
  finance: { currentMonthExpense: 100, currentMonthBudget: null, budgetRemaining: null, activeSavingPlansCount: 1 },
  wedding: { weddingDate: null, daysRemaining: null, pendingTasksCount: 0, completedTasksCount: 0, budgetRemaining: null },
}

describe('dashboardService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gets the summary and unwraps the common response envelope', async () => {
    apiMocks.get.mockResolvedValue({ data: { success: true, data: summary } })

    await expect(dashboardService.getSummary()).resolves.toEqual(summary)
    expect(apiMocks.get).toHaveBeenCalledWith('/api/dashboard/summary')
  })
})
