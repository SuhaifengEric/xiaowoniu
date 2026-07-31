import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ExamCountdownResponse, StudySubjectResponse } from '@xiaowoniu/shared'
import ExamCountdown from './ExamCountdown'
import SubjectProgressBoard from './SubjectProgressBoard'
import StudyCalendar from './StudyCalendar'
import { formatLocalDate, getCalendarDays, getCalendarRange } from '@/pages/Fitness/CheckinCalendar'

const exam: ExamCountdownResponse = {
  id: 'exam-1', userId: 'user-1', examName: '资格考试', examDate: '2026-12-01', isArchived: false,
  createdAt: '', updatedAt: '',
}

const subject: StudySubjectResponse = {
  id: 'subject-1', userId: 'user-1', examId: 'exam-1', subjectName: '数学', totalChapters: 20,
  currentChapter: 20, progressPercentage: 140, targetCompletionDate: null, createdAt: '', updatedAt: '',
}

describe('ExamCountdown', () => {
  it.each([
    [5, '还剩 5 天'],
    [0, '今天考试'],
    [-3, '已结束 3 天'],
  ])('renders the backend countdown state %s', (daysRemaining, text) => {
    render(<ExamCountdown exam={exam} daysRemaining={daysRemaining} />)
    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it('renders a useful empty state without inventing a countdown', () => {
    render(<ExamCountdown exam={null} daysRemaining={999} />)
    expect(screen.getByRole('heading', { name: '还没有考试' })).toBeInTheDocument()
    expect(screen.queryByText(/还剩|今天考试|已结束/)).not.toBeInTheDocument()
  })
})

describe('SubjectProgressBoard', () => {
  it('clamps progress visually and provides a text completion status', () => {
    render(<SubjectProgressBoard subjects={[subject]} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('已完成')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: '数学进度 100%' })).toHaveAttribute('aria-valuenow', '100')
  })
})

describe('StudyCalendar', () => {
  it('renders a fixed 42-cell Monday-first calendar and complete labels', () => {
    const month = new Date(2026, 7, 1)
    render(<StudyCalendar month={month} activities={[{ date: '2026-08-03', checkinsCount: 2, studyHours: 1.5, completedChaptersCount: 3 }]} onMonthChange={vi.fn()} onSelectDate={vi.fn()} />)

    expect(getCalendarDays(month)).toHaveLength(42)
    expect(getCalendarRange(month)).toEqual({ startDate: '2026-07-27', endDate: '2026-09-06' })
    expect(screen.getAllByRole('button', { name: /2026年.*月.*日/ })).toHaveLength(42)
    expect(screen.getByRole('button', { name: /2026年8月3日.*1.5 小时，2 次打卡，3 章/ })).toBeInTheDocument()
  })

  it('shows empty-range copy and exposes a date action', () => {
    render(<StudyCalendar month={new Date(2026, 7, 1)} activities={[]} onMonthChange={vi.fn()} onSelectDate={vi.fn()} />)
    expect(screen.getByText('这个范围还没有学习记录。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '记录今天' })).toBeInTheDocument()
  })

  it('uses browser-local date formatting for selected dates', () => {
    const onSelectDate = vi.fn()
    const date = new Date(2026, 7, 3)
    render(<StudyCalendar month={date} activities={[]} onMonthChange={vi.fn()} onSelectDate={onSelectDate} />)
    screen.getByRole('button', { name: /2026年8月3日/ }).click()
    expect(onSelectDate).toHaveBeenCalledWith(formatLocalDate(date))
  })
})
