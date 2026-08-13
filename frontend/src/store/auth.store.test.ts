import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  updateMe: vi.fn(),
  changePassword: vi.fn(),
  logout: vi.fn(),
  getSavedUser: vi.fn(),
  isAuthenticated: vi.fn(() => false),
  saveAuth: vi.fn(),
  saveUser: vi.fn(),
  clearAuth: vi.fn(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }),
  resetFitness: vi.fn(),
  resetLearning: vi.fn(),
  resetFinance: vi.fn(),
  resetWedding: vi.fn(),
  resetDashboard: vi.fn(),
}))

vi.mock('@/services/auth.service', () => ({
  authService: {
    getSavedUser: mocks.getSavedUser,
    isAuthenticated: mocks.isAuthenticated,
    logout: mocks.logout,
    login: mocks.login,
    register: mocks.register,
    updateMe: mocks.updateMe,
    changePassword: mocks.changePassword,
    saveAuth: mocks.saveAuth,
    saveUser: mocks.saveUser,
    clearAuth: mocks.clearAuth,
  },
}))

vi.mock('./fitness.store', () => ({
  useFitnessStore: {
    getState: () => ({ reset: mocks.resetFitness }),
  },
}))

vi.mock('./learning.store', () => ({
  useLearningStore: {
    getState: () => ({ reset: mocks.resetLearning }),
  },
}))

vi.mock('./finance.store', () => ({
  useFinanceStore: {
    getState: () => ({ reset: mocks.resetFinance }),
  },
}))

vi.mock('./wedding.store', () => ({
  useWeddingStore: {
    getState: () => ({ reset: mocks.resetWedding }),
  },
}))

vi.mock('./dashboard.store', () => ({
  useDashboardStore: {
    getState: () => ({ reset: mocks.resetDashboard }),
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

describe('useAuthStore auth-scoped cleanup', () => {
  beforeAll(async () => {
    ;({ useAuthStore } = await import('./auth.store'))
  })
  beforeEach(() => {
    vi.clearAllMocks()
    storage.clear()
    mocks.getSavedUser.mockReturnValue(null)
    mocks.isAuthenticated.mockReturnValue(false)
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
    expect(mocks.resetLearning).toHaveBeenCalledOnce()
    expect(mocks.resetFinance).toHaveBeenCalledOnce()
    expect(mocks.resetWedding).toHaveBeenCalledOnce()
    expect(mocks.resetDashboard).toHaveBeenCalledOnce()
    expect(mocks.resetFitness.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.saveAuth.mock.invocationCallOrder[0])
    expect(mocks.resetLearning.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.saveAuth.mock.invocationCallOrder[0])
    expect(mocks.resetFinance.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.saveAuth.mock.invocationCallOrder[0])
    expect(mocks.resetWedding.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.saveAuth.mock.invocationCallOrder[0])
  })

  it('does not reset fitness after a failed login', async () => {
    const failure = new Error('invalid credentials')
    mocks.login.mockRejectedValue(failure)

    await expect(useAuthStore.getState().login({
      email: 'login@example.com', password: 'wrong-password',
    })).rejects.toBe(failure)

    expect(mocks.resetFitness).not.toHaveBeenCalled()
    expect(mocks.resetLearning).not.toHaveBeenCalled()
    expect(mocks.resetFinance).not.toHaveBeenCalled()
    expect(mocks.resetWedding).not.toHaveBeenCalled()
    expect(mocks.resetDashboard).not.toHaveBeenCalled()
  })

  it('keeps a server login error in the store for the login page to display', async () => {
    const failure = { response: { data: { error: { message: '邮箱或密码错误' } } } }
    mocks.login.mockRejectedValue(failure)

    await expect(useAuthStore.getState().login({
      email: 'wrong@example.com', password: 'wrong-password',
    })).rejects.toBe(failure)

    expect(useAuthStore.getState().error).toBe('邮箱或密码错误')
    expect(useAuthStore.getState().isLoading).toBe(false)
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
    expect(mocks.resetLearning).toHaveBeenCalledOnce()
    expect(mocks.resetFinance).toHaveBeenCalledOnce()
    expect(mocks.resetWedding).toHaveBeenCalledOnce()
    expect(mocks.resetDashboard).toHaveBeenCalledOnce()
    expect(mocks.resetFitness.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.saveAuth.mock.invocationCallOrder[0])
    expect(mocks.resetLearning.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.saveAuth.mock.invocationCallOrder[0])
    expect(mocks.resetFinance.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.saveAuth.mock.invocationCallOrder[0])
    expect(mocks.resetWedding.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.saveAuth.mock.invocationCallOrder[0])
  })

  it('does not reset fitness after a failed registration', async () => {
    const failure = new Error('email already exists')
    mocks.register.mockRejectedValue(failure)

    await expect(useAuthStore.getState().register({
      username: 'new-user', email: 'new@example.com', password: 'password123',
    })).rejects.toBe(failure)

    expect(mocks.resetFitness).not.toHaveBeenCalled()
    expect(mocks.resetLearning).not.toHaveBeenCalled()
    expect(mocks.resetFinance).not.toHaveBeenCalled()
    expect(mocks.resetWedding).not.toHaveBeenCalled()
    expect(mocks.resetDashboard).not.toHaveBeenCalled()
  })

  it('updates the current user and localStorage without resetting module stores', async () => {
    const previousUser = {
      id: 'user-1', username: 'tester', email: 'test@example.com', nickname: null,
      avatarUrl: null, createdAt: 'created', updatedAt: 'old',
    }
    const nextUser = { ...previousUser, nickname: '花花', updatedAt: 'new' }
    useAuthStore.setState({ user: previousUser, token: 'saved-token', isAuthenticated: true })
    mocks.updateMe.mockResolvedValue(nextUser)

    await expect(useAuthStore.getState().updateProfile({ nickname: '花花' })).resolves.toEqual(nextUser)

    expect(mocks.saveUser).toHaveBeenCalledWith(nextUser)
    expect(useAuthStore.getState().user).toEqual(nextUser)
    expect(useAuthStore.getState().token).toBe('saved-token')
    expect(mocks.resetFitness).not.toHaveBeenCalled()
    expect(mocks.resetLearning).not.toHaveBeenCalled()
    expect(mocks.resetFinance).not.toHaveBeenCalled()
    expect(mocks.resetWedding).not.toHaveBeenCalled()
    expect(mocks.resetDashboard).not.toHaveBeenCalled()
  })

  it('keeps the original user and token when profile update fails', async () => {
    const previousUser = {
      id: 'user-1', username: 'tester', email: 'test@example.com', nickname: null,
      avatarUrl: null, createdAt: 'created', updatedAt: 'old',
    }
    const failure = new Error('profile update failed')
    useAuthStore.setState({ user: previousUser, token: 'saved-token', isAuthenticated: true })
    mocks.updateMe.mockRejectedValue(failure)

    await expect(useAuthStore.getState().updateProfile({ nickname: '花花' })).rejects.toBe(failure)

    expect(useAuthStore.getState().user).toEqual(previousUser)
    expect(useAuthStore.getState().token).toBe('saved-token')
    expect(mocks.saveUser).not.toHaveBeenCalled()
  })

  it('changes the password without changing user, token, or business stores', async () => {
    const user = {
      id: 'user-1', username: 'tester', email: 'test@example.com', nickname: '花花',
      avatarUrl: null, createdAt: 'created', updatedAt: 'old',
    }
    useAuthStore.setState({ user, token: 'saved-token', isAuthenticated: true })
    mocks.changePassword.mockResolvedValue(null)

    await expect(useAuthStore.getState().changePassword({
      currentPassword: 'old-password', newPassword: 'new-password',
    })).resolves.toBeUndefined()

    expect(mocks.changePassword).toHaveBeenCalledWith({
      currentPassword: 'old-password', newPassword: 'new-password',
    })
    expect(useAuthStore.getState().user).toEqual(user)
    expect(useAuthStore.getState().token).toBe('saved-token')
    expect(mocks.saveUser).not.toHaveBeenCalled()
    expect(mocks.resetFitness).not.toHaveBeenCalled()
    expect(mocks.resetLearning).not.toHaveBeenCalled()
    expect(mocks.resetFinance).not.toHaveBeenCalled()
    expect(mocks.resetWedding).not.toHaveBeenCalled()
    expect(mocks.resetDashboard).not.toHaveBeenCalled()
  })

  it('resets fitness state after a successful logout', async () => {
    mocks.logout.mockResolvedValue(undefined)

    await useAuthStore.getState().logout()

    expect(mocks.resetFitness).toHaveBeenCalledOnce()
    expect(mocks.resetLearning).toHaveBeenCalledOnce()
    expect(mocks.resetFinance).toHaveBeenCalledOnce()
    expect(mocks.resetWedding).toHaveBeenCalledOnce()
    expect(mocks.resetDashboard).toHaveBeenCalledOnce()
  })

  it('resets both module states when checkAuth detects an identity change', () => {
    const previousUser = {
      id: 'user-1', username: 'old-user', email: 'old@example.com', nickname: null,
      avatarUrl: null, createdAt: 'created', updatedAt: 'updated',
    }
    const nextUser = {
      id: 'user-2', username: 'next-user', email: 'next@example.com', nickname: null,
      avatarUrl: null, createdAt: 'created', updatedAt: 'updated',
    }
    useAuthStore.setState({ user: previousUser, token: 'old-token', isAuthenticated: true })
    mocks.getSavedUser.mockReturnValue(nextUser)
    mocks.isAuthenticated.mockReturnValue(true)

    useAuthStore.getState().checkAuth()

    expect(mocks.resetFitness).toHaveBeenCalledOnce()
    expect(mocks.resetLearning).toHaveBeenCalledOnce()
    expect(mocks.resetFinance).toHaveBeenCalledOnce()
    expect(mocks.resetWedding).toHaveBeenCalledOnce()
    expect(mocks.resetDashboard).toHaveBeenCalledOnce()
    expect(useAuthStore.getState().user).toEqual(nextUser)
    expect(useAuthStore.getState().token).toBeNull()
  })

  it('keeps module state when checkAuth sees the same identity', () => {
    const user = {
      id: 'user-1', username: 'same-user', email: 'same@example.com', nickname: null,
      avatarUrl: null, createdAt: 'created', updatedAt: 'updated',
    }
    useAuthStore.setState({ user, token: 'saved-token', isAuthenticated: true })
    mocks.getSavedUser.mockReturnValue(user)
    mocks.isAuthenticated.mockReturnValue(true)
    storage.set('token', 'saved-token')

    useAuthStore.getState().checkAuth()

    expect(mocks.resetFitness).not.toHaveBeenCalled()
    expect(mocks.resetLearning).not.toHaveBeenCalled()
    expect(mocks.resetFinance).not.toHaveBeenCalled()
    expect(mocks.resetWedding).not.toHaveBeenCalled()
    expect(mocks.resetDashboard).not.toHaveBeenCalled()
    expect(useAuthStore.getState().user).toEqual(user)
    expect(useAuthStore.getState().token).toBe('saved-token')
  })
})
