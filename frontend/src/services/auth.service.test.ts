import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from './auth.service'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}))

vi.mock('./api', () => ({ default: apiMocks }))

const user = {
  id: 'user-1',
  username: 'tester',
  email: 'test@example.com',
  nickname: '测试用户',
  avatarUrl: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-02T00:00:00.000Z',
}

describe('authService profile APIs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gets and updates the current profile through the API envelope', async () => {
    apiMocks.get.mockResolvedValue({ data: { success: true, data: user } })
    apiMocks.patch.mockResolvedValue({ data: { success: true, data: user, message: '个人资料更新成功' } })

    await expect(authService.getMe()).resolves.toEqual(user)
    await expect(authService.updateMe({ nickname: '测试用户' })).resolves.toEqual(user)

    expect(apiMocks.get).toHaveBeenCalledWith('/api/auth/me')
    expect(apiMocks.patch).toHaveBeenCalledWith('/api/auth/me', { nickname: '测试用户' })
  })

  it('changes the password without sending a confirmation field', async () => {
    apiMocks.patch.mockResolvedValue({ data: { success: true, data: null, message: '密码修改成功' } })

    await expect(authService.changePassword({
      currentPassword: 'old-password',
      newPassword: 'new-password',
    })).resolves.toBeNull()

    expect(apiMocks.patch).toHaveBeenCalledWith('/api/auth/password', {
      currentPassword: 'old-password',
      newPassword: 'new-password',
    })
  })
})
