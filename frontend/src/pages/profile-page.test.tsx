import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Profile from './Profile'

const auth = vi.hoisted(() => ({
  user: {
    id: 'user-1',
    username: 'tester',
    email: 'test@example.com',
    nickname: '旧昵称' as string | null,
    avatarUrl: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => auth,
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path="/profile" element={<Profile />} />
        <Route path="/dashboard" element={<p>世界仪表盘</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  auth.user.nickname = '旧昵称'
  auth.updateProfile.mockReset()
  auth.changePassword.mockReset()
  auth.logout.mockReset()
  auth.logout.mockResolvedValue(undefined)
})

describe('Profile page', () => {
  it('shows profile data, password autocomplete, and keeps five mobile tabs', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: '个人中心' })).toBeInTheDocument()
    expect(screen.getByLabelText('昵称')).toHaveValue('旧昵称')
    expect(screen.getByText('tester')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByLabelText('当前密码')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByLabelText('新密码')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('确认新密码')).toHaveAttribute('autocomplete', 'new-password')
    expect(within(screen.getByRole('navigation', { name: '主导航' })).getAllByRole('button')).toHaveLength(5)
  })

  it('trims and saves a nickname, and supports clearing it with null', async () => {
    const user = userEvent.setup()
    auth.updateProfile
      .mockResolvedValueOnce({ ...auth.user, nickname: '花花' })
      .mockResolvedValueOnce({ ...auth.user, nickname: null })
    renderPage()

    const nickname = screen.getByLabelText('昵称')
    await user.clear(nickname)
    await user.type(nickname, '  花花  ')
    await user.click(screen.getByRole('button', { name: '保存昵称' }))
    await waitFor(() => expect(auth.updateProfile).toHaveBeenNthCalledWith(1, { nickname: '花花' }))
    expect(screen.getByRole('status')).toHaveTextContent('个人资料已更新')

    await user.clear(nickname)
    await user.click(screen.getByRole('button', { name: '保存昵称' }))
    await waitFor(() => expect(auth.updateProfile).toHaveBeenNthCalledWith(2, { nickname: null }))
  })

  it('rejects an overlong nickname before sending a request', async () => {
    const user = userEvent.setup()
    renderPage()
    const nickname = screen.getByLabelText('昵称')
    fireEvent.change(nickname, { target: { value: 'a'.repeat(51) } })

    await user.click(screen.getByRole('button', { name: '保存昵称' }))

    expect(auth.updateProfile).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('昵称最多 50 个字符')
    expect(nickname).toHaveValue('a'.repeat(51))
  })

  it('keeps the nickname input after an API failure', async () => {
    const user = userEvent.setup()
    auth.updateProfile.mockRejectedValue({
      response: { data: { error: { code: 'INTERNAL_ERROR', message: '资料保存失败' } } },
    })
    renderPage()
    const nickname = screen.getByLabelText('昵称')
    await user.clear(nickname)
    await user.type(nickname, '暂存昵称')
    await user.click(screen.getByRole('button', { name: '保存昵称' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('资料保存失败')
    expect(nickname).toHaveValue('暂存昵称')
  })

  it('validates password fields without sending incomplete forms', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('新密码'), '12345')
    await user.type(screen.getByLabelText('确认新密码'), '1234')
    await user.click(screen.getByRole('button', { name: '修改密码' }))

    expect(auth.changePassword).not.toHaveBeenCalled()
    expect(screen.getByText('请输入当前密码')).toBeInTheDocument()
    expect(screen.getByText('新密码至少 6 位')).toBeInTheDocument()
    expect(screen.getByText('两次输入的新密码不一致')).toBeInTheDocument()
  })

  it('shows the current-password error and retains password inputs when the API rejects it', async () => {
    const user = userEvent.setup()
    auth.changePassword.mockRejectedValue({
      response: { data: { error: { code: 'INVALID_CURRENT_PASSWORD', message: '当前密码不正确' } } },
    })
    renderPage()
    await user.type(screen.getByLabelText('当前密码'), 'wrong-password')
    await user.type(screen.getByLabelText('新密码'), 'new-password')
    await user.type(screen.getByLabelText('确认新密码'), 'new-password')
    await user.click(screen.getByRole('button', { name: '修改密码' }))

    await waitFor(() => expect(auth.changePassword).toHaveBeenCalledWith({
      currentPassword: 'wrong-password', newPassword: 'new-password',
    }))
    expect(screen.getByText('当前密码不正确')).toBeInTheDocument()
    expect(screen.getByLabelText('当前密码')).toHaveValue('wrong-password')
    expect(screen.getByLabelText('新密码')).toHaveValue('new-password')
    expect(screen.getByLabelText('确认新密码')).toHaveValue('new-password')
  })

  it('clears all password inputs after success without changing the current user', async () => {
    const user = userEvent.setup()
    auth.changePassword.mockResolvedValue(null)
    renderPage()
    await user.type(screen.getByLabelText('当前密码'), 'old-password')
    await user.type(screen.getByLabelText('新密码'), 'new-password')
    await user.type(screen.getByLabelText('确认新密码'), 'new-password')
    await user.click(screen.getByRole('button', { name: '修改密码' }))

    await waitFor(() => expect(auth.changePassword).toHaveBeenCalledOnce())
    expect(screen.getByRole('status')).toHaveTextContent('当前登录仍然有效')
    expect(screen.getByLabelText('当前密码')).toHaveValue('')
    expect(screen.getByLabelText('新密码')).toHaveValue('')
    expect(screen.getByLabelText('确认新密码')).toHaveValue('')
    expect(auth.user.nickname).toBe('旧昵称')
    expect(localStorage.getItem('password')).toBeNull()
  })
})
