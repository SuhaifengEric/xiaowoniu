import { Request, Response, NextFunction } from 'express'
import { runtimeMetrics } from '../observability/runtime-metrics'
import logger from '../utils/logger'
import { getRequestId, getSafeRequestRoute } from '../utils/request-context'

const METRICS_ROUTE = '/metrics'
const DASHBOARD_SUMMARY_ROUTE = '/api/dashboard/summary'

/**
 * 请求日志中间件
 */
export function loggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startedAt = Date.now()

  res.once('finish', () => {
    const durationMs = Date.now() - startedAt
    const route = getSafeRequestRoute(req)
    const requestId = getRequestId(res)

    if (route !== METRICS_ROUTE) {
      runtimeMetrics.recordRequest(route, res.statusCode, durationMs)
    }

    logger.info('http_request_completed', {
      event: 'http_request_completed',
      requestId,
      method: req.method,
      route,
      statusCode: res.statusCode,
      durationMs,
    })

    if (route === DASHBOARD_SUMMARY_ROUTE) {
      logger.info('dashboard_summary_request_completed', {
        event: 'dashboard_summary_request_completed',
        requestId,
        statusCode: res.statusCode,
        durationMs,
      })
    }
  })

  next()
}
