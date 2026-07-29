import { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger'

/**
 * 请求日志中间件
 */
export function loggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.userId,
    })
  })

  next()
}
