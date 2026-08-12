import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DashboardSummaryResponse } from '@xiaowoniu/shared'
import Dashboard from './Dashboard'

const auth = vi.hoisted(() => ({ logout: vi.fn().mockResolvedValue(undefined) }))
const dashboard = vi.hoisted(() => ({
  summary: null as DashboardSummaryResponse | null,
  loading: false,
  error: null as string | null,
  fetchSummary: vi.fn().mockResolvedValue(undefined),
  clearError: vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { username: 'tester', nickname: '测试用户' }, logout: auth.logout }),
}))
vi.mock('@/store/dashboard.store', () => ({
  useDashboardStore: (selector: (state: typeof dashboard) => unknown) => selector(dashboard),
}))

const completeSummary: DashboardSummaryResponse = {
  generatedAt: '2026-08-06T08:00:00.000Z',
  fitness: { todayCheckinCount: 2, weeklyCheckinCount: 4, weeklyTarget: 5, latestWeightKg: 61.2 },
  learning: { activeExam: { id: 'exam-1', examName: '英语考试', daysRemaining: 12 }, overallProgressPercentage: 48.5, todayStudyHours: 2.5 },
  finance: { currentMonthExpense: 1234.5, currentMonthBudget: 2000, budgetRemaining: 765.5, activeSavingPlansCount: 2 },
  wedding: { weddingDate: '2026-12-01', daysRemaining: 117, pendingTasksCount: 3, completedTasksCount: 8, budgetRemaining: -5000 },
}

beforeEach(() => {
  dashboard.summary = null
  dashboard.loading = false
  dashboard.error = null
  Object.values(dashboard).forEach((value) => typeof value === 'function' && value.mockClear())
  dashboard.fetchSummary.mockResolvedValue(undefined)
  auth.logout.mockClear()
})

describe('Dashboard', () => {
  it('loads, displays module summaries, and keeps null values distinct from zero', async () => {
    dashboard.loading = true
    const { rerender } = render(<MemoryRouter><Dashboard /></MemoryRouter>)
    expect(screen.getByRole('status')).toHaveTextContent('正在汇总')

    dashboard.loading = false
    dashboard.summary = completeSummary
    rerender(<MemoryRouter><Dashboard /></MemoryRouter>)
    expect(screen.getByText('小蜗牛的花花世界')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '世界仪表盘' })).toBeInTheDocument()
    expect(screen.queryByText('Life dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('Today at a glance')).not.toBeInTheDocument()
    expect(screen.queryByText('Go to a module')).not.toBeInTheDocument()
    expect(screen.getByText(/英语考试/)).toBeInTheDocument()
    expect(screen.getByText('¥1,234.50')).toBeInTheDocument()
    expect(screen.getByText(/还有 117 天/)).toBeInTheDocument()

    // 新版今日概览：四张合一的模块卡片
    const overviewSection = screen.getByRole('region', { name: '今日概览' })
    expect(within(overviewSection).getByText('今日运动')).toBeInTheDocument()
    // 进度环显示各模块百分比
    expect(within(overviewSection).getByText('80%')).toBeInTheDocument()
    expect(within(overviewSection).getByText('49%')).toBeInTheDocument()
    expect(within(overviewSection).getByText('62%')).toBeInTheDocument()
    expect(within(overviewSection).getByText('73%')).toBeInTheDocument()
    // 模块卡片本身可点击跳转
    expect(within(overviewSection).getByRole('button', { name: '进入瘦瘦瘦' })).toBeInTheDocument()
    // 模块入口区域仍然存在（大卡片入口）
    const moduleEntries = screen.getByRole('region', { name: '四个小世界' })
    expect(within(moduleEntries).getByRole('heading', { name: '瘦瘦瘦' })).toBeInTheDocument()
    expect(within(moduleEntries).getByRole('heading', { name: '学学学' })).toBeInTheDocument()
    expect(within(moduleEntries).getByRole('heading', { name: '省省省' })).toBeInTheDocument()
    expect(within(moduleEntries).getByRole('heading', { name: '嫁嫁嫁' })).toBeInTheDocument()
    expect(within(moduleEntries).getByRole('button', { name: '进入瘦瘦瘦模块' })).toBeInTheDocument()
  })

  it('shows retryable errors and invokes retry', async () => {
    const user = userEvent.setup()
    dashboard.error = '摘要加载失败'
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    expect(screen.getByRole('alert')).toHaveTextContent('摘要加载失败')
    await user.click(screen.getByRole('button', { name: '重试' }))
    expect(dashboard.fetchSummary).toHaveBeenCalled()
  })

  it('navigates through the finance module entry', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/dashboard']}><Routes><Route path="/dashboard" element={<Dashboard />} /><Route path="/finance" element={<output data-testid="destination" />} /></Routes></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: '进入省省省模块' }))
    await waitFor(() => expect(screen.getByTestId('destination')).toBeInTheDocument())
  })
})
