import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaidStatus, TaskStatus, WeddingTaskCategory } from '@xiaowoniu/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WeddingTaskDialog from './WeddingTaskDialog'
import WeddingExpenseDialog from './WeddingExpenseDialog'
import WeddingBudgetDialog from './WeddingBudgetDialog'
import WeddingDeleteDialog from './WeddingDeleteDialog'

const task = {
  id: 'task-1', userId: 'user-1', taskName: '确认婚礼场地', category: WeddingTaskCategory.VENUE,
  plannedDate: '2026-10-01', completedDate: null, status: TaskStatus.PENDING, priority: 3,
  notes: '确认档期', createdAt: 'created', updatedAt: 'updated',
}
const expense = {
  id: 'expense-1', userId: 'user-1', taskId: 'task-1', task: { id: 'task-1', taskName: '确认婚礼场地' },
  date: '2026-08-04', itemName: '场地定金', category: WeddingTaskCategory.VENUE,
  plannedAmount: 20000, actualAmount: 18000, paidStatus: PaidStatus.PARTIAL,
  notes: '已支付首期', createdAt: 'created', updatedAt: 'updated',
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

describe('Wedding dialogs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a task with defaults and trims the name', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<WeddingTaskDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('任务名称'), '  确认婚礼场地  ')
    await user.click(screen.getByRole('combobox', { name: '任务类别' }))
    await user.click(await screen.findByRole('option', { name: '场地' }))
    await user.click(screen.getByRole('button', { name: '保存任务' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      taskName: '确认婚礼场地', category: WeddingTaskCategory.VENUE, status: TaskStatus.PENDING, priority: 3,
    })))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('prefills editing task and does not show a completedDate input', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<WeddingTaskDialog open task={task} onOpenChange={vi.fn()} onSubmit={onSubmit} />)
    expect(screen.getByLabelText('任务名称')).toHaveValue('确认婚礼场地')
    expectDateValue('计划日期', '2026-10-01')
    expect(screen.queryByLabelText('完成日期')).not.toBeInTheDocument()
  })

  it('clears plannedDate and notes to null when submitting empty values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<WeddingTaskDialog open task={task} onOpenChange={vi.fn()} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: '清除计划日期' }))
    await user.clear(screen.getByLabelText('备注'))
    await user.click(screen.getByRole('button', { name: '保存任务' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ plannedDate: null, notes: null })))
  })

  it('rejects blank task names and keeps the dialog open on submit failure', async () => {
    let reject!: (error: Error) => void
    const onSubmit = vi.fn().mockImplementation(() => new Promise((_, nextReject) => { reject = nextReject }))
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<WeddingTaskDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: '保存任务' }))
    expect(screen.getByText('请输入任务名称')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('任务名称'), '拍婚纱照')
    await user.click(screen.getByRole('combobox', { name: '任务类别' }))
    await user.click(await screen.findByRole('option', { name: '婚纱照' }))
    await user.click(screen.getByRole('button', { name: '保存任务' }))
    expect(screen.getByRole('button', { name: '保存中…' })).toBeDisabled()
    reject(new Error('服务端错误'))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('服务端错误'))
    expect(screen.getByLabelText('任务名称')).toHaveValue('拍婚纱照')
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('submits a task status change without a completedDate', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<WeddingTaskDialog open task={{ ...task, status: TaskStatus.PENDING }} onOpenChange={vi.fn()} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: '保存任务' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ status: TaskStatus.PENDING })))
    expect(JSON.stringify(onSubmit.mock.calls[0][0])).not.toContain('completedDate')
  })

  it('creates an expense with explicit category, amounts, and optional task link', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<WeddingExpenseDialog open tasks={[task]} onOpenChange={vi.fn()} onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('条目名称'), '场地定金')
    await selectDate(user, '花费日期', '2026-08-04')
    await user.type(screen.getByLabelText('计划金额'), '20000')
    await user.type(screen.getByLabelText('实际金额'), '18000')
    await user.click(screen.getByRole('combobox', { name: '花费类别' }))
    await user.click(await screen.findByRole('option', { name: '场地' }))
    await user.click(screen.getByRole('combobox', { name: '支付状态' }))
    await user.click(await screen.findByRole('option', { name: '已支付' }))
    await user.click(screen.getByRole('button', { name: '保存花费' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      itemName: '场地定金', plannedAmount: 20000, actualAmount: 18000,
      category: WeddingTaskCategory.VENUE, paidStatus: PaidStatus.PAID,
    })))
  }, 15_000)

  it('prefills editing expense and unlinks task with null', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<WeddingExpenseDialog open tasks={[task]} expense={expense} onOpenChange={vi.fn()} onSubmit={onSubmit} />)
    expect(screen.getByLabelText('条目名称')).toHaveValue('场地定金')
    expect(screen.getByLabelText('计划金额')).toHaveValue('20000')
    await user.click(screen.getByRole('button', { name: '解除任务关联' }))
    await user.click(screen.getByRole('button', { name: '保存花费' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ taskId: null })))
  })

  it('rejects three-decimal and negative amounts without submitting', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<WeddingExpenseDialog open tasks={[]} onOpenChange={vi.fn()} onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('条目名称'), '定金')
    await user.type(screen.getByLabelText('计划金额'), '1.234')
    await user.click(screen.getByRole('button', { name: '保存花费' }))
    await waitFor(() => expect(screen.getByText('金额最多保留两位小数')).toBeInTheDocument())
    expect(onSubmit).not.toHaveBeenCalled()

    await user.clear(screen.getByLabelText('计划金额'))
    await user.type(screen.getByLabelText('计划金额'), '-5')
    await user.click(screen.getByRole('button', { name: '保存花费' }))
    await waitFor(() => expect(screen.getByLabelText('计划金额')).toHaveAttribute('aria-invalid', 'true'))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits a budget with both fields and supports zero budget', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<WeddingBudgetDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('总预算'), '0')
    await selectDate(user, '婚礼日期', '2026-12-01')
    await user.click(screen.getByRole('button', { name: '保存预算' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ totalBudget: 0, weddingDate: '2026-12-01' }))
  }, 15_000)

  it('prefills budget values when editing and keeps input on failure', async () => {
    let reject!: (error: Error) => void
    const onSubmit = vi.fn().mockImplementation(() => new Promise((_, nextReject) => { reject = nextReject }))
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<WeddingBudgetDialog open budget={{ id: 'b1', totalBudget: 150000, weddingDate: '2026-12-01', createdAt: 'c', updatedAt: 'u' }} onOpenChange={onOpenChange} onSubmit={onSubmit} />)
    expect(screen.getByLabelText('总预算')).toHaveValue('150000')
    expectDateValue('婚礼日期', '2026-12-01')
    await user.click(screen.getByRole('button', { name: '保存预算' }))
    reject(new Error('保存失败'))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('保存失败'))
    expect(screen.getByLabelText('总预算')).toHaveValue('150000')
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('cancels delete without confirming and confirms only once', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<WeddingDeleteDialog open resource="task" onOpenChange={onOpenChange} onConfirm={onConfirm} />)
    expect(screen.getByText(/关联花费会保留并解除关联/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)

    render(<WeddingDeleteDialog open resource="task" onOpenChange={vi.fn()} onConfirm={onConfirm} />)
    await user.click(screen.getByRole('button', { name: '确认删除' }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
  })
})
