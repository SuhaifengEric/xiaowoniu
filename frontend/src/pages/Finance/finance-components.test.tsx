import { render, screen } from '@testing-library/react'
import { ExpenseCategory, PaymentMethod } from '@xiaowoniu/shared'
import { describe, expect, it, vi } from 'vitest'
import { ExpenseList } from '@/components/finance/ExpenseList'
import { FinanceSummary } from '@/components/finance/FinanceSummary'
import { SavingPlanList } from '@/components/finance/SavingPlanList'

const expense = { id: 'expense-1', userId: 'user-1', date: '2026-07-31', amount: 120.5, category: ExpenseCategory.FOOD, paymentMethod: PaymentMethod.ALIPAY, notes: '午餐', createdAt: 'created', updatedAt: 'updated' }
const summary = { month: '2026-07', totalExpense: 120.5, expenseCount: 1, budget: { id: 'budget-1', month: '2026-07', amount: 100, spent: 120.5, remaining: -20.5, usedPercentage: 100, createdAt: 'created', updatedAt: 'updated' }, categoryBreakdown: [{ category: ExpenseCategory.FOOD, amount: 120.5, percentage: 100, count: 1 }, { category: ExpenseCategory.TRANSPORT, amount: 0, percentage: 0, count: 0 }], dailyBreakdown: [] }
const completedPlan = { id: 'plan-1', userId: 'user-1', name: '旅行基金', targetAmount: 1000, currentAmount: 1000, targetDate: '2026-12-31', progressPercentage: 100, remainingAmount: 0, isCompleted: true, createdAt: 'created', updatedAt: 'updated' }

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
})
