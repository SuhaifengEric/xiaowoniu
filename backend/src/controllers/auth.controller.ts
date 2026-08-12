import { Request, Response, NextFunction } from 'express'
import authService, {
  AuthNotFoundError,
  AuthValidationError,
  InvalidCurrentPasswordError,
  PasswordUnchangedError,
} from '../services/auth.service'
import { success, error } from '../utils/response'
import {
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
} from '@xiaowoniu/shared'

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
    } catch (err: unknown) {
      if (err instanceof AuthNotFoundError) {
        return error(res, 404, {
          code: 'NOT_FOUND',
          message: err.message,
        })
      }
      next(err)
    }
  }

  /**
   * 更新当前用户资料
   */
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.updateProfile(
        req.user!.userId,
        req.body as UpdateProfileRequest,
      )
      return success(res, user, '个人资料更新成功')
    } catch (err: unknown) {
      if (err instanceof AuthValidationError) {
        return error(res, 400, { code: 'VALIDATION_ERROR', message: err.message })
      }
      if (err instanceof AuthNotFoundError) {
        return error(res, 404, { code: 'NOT_FOUND', message: err.message })
      }
      return next(err)
    }
  }

  /**
   * 修改当前用户密码
   */
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.changePassword(
        req.user!.userId,
        req.body as ChangePasswordRequest,
      )
      return success(res, null, '密码修改成功')
    } catch (err: unknown) {
      if (err instanceof AuthValidationError) {
        return error(res, 400, { code: 'VALIDATION_ERROR', message: err.message })
      }
      if (err instanceof InvalidCurrentPasswordError) {
        return error(res, 400, { code: 'INVALID_CURRENT_PASSWORD', message: err.message })
      }
      if (err instanceof PasswordUnchangedError) {
        return error(res, 400, { code: 'PASSWORD_UNCHANGED', message: err.message })
      }
      if (err instanceof AuthNotFoundError) {
        return error(res, 404, { code: 'NOT_FOUND', message: err.message })
      }
      return next(err)
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
