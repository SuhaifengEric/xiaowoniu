import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))

const password = vi.hoisted(() => ({
  comparePassword: vi.fn(),
  hashPassword: vi.fn(),
}))

vi.mock('../config/database', () => ({ default: prisma }))
vi.mock('../utils/password', () => password)

import authService, {
  AuthNotFoundError,
  InvalidCurrentPasswordError,
  PasswordUnchangedError,
} from '../services/auth.service'

const user = {
  id: 'user-a',
  username: 'user-a',
  email: 'user-a@example.com',
  password: 'stored-hash',
  nickname: '旧昵称',
  avatarUrl: null,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
}

const updatedUser = {
  ...user,
  nickname: '花花',
  updatedAt: new Date('2026-08-02T00:00:00.000Z'),
}

beforeEach(() => {
  vi.clearAllMocks()
  password.comparePassword.mockResolvedValue(true)
  password.hashPassword.mockResolvedValue('new-hash')
})

describe('auth profile service', () => {
  it('trims a nickname and only updates the authenticated user field', async () => {
    prisma.user.findUnique.mockResolvedValue(user)
    prisma.user.update.mockResolvedValue(updatedUser)

    const result = await authService.updateProfile('user-a', {
      nickname: '  花花  ',
    })

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-a' } })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-a' },
      data: { nickname: '花花' },
    })
    expect(result).toEqual({
      id: 'user-a',
      username: 'user-a',
      email: 'user-a@example.com',
      nickname: '花花',
      avatarUrl: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    })
    expect(result).not.toHaveProperty('password')
  })

  it('normalizes an empty nickname to null and ignores injected user fields', async () => {
    prisma.user.findUnique.mockResolvedValue(user)
    prisma.user.update.mockResolvedValue({ ...updatedUser, nickname: null })

    await authService.updateProfile('user-a', {
      nickname: '   ',
      userId: 'user-b',
      email: 'attacker@example.com',
    } as never)

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-a' },
      data: { nickname: null },
    })
  })

  it('returns not found without updating when the authenticated user is missing', async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    await expect(authService.updateProfile('missing-user', { nickname: '花花' }))
      .rejects.toBeInstanceOf(AuthNotFoundError)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})

describe('auth password service', () => {
  it('compares the current password, hashes the new one, and updates only the password', async () => {
    prisma.user.findUnique.mockResolvedValue(user)
    prisma.user.update.mockResolvedValue({ ...user, password: 'new-hash' })

    await expect(authService.changePassword('user-a', {
      currentPassword: 'old-password',
      newPassword: 'new-password',
    })).resolves.toBeNull()

    expect(password.comparePassword).toHaveBeenCalledWith('old-password', 'stored-hash')
    expect(password.hashPassword).toHaveBeenCalledWith('new-password')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-a' },
      data: { password: 'new-hash' },
    })
  })

  it('does not update when the current password is wrong', async () => {
    prisma.user.findUnique.mockResolvedValue(user)
    password.comparePassword.mockResolvedValue(false)

    await expect(authService.changePassword('user-a', {
      currentPassword: 'wrong-password',
      newPassword: 'new-password',
    })).rejects.toBeInstanceOf(InvalidCurrentPasswordError)

    expect(password.hashPassword).not.toHaveBeenCalled()
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('does not update when the new password is unchanged', async () => {
    prisma.user.findUnique.mockResolvedValue(user)

    await expect(authService.changePassword('user-a', {
      currentPassword: 'same-password',
      newPassword: 'same-password',
    })).rejects.toBeInstanceOf(PasswordUnchangedError)

    expect(password.hashPassword).not.toHaveBeenCalled()
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('uses only the authenticated user id and reports a missing user', async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    await expect(authService.changePassword('user-a', {
      currentPassword: 'old-password',
      newPassword: 'new-password',
      userId: 'user-b',
    } as never)).rejects.toBeInstanceOf(AuthNotFoundError)

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-a' } })
    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})
