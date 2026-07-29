import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import logger from '../utils/logger'
import { error as errorResponse } from '../utils/response'

/**
 * 全局错误处理中间件
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 记录错误日志
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.userId,
  })

  // Zod 验证错误
  if (err instanceof ZodError) {
    return errorResponse(res, 400, {
      code: 'VALIDATION_ERROR',
      message: '请求参数验证失败',
      details: err.errors,
    })
  }

  // Prisma 错误
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // 唯一约束冲突
    if (err.code === 'P2002') {
      return errorResponse(res, 409, {
        code: 'CONFLICT',
        message: '记录已存在',
        details: err.meta,
      })
    }

    // 记录不存在
    if (err.code === 'P2025') {
      return errorResponse(res, 404, {
        code: 'NOT_FOUND',
        message: '记录不存在',
      })
    }
  }

  // 默认错误
  return errorResponse(res, 500, {
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : err.message,
  })
}
