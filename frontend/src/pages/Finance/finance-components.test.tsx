import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseCategory, PaymentMethod } from '@xiaowoniu/shared'
import { describe, expect, it, vi } from 'vitest'
import { ExpenseList } from '@/components/finance/ExpenseList'
import { FinanceSummary } from '@/components/finance/FinanceSummary'
import { SavingPlanList } from '@/components/finance/SavingPlanList'
import SavingDepositList from '@/components/finance/SavingDepositList'

const expense = { id: 'expense-1', userId: 'user-1', date: '2026-07-31', amount: 120.5, category: ExpenseCategory.FOOD, paymentMethod: PaymentMethod.ALIPAY, notes: '午餐', createdAt: 'created', updatedAt: 'updated' }
const summary = { month: '2026-07', totalExpense: 120.5, expenseCount: 1, budget: { id: 'budget-1', month: '2026-07', amount: 100, spent: 120.5, remaining: -20.5, usedPercentage: 100, createdAt: 'created', updatedAt: 'updated' }, categoryBreakdown: [{ category: ExpenseCategory.FOOD, amount: 120.5, percentage: 100, count: 1 }, { category: ExpenseCategory.TRANSPORT, amount: 0, percentage: 0, count: 0 }], dailyBreakdown: [] }
const completedPlan = { id: 'plan-1', userId: 'user-1', name: '旅行基金', targetAmount: 1000, currentAmount: 1000, depositCount: 2, targetDate: '2026-12-31', progressPercentage: 100, remainingAmount: 0, isCompleted: true, createdAt: 'created', updatedAt: 'updated' }
const deposits = [
  { id: 'deposit-1', savingPlanId: 'plan-1', amount: 100, date: '2026-08-14', notes: '固定存入', source: 'manual' as const, createdAt: 'created', updatedAt: 'updated' },
  { id: 'deposit-2', savingPlanId: 'plan-1', amount: 50, date: null, notes: null, source: 'legacy_import' as const, createdAt: 'created', updatedAt: 'updated' },
]

describe('Finance display components', () => {
  it('shows overspending and backend category totals', () => {
    render(<FinanceSummary summary={summary} loading={false} onEditBudget={vi.fn()} />)
    expect(screen.getByText('已超支')).toBeInTheDocument()
    expect(screen.getByText('餐饮')).toBeInTheDocument()
    expect(screen.getAllByText('¥120.50')).toHaveLength(2)
    expect(screen.getByText('¥-20.50')).toBeInTheDocument()
    expect(screen.getByLabelText('每日支出趋势')).toHaveTextContent('暂无每日支出数据')
  })

  it('renders expense empty state and record edit/delete controls', () => {
    const onCreate = vi.fn()
    render(<ExpenseList expenses={[]} loading={false} onCreate={onCreate} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('本月还没有消费记录')).toBeInTheDocument()
    render(<ExpenseList expenses={[expense]} loading={false} onCreate={onCreate} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('¥120.50')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '编辑2026年7月31日消费' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '删除2026年7月31日消费' })).toBeInTheDocument()
  })

  it('renders saving progress and completed state', () => {
    render(<SavingPlanList plans={[completedPlan]} loading={false} onCreate={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('已完成')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: '旅行基金进度 100%' })).toHaveAttribute('aria-valuenow', '100')
  })

  it('keeps saving a deposit as the primary action and loads history only when expanded', async () => {
    const user = userEvent.setup()
    const onDeposit = vi.fn()
    const onLoadDeposits = vi.fn()
    render(<SavingPlanList plans={[completedPlan]} loading={false} onCreate={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onDeposit={onDeposit} onLoadDeposits={onLoadDeposits} />)

    expect(screen.getByRole('button', { name: '存一笔' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '查看存入记录' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('还没有存入记录，存下第一笔吧')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '存一笔' }))
    expect(onDeposit).toHaveBeenCalledWith(completedPlan)
    await user.click(screen.getByRole('button', { name: '查看存入记录' }))
    expect(onLoadDeposits).toHaveBeenCalledWith('plan-1')
    expect(screen.getByRole('button', { name: '收起存入记录' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('还没有存入记录，存下第一笔吧')).toBeInTheDocument()
  })

  it('shows deposit history, legacy source, and pagination controls', async () => {
    const user = userEvent.setup()
    const onLoadMore = vi.fn()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(<SavingDepositList planId="plan-1" deposits={deposits} loading={false} hasMore error={null} onCreate={vi.fn()} onLoadMore={onLoadMore} onEdit={onEdit} onDelete={onDelete} />)

    expect(screen.getByText('2026年8月14日')).toBeInTheDocument()
    expect(screen.getByText('日期未知')).toBeInTheDocument()
    expect(screen.getByText('历史金额')).toBeInTheDocument()
    expect(screen.getByText('固定存入')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '加载更多存入记录' }))
    expect(onLoadMore).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: '编辑2026年8月14日存入记录' }))
    expect(onEdit).toHaveBeenCalledWith(deposits[0])
    await user.click(screen.getByRole('button', { name: '删除日期未知存入记录' }))
    expect(onDelete).toHaveBeenCalledWith(deposits[1])
  })

  it('keeps visible history while a page refresh is loading and exposes errors', () => {
    render(<SavingDepositList planId="plan-1" deposits={[deposits[0]]} loading hasMore={false} error="历史刷新失败" onCreate={vi.fn()} onLoadMore={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('region', { name: '存入记录' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('2026年8月14日')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('历史刷新失败')
  })
})
