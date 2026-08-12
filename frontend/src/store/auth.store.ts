import { create } from 'zustand'
import { authService } from '@/services/auth.service'
import { useFitnessStore } from '@/store/fitness.store'
import { useLearningStore } from '@/store/learning.store'
import { useFinanceStore } from '@/store/finance.store'
import { useWeddingStore } from '@/store/wedding.store'
import { useDashboardStore } from '@/store/dashboard.store'
import type {
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  UserResponse,
} from '@xiaowoniu/shared'

interface AuthState {
  user: UserResponse | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  updateProfile: (data: UpdateProfileRequest) => Promise<UserResponse>
  changePassword: (data: ChangePasswordRequest) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => void
  clearError: () => void
}

const resetAllModuleStores = (): void => {
  useFitnessStore.getState().reset()
  useLearningStore.getState().reset()
  useFinanceStore.getState().reset()
  useWeddingStore.getState().reset()
  useDashboardStore.getState().reset()
}

export const useAuthStore = create<AuthState>((set) => ({
  user: authService.getSavedUser(),
  token: localStorage.getItem('token'),
  isAuthenticated: authService.isAuthenticated(),
  isLoading: false,
  error: null,
  login: async (data: LoginRequest) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authService.login(data)
      resetAllModuleStores()
      authService.saveAuth(response.token, response.user)
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '登录失败'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  register: async (data: RegisterRequest) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authService.register(data)
      resetAllModuleStores()
      authService.saveAuth(response.token, response.user)
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '注册失败'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  updateProfile: async (data: UpdateProfileRequest) => {
    const user = await authService.updateMe(data)
    authService.saveUser(user)
    set({ user })
    return user
  },

  changePassword: async (data: ChangePasswordRequest) => {
    await authService.changePassword(data)
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      await authService.logout()
    } catch {
      // Local logout must succeed even when the server is unavailable.
    } finally {
      authService.clearAuth()
      resetAllModuleStores()
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
    }
  },

  checkAuth: () => {
    const previousUserId = useAuthStore.getState().user?.id
    const user = authService.getSavedUser()
    const token = localStorage.getItem('token')
    const isAuthenticated = authService.isAuthenticated()
    if (previousUserId !== user?.id) {
      resetAllModuleStores()
    }
    set({ user, token, isAuthenticated })
  },

  clearError: () => {
    set({ error: null })
  },
}))
