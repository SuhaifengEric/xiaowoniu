import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActivityType, TimeOfDay } from '@xiaowoniu/shared'
import { fitnessService } from './fitness.service'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('./api', () => ({ default: apiMocks }))
const checkin = {
  id: 'checkin-1',
  userId: 'user-1',
  date: '2026-07-30',
  activityType: ActivityType.PILATES,
  durationMinutes: 45,
  notes: null,
  createdAt: '2026-07-30T01:00:00.000Z',
  updatedAt: '2026-07-30T01:00:00.000Z',
}
const weight = {
  id: 'weight-1',
  userId: 'user-1',
  date: '2026-07-30',
  timeOfDay: TimeOfDay.MORNING,
  weightKg: 61.2,
  notes: null,
  createdAt: '2026-07-30T01:00:00.000Z',
}
const goal = {
  id: 'goal-1',
  userId: 'user-1',
  targetWeightKg: 58,
  weeklyWorkoutTarget: 4,
  startDate: '2026-07-01',
  targetDate: '2026-10-01',
  isActive: true,
  createdAt: '2026-07-01T01:00:00.000Z',
  updatedAt: '2026-07-01T01:00:00.000Z',
}
const stats = {
  currentWeek: { checkinsCount: 2, totalMinutes: 90, goalCompletion: 50 },
  currentMonth: { checkinsCount: 8, totalMinutes: 360, averagePerWeek: 2 },
  weightTrend: { current: 61.2, previous: 61.5, change: -0.3 },
}

describe('fitnessService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gets checkins with query params and unwraps data', async () => {
    const params = { startDate: '2026-07-01', endDate: '2026-07-31', limit: 20, offset: 0 }
    apiMocks.get.mockResolvedValue({ data: { success: true, data: [checkin] } })

    await expect(fitnessService.getCheckins(params)).resolves.toEqual([checkin])
    expect(apiMocks.get).toHaveBeenCalledWith('/api/fitness/checkins', { params })
  })

  it('creates and deletes a checkin using the API envelope', async () => {
    const input = { date: '2026-07-30', activityType: ActivityType.PILATES, durationMinutes: 45 }
    apiMocks.post.mockResolvedValue({ data: { success: true, data: checkin } })
    apiMocks.delete.mockResolvedValue({ data: { success: true, data: null } })

    await expect(fitnessService.createCheckin(input)).resolves.toEqual(checkin)
    await expect(fitnessService.deleteCheckin('checkin-1')).resolves.toBeNull()
    expect(apiMocks.post).toHaveBeenCalledWith('/api/fitness/checkins', input)
    expect(apiMocks.delete).toHaveBeenCalledWith('/api/fitness/checkins/checkin-1')
  })

  it('gets weights with query params and unwraps data', async () => {
    const params = { startDate: '2026-06-01', endDate: '2026-07-31' }
    apiMocks.get.mockResolvedValue({ data: { success: true, data: [weight] } })

    await expect(fitnessService.getWeights(params)).resolves.toEqual([weight])
    expect(apiMocks.get).toHaveBeenCalledWith('/api/fitness/weights', { params })
  })

  it('creates and deletes a weight using the API envelope', async () => {
    const input = { date: '2026-07-30', timeOfDay: TimeOfDay.MORNING, weightKg: 61.2 }
    apiMocks.post.mockResolvedValue({ data: { success: true, data: weight } })
    apiMocks.delete.mockResolvedValue({ data: { success: true, data: null } })

    await expect(fitnessService.createWeight(input)).resolves.toEqual(weight)
    await expect(fitnessService.deleteWeight('weight-1')).resolves.toBeNull()
    expect(apiMocks.post).toHaveBeenCalledWith('/api/fitness/weights', input)
    expect(apiMocks.delete).toHaveBeenCalledWith('/api/fitness/weights/weight-1')
  })

  it('gets and upserts the active goal', async () => {
    const input = { targetWeightKg: 58, weeklyWorkoutTarget: 4, startDate: '2026-07-01' }
    apiMocks.get.mockResolvedValue({ data: { success: true, data: goal } })
    apiMocks.put.mockResolvedValue({ data: { success: true, data: goal } })

    await expect(fitnessService.getGoal()).resolves.toEqual(goal)
    await expect(fitnessService.upsertGoal(input)).resolves.toEqual(goal)
    expect(apiMocks.get).toHaveBeenCalledWith('/api/fitness/goal')
    expect(apiMocks.put).toHaveBeenCalledWith('/api/fitness/goal', input)
  })

  it('supports a missing active goal and unwraps stats', async () => {
    apiMocks.get
      .mockResolvedValueOnce({ data: { success: true, data: null } })
      .mockResolvedValueOnce({ data: { success: true, data: stats } })

    await expect(fitnessService.getGoal()).resolves.toBeNull()
    await expect(fitnessService.getStats()).resolves.toEqual(stats)
    expect(apiMocks.get).toHaveBeenNthCalledWith(1, '/api/fitness/goal')
    expect(apiMocks.get).toHaveBeenNthCalledWith(2, '/api/fitness/stats')
  })
})
