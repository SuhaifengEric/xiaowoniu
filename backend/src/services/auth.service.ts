import prisma from '../config/database'
import { hashPassword, comparePassword } from '../utils/password'
import { generateToken } from '../utils/jwt'
import {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UpdateProfileRequest,
  UserResponse,
} from '@xiaowoniu/shared'

export class AuthValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthValidationError'
  }
}

export class AuthNotFoundError extends Error {
  constructor(message = '用户不存在') {
    super(message)
    this.name = 'AuthNotFoundError'
  }
}

export class InvalidCurrentPasswordError extends Error {
  constructor(message = '当前密码不正确') {
    super(message)
    this.name = 'InvalidCurrentPasswordError'
  }
}

export class PasswordUnchangedError extends Error {
  constructor(message = '新密码不能与当前密码相同') {
    super(message)
    this.name = 'PasswordUnchangedError'
  }
}

const normalizeNickname = (nickname: string | null): string | null => {
  if (nickname === null) return null
  if (typeof nickname !== 'string') {
    throw new AuthValidationError('昵称必须是字符串或 null')
  }

  const normalized = nickname.trim()
  if (Array.from(normalized).length > 50) {
    throw new AuthValidationError('昵称最多 50 个字符')
  }

  return normalized || null
}

export class AuthService {
  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<LoginResponse> {
    // 检查用户是否已存在
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username },
        ],
      },
    })

    if (existingUser) {
      throw new Error('用户名或邮箱已存在')
    }

    // 加密密码
    const hashedPassword = await hashPassword(data.password)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        nickname: data.nickname || null,
      },
    })

    // 生成 Token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    })

    // 返回响应
    return {
      token,
      user: this.toUserResponse(user),
    }
  }

  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (!user) {
      throw new Error('邮箱或密码错误')
    }

    // 验证密码
    const isPasswordValid = await comparePassword(data.password, user.password)

    if (!isPasswordValid) {
      throw new Error('邮箱或密码错误')
    }

    // 生成 Token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    })

    return {
      token,
      user: this.toUserResponse(user),
    }
  }

  /**
   * 获取当前用户信息
   */
  async getMe(userId: string): Promise<UserResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) throw new AuthNotFoundError()

    return this.toUserResponse(user)
  }

  /**
   * 更新当前用户的昵称
   */
  async updateProfile(userId: string, data: UpdateProfileRequest): Promise<UserResponse> {
    const nickname = normalizeNickname(data.nickname)
    const existingUser = await prisma.user.findUnique({ where: { id: userId } })

    if (!existingUser) throw new AuthNotFoundError()

    const user = await prisma.user.update({
      where: { id: userId },
      data: { nickname },
    })

    return this.toUserResponse(user)
  }

  /**
   * 修改当前用户的密码
   */
  async changePassword(userId: string, data: ChangePasswordRequest): Promise<null> {
    if (typeof data.currentPassword !== 'string' || data.currentPassword.length === 0) {
      throw new AuthValidationError('当前密码不能为空')
    }
    if (typeof data.newPassword !== 'string' || data.newPassword.length < 6) {
      throw new AuthValidationError('新密码至少 6 位')
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new AuthNotFoundError()

    const isCurrentPasswordValid = await comparePassword(data.currentPassword, user.password)
    if (!isCurrentPasswordValid) throw new InvalidCurrentPasswordError()
    if (data.currentPassword === data.newPassword) throw new PasswordUnchangedError()

    const password = await hashPassword(data.newPassword)
    await prisma.user.update({
      where: { id: userId },
      data: { password },
    })

    return null
  }

  /**
   * 转换为用户响应格式
   */
  private toUserResponse(user: any): UserResponse {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }
  }
}

export default new AuthService()
