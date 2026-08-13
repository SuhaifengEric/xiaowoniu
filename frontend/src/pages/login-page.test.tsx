import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Login from './Login'

const auth = vi.hoisted(() => ({
  login: vi.fn(),
  clearError: vi.fn(),
  error: '邮箱或密码错误',
  isLoading: false,
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => auth,
}))

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.error = '邮箱或密码错误'
    auth.isLoading = false
    auth.login.mockRejectedValue(new Error('登录失败'))
  })

  it('shows the authentication error as an alert and keeps entered values after failure', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><Login /></MemoryRouter>)

    const email = screen.getByLabelText('邮箱')
    const password = screen.getByLabelText('密码')
    await user.type(email, 'wrong@example.com')
    await user.type(password, 'wrong-password')
    await user.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('邮箱或密码错误')
    expect(email).toHaveValue('wrong@example.com')
    expect(password).toHaveValue('wrong-password')
    expect(auth.login).toHaveBeenCalledWith({ email: 'wrong@example.com', password: 'wrong-password' })
  })
})
