import { describe, expect, it } from 'vitest'
import {
  createCheckinSchema,
  createExamSchema,
  createSubjectSchema,
  learningQuerySchema,
  progressQuerySchema,
  updateExamSchema,
} from '../validation/learning.schemas'

const examId = '00000000-0000-0000-0000-000000000001'
const subjectId = '00000000-0000-0000-0000-000000000002'

const exam = { examName: '教师资格证', examDate: '2026-11-01' }
const subject = {
  examId,
  subjectName: '教育知识与能力',
  totalChapters: 24,
  targetCompletionDate: '2026-10-15',
}
const checkin = {
  subjectId,
  date: '2026-07-30',
  completedChapters: [3, 4],
  studyHours: 1.5,
}

describe('learning validation schemas', () => {
  it('accepts strict real calendar dates and valid request bodies', () => {
    expect(createExamSchema.safeParse({ body: exam }).success).toBe(true)
    expect(createSubjectSchema.safeParse({ body: subject }).success).toBe(true)
    expect(createCheckinSchema.safeParse({ body: checkin }).success).toBe(true)
  })

  it.each(['2026-7-30', '2026-02-30', '2026-13-01'])('rejects invalid date %s', (date) => {
    expect(createExamSchema.safeParse({ body: { ...exam, examDate: date } }).success).toBe(false)
  })

  it('rejects blank and overlong names', () => {
    expect(createExamSchema.safeParse({ body: { ...exam, examName: '   ' } }).success).toBe(false)
    expect(createExamSchema.safeParse({ body: { ...exam, examName: 'x'.repeat(101) } }).success).toBe(false)
    expect(createSubjectSchema.safeParse({ body: { ...subject, subjectName: 'x'.repeat(101) } }).success).toBe(false)
  })

  it('rejects unknown fields and an empty patch', () => {
    expect(createExamSchema.safeParse({ body: { ...exam, userId: 'injected' } }).success).toBe(false)
    expect(updateExamSchema.safeParse({ body: {} }).success).toBe(false)
    expect(updateExamSchema.safeParse({ body: { examName: 'new', ignored: true } }).success).toBe(false)
  })

  it('enforces chapter, hours, and notes boundaries', () => {
    expect(createSubjectSchema.safeParse({ body: { ...subject, totalChapters: 0 } }).success).toBe(false)
    expect(createSubjectSchema.safeParse({ body: { ...subject, totalChapters: 10001 } }).success).toBe(false)
    expect(createCheckinSchema.safeParse({ body: { ...checkin, completedChapters: [] } }).success).toBe(false)
    expect(createCheckinSchema.safeParse({ body: { ...checkin, completedChapters: [1, 1] } }).success).toBe(false)
    expect(createCheckinSchema.safeParse({ body: { ...checkin, completedChapters: [0] } }).success).toBe(false)
    expect(createCheckinSchema.safeParse({ body: { ...checkin, studyHours: 0 } }).success).toBe(false)
    expect(createCheckinSchema.safeParse({ body: { ...checkin, studyHours: 1.111 } }).success).toBe(false)
    expect(createCheckinSchema.safeParse({ body: { ...checkin, notes: 'x'.repeat(2001) } }).success).toBe(false)
  })

  it('accepts nullable target completion dates and rejects invalid IDs', () => {
    expect(createSubjectSchema.safeParse({ body: { ...subject, targetCompletionDate: null } }).success).toBe(true)
    expect(createSubjectSchema.safeParse({ body: { ...subject, examId: 'not-a-uuid' } }).success).toBe(false)
    expect(createCheckinSchema.safeParse({ body: { ...checkin, subjectId: 'not-a-uuid' } }).success).toBe(false)
  })

  it('validates one-sided and non-reversed date ranges with bounded pagination', () => {
    expect(learningQuerySchema.safeParse({ query: { examId } }).success).toBe(true)
    expect(learningQuerySchema.safeParse({ query: { subjectId, startDate: '2026-07-01' } }).success).toBe(true)
    expect(learningQuerySchema.safeParse({ query: { startDate: '2026-08-01', endDate: '2026-07-31' } }).success).toBe(false)
    expect(learningQuerySchema.safeParse({ query: { limit: '0' } }).success).toBe(false)
    expect(learningQuerySchema.safeParse({ query: { limit: '101', offset: '1000001' } }).success).toBe(false)
    expect(progressQuerySchema.safeParse({ query: { examId, startDate: '2026-07-01', endDate: '2026-07-31' } }).success).toBe(true)
  })
})
