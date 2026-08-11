import { Request, Response } from 'express'

const validRequestId = /^[A-Za-z0-9][A-Za-z0-9._-]{7,127}$/
const uuidSegment = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const numericSegment = /^\d+$/
const safeRouteSegments = new Set([
  'api', 'auth', 'register', 'login', 'logout', 'me', 'dashboard', 'summary',
  'fitness', 'checkins', 'weights', 'goals', 'goal', 'stats',
  'learning', 'exams', 'subjects', 'progress',
  'finance', 'expenses', 'budget', 'saving-plans',
  'wedding', 'tasks', 'overview', 'timeline',
  'health', 'readyz', 'version', 'metrics',
])

export function getInboundRequestId(req: Request): string | undefined {
  const requestId = req.get('x-request-id')
  return requestId && validRequestId.test(requestId) ? requestId : undefined
}

export function getRequestId(res: Response): string {
  const requestId = res.locals.requestId
  return typeof requestId === 'string' ? requestId : 'unknown'
}

export function getSafeRequestRoute(req: Request): string {
  return req.path
    .split('/')
    .map((segment) => {
      if (!segment || safeRouteSegments.has(segment)) {
        return segment
      }

      return uuidSegment.test(segment) || numericSegment.test(segment) ? ':id' : ':param'
    })
    .join('/')
}
