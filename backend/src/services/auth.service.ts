import prisma from '../config/database'
import { hashPassword, comparePassword } from '../utils/password'
import { generateToken } from '../utils/jwt'
import { RegisterRequest, LoginRequest, LoginResponse, UserResponse } from '@xiaowoniu/shared'

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

    if (!user) {
      throw new Error('用户不存在')
    }

    return this.toUserResponse(user)
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
