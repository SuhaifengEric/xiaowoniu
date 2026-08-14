import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ isAuthenticated: true, logout: vi.fn().mockResolvedValue(undefined) }))
const wedding = vi.hoisted(() => ({
  tasks: [], expenses: [], budget: null, overview: null, timeline: null,
  tasksHasMore: false, expensesHasMore: false, loading: false, error: null,
  fetchDashboard: vi.fn().mockResolvedValue(undefined), fetchTasks: vi.fn().mockResolvedValue(undefined), fetchExpenses: vi.fn().mockResolvedValue(undefined),
  createTask: vi.fn().mockResolvedValue(undefined), updateTask: vi.fn().mockResolvedValue(undefined), deleteTask: vi.fn().mockResolvedValue(undefined),
  createExpense: vi.fn().mockResolvedValue(undefined), updateExpense: vi.fn().mockResolvedValue(undefined), deleteExpense: vi.fn().mockResolvedValue(undefined),
  upsertBudget: vi.fn().mockResolvedValue(undefined), clearError: vi.fn(),
}))
const dashboard = vi.hoisted(() => ({ summary: null, loading: false, error: null, fetchSummary: vi.fn().mockResolvedValue(undefined), clearError: vi.fn() }))

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: auth.isAuthenticated, logout: auth.logout, user: { username: 'tester', nickname: '测试用户', email: 'test@example.com', createdAt: '2026-07-01' } }) }))
vi.mock('@/store/wedding.store', () => ({
  useWeddingStore: (selector: (state: typeof wedding) => unknown) => selector(wedding),
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
  wedding.fetchDashboard.mockResolvedValue(undefined)
})

describe('wedding routing', () => {
  it('loads the protected lazy wedding page', async () => {
    window.history.pushState({}, '', '/wedding')
    const AppRoutes = (await import('@/routes')).default
    render(<AppRoutes />)
    expect(await screen.findByRole('heading', { name: '嫁嫁嫁' }, { timeout: 20_000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /新增行动项/ })).toBeInTheDocument()
  }, 25_000)

  it('redirects unauthenticated visitors to login', async () => {
    auth.isAuthenticated = false
    window.history.pushState({}, '', '/wedding')
    const AppRoutes = (await import('@/routes')).default
    render(<AppRoutes />)
    expect(await screen.findByRole('heading', { name: '欢迎回来' })).toBeInTheDocument()
  })

  it.each(['click', 'Enter', 'Space'])('links the dashboard wedding card by %s', async (interaction) => {
    const user = userEvent.setup()
    const Dashboard = (await import('@/pages/Dashboard')).default
    render(<MemoryRouter initialEntries={['/dashboard']}><Routes><Route path="/dashboard" element={<Dashboard />} /><Route path="/wedding" element={<LocationProbe />} /></Routes></MemoryRouter>)
    const card = screen.getByRole('button', { name: '进入嫁嫁嫁模块' })
    if (interaction === 'click') await user.click(card)
    else { card.focus(); await user.keyboard(interaction === 'Enter' ? '{Enter}' : ' ') }
    expect(screen.getByTestId('location')).toHaveTextContent('/wedding')
  })
})
