import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { config } from '../config/app'
import { runtimeMetrics } from '../observability/runtime-metrics'
import logger from '../utils/logger'
import { error as errorResponse } from '../utils/response'
import { getRequestId, getSafeRequestRoute } from '../utils/request-context'

function isDatabaseError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError
    || err instanceof Prisma.PrismaClientInitializationError
    || err instanceof Prisma.PrismaClientRustPanicError
}

/**
 * 全局错误处理中间件
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (isDatabaseError(err)) {
    runtimeMetrics.recordDatabaseQueryError()
  }

  logger.error('http_request_failed', {
    event: 'http_request_failed',
    requestId: getRequestId(res),
    method: req.method,
    route: getSafeRequestRoute(req),
    error: err,
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

  // 只在本地开发与测试环境返回内部错误信息。
  const canExposeErrorMessage = config.nodeEnv === 'development' || config.nodeEnv === 'test'
  return errorResponse(res, 500, {
    code: 'INTERNAL_ERROR',
    message: canExposeErrorMessage ? err.message : '服务器内部错误',
  })
}
