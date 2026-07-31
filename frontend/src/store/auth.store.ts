import { create } from 'zustand'
import { authService } from '@/services/auth.service'
import { useFitnessStore } from '@/store/fitness.store'
import type { UserResponse, LoginRequest, RegisterRequest } from '@xiaowoniu/shared'

interface AuthState {
  user: UserResponse | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => void
  clearError: () => void
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
      useFitnessStore.getState().reset()
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
      useFitnessStore.getState().reset()
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

  logout: async () => {
    set({ isLoading: true })
    try {
      await authService.logout()
    } catch {
      // Local logout must succeed even when the server is unavailable.
    } finally {
      authService.clearAuth()
      useFitnessStore.getState().reset()
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
    const user = authService.getSavedUser()
    const token = localStorage.getItem('token')
    const isAuthenticated = authService.isAuthenticated()
    set({ user, token, isAuthenticated })
  },

  clearError: () => {
    set({ error: null })
  },
}))
