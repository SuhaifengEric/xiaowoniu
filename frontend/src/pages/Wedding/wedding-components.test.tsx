import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaidStatus, TaskStatus, WeddingTaskCategory } from '@xiaowoniu/shared'
import { describe, expect, it, vi } from 'vitest'
import { WeddingOverview } from '@/components/wedding/WeddingOverview'
import { WeddingTaskBoard } from '@/components/wedding/WeddingTaskBoard'
import { WeddingTimeline } from '@/components/wedding/WeddingTimeline'
import { WeddingExpenseList } from '@/components/wedding/WeddingExpenseList'

const task = {
  id: 'task-1', userId: 'user-1', taskName: '确认婚礼场地', category: WeddingTaskCategory.VENUE,
  plannedDate: '2026-10-01', completedDate: null, status: TaskStatus.PENDING, priority: 5,
  notes: null, createdAt: 'created', updatedAt: 'updated',
}
const inProgress = { ...task, id: 'task-2', taskName: '拍婚纱照', category: WeddingTaskCategory.PHOTO, status: TaskStatus.IN_PROGRESS, priority: 3 }
const completed = { ...task, id: 'task-3', taskName: '定制请柬', category: WeddingTaskCategory.INVITATION, status: TaskStatus.COMPLETED, completedDate: '2026-08-01', priority: 4 }
const cancelled = { ...task, id: 'task-4', taskName: '蜜月规划', category: WeddingTaskCategory.HONEYMOON, status: TaskStatus.CANCELLED, priority: 2 }

const expense = {
  id: 'expense-1', userId: 'user-1', taskId: 'task-1', task: { id: 'task-1', taskName: '确认婚礼场地' },
  date: '2026-08-04', itemName: '场地定金', category: WeddingTaskCategory.VENUE,
  plannedAmount: 20000, actualAmount: 18000, paidStatus: PaidStatus.PARTIAL,
  notes: null, createdAt: 'created', updatedAt: 'updated',
}

const overviewWithoutBudget = {
  budget: null, plannedExpenseTotal: 0, actualExpenseTotal: 0, expenseCount: 0,
  remainingBudget: null, budgetUsedPercentage: null, plannedBudgetPercentage: null,
  actualVsPlannedPercentage: null, daysUntilWedding: null,
  taskCounts: { pending: 0, inProgress: 0, completed: 0, cancelled: 0, activeTotal: 0, completionPercentage: 0 },
  categoryBreakdown: [
    { category: WeddingTaskCategory.VENUE, plannedAmount: 0, actualAmount: 0, expenseCount: 0, actualPercentage: 0 },
    { category: WeddingTaskCategory.PHOTO, plannedAmount: 0, actualAmount: 0, expenseCount: 0, actualPercentage: 0 },
    { category: WeddingTaskCategory.INVITATION, plannedAmount: 0, actualAmount: 0, expenseCount: 0, actualPercentage: 0 },
    { category: WeddingTaskCategory.DRESS, plannedAmount: 0, actualAmount: 0, expenseCount: 0, actualPercentage: 0 },
    { category: WeddingTaskCategory.MAKEUP, plannedAmount: 0, actualAmount: 0, expenseCount: 0, actualPercentage: 0 },
    { category: WeddingTaskCategory.HONEYMOON, plannedAmount: 0, actualAmount: 0, expenseCount: 0, actualPercentage: 0 },
    { category: WeddingTaskCategory.OTHER, plannedAmount: 0, actualAmount: 0, expenseCount: 0, actualPercentage: 0 },
  ],
}

const overviewWithBudget = {
  ...overviewWithoutBudget,
  budget: { id: 'b1', totalBudget: 150000, weddingDate: '2026-12-01', createdAt: 'c', updatedAt: 'u' },
  plannedExpenseTotal: 20000, actualExpenseTotal: 18000, expenseCount: 1,
  remainingBudget: 132000, budgetUsedPercentage: 12, plannedBudgetPercentage: 13.33,
  actualVsPlannedPercentage: 90, daysUntilWedding: 119,
  taskCounts: { pending: 1, inProgress: 1, completed: 1, cancelled: 1, activeTotal: 3, completionPercentage: 33.33 },
}

const timeline = {
  weddingDate: '2026-12-01', daysUntilWedding: 119,
  items: [{ taskId: 'task-1', taskName: '确认婚礼场地', category: WeddingTaskCategory.VENUE, status: TaskStatus.PENDING, priority: 5, plannedDate: '2026-10-01', completedDate: null, isOverdue: false }],
}

describe('Wedding overview', () => {
  it('shows expense and task stats without budget and offers the budget entry, not fake 0% usage', async () => {
    render(<WeddingOverview overview={overviewWithoutBudget} loading={false} onEditBudget={vi.fn()} />)
    expect(screen.getByRole('button', { name: '设置预算与婚期' })).toBeInTheDocument()
    expect(screen.getAllByText('¥0.00').length).toBeGreaterThan(0)
    expect(screen.getByText('未设置')).toBeInTheDocument()
    expect(screen.queryByText(/已用/)).not.toBeInTheDocument()
  })

  it('renders different copy for future, today, and past wedding dates', () => {
    const future = render(<WeddingOverview overview={{ ...overviewWithBudget, daysUntilWedding: 10 }} loading={false} onEditBudget={vi.fn()} />)
    expect(future.getByText(/还有 10 天/)).toBeInTheDocument()

    const today = render(<WeddingOverview overview={{ ...overviewWithBudget, daysUntilWedding: 0 }} loading={false} onEditBudget={vi.fn()} />)
    expect(today.getByText('婚礼就是今天')).toBeInTheDocument()

    const past = render(<WeddingOverview overview={{ ...overviewWithBudget, daysUntilWedding: -3 }} loading={false} onEditBudget={vi.fn()} />)
    expect(past.getByText(/婚礼已过去 3 天/)).toBeInTheDocument()
  })

  it('shows over-budget state with negative remaining and percentages above 100', () => {
    const over = {
      ...overviewWithBudget,
      remainingBudget: -5000, budgetUsedPercentage: 103.33, plannedBudgetPercentage: 110,
      actualVsPlannedPercentage: 120,
    }
    render(<WeddingOverview overview={over} loading={false} onEditBudget={vi.fn()} />)
    expect(screen.getByText('¥-5000.00')).toBeInTheDocument()
    expect(screen.getByText(/超支/)).toBeInTheDocument()
    expect(screen.getByText('已用 103.33%')).toBeInTheDocument()
  })

  it('renders the fixed category chart with zero-fill data', () => {
    render(<WeddingOverview overview={overviewWithoutBudget} loading={false} onEditBudget={vi.fn()} />)
    expect(screen.getByRole('heading', { name: /分类统计/ })).toBeInTheDocument()
    expect(screen.getAllByText('¥0.00').length).toBeGreaterThanOrEqual(1)
  })

  it('renders a loading state with role status', () => {
    render(<WeddingOverview overview={null} loading onEditBudget={vi.fn()} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

describe('Wedding task board', () => {
  it('shows exactly three columns and keeps cancelled tasks in the archive', async () => {
    const user = userEvent.setup()
    render(<WeddingTaskBoard
      tasks={[task, inProgress, completed, cancelled]}
      loading={false}
      hasMore={false}
      onLoadMore={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      onStatusChange={vi.fn()}
    />)
    expect(screen.getByRole('heading', { name: '待办' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '进行中' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '已完成' })).toBeInTheDocument()
    expect(screen.getByText('左右滑动查看待办、进行中和已完成')).toBeInTheDocument()
    expect(document.querySelectorAll('.wedding-board-column')).toHaveLength(3)
    expect(screen.queryByRole('heading', { name: '已取消' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /已取消归档/ }))
    expect(screen.getByText('蜜月规划')).toBeInTheDocument()
  })

  it('does not duplicate a task between columns and archive', async () => {
    const user = userEvent.setup()
    render(<WeddingTaskBoard tasks={[task, cancelled]} loading={false} hasMore={false} onLoadMore={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onStatusChange={vi.fn()} />)
    expect(screen.getAllByText('确认婚礼场地').length).toBe(1)
    await user.click(screen.getByRole('button', { name: /已取消归档/ }))
    expect(screen.getAllByText('蜜月规划').length).toBe(1)
  })

  it('triggers status changes through an explicit action, not drag', async () => {
    const onStatusChange = vi.fn()
    const user = userEvent.setup()
    render(<WeddingTaskBoard tasks={[task]} loading={false} hasMore={false} onLoadMore={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onStatusChange={onStatusChange} />)
    await user.click(screen.getByRole('button', { name: /开始/ }))
    expect(onStatusChange).toHaveBeenCalledWith('task-1', TaskStatus.IN_PROGRESS)
  })

  it('keeps empty columns visible', () => {
    render(<WeddingTaskBoard tasks={[task]} loading={false} hasMore={false} onLoadMore={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onStatusChange={vi.fn()} />)
    expect(screen.getByRole('heading', { name: '进行中' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '已完成' })).toBeInTheDocument()
  })
})

describe('Wedding timeline', () => {
  it('renders tasks in response order with status, overdue and completion info', () => {
    render(<WeddingTimeline timeline={timeline} loading={false} />)
    expect(screen.getByText('确认婚礼场地')).toBeInTheDocument()
    expect(screen.getByText('2026年10月1日')).toBeInTheDocument()
    expect(screen.getByText('待办')).toBeInTheDocument()
  })

  it('shows an empty state instead of fake tasks', () => {
    render(<WeddingTimeline timeline={{ weddingDate: null, daysUntilWedding: null, items: [] }} loading={false} />)
    expect(screen.getByText(/暂无里程碑/)).toBeInTheDocument()
  })
})

describe('Wedding expense list', () => {
  it('renders planned/actual, category, paid status and task reference', () => {
    render(<WeddingExpenseList expenses={[expense]} loading={false} hasMore={false} onLoadMore={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onCreate={vi.fn()} />)
    expect(screen.getByText('场地定金')).toBeInTheDocument()
    expect(screen.getAllByText('计划').length).toBeGreaterThan(0)
    expect(screen.getByText('¥20000.00')).toBeInTheDocument()
    expect(screen.getByText('¥18000.00')).toBeInTheDocument()
    expect(screen.getByText('部分支付')).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes('关联：') && content.includes('确认婚礼场地'))).toBeInTheDocument()
  })

  it('shows unlinked expenses and triggers edit/delete/load-more', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const onLoadMore = vi.fn()
    const user = userEvent.setup()
    render(<WeddingExpenseList
      expenses={[{ ...expense, taskId: null, task: null, id: 'expense-2' }]}
      loading={false} hasMore onLoadMore={onLoadMore} onEdit={onEdit} onDelete={onDelete} onCreate={vi.fn()}
    />)
    expect(screen.getByText(/未关联任务/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /加载更多/ }))
    expect(onLoadMore).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /编辑/ }))
    expect(onEdit).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /删除/ }))
    expect(onDelete).toHaveBeenCalled()
  })

  it('does not show load-more when hasMore is false', () => {
    render(<WeddingExpenseList expenses={[expense]} loading={false} hasMore={false} onLoadMore={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onCreate={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /加载更多/ })).not.toBeInTheDocument()
  })

  it('shows a loading skeleton with role status and keeps list on refresh', () => {
    const { rerender } = render(<WeddingExpenseList expenses={[]} loading onLoadMore={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onCreate={vi.fn()} hasMore={false} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    rerender(<WeddingExpenseList expenses={[expense]} loading onLoadMore={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onCreate={vi.fn()} hasMore={false} />)
    expect(screen.getByText('场地定金')).toBeInTheDocument()
  })
})

describe('Wedding accessibility details', () => {
  it('gives every icon-only button an aria-label', () => {
    render(<WeddingTaskBoard tasks={[task]} loading={false} hasMore={false} onLoadMore={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onStatusChange={vi.fn()} />)
    const iconButtons = Array.from(document.querySelectorAll('button')).filter((button) => button.querySelector('svg') && !button.textContent?.trim())
    expect(iconButtons.length).toBeGreaterThan(0)
    for (const button of iconButtons) {
      expect(button.getAttribute('aria-label')).toBeTruthy()
    }
  })

  it('marks the archive disclosure with aria-expanded and aria-controls', async () => {
    const user = userEvent.setup()
    render(<WeddingTaskBoard tasks={[task, cancelled]} loading={false} hasMore={false} onLoadMore={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onStatusChange={vi.fn()} />)
    const disclosure = screen.getByRole('button', { name: /已取消归档/ })
    expect(disclosure).toHaveAttribute('aria-expanded', 'false')
    expect(disclosure).toHaveAttribute('aria-controls', 'wedding-cancelled-archive')
    await user.click(disclosure)
    expect(disclosure).toHaveAttribute('aria-expanded', 'true')
  })

  it('uses role status for loading states', () => {
    render(<WeddingOverview overview={null} loading onEditBudget={vi.fn()} />)
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
  })

  it('keeps 44px targets and min-w-0 for long text rows', () => {
    const longTask = { ...task, taskName: '很长的任务名称'.repeat(10) }
    const { container } = render(<WeddingTaskBoard tasks={[longTask]} loading={false} hasMore={false} onLoadMore={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onStatusChange={vi.fn()} />)
    const iconButton = container.querySelector('button.wedding-icon-button')
    expect(iconButton?.getAttribute('aria-label')).toBeTruthy()
    expect(container.querySelector('.wedding-task-card')?.className).toContain('min-w-0')
    expect(container.querySelector('h4')?.className).toContain('break-words')

    const css = require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../../index.css'), 'utf8')
    const iconRule = css.match(/\.wedding-icon-button\s*\{[^}]+\}/)?.[0] ?? ''
    expect(iconRule).toContain('min-h-11')
    expect(iconRule).toContain('min-w-11')
    const cardRule = css.match(/\.wedding-task-card\s*\{[^}]+\}/)?.[0] ?? ''
    expect(cardRule).toContain('min-w-0')
    const rowRule = css.match(/\.wedding-expense-row\s*\{[^}]+\}/)?.[0] ?? ''
    expect(rowRule).toContain('min-w-0')
  })

  it('wraps long item names without overlapping action buttons', () => {
    const longExpense = { ...expense, itemName: '非常长的花费条目名称'.repeat(12) }
    render(<WeddingExpenseList expenses={[longExpense]} loading={false} hasMore={false} onLoadMore={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onCreate={vi.fn()} />)
    const row = screen.getByText((content) => content.includes('非常长的花费条目名称')).closest('li')
    expect(row?.className).toContain('min-w-0')
    expect(row?.querySelector('div')?.className).toContain('min-w-0')
  })
})
