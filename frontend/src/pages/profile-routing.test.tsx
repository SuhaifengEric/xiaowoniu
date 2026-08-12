import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  isAuthenticated: true,
  user: {
    id: 'user-1', username: 'tester', email: 'test@example.com', nickname: '测试用户', avatarUrl: null,
    createdAt: '2026-08-01', updatedAt: '2026-08-01',
  },
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => auth,
}))

beforeEach(() => {
  auth.isAuthenticated = true
  window.history.pushState({}, '', '/profile')
})

describe('profile routing', () => {
  it('loads the protected /profile page', async () => {
    const AppRoutes = (await import('@/routes')).default
    render(<AppRoutes />)

    expect(await screen.findByRole('heading', { name: '个人中心' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /打开用户菜单：测试用户/ })).toBeInTheDocument()
  })

  it('redirects an unauthenticated visitor to login', async () => {
    auth.isAuthenticated = false
    const AppRoutes = (await import('@/routes')).default
    render(<AppRoutes />)

    expect(await screen.findByRole('heading', { name: '欢迎回来' })).toBeInTheDocument()
  })
})
