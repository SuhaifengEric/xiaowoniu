import { ActivityType, TimeOfDay } from '@xiaowoniu/shared'
import { z } from 'zod'

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}, '日期必须是有效的 YYYY-MM-DD')

const boundedIntegerString = (min: number, max: number) => z.string()
  .regex(/^\d+$/)
  .refine((value) => {
    const number = Number(value)
    return Number.isSafeInteger(number) && number >= min && number <= max
  })

const dateRange = z.object({
  startDate: dateString.optional(),
  endDate: dateString.optional(),
  limit: boundedIntegerString(1, 100).optional(),
  offset: boundedIntegerString(0, 1_000_000).optional(),
}).refine(({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate, {
  message: '开始日期不能晚于结束日期', path: ['endDate'],
})

export const fitnessQuerySchema = z.object({ query: dateRange })

export const createCheckinSchema = z.object({
  body: z.object({
    date: dateString,
    activityType: z.nativeEnum(ActivityType),
    durationMinutes: z.number().int().positive().max(1440),
    notes: z.string().max(2000).optional(),
  }),
})

export const createWeightSchema = z.object({
  body: z.object({
    date: dateString,
    timeOfDay: z.nativeEnum(TimeOfDay),
    weightKg: z.number().positive().max(999.99),
    notes: z.string().max(2000).optional(),
  }),
})

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
})

export const goalSchema = z.object({
  body: z.object({
    targetWeightKg: z.number().positive().max(999.99).optional(),
    weeklyWorkoutTarget: z.number().int().min(0).max(100),
    startDate: dateString,
    targetDate: dateString.optional(),
  }).refine(({ startDate, targetDate }) => !targetDate || startDate <= targetDate, {
    message: '目标日期不能早于开始日期', path: ['targetDate'],
  }),
})

export const emptySchema = z.object({})
