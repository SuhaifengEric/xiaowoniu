import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = vi.hoisted(() => ({
  examCountdown: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  studySubject: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  studyCheckin: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  $executeRaw: vi.fn(),
  $transaction: vi.fn(),
}))

vi.mock('../config/database', () => ({ default: prisma }))

import learningService, {
  LearningConflictError,
  LearningNotFoundError,
} from '../services/learning.service'

const examRecord = {
  id: 'e1', userId: 'u1', examName: '教师资格证', examDate: new Date('2026-11-01T00:00:00.000Z'),
  isArchived: false, createdAt: new Date('2026-07-01T00:00:00.000Z'), updatedAt: new Date('2026-07-01T00:00:00.000Z'),
}
const subjectRecord = {
  id: 's1', userId: 'u1', examId: 'e1', subjectName: '教育知识与能力', totalChapters: 4,
  currentChapter: 0, progressPercentage: 0, targetCompletionDate: null,
  createdAt: new Date('2026-07-01T00:00:00.000Z'), updatedAt: new Date('2026-07-01T00:00:00.000Z'),
}
const checkinRecord = {
  id: 'c1', userId: 'u1', subjectId: 's1', date: new Date('2026-07-30T00:00:00.000Z'),
  completedChapters: [1, 2], studyHours: { toNumber: () => 1.5 }, notes: null, progressPercentage: 50,
  createdAt: new Date('2026-07-30T08:00:00.000Z'), updatedAt: new Date('2026-07-30T08:00:00.000Z'),
}

beforeEach(() => {
  vi.clearAllMocks()
  prisma.$transaction.mockImplementation(async (callback) => callback(prisma))
  prisma.$executeRaw.mockResolvedValue(0)
})

describe('learning resource isolation and DTOs', () => {
  it('formats dates and Decimal values at the DTO boundary', async () => {
    prisma.examCountdown.findMany.mockResolvedValue([examRecord])
    prisma.studyCheckin.findMany.mockResolvedValue([checkinRecord])
    const exams = await learningService.listExams('u1')
    const checkins = await learningService.listCheckins('u1', {})
    expect(exams[0]).toMatchObject({ examDate: '2026-11-01', createdAt: '2026-07-01T00:00:00.000Z' })
    expect(checkins[0]).toMatchObject({ date: '2026-07-30', studyHours: 1.5 })
  })

  it('filters every exam read by user and explicit fields on create', async () => {
    prisma.examCountdown.findMany.mockResolvedValue([])
    await learningService.listExams('u1')
    expect(prisma.examCountdown.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1' } }))

    prisma.examCountdown.create.mockResolvedValue(examRecord)
    await learningService.createExam('u1', { examName: '  教师资格证  ', examDate: '2026-11-01', userId: 'other' } as any)
    expect(prisma.examCountdown.create).toHaveBeenCalledWith({ data: {
      userId: 'u1', examName: '教师资格证', examDate: new Date('2026-11-01T00:00:00.000Z'), isArchived: false,
    } })
  })

  it('returns one not-found error for cross-user resources', async () => {
    prisma.examCountdown.findFirst.mockResolvedValue(null)
    await expect(learningService.updateExam('u1', 'other', { examName: 'x' })).rejects.toBeInstanceOf(LearningNotFoundError)
    expect(prisma.examCountdown.findFirst).toHaveBeenCalledWith({ where: { id: 'other', userId: 'u1' } })
  })

  it('uses transaction lock and recomputes chapters as a de-duplicated union', async () => {
    prisma.studySubject.findFirst.mockResolvedValue(subjectRecord)
    prisma.studyCheckin.create.mockResolvedValue(checkinRecord)
    prisma.studyCheckin.findMany.mockResolvedValue([
      { completedChapters: [1, 2] }, { completedChapters: [2, 4] },
    ])
    prisma.studySubject.update.mockResolvedValue({ ...subjectRecord, currentChapter: 3, progressPercentage: 75 })
    prisma.studyCheckin.update.mockResolvedValue(checkinRecord)
    const result = await learningService.createCheckin('u1', {
      subjectId: 's1', date: '2026-07-30', completedChapters: [2, 1], studyHours: 1.5,
    })
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(prisma.$executeRaw).toHaveBeenCalled()
    expect(prisma.studySubject.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { currentChapter: 3, progressPercentage: 75 } })
    expect(result).toMatchObject({ id: 'c1', studyHours: 1.5 })
  })

  it('rejects chapters outside the subject and refuses shrinking below completion', async () => {
    prisma.studySubject.findFirst.mockResolvedValue({ ...subjectRecord, currentChapter: 3, progressPercentage: 75 })
    await expect(learningService.createCheckin('u1', {
      subjectId: 's1', date: '2026-07-30', completedChapters: [5], studyHours: 1,
    })).rejects.toBeInstanceOf(LearningConflictError)
    await expect(learningService.updateSubject('u1', 's1', { totalChapters: 2 })).rejects.toBeInstanceOf(LearningConflictError)
  })

  it('deletes a checkin in a transaction and recomputes progress after removal', async () => {
    prisma.studyCheckin.findFirst.mockResolvedValue(checkinRecord)
    prisma.studyCheckin.delete.mockResolvedValue(checkinRecord)
    prisma.studyCheckin.findMany.mockResolvedValue([])
    prisma.studySubject.update.mockResolvedValue({ ...subjectRecord })
    await learningService.deleteCheckin('u1', 'c1')
    expect(prisma.studyCheckin.findFirst).toHaveBeenCalledWith({ where: { id: 'c1', userId: 'u1' } })
    expect(prisma.studyCheckin.delete).toHaveBeenCalledWith({ where: { id: 'c1' } })
    expect(prisma.studySubject.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { currentChapter: 0, progressPercentage: 0 } })
  })
})

describe('learning progress', () => {
  it('returns weighted progress and zero-filled daily activity', async () => {
    prisma.examCountdown.findFirst.mockResolvedValue(examRecord)
    prisma.studySubject.findMany.mockResolvedValue([
      { ...subjectRecord, totalChapters: 4, currentChapter: 2, progressPercentage: 50 },
      { ...subjectRecord, id: 's2', subjectName: '综合素质', totalChapters: 6, currentChapter: 6, progressPercentage: 100 },
    ])
    prisma.studyCheckin.findMany.mockResolvedValue([
      { ...checkinRecord, subjectId: 's1', date: new Date('2026-07-30T00:00:00.000Z') },
      { ...checkinRecord, id: 'c2', subjectId: 's2', date: new Date('2026-07-30T00:00:00.000Z'), studyHours: { toNumber: () => 2 } },
    ])
    const result = await learningService.getProgress('u1', 'e1', { startDate: '2026-07-29', endDate: '2026-07-30' })
    expect(result.summary).toMatchObject({ subjectsCount: 2, completedSubjectsCount: 1, overallProgressPercentage: 80, totalCheckins: 2 })
    expect(result.dailyActivity).toHaveLength(2)
    expect(result.dailyActivity[0]).toMatchObject({ date: '2026-07-29', checkinsCount: 0, studyHours: 0 })
    expect(result.dailyActivity[1]).toMatchObject({ date: '2026-07-30', checkinsCount: 2, studyHours: 3.5 })
  })
})
