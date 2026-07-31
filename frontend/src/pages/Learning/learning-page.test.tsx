import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExamCountdownResponse, LearningProgressResponse, StudyCheckinResponse, StudySubjectResponse } from '@xiaowoniu/shared'
import Learning from './index'
import { getCalendarRange } from '@/pages/Fitness/CheckinCalendar'

const exam: ExamCountdownResponse = {
  id: 'exam-1', userId: 'user-1', examName: '资格考试', examDate: '2026-12-01', isArchived: false,
  createdAt: '', updatedAt: '',
}
const subject: StudySubjectResponse = {
  id: 'subject-1', userId: 'user-1', examId: 'exam-1', subjectName: '数学', totalChapters: 20,
  currentChapter: 4, progressPercentage: 20, targetCompletionDate: null, createdAt: '', updatedAt: '',
}
const checkin: StudyCheckinResponse = {
  id: 'checkin-1', userId: 'user-1', subjectId: 'subject-1', date: '2026-08-03', completedChapters: [1, 2],
  studyHours: 1.5, notes: null, progressPercentage: 10, createdAt: '', updatedAt: '',
}
const progress: LearningProgressResponse = {
  exam: { id: 'exam-1', examName: '资格考试', examDate: '2026-12-01', isArchived: false, daysRemaining: 12 },
  summary: { subjectsCount: 1, completedSubjectsCount: 0, overallProgressPercentage: 20, totalStudyHours: 3, totalCheckins: 2 },
  subjects: [{ ...subject, totalStudyHours: 3, checkinsCount: 2 }],
  dailyActivity: [{ date: '2026-08-03', checkinsCount: 1, studyHours: 1.5, completedChaptersCount: 2 }],
}

const store = vi.hoisted(() => ({
  exams: [] as ExamCountdownResponse[],
  subjects: [] as StudySubjectResponse[],
  checkins: [] as StudyCheckinResponse[],
  progress: null as LearningProgressResponse | null,
  selectedExamId: null as string | null,
  loading: false,
  error: null as string | null,
  fetchDashboard: vi.fn().mockResolvedValue(undefined),
  selectExam: vi.fn().mockResolvedValue(undefined),
  createExam: vi.fn().mockResolvedValue(undefined),
  updateExam: vi.fn().mockResolvedValue(undefined),
  deleteExam: vi.fn().mockResolvedValue(undefined),
  createSubject: vi.fn().mockResolvedValue(undefined),
  updateSubject: vi.fn().mockResolvedValue(undefined),
  deleteSubject: vi.fn().mockResolvedValue(undefined),
  createCheckin: vi.fn().mockResolvedValue(undefined),
  deleteCheckin: vi.fn().mockResolvedValue(undefined),
  fetchCheckins: vi.fn().mockResolvedValue(undefined),
  clearError: vi.fn(),
}))

vi.mock('@/store/learning.store', () => ({
  useLearningStore: (selector: (state: typeof store) => unknown) => selector(store),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ logout: vi.fn().mockResolvedValue(undefined) }),
}))

function renderPage() {
  return render(<MemoryRouter><Learning /></MemoryRouter>)
}

beforeEach(() => {
  store.exams = [exam]
  store.subjects = [subject]
  store.checkins = []
  store.progress = progress
  store.selectedExamId = 'exam-1'
  store.loading = false
  store.error = null
  Object.values(store).forEach((value) => typeof value === 'function' && value.mockClear())
  store.fetchDashboard.mockResolvedValue(undefined)
  store.selectExam.mockResolvedValue(undefined)
  store.createExam.mockResolvedValue(undefined)
  store.createSubject.mockResolvedValue(undefined)
  store.createCheckin.mockResolvedValue(undefined)
  store.deleteCheckin.mockResolvedValue(undefined)
})

describe('Learning page', () => {
  it('requests the visible 42-day range on mount', async () => {
    renderPage()
    const range = getCalendarRange(new Date())
    await waitFor(() => expect(store.fetchDashboard).toHaveBeenCalledWith(null, range))
  })

  it('prefills a check-in from a calendar date and submits through the store', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /2026年8月3日/ }))
    expect(screen.getByRole('dialog', { name: '学习打卡' })).toBeInTheDocument()
    expect(screen.getByLabelText('日期')).toHaveValue('2026-08-03')

    await user.click(screen.getByRole('combobox', { name: '科目' }))
    await user.click(await screen.findByRole('option', { name: /数学（共 20 章）/ }))
    await user.type(screen.getByLabelText('完成章节'), '5')
    await user.type(screen.getByLabelText('学习时长（小时）'), '1')
    await user.click(screen.getByRole('button', { name: '保存打卡' }))

    await waitFor(() => expect(store.createCheckin).toHaveBeenCalledWith({
      subjectId: 'subject-1', date: '2026-08-03', completedChapters: [5], studyHours: 1,
    }))
    expect(await screen.findByRole('status')).toHaveTextContent('学习打卡已保存')
  })

  it('supports exam selection and independent delete confirmation', async () => {
    const user = userEvent.setup()
    store.checkins = [checkin]
    renderPage()

    await user.click(screen.getByRole('button', { name: '删除2026年8月3日的学习打卡' }))
    expect(screen.getByRole('dialog', { name: '确认删除学习打卡' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(store.deleteCheckin).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '删除2026年8月3日的学习打卡' }))
    await user.click(screen.getByRole('button', { name: '确认删除' }))
    await waitFor(() => expect(store.deleteCheckin).toHaveBeenCalledWith('checkin-1'))
  })

  it('keeps subject and check-in actions unavailable until an exam exists', () => {
    store.exams = []
    store.subjects = []
    store.selectedExamId = null
    store.progress = null
    renderPage()

    expect(screen.getByRole('heading', { name: '还没有考试' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新建科目' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '学习打卡' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '新建考试' })).toBeEnabled()
  })
})
