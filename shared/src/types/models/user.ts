/**
 * 用户信息响应
 */
export interface UserResponse {
  id: string
  username: string
  email: string
  nickname: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 用户基本信息（不含敏感信息）
 */
export interface UserProfile {
  id: string
  username: string
  nickname: string | null
  avatarUrl: string | null
}
