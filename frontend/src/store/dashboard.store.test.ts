import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardService } from '@/services/dashboard.service'
import { initialDashboardState, useDashboardStore } from './dashboard.store'

vi.mock('@/services/dashboard.service', () => ({ dashboardService: { getSummary: vi.fn() } }))

const service = vi.mocked(dashboardService)
const summary = {
  generatedAt: '2026-08-06T08:00:00.000Z',
  fitness: { todayCheckinCount: 1, weeklyCheckinCount: 3, weeklyTarget: 4, latestWeightKg: 61.2 },
  learning: { activeExam: null, overallProgressPercentage: null, todayStudyHours: 0 },
  finance: { currentMonthExpense: 100, currentMonthBudget: null, budgetRemaining: null, activeSavingPlansCount: 1 },
  wedding: { weddingDate: null, daysRemaining: null, pendingTasksCount: 0, completedTasksCount: 0, budgetRemaining: null },
}

describe('useDashboardStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDashboardStore.getState().reset()
    service.getSummary.mockResolvedValue(summary)
  })

  it('starts empty and stores a successful summary', async () => {
    expect(useDashboardStore.getState()).toMatchObject(initialDashboardState)
    const request = useDashboardStore.getState().fetchSummary()
    expect(useDashboardStore.getState().loading).toBe(true)
    await request
    expect(useDashboardStore.getState()).toMatchObject({ summary, loading: false, error: null })
  })

  it('exposes API errors and preserves the last good summary on refresh failure', async () => {
    await useDashboardStore.getState().fetchSummary()
    service.getSummary.mockRejectedValue({ response: { data: { error: { message: '摘要暂时不可用' } } } })

    await expect(useDashboardStore.getState().fetchSummary()).rejects.toBeTruthy()
    expect(useDashboardStore.getState()).toMatchObject({ summary, loading: false, error: '摘要暂时不可用' })
  })

  it('prevents an in-flight response from writing after reset', async () => {
    let resolve!: (value: typeof summary) => void
    service.getSummary.mockImplementationOnce(() => new Promise((innerResolve) => { resolve = innerResolve }))
    const pending = useDashboardStore.getState().fetchSummary()
    useDashboardStore.getState().reset()
    resolve(summary)
    await pending

    expect(useDashboardStore.getState()).toMatchObject(initialDashboardState)
  })
})
