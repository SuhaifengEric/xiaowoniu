import api from './api'
import type {
  ApiSuccessResponse,
  ChangePasswordRequest,
  RegisterRequest,
  LoginRequest,
  LoginResponse,
  UpdateProfileRequest,
  UserResponse,
} from '@xiaowoniu/shared'

export const authService = {
  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await api.post<{ success: boolean; data: LoginResponse }>(
      '/api/auth/register',
      data
    )
    return response.data.data
  },

  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<{ success: boolean; data: LoginResponse }>(
      '/api/auth/login',
      data
    )
    return response.data.data
  },

  /**
   * 获取当前用户信息
   */
  async getMe(): Promise<UserResponse> {
    const response = await api.get<ApiSuccessResponse<UserResponse>>(
      '/api/auth/me'
    )
    return response.data.data
  },

  /**
   * 更新当前用户资料
   */
  async updateMe(data: UpdateProfileRequest): Promise<UserResponse> {
    const response = await api.patch<ApiSuccessResponse<UserResponse>>(
      '/api/auth/me',
      data,
    )
    return response.data.data
  },

  /**
   * 修改当前用户密码
   */
  async changePassword(data: ChangePasswordRequest): Promise<null> {
    const response = await api.patch<ApiSuccessResponse<null>>(
      '/api/auth/password',
      data,
    )
    return response.data.data
  },

  /**
   * 登出
   */
  async logout(): Promise<void> {
    await api.post('/api/auth/logout')
  },

  clearAuth(): void {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  /**
   * 保存 Token 和用户信息
   */
  saveAuth(token: string, user: UserResponse): void {
    localStorage.setItem('token', token)
    this.saveUser(user)
  },

  /**
   * 保存当前用户信息，不改变登录 Token
   */
  saveUser(user: UserResponse): void {
    localStorage.setItem('user', JSON.stringify(user))
  },

  /**
   * 获取保存的用户信息
   */
  getSavedUser(): UserResponse | null {
    const userStr = localStorage.getItem('user')
    if (!userStr) return null
    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  },

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token')
  },
}

export default authService
