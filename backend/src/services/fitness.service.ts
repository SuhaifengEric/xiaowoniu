import { Prisma } from '@prisma/client'
import {
  ActivityType,
  CreateCheckinRequest,
  CreateWeightRecordRequest,
  FitnessCheckinResponse,
  FitnessGoalResponse,
  FitnessQueryParams,
  FitnessStatsResponse,
  TimeOfDay,
  UpsertGoalRequest,
  WeightRecordResponse,
} from '@xiaowoniu/shared'
import prisma from '../config/database'

export class FitnessNotFoundError extends Error {
  constructor(message = '记录不存在') {
    super(message)
    this.name = 'FitnessNotFoundError'
  }
}

const utcDate = (value: string) => new Date(`${value}T00:00:00.000Z`)
const dateString = (value: Date) => value.toISOString().slice(0, 10)
const numberValue = (value: Prisma.Decimal | number) => typeof value === 'number' ? value : value.toNumber()
const rounded = (value: number) => Math.round(value * 100) / 100

function dateFilter(query: FitnessQueryParams) {
  const date: { gte?: Date; lte?: Date } = {}
  if (query.startDate) date.gte = utcDate(query.startDate)
  if (query.endDate) date.lte = utcDate(query.endDate)
  return Object.keys(date).length ? date : undefined
}

function pagination(query: FitnessQueryParams) {
  const limit = query.limit === undefined ? undefined : Number(query.limit)
  const offset = query.offset === undefined ? undefined : Number(query.offset)
  return { ...(limit === undefined ? {} : { take: limit }), ...(offset === undefined ? {} : { skip: offset }) }
}

function toCheckinResponse(record: any): FitnessCheckinResponse {
  return {
    id: record.id, userId: record.userId, date: dateString(record.date),
    activityType: record.activityType as ActivityType,
    durationMinutes: record.durationMinutes, notes: record.notes,
    createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(),
  }
}

function toWeightResponse(record: any): WeightRecordResponse {
  return {
    id: record.id, userId: record.userId, date: dateString(record.date),
    timeOfDay: record.timeOfDay as TimeOfDay, weightKg: numberValue(record.weightKg),
    notes: record.notes, createdAt: record.createdAt.toISOString(),
  }
}

function toGoalResponse(record: any): FitnessGoalResponse {
  return {
    id: record.id, userId: record.userId,
    targetWeightKg: record.targetWeightKg === null ? null : numberValue(record.targetWeightKg),
    weeklyWorkoutTarget: record.weeklyWorkoutTarget,
    startDate: dateString(record.startDate),
    targetDate: record.targetDate ? dateString(record.targetDate) : null,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(),
  }
}

export class FitnessService {
  async getCheckins(userId: string, query: FitnessQueryParams): Promise<FitnessCheckinResponse[]> {
    const date = dateFilter(query)
    const records = await prisma.fitnessCheckin.findMany({
      where: { userId, ...(date ? { date } : {}) },
      orderBy: { date: 'desc' },
      ...pagination(query),
    })
    return records.map(toCheckinResponse)
  }

  async createCheckin(userId: string, data: CreateCheckinRequest): Promise<FitnessCheckinResponse> {
    const record = await prisma.fitnessCheckin.create({
      data: {
        userId,
        date: utcDate(data.date),
        activityType: data.activityType,
        durationMinutes: data.durationMinutes,
        notes: data.notes ?? null,
      },
    })
    return toCheckinResponse(record)
  }

  async deleteCheckin(userId: string, id: string): Promise<void> {
    const result = await prisma.fitnessCheckin.deleteMany({ where: { id, userId } })
    if (result.count === 0) throw new FitnessNotFoundError('健身打卡不存在')
  }

  async getWeights(userId: string, query: FitnessQueryParams): Promise<WeightRecordResponse[]> {
    const date = dateFilter(query)
    const records = await prisma.weightRecord.findMany({
      where: { userId, ...(date ? { date } : {}) },
      orderBy: [{ date: 'desc' }, { timeOfDay: 'asc' }, { createdAt: 'desc' }],
      ...pagination(query),
    })
    return records.map(toWeightResponse)
  }

  async createWeight(userId: string, data: CreateWeightRecordRequest): Promise<WeightRecordResponse> {
    const record = await prisma.weightRecord.create({
      data: {
        userId,
        date: utcDate(data.date),
        timeOfDay: data.timeOfDay,
        weightKg: data.weightKg,
        notes: data.notes ?? null,
      },
    })
    return toWeightResponse(record)
  }

  async deleteWeight(userId: string, id: string): Promise<void> {
    const result = await prisma.weightRecord.deleteMany({ where: { id, userId } })
    if (result.count === 0) throw new FitnessNotFoundError('体重记录不存在')
  }

  async getGoal(userId: string): Promise<FitnessGoalResponse | null> {
    const record = await prisma.fitnessGoal.findFirst({
      where: { userId, isActive: true }, orderBy: { createdAt: 'desc' },
    })
    return record ? toGoalResponse(record) : null
  }

  async upsertGoal(userId: string, data: UpsertGoalRequest): Promise<FitnessGoalResponse> {
    const record = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`
      await tx.fitnessGoal.updateMany({
        where: { userId, isActive: true }, data: { isActive: false },
      })
      return tx.fitnessGoal.create({
        data: {
          userId, targetWeightKg: data.targetWeightKg ?? null,
          weeklyWorkoutTarget: data.weeklyWorkoutTarget,
          startDate: utcDate(data.startDate),
          targetDate: data.targetDate ? utcDate(data.targetDate) : null,
        },
      })
    })
    return toGoalResponse(record)
  }

  async getStats(userId: string, now = new Date()): Promise<FitnessStatsResponse> {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const weekStart = new Date(now)
    const day = weekStart.getUTCDay()
    weekStart.setUTCDate(weekStart.getUTCDate() - (day === 0 ? 6 : day - 1))
    weekStart.setUTCHours(0, 0, 0, 0)

    const queryStart = weekStart < monthStart ? weekStart : monthStart
    const [checkins, goal, weights] = await Promise.all([
      prisma.fitnessCheckin.findMany({
        where: { userId, date: { gte: queryStart, lte: now } },
        select: { date: true, durationMinutes: true },
      }),
      prisma.fitnessGoal.findFirst({
        where: { userId, isActive: true }, orderBy: { createdAt: 'desc' },
      }),
      prisma.weightRecord.findMany({
        where: { userId },
        select: { weightKg: true },
        orderBy: [{ date: 'desc' }, { timeOfDay: 'asc' }, { createdAt: 'desc' }],
        take: 2,
      }),
    ])

    const weekly = checkins.filter((item) => item.date >= weekStart)
    const monthly = checkins.filter((item) => item.date >= monthStart)
    const weeklyTarget = goal?.weeklyWorkoutTarget ?? 0
    const goalCompletion = weeklyTarget > 0
      ? Math.min(100, Math.max(0, rounded(weekly.length / weeklyTarget * 100)))
      : 0
    const elapsedWeeks = Math.max(1, Math.ceil(now.getUTCDate() / 7))
    const current = weights[0] ? numberValue(weights[0].weightKg) : null
    const previous = weights[1] ? numberValue(weights[1].weightKg) : null

    return {
      currentWeek: {
        checkinsCount: weekly.length,
        totalMinutes: weekly.reduce((sum, item) => sum + item.durationMinutes, 0),
        goalCompletion,
      },
      currentMonth: {
        checkinsCount: monthly.length,
        totalMinutes: monthly.reduce((sum, item) => sum + item.durationMinutes, 0),
        averagePerWeek: rounded(monthly.length / elapsedWeeks),
      },
      weightTrend: {
        current, previous,
        change: current === null || previous === null ? null : rounded(current - previous),
      },
    }
  }
}

export default new FitnessService()
