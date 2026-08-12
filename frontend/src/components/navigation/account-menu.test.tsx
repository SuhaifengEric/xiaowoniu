import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AccountMenu from './AccountMenu'

const auth = vi.hoisted(() => ({
  user: {
    username: 'tester',
    email: 'test@example.com',
    nickname: '测试用户' as string | null,
    avatarUrl: null,
  },
  logout: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => auth,
}))

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

function renderMenu(initialEntries = ['/dashboard']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AccountMenu />
      <LocationProbe />
      <Routes>
        <Route path="/profile" element={<p>个人中心页</p>} />
        <Route path="/login" element={<p>登录页</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  auth.user.nickname = '测试用户'
  auth.logout.mockClear()
  auth.logout.mockResolvedValue(undefined)
})

describe('AccountMenu', () => {
  it('shows nickname and falls back to username when nickname is empty', async () => {
    const user = userEvent.setup()
    const { rerender } = renderMenu()
    expect(screen.getByText('测试用户')).toBeInTheDocument()

    auth.user.nickname = null
    rerender(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AccountMenu />
      </MemoryRouter>,
    )
    expect(screen.getByText('tester')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /打开用户菜单：tester/ }))
    expect(screen.getByRole('button', { name: '个人中心' })).toBeInTheDocument()
  })

  it('navigates to profile from the menu', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: /打开用户菜单：测试用户/ }))
    await user.click(screen.getByRole('button', { name: '个人中心' }))

    expect(screen.getByTestId('location')).toHaveTextContent('/profile')
    expect(screen.getByText('个人中心页')).toBeInTheDocument()
  })

  it('logs out and navigates to login', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: /打开用户菜单/ }))
    await user.click(screen.getByRole('button', { name: '登出' }))

    await waitFor(() => expect(auth.logout).toHaveBeenCalledOnce())
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
    expect(screen.getByText('登录页')).toBeInTheDocument()
  })

  it('supports keyboard open and Escape focus return', async () => {
    const user = userEvent.setup()
    renderMenu()
    const trigger = screen.getByRole('button', { name: /打开用户菜单/ })

    trigger.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: '个人中心' })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    await waitFor(() => expect(document.activeElement).toBe(trigger))
    expect(screen.queryByRole('button', { name: '个人中心' })).not.toBeInTheDocument()
  })

  it('supports Space as the trigger interaction', async () => {
    const user = userEvent.setup()
    renderMenu()
    const trigger = screen.getByRole('button', { name: /打开用户菜单/ })
    trigger.focus()

    await user.keyboard(' ')
    expect(screen.getByRole('button', { name: '个人中心' })).toBeInTheDocument()
  })
})
