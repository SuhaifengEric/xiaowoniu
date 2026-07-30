import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = vi.hoisted(() => ({
  fitnessCheckin: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  weightRecord: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  fitnessGoal: { findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
}))

vi.mock('../config/database', () => ({ default: prisma }))

import fitnessService, { FitnessNotFoundError } from '../services/fitness.service'

const checkin = {
  id: 'c1', userId: 'u1', date: new Date('2026-07-30T00:00:00.000Z'),
  activityType: 'pilates', durationMinutes: 45, notes: null,
  createdAt: new Date('2026-07-30T08:00:00.000Z'),
  updatedAt: new Date('2026-07-30T09:00:00.000Z'),
}

const weight = {
  id: 'w1', userId: 'u1', date: new Date('2026-07-30T00:00:00.000Z'),
  timeOfDay: 'evening', weightKg: { toNumber: () => 55.25 }, notes: null,
  createdAt: new Date('2026-07-30T10:00:00.000Z'),
}

beforeEach(() => vi.clearAllMocks())

describe('fitness DTOs and queries', () => {
  it('formats dates, timestamps, and Decimal values explicitly', async () => {
    prisma.fitnessCheckin.findMany.mockResolvedValue([checkin])
    prisma.weightRecord.findMany.mockResolvedValue([weight])
    const [checkins, weights] = await Promise.all([
      fitnessService.getCheckins('u1', {}), fitnessService.getWeights('u1', {}),
    ])
    expect(checkins[0]).toMatchObject({ date: '2026-07-30', createdAt: '2026-07-30T08:00:00.000Z' })
    expect(weights[0]).toMatchObject({ date: '2026-07-30', weightKg: 55.25 })
  })

  it('builds inclusive UTC filters from either date bound', async () => {
    prisma.fitnessCheckin.findMany.mockResolvedValue([])
    await fitnessService.getCheckins('u1', { startDate: '2026-07-01' })
    expect(prisma.fitnessCheckin.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'u1', date: { gte: new Date('2026-07-01T00:00:00.000Z') } },
    }))
    await fitnessService.getCheckins('u1', { endDate: '2026-07-31' })
    expect(prisma.fitnessCheckin.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { userId: 'u1', date: { lte: new Date('2026-07-31T00:00:00.000Z') } },
    }))
  })

  it('requests evening-first ordering for same-day weights', async () => {
    prisma.weightRecord.findMany.mockResolvedValue([
      { ...weight, id: 'evening', timeOfDay: 'evening' },
    ])
    const result = await fitnessService.getWeights('u1', { limit: 1, offset: 0 })
    expect(prisma.weightRecord.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: [{ date: 'desc' }, { timeOfDay: 'asc' }, { createdAt: 'desc' }],
      take: 1,
      skip: 0,
    })
    expect(result.map((item) => item.id)).toEqual(['evening'])
  })

  it('passes only allowed checkin fields to Prisma', async () => {
    prisma.fitnessCheckin.create.mockResolvedValue(checkin)
    await fitnessService.createCheckin('u1', {
      date: '2026-07-30', activityType: 'pilates', durationMinutes: 45, notes: 'done',
      id: 'injected', createdAt: 'injected', userId: 'other',
    } as any)
    expect(prisma.fitnessCheckin.create).toHaveBeenCalledWith({ data: {
      userId: 'u1', date: new Date('2026-07-30T00:00:00.000Z'),
      activityType: 'pilates', durationMinutes: 45, notes: 'done',
    } })
  })

  it('passes only allowed weight fields to Prisma', async () => {
    prisma.weightRecord.create.mockResolvedValue(weight)
    await fitnessService.createWeight('u1', {
      date: '2026-07-30', timeOfDay: 'evening', weightKg: 55.25, notes: 'done',
      id: 'injected', createdAt: 'injected', userId: 'other',
    } as any)
    expect(prisma.weightRecord.create).toHaveBeenCalledWith({ data: {
      userId: 'u1', date: new Date('2026-07-30T00:00:00.000Z'),
      timeOfDay: 'evening', weightKg: 55.25, notes: 'done',
    } })
  })

  it('uses database ordering and pagination for weights', async () => {
    prisma.weightRecord.findMany.mockResolvedValue([weight])
    await fitnessService.getWeights('u1', { limit: 1, offset: 2 })
    expect(prisma.weightRecord.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: [{ date: 'desc' }, { timeOfDay: 'asc' }, { createdAt: 'desc' }],
      take: 1,
      skip: 2,
    })
  })
})

describe('fitness mutations', () => {
  it('deletes a checkin by id and userId and maps count zero to not found', async () => {
    prisma.fitnessCheckin.deleteMany.mockResolvedValue({ count: 0 })
    await expect(fitnessService.deleteCheckin('u1', 'other-user-record'))
      .rejects.toBeInstanceOf(FitnessNotFoundError)
    expect(prisma.fitnessCheckin.deleteMany).toHaveBeenCalledWith({
      where: { id: 'other-user-record', userId: 'u1' },
    })
  })

  it('deletes a weight by id and userId', async () => {
    prisma.weightRecord.deleteMany.mockResolvedValue({ count: 1 })
    await fitnessService.deleteWeight('u1', 'w1')
    expect(prisma.weightRecord.deleteMany).toHaveBeenCalledWith({ where: { id: 'w1', userId: 'u1' } })
  })

  it('takes a parameterized transaction advisory lock before replacing the active goal', async () => {
    const calls: string[] = []
    const goal = {
      id: 'g2', userId: 'u1', targetWeightKg: null, weeklyWorkoutTarget: 3,
      startDate: new Date('2026-07-01T00:00:00.000Z'), targetDate: null,
      isActive: true, createdAt: new Date(), updatedAt: new Date(),
    }
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma))
    prisma.$queryRaw.mockImplementation(async (query: TemplateStringsArray, userId: string) => {
      calls.push('lock')
      expect(query).toEqual(expect.arrayContaining([expect.stringContaining('pg_advisory_xact_lock')]))
      expect(userId).toBe('u1')
      return [{ pg_advisory_xact_lock: null }]
    })
    prisma.fitnessGoal.updateMany.mockImplementation(async () => { calls.push('deactivate'); return { count: 1 } })
    prisma.fitnessGoal.create.mockImplementation(async () => { calls.push('create'); return goal })

    await fitnessService.upsertGoal('u1', { weeklyWorkoutTarget: 3, startDate: '2026-07-01' })

    expect(calls).toEqual(['lock', 'deactivate', 'create'])
  })
})

describe('fitness stats', () => {
  it('uses Monday UTC, elapsed month weeks, and clamps weekly completion', async () => {
    prisma.fitnessCheckin.findMany.mockResolvedValue([
      { date: new Date('2026-07-06T00:00:00.000Z'), durationMinutes: 20 },
      { date: new Date('2026-07-13T00:00:00.000Z'), durationMinutes: 30 },
      { date: new Date('2026-07-14T00:00:00.000Z'), durationMinutes: 40 },
      { date: new Date('2026-07-15T00:00:00.000Z'), durationMinutes: 50 },
    ])
    prisma.fitnessGoal.findFirst.mockResolvedValue({ weeklyWorkoutTarget: 2 })
    prisma.weightRecord.findMany.mockResolvedValue([
      { ...weight, weightKg: { toNumber: () => 55 } },
      { ...weight, id: 'w0', date: new Date('2026-07-14T00:00:00.000Z'), weightKg: { toNumber: () => 56 } },
    ])
    const result = await fitnessService.getStats('u1', new Date('2026-07-15T12:00:00.000Z'))
    expect(prisma.fitnessCheckin.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1', date: { gte: new Date('2026-07-01T00:00:00.000Z'), lte: new Date('2026-07-15T12:00:00.000Z') } },
      select: { date: true, durationMinutes: true },
    })
    expect(prisma.weightRecord.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      select: { weightKg: true },
      orderBy: [{ date: 'desc' }, { timeOfDay: 'asc' }, { createdAt: 'desc' }],
      take: 2,
    })
    expect(result.currentWeek).toEqual({ checkinsCount: 3, totalMinutes: 120, goalCompletion: 100 })
    expect(result.currentMonth).toEqual({ checkinsCount: 4, totalMinutes: 140, averagePerWeek: 1.33 })
    expect(result.weightTrend).toEqual({ current: 55, previous: 56, change: -1 })
  })

  it('includes the prior month when the current UTC week crosses a month boundary', async () => {
    prisma.fitnessCheckin.findMany.mockResolvedValue([
      { date: new Date('2026-07-27T00:00:00.000Z'), durationMinutes: 20 },
      { date: new Date('2026-08-01T00:00:00.000Z'), durationMinutes: 30 },
    ])
    prisma.fitnessGoal.findFirst.mockResolvedValue({ weeklyWorkoutTarget: 2 })
    prisma.weightRecord.findMany.mockResolvedValue([])

    const result = await fitnessService.getStats('u1', new Date('2026-08-01T12:00:00.000Z'))

    expect(prisma.fitnessCheckin.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1', date: { gte: new Date('2026-07-27T00:00:00.000Z'), lte: new Date('2026-08-01T12:00:00.000Z') } },
      select: { date: true, durationMinutes: true },
    })
    expect(result.currentWeek).toEqual({ checkinsCount: 2, totalMinutes: 50, goalCompletion: 100 })
    expect(result.currentMonth).toEqual({ checkinsCount: 1, totalMinutes: 30, averagePerWeek: 1 })
  })

  it('returns finite zeroed values for empty data and a zero weekly target', async () => {
    prisma.fitnessCheckin.findMany.mockResolvedValue([])
    prisma.fitnessGoal.findFirst.mockResolvedValue({ weeklyWorkoutTarget: 0 })
    prisma.weightRecord.findMany.mockResolvedValue([])
    await expect(fitnessService.getStats('u1', new Date('2026-07-01T00:00:00.000Z'))).resolves.toEqual({
      currentWeek: { checkinsCount: 0, totalMinutes: 0, goalCompletion: 0 },
      currentMonth: { checkinsCount: 0, totalMinutes: 0, averagePerWeek: 0 },
      weightTrend: { current: null, previous: null, change: null },
    })
  })
})
