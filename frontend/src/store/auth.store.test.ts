import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  saveAuth: vi.fn(),
  clearAuth: vi.fn(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }),
  resetFitness: vi.fn(),
}))

vi.mock('@/services/auth.service', () => ({
  authService: {
    getSavedUser: vi.fn(() => null),
    isAuthenticated: vi.fn(() => false),
    logout: mocks.logout,
    login: mocks.login,
    register: mocks.register,
    saveAuth: mocks.saveAuth,
    clearAuth: mocks.clearAuth,
  },
}))

vi.mock('./fitness.store', () => ({
  useFitnessStore: {
    getState: () => ({ reset: mocks.resetFitness }),
  },
}))

const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
})

let useAuthStore: typeof import('./auth.store').useAuthStore

describe('useAuthStore logout fitness cleanup', () => {
  beforeAll(async () => {
    ;({ useAuthStore } = await import('./auth.store'))
  })
  beforeEach(() => {
    vi.clearAllMocks()
    storage.clear()
  })

  it('resets fitness before saving a successful login identity', async () => {
    const response = {
      token: 'login-token',
      user: {
        id: 'user-1', username: 'login-user', email: 'login@example.com', nickname: null,
        avatarUrl: null, createdAt: 'created', updatedAt: 'updated',
      },
    }
    mocks.login.mockResolvedValue(response)

    await useAuthStore.getState().login({ email: 'login@example.com', password: 'password123' })

    expect(mocks.resetFitness).toHaveBeenCalledOnce()
    expect(mocks.resetFitness.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.saveAuth.mock.invocationCallOrder[0])
  })

  it('does not reset fitness after a failed login', async () => {
    const failure = new Error('invalid credentials')
    mocks.login.mockRejectedValue(failure)

    await expect(useAuthStore.getState().login({
      email: 'login@example.com', password: 'wrong-password',
    })).rejects.toBe(failure)

    expect(mocks.resetFitness).not.toHaveBeenCalled()
  })

  it('resets fitness before saving a successful registration identity', async () => {
    const response = {
      token: 'register-token',
      user: {
        id: 'user-2', username: 'new-user', email: 'new@example.com', nickname: null,
        avatarUrl: null, createdAt: 'created', updatedAt: 'updated',
      },
    }
    mocks.register.mockResolvedValue(response)

    await useAuthStore.getState().register({
      username: 'new-user', email: 'new@example.com', password: 'password123',
    })

    expect(mocks.resetFitness).toHaveBeenCalledOnce()
    expect(mocks.resetFitness.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.saveAuth.mock.invocationCallOrder[0])
  })

  it('does not reset fitness after a failed registration', async () => {
    const failure = new Error('email already exists')
    mocks.register.mockRejectedValue(failure)

    await expect(useAuthStore.getState().register({
      username: 'new-user', email: 'new@example.com', password: 'password123',
    })).rejects.toBe(failure)

    expect(mocks.resetFitness).not.toHaveBeenCalled()
  })

  it('resets fitness state after a successful logout', async () => {
    mocks.logout.mockResolvedValue(undefined)

    await useAuthStore.getState().logout()

    expect(mocks.resetFitness).toHaveBeenCalledOnce()
  })

  it('clears local credentials after a failed server logout', async () => {
    storage.set('token', 'stale-token')
    storage.set('user', '{"id":"user-1"}')
    mocks.logout.mockRejectedValue(new Error('server unavailable'))

    await useAuthStore.getState().logout()

    expect(mocks.logout).toHaveBeenCalledOnce()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(mocks.resetFitness).toHaveBeenCalledOnce()
  })
})
