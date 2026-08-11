import { timingSafeEqual } from 'node:crypto'
import { NextFunction, Request, Response } from 'express'
import { config } from '../config/app'

export function tokensMatch(expected: string, actual: string | undefined): boolean {
  if (!actual) {
    return false
  }

  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(actual)
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
}

export function metricsAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!config.metricsToken) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '路由不存在' },
    })
  }

  const authorization = req.get('authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : undefined
  if (!tokensMatch(config.metricsToken, token)) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '未授权访问' },
    })
  }

  return next()
}
