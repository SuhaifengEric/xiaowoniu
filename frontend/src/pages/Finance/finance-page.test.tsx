import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseCategory, PaymentMethod } from '@xiaowoniu/shared'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Finance from './index'

const store = vi.hoisted(() => ({
  expenses: [] as Array<Record<string, unknown>>,
  summary: null as Record<string, unknown> | null,
  budget: null as Record<string, unknown> | null,
  savingPlans: [] as Array<Record<string, unknown>>,
  selectedMonth: '2026-07',
  loading: false,
  error: null as string | null,
  fetchDashboard: vi.fn().mockResolvedValue(undefined),
  setMonth: vi.fn((month: string) => { store.selectedMonth = month }),
  createExpense: vi.fn().mockResolvedValue(undefined),
  updateExpense: vi.fn().mockResolvedValue(undefined),
  deleteExpense: vi.fn().mockResolvedValue(undefined),
  upsertBudget: vi.fn().mockResolvedValue(undefined),
  createSavingPlan: vi.fn().mockResolvedValue(undefined),
  updateSavingPlan: vi.fn().mockResolvedValue(undefined),
  deleteSavingPlan: vi.fn().mockResolvedValue(undefined),
  clearError: vi.fn(),
}))
const auth = vi.hoisted(() => ({ logout: vi.fn().mockResolvedValue(undefined) }))

vi.mock('@/store/finance.store', () => ({
  formatMonth: (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
  useFinanceStore: (selector: (state: typeof store) => unknown) => selector(store),
}))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ logout: auth.logout }) }))

const renderPage = () => render(<MemoryRouter><Finance /></MemoryRouter>)

beforeEach(() => {
  store.expenses = []
  store.summary = null
  store.budget = null
  store.savingPlans = []
  store.selectedMonth = '2026-07'
  store.loading = false
  store.error = null
  Object.values(store).forEach((value) => typeof value === 'function' && value.mockClear())
  store.fetchDashboard.mockResolvedValue(undefined)
  store.setMonth.mockImplementation((month: string) => { store.selectedMonth = month })
  store.createExpense.mockResolvedValue(undefined)
  store.updateExpense.mockResolvedValue(undefined)
  store.deleteExpense.mockResolvedValue(undefined)
  store.upsertBudget.mockResolvedValue(undefined)
  store.createSavingPlan.mockResolvedValue(undefined)
  store.updateSavingPlan.mockResolvedValue(undefined)
  store.deleteSavingPlan.mockResolvedValue(undefined)
  auth.logout.mockClear()
})

describe('Finance page', () => {
  it('loads the selected month dashboard and changes months', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(store.fetchDashboard).toHaveBeenCalledWith('2026-07'))
    await user.click(screen.getByRole('button', { name: '查看下个月' }))
    expect(store.setMonth).toHaveBeenCalledWith('2026-08')
    expect(store.fetchDashboard).toHaveBeenCalledWith('2026-08')
  })

  it('opens and cancels each finance dialog', async () => {
    const user = userEvent.setup()
    renderPage()
    for (const [button, dialog] of [
      ['记一笔', '记一笔消费'],
      ['设置预算', '设置2026年7月预算'],
      ['新建存钱计划', '新建存钱计划'],
    ]) {
      await user.click(screen.getAllByRole('button', { name: button })[0])
      expect(screen.getByRole('dialog', { name: dialog })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: '取消' }))
      expect(screen.queryByRole('dialog', { name: dialog })).not.toBeInTheDocument()
    }
  })

  it('renders store errors and successful mutation status', async () => {
    const user = userEvent.setup()
    store.error = '数据加载失败'
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent('数据加载失败')
    await user.click(screen.getByRole('button', { name: '关闭错误提示' }))
    expect(store.clearError).toHaveBeenCalledOnce()
    await user.click(screen.getAllByRole('button', { name: '设置预算' })[0])
    await user.type(screen.getByLabelText('预算金额'), '300')
    await user.click(screen.getByRole('button', { name: '保存预算' }))
    expect(await screen.findByRole('status')).toHaveTextContent('预算已更新')
  })

  it('keeps delete confirmation open after a failed deletion and does not confirm on cancel', async () => {
    const user = userEvent.setup()
    store.expenses = [{ id: 'expense-1', userId: 'user-1', date: '2026-07-31', amount: 12, category: ExpenseCategory.FOOD, paymentMethod: PaymentMethod.ALIPAY, notes: null, createdAt: '', updatedAt: '' }]
    store.deleteExpense.mockRejectedValue(new Error('删除失败'))
    renderPage()
    await user.click(screen.getByRole('button', { name: '删除2026年7月31日消费' }))
    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(store.deleteExpense).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '删除2026年7月31日消费' }))
    await user.click(screen.getByRole('button', { name: '确认删除' }))
    await waitFor(() => expect(store.deleteExpense).toHaveBeenCalledWith('expense-1'))
    expect(screen.getByRole('dialog', { name: '确认删除消费记录' })).toBeInTheDocument()
  })
})
