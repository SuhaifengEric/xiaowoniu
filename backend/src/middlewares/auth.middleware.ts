import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
import { error } from '../utils/response'

/**
 * JWT 认证中间件
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return error(res, 401, {
        code: 'UNAUTHORIZED',
        message: '未提供认证 Token',
      })
    }

    const payload = verifyToken(token)
    req.user = payload
    next()
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 401, {
        code: 'TOKEN_EXPIRED',
        message: 'Token 已过期，请重新登录',
      })
    }

    if (err.name === 'JsonWebTokenError') {
      return error(res, 401, {
        code: 'INVALID_TOKEN',
        message: 'Token 无效',
      })
    }

    return error(res, 401, {
      code: 'UNAUTHORIZED',
      message: '认证失败',
    })
  }
}
