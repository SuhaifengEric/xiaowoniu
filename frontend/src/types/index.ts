// 导出 shared 包中的类型
import type {
  UserResponse as SharedUserResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ApiResponse,
  ApiError,
} from '@xiaowoniu/shared'

export type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ApiResponse,
  ApiError,
}

export type UserResponse = SharedUserResponse

// 前端特有的类型
export interface AuthState {
  user: UserResponse | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}
