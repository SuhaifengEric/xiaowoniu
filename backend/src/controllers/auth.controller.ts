import { Request, Response, NextFunction } from 'express'
import authService from '../services/auth.service'
import { success, error } from '../utils/response'
import { RegisterRequest, LoginRequest } from '@xiaowoniu/shared'

export class AuthController {
  /**
   * 用户注册
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data: RegisterRequest = req.body
      const result = await authService.register(data)
      return success(res, result, '注册成功')
    } catch (err: any) {
      if (err.message.includes('已存在')) {
        return error(res, 409, {
          code: 'CONFLICT',
          message: err.message,
        })
      }
      next(err)
    }
  }

  /**
   * 用户登录
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data: LoginRequest = req.body
      const result = await authService.login(data)
      return success(res, result, '登录成功')
    } catch (err: any) {
      if (err.message.includes('错误')) {
        return error(res, 401, {
          code: 'INVALID_CREDENTIALS',
          message: err.message,
        })
      }
      next(err)
    }
  }

  /**
   * 获取当前用户信息
   */
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId
      const user = await authService.getMe(userId)
      return success(res, user)
    } catch (err: any) {
      if (err.message.includes('不存在')) {
        return error(res, 404, {
          code: 'NOT_FOUND',
          message: err.message,
        })
      }
      next(err)
    }
  }

  /**
   * 用户登出（客户端删除 token）
   */
  async logout(req: Request, res: Response) {
    return success(res, null, '登出成功')
  }
}

export default new AuthController()
