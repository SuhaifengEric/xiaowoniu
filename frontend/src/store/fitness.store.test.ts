import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActivityType, TimeOfDay } from '@xiaowoniu/shared'
import { fitnessService } from '@/services/fitness.service'
import { initialFitnessState, useFitnessStore } from './fitness.store'

vi.mock('@/services/fitness.service', () => ({
  fitnessService: {
    getCheckins: vi.fn(),
    createCheckin: vi.fn(),
    deleteCheckin: vi.fn(),
    getWeights: vi.fn(),
    createWeight: vi.fn(),
    deleteWeight: vi.fn(),
    getGoal: vi.fn(),
    upsertGoal: vi.fn(),
    getStats: vi.fn(),
  },
}))

const service = vi.mocked(fitnessService)
const checkin = {
  id: 'checkin-1', userId: 'user-1', date: '2026-07-30', activityType: ActivityType.PILATES,
  durationMinutes: 45, notes: null, createdAt: 'created', updatedAt: 'updated',
}
const weight = {
  id: 'weight-1', userId: 'user-1', date: '2026-07-30', timeOfDay: TimeOfDay.MORNING,
  weightKg: 61.2, notes: null, createdAt: 'created',
}
const goal = {
  id: 'goal-1', userId: 'user-1', targetWeightKg: 58, weeklyWorkoutTarget: 4,
  startDate: '2026-07-01', targetDate: null, isActive: true, createdAt: 'created', updatedAt: 'updated',
}
const stats = {
  currentWeek: { checkinsCount: 1, totalMinutes: 45, goalCompletion: 25 },
  currentMonth: { checkinsCount: 4, totalMinutes: 180, averagePerWeek: 1 },
  weightTrend: { current: 61.2, previous: null, change: null },
}

describe('useFitnessStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFitnessStore.setState(initialFitnessState)
    service.getCheckins.mockResolvedValue([checkin])
    service.getWeights.mockResolvedValue([weight])
    service.getGoal.mockResolvedValue(goal)
    service.getStats.mockResolvedValue(stats)
  })

  it('fetches all dashboard resources concurrently and scopes visible checkins', async () => {
    const range = { startDate: '2026-07-27', endDate: '2026-09-06' }
    const resolvers: Array<() => void> = []
    service.getCheckins.mockImplementation(() => new Promise((resolve) => resolvers.push(() => resolve([checkin]))))
    service.getWeights.mockImplementation(() => new Promise((resolve) => resolvers.push(() => resolve([weight]))))
    service.getGoal.mockImplementation(() => new Promise((resolve) => resolvers.push(() => resolve(goal))))
    service.getStats.mockImplementation(() => new Promise((resolve) => resolvers.push(() => resolve(stats))))

    const pending = useFitnessStore.getState().fetchDashboard(range)
    expect(service.getCheckins).toHaveBeenCalledWith(range)
    expect(resolvers).toHaveLength(4)
    expect(useFitnessStore.getState().loading).toBe(true)
    resolvers.forEach((resolve) => resolve())
    await pending

    expect(useFitnessStore.getState()).toMatchObject({ checkins: [checkin], weights: [weight], goal, stats, loading: false, error: null })
  })

  it('passes range queries to checkin and weight fetches', async () => {
    const checkinParams = { startDate: '2026-07-01', endDate: '2026-07-31' }
    const weightParams = { startDate: '2026-06-01', endDate: '2026-07-31', limit: 30 }

    await useFitnessStore.getState().fetchCheckins(checkinParams)
    await useFitnessStore.getState().fetchWeights(weightParams)

    expect(service.getCheckins).toHaveBeenCalledWith(checkinParams)
    expect(service.getWeights).toHaveBeenCalledWith(weightParams)
    expect(useFitnessStore.getState()).toMatchObject({ checkins: [checkin], weights: [weight], loading: false })
  })

  it('fetches goal and stats independently', async () => {
    await useFitnessStore.getState().fetchGoal()
    await useFitnessStore.getState().fetchStats()

    expect(useFitnessStore.getState()).toMatchObject({ goal, stats, loading: false })
  })

  it('refreshes checkins and stats after creating or deleting a checkin', async () => {
    const input = { date: '2026-07-30', activityType: ActivityType.PILATES, durationMinutes: 45 }
    service.createCheckin.mockResolvedValue(checkin)
    service.deleteCheckin.mockResolvedValue(null)

    await useFitnessStore.getState().createCheckin(input)
    await useFitnessStore.getState().deleteCheckin('checkin-1')

    expect(service.createCheckin).toHaveBeenCalledWith(input)
    expect(service.deleteCheckin).toHaveBeenCalledWith('checkin-1')
    expect(service.getCheckins).toHaveBeenCalledTimes(2)
    expect(service.getStats).toHaveBeenCalledTimes(2)
  })

  it('refreshes weights and stats after creating or deleting a weight', async () => {
    const input = { date: '2026-07-30', timeOfDay: TimeOfDay.MORNING, weightKg: 61.2 }
    service.createWeight.mockResolvedValue(weight)
    service.deleteWeight.mockResolvedValue(null)

    await useFitnessStore.getState().createWeight(input)
    await useFitnessStore.getState().deleteWeight('weight-1')

    expect(service.createWeight).toHaveBeenCalledWith(input)
    expect(service.deleteWeight).toHaveBeenCalledWith('weight-1')
    expect(service.getWeights).toHaveBeenCalledTimes(2)
    expect(service.getStats).toHaveBeenCalledTimes(2)
  })

  it('refreshes goal and stats after upserting a goal', async () => {
    const input = { targetWeightKg: 58, weeklyWorkoutTarget: 4, startDate: '2026-07-01' }
    service.upsertGoal.mockResolvedValue(goal)

    await useFitnessStore.getState().upsertGoal(input)

    expect(service.upsertGoal).toHaveBeenCalledWith(input)
    expect(service.getGoal).toHaveBeenCalledOnce()
    expect(service.getStats).toHaveBeenCalledOnce()
  })

  it('exposes an API error, restores loading, and rethrows the original error', async () => {
    const apiError = { response: { data: { error: { message: '日期已打卡' } } } }
    service.createCheckin.mockRejectedValue(apiError)

    await expect(useFitnessStore.getState().createCheckin({
      date: '2026-07-30', activityType: ActivityType.PILATES, durationMinutes: 45,
    })).rejects.toBe(apiError)
    expect(useFitnessStore.getState()).toMatchObject({ loading: false, error: '日期已打卡' })
  })

  it('uses an Error message fallback and can clear it', async () => {
    const failure = new Error('network unavailable')
    service.getStats.mockRejectedValue(failure)

    await expect(useFitnessStore.getState().fetchStats()).rejects.toBe(failure)
    expect(useFitnessStore.getState()).toMatchObject({ loading: false, error: 'network unavailable' })
    useFitnessStore.getState().clearError()
    expect(useFitnessStore.getState().error).toBeNull()
  })

  it('reset clears state and prevents an in-flight request from writing back', async () => {
    let resolveCheckins!: (value: typeof checkin[]) => void
    service.getCheckins.mockImplementation(() => new Promise((resolve) => {
      resolveCheckins = resolve
    }))
    useFitnessStore.setState({ checkins: [checkin], weights: [weight], goal, stats, error: 'old error' })

    const pending = useFitnessStore.getState().fetchCheckins()
    useFitnessStore.getState().reset()
    expect(useFitnessStore.getState()).toMatchObject(initialFitnessState)
    resolveCheckins([checkin])
    await pending

    expect(useFitnessStore.getState()).toMatchObject(initialFitnessState)
  })

  it('reset invalidates an in-flight mutation before it can update or refresh', async () => {
    let resolveCreate!: (value: typeof checkin) => void
    service.createCheckin.mockImplementation(() => new Promise((resolve) => {
      resolveCreate = resolve
    }))

    const pending = useFitnessStore.getState().createCheckin({
      date: checkin.date, activityType: checkin.activityType, durationMinutes: checkin.durationMinutes,
    })
    useFitnessStore.getState().reset()
    resolveCreate(checkin)
    await pending

    expect(service.getCheckins).not.toHaveBeenCalled()
    expect(service.getStats).not.toHaveBeenCalled()
    expect(useFitnessStore.getState()).toMatchObject(initialFitnessState)
  })

  it('keeps loading true until every concurrent action finishes', async () => {
    let resolveCheckins!: (value: typeof checkin[]) => void
    let resolveWeights!: (value: typeof weight[]) => void
    service.getCheckins.mockImplementation(() => new Promise((resolve) => { resolveCheckins = resolve }))
    service.getWeights.mockImplementation(() => new Promise((resolve) => { resolveWeights = resolve }))

    const first = useFitnessStore.getState().fetchCheckins()
    const second = useFitnessStore.getState().fetchWeights()
    resolveCheckins([checkin])
    await first
    expect(useFitnessStore.getState().loading).toBe(true)
    resolveWeights([weight])
    await second

    expect(useFitnessStore.getState().loading).toBe(false)
  })

  it('lets the newest request win independently for all four resources', async () => {
    const newerCheckin = { ...checkin, id: 'checkin-2', date: '2026-07-31' }
    const newerWeight = { ...weight, id: 'weight-2', weightKg: 60.8 }
    const newerGoal = { ...goal, id: 'goal-2', weeklyWorkoutTarget: 5 }
    const newerStats = { ...stats, currentWeek: { ...stats.currentWeek, checkinsCount: 2 } }
    let resolveOldCheckins!: (value: typeof checkin[]) => void
    let resolveNewCheckins!: (value: typeof checkin[]) => void
    let resolveOldWeights!: (value: typeof weight[]) => void
    let resolveNewWeights!: (value: typeof weight[]) => void
    let resolveOldGoal!: (value: typeof goal) => void
    let resolveNewGoal!: (value: typeof goal) => void
    let resolveOldStats!: (value: typeof stats) => void
    let resolveNewStats!: (value: typeof stats) => void
    service.getCheckins
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOldCheckins = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNewCheckins = resolve }))
    service.getWeights
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOldWeights = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNewWeights = resolve }))
    service.getGoal
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOldGoal = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNewGoal = resolve }))
    service.getStats
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOldStats = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNewStats = resolve }))

    const older = Promise.all([
      useFitnessStore.getState().fetchCheckins(), useFitnessStore.getState().fetchWeights(),
      useFitnessStore.getState().fetchGoal(), useFitnessStore.getState().fetchStats(),
    ])
    const newer = Promise.all([
      useFitnessStore.getState().fetchCheckins(), useFitnessStore.getState().fetchWeights(),
      useFitnessStore.getState().fetchGoal(), useFitnessStore.getState().fetchStats(),
    ])
    resolveNewCheckins([newerCheckin])
    resolveNewWeights([newerWeight])
    resolveNewGoal(newerGoal)
    resolveNewStats(newerStats)
    await newer
    resolveOldCheckins([checkin])
    resolveOldWeights([weight])
    resolveOldGoal(goal)
    resolveOldStats(stats)
    await older

    expect(useFitnessStore.getState()).toMatchObject({
      checkins: [newerCheckin], weights: [newerWeight], goal: newerGoal, stats: newerStats,
    })
  })

  it('keeps a created checkin when its background refresh fails', async () => {
    service.createCheckin.mockResolvedValue(checkin)
    service.getCheckins.mockRejectedValue(new Error('checkins refresh failed'))
    service.getStats.mockRejectedValue(new Error('stats refresh failed'))

    await expect(useFitnessStore.getState().createCheckin({
      date: checkin.date, activityType: checkin.activityType, durationMinutes: checkin.durationMinutes,
    })).resolves.toBeUndefined()

    expect(useFitnessStore.getState()).toMatchObject({
      checkins: [checkin], error: '操作已成功，但数据刷新失败', loading: false,
    })
  })

  it('keeps a deleted checkin removed when its background refresh fails', async () => {
    useFitnessStore.setState({ checkins: [checkin] })
    service.deleteCheckin.mockResolvedValue(null)
    service.getCheckins.mockRejectedValue(new Error('checkins refresh failed'))
    service.getStats.mockRejectedValue(new Error('stats refresh failed'))

    await expect(useFitnessStore.getState().deleteCheckin(checkin.id)).resolves.toBeUndefined()

    expect(useFitnessStore.getState()).toMatchObject({
      checkins: [], error: '操作已成功，但数据刷新失败', loading: false,
    })
  })

  it('keeps a created weight when its background refresh fails', async () => {
    service.createWeight.mockResolvedValue(weight)
    service.getWeights.mockRejectedValue(new Error('weights refresh failed'))
    service.getStats.mockRejectedValue(new Error('stats refresh failed'))

    await expect(useFitnessStore.getState().createWeight({
      date: weight.date, timeOfDay: weight.timeOfDay, weightKg: weight.weightKg,
    })).resolves.toBeUndefined()

    expect(useFitnessStore.getState()).toMatchObject({
      weights: [weight], error: '操作已成功，但数据刷新失败', loading: false,
    })
  })

  it('keeps a deleted weight removed when its background refresh fails', async () => {
    useFitnessStore.setState({ weights: [weight] })
    service.deleteWeight.mockResolvedValue(null)
    service.getWeights.mockRejectedValue(new Error('weights refresh failed'))
    service.getStats.mockRejectedValue(new Error('stats refresh failed'))

    await expect(useFitnessStore.getState().deleteWeight(weight.id)).resolves.toBeUndefined()

    expect(useFitnessStore.getState()).toMatchObject({
      weights: [], error: '操作已成功，但数据刷新失败', loading: false,
    })
  })

  it('keeps the upserted goal when its background refresh fails', async () => {
    service.upsertGoal.mockResolvedValue(goal)
    service.getGoal.mockRejectedValue(new Error('goal refresh failed'))
    service.getStats.mockRejectedValue(new Error('stats refresh failed'))

    await expect(useFitnessStore.getState().upsertGoal({
      targetWeightKg: 58, weeklyWorkoutTarget: 4, startDate: '2026-07-01',
    })).resolves.toBeUndefined()

    expect(useFitnessStore.getState()).toMatchObject({
      goal, error: '操作已成功，但数据刷新失败', loading: false,
    })
  })
})
