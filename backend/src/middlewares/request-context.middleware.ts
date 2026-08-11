import { randomUUID } from 'node:crypto'
import { NextFunction, Request, Response } from 'express'
import { getInboundRequestId } from '../utils/request-context'

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = getInboundRequestId(req) || randomUUID()
  res.locals.requestId = requestId
  res.setHeader('X-Request-Id', requestId)
  next()
}
