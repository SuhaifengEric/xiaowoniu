import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ isAuthenticated: true, logout: vi.fn().mockResolvedValue(undefined) }))
const finance = vi.hoisted(() => ({
  expenses: [], summary: null, budget: null, savingPlans: [], selectedMonth: '2026-07', loading: false, error: null,
  fetchDashboard: vi.fn().mockResolvedValue(undefined), setMonth: vi.fn(), createExpense: vi.fn(), updateExpense: vi.fn(), deleteExpense: vi.fn(), upsertBudget: vi.fn(), createSavingPlan: vi.fn(), updateSavingPlan: vi.fn(), deleteSavingPlan: vi.fn(), clearError: vi.fn(),
}))
const dashboard = vi.hoisted(() => ({ summary: null, loading: false, error: null, fetchSummary: vi.fn().mockResolvedValue(undefined), clearError: vi.fn() }))

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: auth.isAuthenticated, logout: auth.logout, user: { username: 'tester', nickname: '测试用户', email: 'test@example.com', createdAt: '2026-07-01' } }) }))
vi.mock('@/store/finance.store', () => ({
  formatMonth: (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
  useFinanceStore: (selector: (state: typeof finance) => unknown) => selector(finance),
}))
vi.mock('@/store/dashboard.store', () => ({
  useDashboardStore: (selector: (state: typeof dashboard) => unknown) => selector(dashboard),
}))

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

beforeEach(() => {
  auth.isAuthenticated = true
  vi.clearAllMocks()
  finance.fetchDashboard.mockResolvedValue(undefined)
})

describe('finance routing', () => {
  it('loads the protected lazy finance page', async () => {
    window.history.pushState({}, '', '/finance')
    const AppRoutes = (await import('@/routes')).default
    render(<AppRoutes />)
    expect(await screen.findByRole('heading', { name: '省省省' }, { timeout: 20_000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '记一笔' })).toBeInTheDocument()
  }, 25_000)

  it('redirects unauthenticated visitors to login', async () => {
    auth.isAuthenticated = false
    window.history.pushState({}, '', '/finance')
    const AppRoutes = (await import('@/routes')).default
    render(<AppRoutes />)
    expect(await screen.findByRole('heading', { name: '欢迎回来' })).toBeInTheDocument()
  })

  it.each(['click', 'Enter', 'Space'])('links the dashboard finance card by %s', async (interaction) => {
    const user = userEvent.setup()
    const Dashboard = (await import('@/pages/Dashboard')).default
    render(<MemoryRouter initialEntries={['/dashboard']}><Routes><Route path="/dashboard" element={<Dashboard />} /><Route path="/finance" element={<LocationProbe />} /></Routes></MemoryRouter>)
    const card = screen.getByRole('button', { name: '进入省省省模块' })
    if (interaction === 'click') await user.click(card)
    else { card.focus(); await user.keyboard(interaction === 'Enter' ? '{Enter}' : ' ') }
    expect(screen.getByTestId('location')).toHaveTextContent('/finance')
  })
})
