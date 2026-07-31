import { beforeEach, describe, expect, it, vi } from 'vitest'
import { learningService } from './learning.service'

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }))
vi.mock('./api', () => ({ default: apiMocks }))

const exam = { id: 'exam-1', userId: 'user-1', examName: '考试', examDate: '2026-11-01', isArchived: false, createdAt: 'created', updatedAt: 'updated' }
const subject = { id: 'subject-1', userId: 'user-1', examId: 'exam-1', subjectName: '科目', totalChapters: 10, currentChapter: 0, progressPercentage: 0, targetCompletionDate: null, createdAt: 'created', updatedAt: 'updated' }
const checkin = { id: 'checkin-1', userId: 'user-1', subjectId: 'subject-1', date: '2026-07-30', completedChapters: [1], studyHours: 1, notes: null, progressPercentage: 10, createdAt: 'created', updatedAt: 'updated' }
const progress = { exam: { id: 'exam-1', examName: '考试', examDate: '2026-11-01', isArchived: false, daysRemaining: 93 }, summary: { subjectsCount: 1, completedSubjectsCount: 0, overallProgressPercentage: 10, totalStudyHours: 1, totalCheckins: 1 }, subjects: [], dailyActivity: [] }

beforeEach(() => vi.clearAllMocks())

describe('learningService', () => {
  it('gets exams and unwraps the response envelope', async () => {
    apiMocks.get.mockResolvedValue({ data: { success: true, data: [exam] } })
    await expect(learningService.getExams()).resolves.toEqual([exam])
    expect(apiMocks.get).toHaveBeenCalledWith('/api/learning/exams')
  })

  it('uses explicit methods, bodies and response unwrapping for mutations', async () => {
    apiMocks.post.mockResolvedValueOnce({ data: { success: true, data: exam } })
      .mockResolvedValueOnce({ data: { success: true, data: subject } })
      .mockResolvedValueOnce({ data: { success: true, data: checkin } })
    apiMocks.patch.mockResolvedValueOnce({ data: { success: true, data: exam } })
      .mockResolvedValueOnce({ data: { success: true, data: subject } })
    apiMocks.delete.mockResolvedValue({ data: { success: true, data: null } })

    await expect(learningService.createExam({ examName: '考试', examDate: '2026-11-01' })).resolves.toEqual(exam)
    await expect(learningService.updateExam('exam-1', { isArchived: true })).resolves.toEqual(exam)
    await expect(learningService.deleteExam('exam-1')).resolves.toBeNull()
    await expect(learningService.createSubject({ examId: 'exam-1', subjectName: '科目', totalChapters: 10 })).resolves.toEqual(subject)
    await expect(learningService.updateSubject('subject-1', { totalChapters: 12 })).resolves.toEqual(subject)
    await expect(learningService.deleteSubject('subject-1')).resolves.toBeNull()
    await expect(learningService.createCheckin({ subjectId: 'subject-1', date: '2026-07-30', completedChapters: [1], studyHours: 1 })).resolves.toEqual(checkin)
    await expect(learningService.deleteCheckin('checkin-1')).resolves.toBeNull()

    expect(apiMocks.post).toHaveBeenNthCalledWith(1, '/api/learning/exams', { examName: '考试', examDate: '2026-11-01' })
    expect(apiMocks.patch).toHaveBeenNthCalledWith(1, '/api/learning/exams/exam-1', { isArchived: true })
    expect(apiMocks.post).toHaveBeenNthCalledWith(2, '/api/learning/subjects', { examId: 'exam-1', subjectName: '科目', totalChapters: 10 })
    expect(apiMocks.patch).toHaveBeenNthCalledWith(2, '/api/learning/subjects/subject-1', { totalChapters: 12 })
    expect(apiMocks.post).toHaveBeenNthCalledWith(3, '/api/learning/checkins', { subjectId: 'subject-1', date: '2026-07-30', completedChapters: [1], studyHours: 1 })
  })

  it('sends query parameters through Axios params', async () => {
    const params = { examId: 'exam-1', startDate: '2026-07-01', endDate: '2026-08-11', limit: 10, offset: 0 }
    apiMocks.get.mockResolvedValueOnce({ data: { success: true, data: [subject] } })
      .mockResolvedValueOnce({ data: { success: true, data: [checkin] } })
      .mockResolvedValueOnce({ data: { success: true, data: progress } })
    await learningService.getSubjects('exam-1')
    await learningService.getCheckins(params)
    await learningService.getProgress({ examId: 'exam-1', startDate: params.startDate, endDate: params.endDate })
    expect(apiMocks.get).toHaveBeenNthCalledWith(1, '/api/learning/subjects', { params: { examId: 'exam-1' } })
    expect(apiMocks.get).toHaveBeenNthCalledWith(2, '/api/learning/checkins', { params })
    expect(apiMocks.get).toHaveBeenNthCalledWith(3, '/api/learning/progress', { params: { examId: 'exam-1', startDate: params.startDate, endDate: params.endDate } })
  })
})
