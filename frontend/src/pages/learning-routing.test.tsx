import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LearningProgressResponse } from '@xiaowoniu/shared'

const auth = vi.hoisted(() => ({
  isAuthenticated: true,
  logout: vi.fn().mockResolvedValue(undefined),
}))
const learning = vi.hoisted(() => ({
  exams: [], subjects: [], checkins: [], progress: null as LearningProgressResponse | null, selectedExamId: null, loading: false, error: null,
  fetchDashboard: vi.fn().mockResolvedValue(undefined), selectExam: vi.fn().mockResolvedValue(undefined), createExam: vi.fn().mockResolvedValue(undefined), updateExam: vi.fn().mockResolvedValue(undefined), deleteExam: vi.fn().mockResolvedValue(undefined), createSubject: vi.fn().mockResolvedValue(undefined), updateSubject: vi.fn().mockResolvedValue(undefined), deleteSubject: vi.fn().mockResolvedValue(undefined), createCheckin: vi.fn().mockResolvedValue(undefined), deleteCheckin: vi.fn().mockResolvedValue(undefined), fetchCheckins: vi.fn().mockResolvedValue(undefined), clearError: vi.fn(),
}))
const dashboard = vi.hoisted(() => ({ summary: null, loading: false, error: null, fetchSummary: vi.fn().mockResolvedValue(undefined), clearError: vi.fn() }))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: auth.isAuthenticated,
    logout: auth.logout,
    user: { username: 'tester', nickname: '测试用户', email: 'test@example.com', createdAt: '2026-07-01' },
  }),
}))
vi.mock('@/store/learning.store', () => ({
  useLearningStore: (selector: (state: typeof learning) => unknown) => selector(learning),
}))
vi.mock('@/store/dashboard.store', () => ({
  useDashboardStore: (selector: (state: typeof dashboard) => unknown) => selector(dashboard),
}))

describe('learning routing', () => {
  beforeEach(() => {
    auth.isAuthenticated = true
    vi.clearAllMocks()
  })

  it('loads the protected lazy learning page', async () => {
    window.history.pushState({}, '', '/learning')
    const AppRoutes = (await import('@/routes')).default
    render(<AppRoutes />)

    expect(await screen.findByRole('heading', { name: '学学学' }, { timeout: 20_000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新建考试' })).toBeInTheDocument()
  }, 25_000)

  it('redirects unauthenticated visitors to login', async () => {
    auth.isAuthenticated = false
    window.history.pushState({}, '', '/learning')
    const AppRoutes = (await import('@/routes')).default
    render(<AppRoutes />)

    expect(await screen.findByRole('heading', { name: '欢迎回来' })).toBeInTheDocument()
  })

  it('links the dashboard learning card to the learning workspace', async () => {
    const user = userEvent.setup()
    const Dashboard = (await import('@/pages/Dashboard')).default
    function LocationProbe() {
      const location = useLocation()
      return <output data-testid="location">{location.pathname}</output>
    }
    render(<MemoryRouter initialEntries={['/dashboard']}><Routes><Route path="/dashboard" element={<Dashboard />} /><Route path="/learning" element={<LocationProbe />} /></Routes></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: '进入学学学模块' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/learning')
  })
})
