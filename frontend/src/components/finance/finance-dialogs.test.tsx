import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseCategory, PaymentMethod } from '@xiaowoniu/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExpenseDialog from './ExpenseDialog'
import BudgetDialog from './BudgetDialog'
import SavingPlanDialog from './SavingPlanDialog'
import FinanceDeleteDialog from './FinanceDeleteDialog'

const expense = { id: 'expense-1', userId: 'user-1', date: '2026-07-31', amount: 28.5, category: ExpenseCategory.FOOD, paymentMethod: PaymentMethod.ALIPAY, notes: '午餐', createdAt: 'created', updatedAt: 'updated' }
const plan = { id: 'plan-1', userId: 'user-1', name: '旅行基金', targetAmount: 500, currentAmount: 250, targetDate: '2026-12-31', progressPercentage: 50, remainingAmount: 250, isCompleted: false, createdAt: 'created', updatedAt: 'updated' }

function expectDateValue(label: string, value: string) {
  const [year, month, day] = value.split('-').map(Number)
  expect(screen.getByLabelText(label)).toHaveTextContent(`${year}年${month}月${day}日`)
}

describe('Finance dialogs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects blank and three-decimal expense amounts with linked errors', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<ExpenseDialog open onOpenChange={vi.fn()} initialDate="2026-07-31" onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: '保存消费' }))
    await waitFor(() => expect(screen.getByLabelText('金额')).toHaveAttribute('aria-invalid', 'true'))
    expect(screen.getByText('请输入有效金额')).toBeInTheDocument()
    await user.type(screen.getByLabelText('金额'), '1.234')
    await waitFor(() => expect(screen.getByText('金额最多保留两位小数')).toBeInTheDocument())
    expect(screen.getByLabelText('金额')).toHaveAttribute('aria-describedby', 'finance-expense-amount-error')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits selected expense values and maps an edited blank note to null', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<ExpenseDialog open expense={expense} onOpenChange={onOpenChange} onSubmit={onSubmit} />)
    expectDateValue('日期', '2026-07-31')
    expect(screen.getByLabelText('金额')).toHaveValue('28.5')
    await user.clear(screen.getByLabelText('备注'))
    await user.click(screen.getByRole('button', { name: '保存消费' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ amount: 28.5, category: ExpenseCategory.FOOD, paymentMethod: PaymentMethod.ALIPAY, notes: null })))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('submits a budget with the exact month and supports zero', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<BudgetDialog open month="2026-07" onOpenChange={vi.fn()} onSubmit={onSubmit} />)
    expect(screen.getByRole('heading', { name: '设置2026年7月预算' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('预算金额'), '0')
    await user.click(screen.getByRole('button', { name: '保存预算' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ month: '2026-07', amount: 0 }))
  })

  it('blocks a saving plan target below current amount', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<SavingPlanDialog open plan={plan} onOpenChange={vi.fn()} onSubmit={onSubmit} />)
    await user.clear(screen.getByLabelText('目标金额'))
    await user.type(screen.getByLabelText('目标金额'), '100')
    await user.click(screen.getByRole('button', { name: '保存存钱计划' }))
    expect(screen.getByRole('alert')).toHaveTextContent('目标金额不能小于已存金额')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps form input when submit rejects and locks duplicate submit', async () => {
    let reject!: (error: Error) => void
    const onSubmit = vi.fn().mockImplementation(() => new Promise((_, nextReject) => { reject = nextReject }))
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<BudgetDialog open month="2026-07" onOpenChange={onOpenChange} onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('预算金额'), '300')
    await user.click(screen.getByRole('button', { name: '保存预算' }))
    expect(screen.getByRole('button', { name: '保存中…' })).toBeDisabled()
    expect(screen.getByLabelText('预算金额')).toHaveValue('300')
    reject(new Error('预算冲突'))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('预算冲突'))
    expect(screen.getByLabelText('预算金额')).toHaveValue('300')
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('cancels delete without confirming and confirms only once', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<FinanceDeleteDialog open resource="expense" onConfirm={onConfirm} onOpenChange={onOpenChange} />)
    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(onConfirm).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '确认删除' }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce())
  })
})
