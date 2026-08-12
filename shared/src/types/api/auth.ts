import { UserResponse } from '../models/user'

/**
 * 用户注册请求
 */
export interface RegisterRequest {
  username: string
  email: string
  password: string
  nickname?: string
}

/**
 * 用户登录请求
 */
export interface LoginRequest {
  email: string
  password: string
}

/**
 * 更新当前用户资料请求
 */
export interface UpdateProfileRequest {
  nickname: string | null
}

/**
 * 修改当前用户密码请求
 */
export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

/**
 * 登录响应
 */
export interface LoginResponse {
  token: string
  user: UserResponse
}

/**
 * Token 刷新响应
 */
export interface RefreshTokenResponse {
  token: string
}

/**
 * JWT Payload
 */
export interface JWTPayload {
  userId: string
  email: string
  iat: number
  exp: number
}
