import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ExamDialog from './ExamDialog'
import SubjectDialog from './SubjectDialog'
import StudyCheckinDialog from './StudyCheckinDialog'
import DeleteConfirmationDialog from './DeleteConfirmationDialog'

const exam = {
  id: 'exam-1',
  userId: 'user-1',
  examName: '原考试',
  examDate: '2026-12-01',
  isArchived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const subject = {
  id: 'subject-1',
  userId: 'user-1',
  examId: 'exam-1',
  subjectName: '数学',
  totalChapters: 20,
  currentChapter: 5,
  progressPercentage: 25,
  targetCompletionDate: '2026-11-01',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function openSubjectSelect(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getByRole('combobox', { name: '科目' }))
}

async function chooseSubject(user: ReturnType<typeof userEvent.setup>) {
  await openSubjectSelect(user)
  await user.click(await screen.findByRole('option', { name: /数学（共 20 章）/ }))
}

function dateLabel(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return `${year}年${month}月${day}日`
}

function expectDateValue(label: string, value: string) {
  expect(screen.getByLabelText(label)).toHaveTextContent(dateLabel(value))
}

async function selectDate(user: ReturnType<typeof userEvent.setup>, label: string, value: string) {
  const [year, month] = value.split('-').map(Number)
  const targetMonth = year * 12 + month
  const targetDay = dateLabel(value)
  await user.click(screen.getByLabelText(label))

  for (let attempts = 0; attempts < 120; attempts += 1) {
    const day = screen.queryByRole('button', { name: targetDay })
    if (day) {
      await user.click(day)
      return
    }
    const currentMonth = screen.getByRole('grid').getAttribute('aria-label')
    const match = currentMonth?.match(/^(\d+)年(\d+)月$/)
    if (!match) throw new Error('日期选择器月份格式异常')
    const current = Number(match[1]) * 12 + Number(match[2])
    await user.click(screen.getByRole('button', { name: current < targetMonth ? '下个月' : '上个月' }))
  }

  throw new Error(`未找到日期 ${value}`)
}

describe('ExamDialog', () => {
  it('rejects blank names and invalid dates with ARIA-linked errors', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ExamDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: '创建考试' }))

    expect(screen.getByText('请输入考试名称')).toBeInTheDocument()
    expect(screen.getByText('请输入合法日期')).toBeInTheDocument()
    expect(screen.getByLabelText('考试名称')).toHaveAttribute('aria-describedby', 'exam-name-error')
    expect(screen.getByLabelText('考试日期')).toHaveAttribute('aria-describedby', 'exam-date-error')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('prefills edit fields and preserves them in the update request', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()
    render(<ExamDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} exam={exam} />)

    expect(screen.getByRole('dialog', { name: '编辑考试' })).toBeInTheDocument()
    expect(screen.getByLabelText('考试名称')).toHaveValue('原考试')
    expectDateValue('考试日期', '2026-12-01')
    expect(screen.getByLabelText('归档考试')).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: '保存考试' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      examName: '原考试', examDate: '2026-12-01', isArchived: false,
    }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('keeps the form open and shows submit failures', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('考试保存失败'))
    const onOpenChange = vi.fn()
    render(<ExamDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('考试名称'), '新考试')
    await selectDate(user, '考试日期', '2026-12-01')
    await user.click(screen.getByRole('button', { name: '创建考试' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('考试保存失败')
    expect(screen.getByRole('dialog', { name: '新建考试' })).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})

describe('SubjectDialog', () => {
  it('shows the selected exam and rejects totals below completed chapters', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SubjectDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} exam={exam} subject={subject} />)

    expect(screen.getByText('所属考试：原考试')).toBeInTheDocument()
    expect(screen.getByLabelText('科目名称')).toHaveValue('数学')
    expect(screen.getByLabelText('总章节数')).toHaveValue(20)
    expectDateValue('目标完成日期（可选）', '2026-11-01')

    const chapters = screen.getByLabelText('总章节数')
    await user.clear(chapters)
    await user.type(chapters, '4')
    await user.click(screen.getByRole('button', { name: '保存科目' }))

    expect(await screen.findByText('总章节数不能少于已完成章节数 5')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('preserves edit fields and sends null when the target date is cleared', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<SubjectDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} exam={exam} subject={subject} />)

    await user.click(screen.getByRole('button', { name: '清除目标完成日期' }))
    await user.click(screen.getByRole('button', { name: '保存科目' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      subjectName: '数学', totalChapters: 20, targetCompletionDate: null,
    }))
  })

  it('does not submit a new subject without an exam', async () => {
    const onSubmit = vi.fn()
    render(<SubjectDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} exam={null} />)

    expect(screen.getByText('请先选择考试。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '创建科目' })).toBeDisabled()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('StudyCheckinDialog', () => {
  it('parses trimmed chapter input and sends numeric values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()
    render(<StudyCheckinDialog
      open
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      subjects={[subject]}
      initialDate="2026-07-31"
    />)

    await chooseSubject(user)
    await user.type(screen.getByLabelText('完成章节'), ' 1, 2,3 ')
    await user.type(screen.getByLabelText('学习时长（小时）'), '1.25')
    await user.click(screen.getByRole('button', { name: '保存打卡' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      subjectId: 'subject-1', date: '2026-07-31', completedChapters: [1, 2, 3], studyHours: 1.25,
    }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it.each([
    ['重复章节', '1,2,2', '章节不能重复'],
    ['空项', '1,,2', '章节输入不能包含空项'],
    ['小数章节', '1,1.5', '章节必须为正整数，并使用逗号分隔'],
    ['超出总章节', '1,21', '章节不能超过该科目总章节数 20'],
  ])('rejects %s', async (_label, value, message) => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<StudyCheckinDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} subjects={[subject]} initialDate="2026-07-31" />)

    await chooseSubject(user)
    await user.type(screen.getByLabelText('完成章节'), value)
    await user.type(screen.getByLabelText('学习时长（小时）'), '1')
    await user.click(screen.getByRole('button', { name: '保存打卡' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps the dialog open when saving fails', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('打卡保存失败'))
    const onOpenChange = vi.fn()
    render(<StudyCheckinDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} subjects={[subject]} initialDate="2026-07-31" />)

    await chooseSubject(user)
    await user.type(screen.getByLabelText('完成章节'), '1')
    await user.type(screen.getByLabelText('学习时长（小时）'), '1')
    await user.click(screen.getByRole('button', { name: '保存打卡' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('打卡保存失败')
    expect(screen.getByRole('dialog', { name: '学习打卡' })).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})

describe('DeleteConfirmationDialog', () => {
  it('cancels without invoking the action and confirms with a locked state', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn(() => Promise.resolve())
    const onOpenChange = vi.fn()
    const { rerender } = render(<DeleteConfirmationDialog
      open
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="确认删除考试"
      description="删除考试会同时删除所有科目和学习记录。"
    />)

    expect(screen.getByText('删除考试会同时删除所有科目和学习记录。')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)

    await user.click(screen.getByRole('button', { name: '确认删除' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    rerender(<DeleteConfirmationDialog
      open
      submitting
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="确认删除考试"
      description="删除考试会同时删除所有科目和学习记录。"
    />)
    expect(screen.getByRole('button', { name: '删除中…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled()
  })
})
