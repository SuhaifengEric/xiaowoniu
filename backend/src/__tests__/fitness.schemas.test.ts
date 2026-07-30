import { describe, expect, it } from 'vitest'
import {
  createCheckinSchema,
  createWeightSchema,
  fitnessQuerySchema,
  goalSchema,
} from '../validation/fitness.schemas'

describe('fitness validation schemas', () => {
  it('accepts strict calendar dates and valid shared enum values', () => {
    expect(createCheckinSchema.safeParse({ body: {
      date: '2026-07-30', activityType: 'pilates', durationMinutes: 45,
    } }).success).toBe(true)
    expect(createWeightSchema.safeParse({ body: {
      date: '2026-07-30', timeOfDay: 'evening', weightKg: 55.2,
    } }).success).toBe(true)
  })

  it.each(['2026-7-30', '2026-02-30', '2026-13-01'])('rejects invalid date %s', (date) => {
    expect(createCheckinSchema.safeParse({ body: {
      date, activityType: 'other', durationMinutes: 30,
    } }).success).toBe(false)
  })

  it('supports either date bound and rejects reversed ranges', () => {
    expect(fitnessQuerySchema.safeParse({ query: { startDate: '2026-07-01' } }).success).toBe(true)
    expect(fitnessQuerySchema.safeParse({ query: { endDate: '2026-07-31' } }).success).toBe(true)
    expect(fitnessQuerySchema.safeParse({ query: {
      startDate: '2026-08-01', endDate: '2026-07-31',
    } }).success).toBe(false)
  })

  it.each([
    { limit: '0' }, { limit: '101' }, { limit: 'Infinity' },
    { offset: '-1' }, { offset: '1000001' }, { offset: 'Infinity' },
  ])('rejects unsafe pagination %#', (query) => {
    expect(fitnessQuerySchema.safeParse({ query }).success).toBe(false)
  })

  it.each([
    { limit: '1', offset: '0' }, { limit: '100', offset: '1000000' },
  ])('accepts bounded pagination %#', (query) => {
    expect(fitnessQuerySchema.safeParse({ query }).success).toBe(true)
  })

  it('rejects a goal whose target date precedes its start date', () => {
    expect(goalSchema.safeParse({ body: {
      weeklyWorkoutTarget: 3,
      startDate: '2026-08-01',
      targetDate: '2026-07-31',
    } }).success).toBe(false)
  })
})
