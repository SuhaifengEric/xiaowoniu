import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LearningProgressResponse } from '@xiaowoniu/shared'

const service = vi.hoisted(() => ({
  getExams: vi.fn(), createExam: vi.fn(), updateExam: vi.fn(), deleteExam: vi.fn(),
  getSubjects: vi.fn(), createSubject: vi.fn(), updateSubject: vi.fn(), deleteSubject: vi.fn(),
  getCheckins: vi.fn(), createCheckin: vi.fn(), deleteCheckin: vi.fn(), getProgress: vi.fn(),
}))
vi.mock('@/services/learning.service', () => ({ learningService: service }))

import { initialLearningState, useLearningStore } from './learning.store'

const exam = { id: 'exam-1', userId: 'user-1', examName: '考试', examDate: '2026-11-01', isArchived: false, createdAt: 'created', updatedAt: 'updated' }
const exam2 = { ...exam, id: 'exam-2', examName: '第二场' }
const subject = { id: 'subject-1', userId: 'user-1', examId: 'exam-1', subjectName: '科目', totalChapters: 10, currentChapter: 0, progressPercentage: 0, targetCompletionDate: null, createdAt: 'created', updatedAt: 'updated' }
const checkin = { id: 'checkin-1', userId: 'user-1', subjectId: 'subject-1', date: '2026-07-30', completedChapters: [1], studyHours: 1, notes: null, progressPercentage: 10, createdAt: 'created', updatedAt: 'updated' }
const progress = { exam: { id: 'exam-1', examName: '考试', examDate: '2026-11-01', isArchived: false, daysRemaining: 93 }, summary: { subjectsCount: 1, completedSubjectsCount: 0, overallProgressPercentage: 10, totalStudyHours: 1, totalCheckins: 1 }, subjects: [], dailyActivity: [] } as LearningProgressResponse

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  vi.clearAllMocks()
  useLearningStore.getState().reset()
  service.getExams.mockResolvedValue([exam])
  service.getSubjects.mockResolvedValue([subject])
  service.getCheckins.mockResolvedValue([checkin])
  service.getProgress.mockResolvedValue(progress)
})

describe('useLearningStore', () => {
  it('loads the initial dashboard with a 42-day calendar range', async () => {
    await useLearningStore.getState().fetchDashboard('exam-1', { startDate: '2026-07-06', endDate: '2026-08-16' })
    expect(service.getSubjects).toHaveBeenCalledWith('exam-1')
    expect(service.getCheckins).toHaveBeenCalledWith({ examId: 'exam-1', startDate: '2026-07-06', endDate: '2026-08-16', limit: 10, offset: 0 })
    expect(service.getProgress).toHaveBeenCalledWith({ examId: 'exam-1', startDate: '2026-07-06', endDate: '2026-08-16' })
    expect(useLearningStore.getState()).toMatchObject({ selectedExamId: 'exam-1', subjects: [subject], checkins: [checkin], progress })
  })

  it('does not request exam-scoped resources when no exam is selected', async () => {
    await useLearningStore.getState().fetchDashboard(null, { startDate: '2026-07-06', endDate: '2026-08-16' })
    expect(service.getSubjects).not.toHaveBeenCalled()
    expect(service.getCheckins).not.toHaveBeenCalled()
    expect(service.getProgress).not.toHaveBeenCalled()
    expect(useLearningStore.getState().selectedExamId).toBeNull()
  })

  it('keeps only the final exam selection when an older request resolves later', async () => {
    let resolveFirst!: (value: any[]) => void
    service.getSubjects.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
      .mockResolvedValueOnce([subject])
    service.getCheckins.mockResolvedValue([])
    service.getProgress.mockResolvedValue(progress)
    const first = useLearningStore.getState().selectExam('exam-1', { startDate: '2026-07-06', endDate: '2026-08-16' })
    const second = useLearningStore.getState().selectExam('exam-2', { startDate: '2026-07-06', endDate: '2026-08-16' })
    await second
    resolveFirst([subject])
    await first
    expect(useLearningStore.getState().selectedExamId).toBe('exam-2')
  })

  it('keeps loading true while dashboard requests are still pending', async () => {
    let resolveSubjects!: (value: any[]) => void
    let resolveCheckins!: (value: any[]) => void
    let resolveProgress!: (value: LearningProgressResponse) => void
    service.getSubjects.mockImplementation(() => new Promise((resolve) => { resolveSubjects = resolve }))
    service.getCheckins.mockImplementation(() => new Promise((resolve) => { resolveCheckins = resolve }))
    service.getProgress.mockImplementation(() => new Promise((resolve) => { resolveProgress = resolve }))
    const request = useLearningStore.getState().fetchDashboard('exam-1', { startDate: '2026-07-06', endDate: '2026-08-16' })
    expect(useLearningStore.getState().loading).toBe(true)
    resolveSubjects([subject]); await flush(); expect(useLearningStore.getState().loading).toBe(true)
    resolveCheckins([checkin]); await flush(); expect(useLearningStore.getState().loading).toBe(true)
    resolveProgress(progress); await request
    expect(useLearningStore.getState().loading).toBe(false)
  })

  it('applies a successful checkin before reporting refresh failure', async () => {
    await useLearningStore.getState().fetchDashboard('exam-1', { startDate: '2026-07-06', endDate: '2026-08-16' })
    service.createCheckin.mockResolvedValue(checkin)
    service.getCheckins.mockRejectedValue(new Error('refresh down'))
    service.getProgress.mockResolvedValue(progress)
    await expect(useLearningStore.getState().createCheckin({ subjectId: 'subject-1', date: '2026-07-30', completedChapters: [1], studyHours: 1 })).resolves.toBeUndefined()
    expect(useLearningStore.getState().checkins).toEqual([checkin])
    expect(useLearningStore.getState().error).toBe('操作已成功，但数据刷新失败')
  })

  it('invalidates in-flight responses after reset', async () => {
    let resolve!: (value: any[]) => void
    service.getExams.mockImplementation(() => new Promise((result) => { resolve = result }))
    const request = useLearningStore.getState().fetchExams()
    useLearningStore.getState().reset()
    resolve([exam])
    await request
    expect(useLearningStore.getState()).toEqual(expect.objectContaining(initialLearningState))
  })

  it('selects a remaining exam after deleting the current one', async () => {
    useLearningStore.setState({ exams: [exam, exam2], selectedExamId: 'exam-1' })
    service.deleteExam.mockResolvedValue(null)
    service.getExams.mockResolvedValue([exam2])
    await useLearningStore.getState().deleteExam('exam-1')
    expect(useLearningStore.getState().exams).toEqual([exam2])
    expect(useLearningStore.getState().selectedExamId).toBe('exam-2')
  })
})
