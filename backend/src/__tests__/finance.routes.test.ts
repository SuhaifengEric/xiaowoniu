import http from 'node:http'
import { AddressInfo } from 'node:net'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import express from 'express'
import routes from '../routes'
import financeRoutes from '../routes/finance.routes'
import financeService, { FinanceConflictError, FinanceNotFoundError } from '../services/finance.service'
import { errorHandler } from '../middlewares/error.middleware'
import { generateToken } from '../utils/jwt'

const routeLayers = (financeRoutes as any).stack.filter((layer: any) => layer.route)
const routeTable = routeLayers.map((layer: any) => ({
  method: Object.keys(layer.route.methods)[0],
  path: layer.route.path,
  middleware: layer.route.stack.map((item: any) => item.name),
}))

const expectedRoutes = [
  ['get', '/expenses'],
  ['post', '/expenses'],
  ['patch', '/expenses/:id'],
  ['delete', '/expenses/:id'],
  ['get', '/summary'],
  ['get', '/budgets'],
  ['put', '/budgets'],
  ['get', '/saving-plans'],
  ['post', '/saving-plans'],
  ['patch', '/saving-plans/:id'],
  ['delete', '/saving-plans/:id'],
] as const

const token = generateToken({ userId: 'u1', email: 'u1@example.com' })
const app = express()
app.use(express.json())
app.use('/api', routes)
app.use(errorHandler)
const server = http.createServer(app)

interface HttpResponse {
  statusCode: number
  body: any
}

function httpRequest(method: string, path: string, body?: unknown, authorization = `Bearer ${token}`): Promise<HttpResponse> {
  const address = server.address() as AddressInfo
  const payload = body === undefined ? undefined : JSON.stringify(body)
  return new Promise((resolve, reject) => {
    const request = http.request({
      host: '127.0.0.1',
      port: address.port,
      method,
      path,
      headers: {
        ...(authorization ? { authorization } : {}),
        ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
      },
    }, (response) => {
      let raw = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => { raw += chunk })
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode ?? 0,
          body: raw ? JSON.parse(raw) : undefined,
        })
      })
    })
    request.on('error', reject)
    if (payload) request.write(payload)
    request.end()
  })
}

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve))
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('finance routes', () => {
  it('registers exactly all finance endpoints with auth before validation and controller', () => {
    expect(routeTable).toHaveLength(expectedRoutes.length)
    expect(routeTable.map(({ method, path }: any) => [method, path])).toEqual(expectedRoutes)
    for (const route of routeTable) {
      expect(route.middleware[0]).toBe('authMiddleware')
      expect(route.middleware[1]).toBe('validateRequest')
      expect(route.middleware[2]).toMatch(/bound /)
      expect(route.middleware).toHaveLength(3)
    }
  })

  it('mounts finance through the real API router', async () => {
    const mounted = (routes as any).stack.find((layer: any) => layer.regexp?.toString().includes('finance'))
    expect(mounted).toBeDefined()
    expect(mounted.handle).toBe(financeRoutes)

    vi.spyOn(financeService, 'getExpenses').mockResolvedValue([])
    const response = await httpRequest('GET', '/api/finance/expenses')
    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ success: true, data: [] })
  })

  it.each(expectedRoutes)('requires authentication for %s %s', async (method, path) => {
    const requestPath = path.replace(':id', 'missing-id') + (path.includes('summary') || path.includes('budgets') ? '?month=2026-07' : '')
    const response = await httpRequest(method.toUpperCase(), `/api/finance${requestPath}`, undefined, '')
    expect(response.statusCode).toBe(401)
    expect(response.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } })
  })

  it('runs the real validation middleware for invalid amount, date, and month', async () => {
    const invalidAmount = await httpRequest('POST', '/api/finance/expenses', {
      date: '2026-07-31', amount: 1.001, category: 'food', paymentMethod: 'cash',
    })
    expect(invalidAmount.statusCode).toBe(400)
    expect(invalidAmount.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } })

    const invalidDate = await httpRequest('POST', '/api/finance/expenses', {
      date: '2026-02-30', amount: 1, category: 'food', paymentMethod: 'cash',
    })
    expect(invalidDate.statusCode).toBe(400)
    expect(invalidDate.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } })

    const invalidMonth = await httpRequest('GET', '/api/finance/summary?month=2026-13')
    expect(invalidMonth.statusCode).toBe(400)
    expect(invalidMonth.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } })
  })

  it('binds every endpoint to its schema and controller through real requests', async () => {
    const cases = [
      {
        method: 'GET', path: '/api/finance/expenses', service: 'getExpenses', body: undefined,
        result: [], args: ['u1', {}],
      },
      {
        method: 'POST', path: '/api/finance/expenses', service: 'createExpense',
        body: { date: '2026-07-31', amount: 1, category: 'food', paymentMethod: 'cash' },
        result: { id: 'e1' }, args: ['u1', { date: '2026-07-31', amount: 1, category: 'food', paymentMethod: 'cash' }],
      },
      {
        method: 'PATCH', path: '/api/finance/expenses/e1', service: 'updateExpense', body: { amount: 2 },
        result: { id: 'e1' }, args: ['u1', 'e1', { amount: 2 }],
      },
      {
        method: 'DELETE', path: '/api/finance/expenses/e1', service: 'deleteExpense', body: undefined,
        result: undefined, args: ['u1', 'e1'],
      },
      {
        method: 'GET', path: '/api/finance/summary?month=2026-07', service: 'getSummary', body: undefined,
        result: { month: '2026-07' }, args: ['u1', '2026-07'],
      },
      {
        method: 'GET', path: '/api/finance/budgets?month=2026-07', service: 'getBudget', body: undefined,
        result: null, args: ['u1', '2026-07'],
      },
      {
        method: 'PUT', path: '/api/finance/budgets', service: 'upsertBudget', body: { month: '2026-07', amount: 0 },
        result: { id: 'b1' }, args: ['u1', { month: '2026-07', amount: 0 }],
      },
      {
        method: 'GET', path: '/api/finance/saving-plans', service: 'getSavingPlans', body: undefined,
        result: [], args: ['u1'],
      },
      {
        method: 'POST', path: '/api/finance/saving-plans', service: 'createSavingPlan',
        body: { name: '旅行', targetAmount: 10, targetDate: '2026-12-31' },
        result: { id: 'p1' }, args: ['u1', { name: '旅行', targetAmount: 10, targetDate: '2026-12-31' }],
      },
      {
        method: 'PATCH', path: '/api/finance/saving-plans/p1', service: 'updateSavingPlan', body: { name: '新旅行' },
        result: { id: 'p1' }, args: ['u1', 'p1', { name: '新旅行' }],
      },
      {
        method: 'DELETE', path: '/api/finance/saving-plans/p1', service: 'deleteSavingPlan', body: undefined,
        result: undefined, args: ['u1', 'p1'],
      },
    ] as const

    for (const route of cases) {
      const serviceMethod = vi.spyOn(financeService, route.service as any).mockResolvedValue(route.result as never)
      const response = await httpRequest(route.method, route.path, route.body)
      expect(response.statusCode).toBe(200)
      expect(serviceMethod).toHaveBeenCalledWith(...route.args)
      expect(response.body.success).toBe(true)
    }
  })

  it('returns required success messages through real endpoints', async () => {
    const cases = [
      ['POST', '/api/finance/expenses', 'createExpense', { date: '2026-07-31', amount: 1, category: 'food', paymentMethod: 'cash' }, '消费记录已创建'],
      ['PATCH', '/api/finance/expenses/e1', 'updateExpense', { amount: 2 }, '消费记录已更新'],
      ['DELETE', '/api/finance/expenses/e1', 'deleteExpense', undefined, '消费记录已删除'],
      ['PUT', '/api/finance/budgets', 'upsertBudget', { month: '2026-07', amount: 0 }, '预算已更新'],
      ['POST', '/api/finance/saving-plans', 'createSavingPlan', { name: '旅行', targetAmount: 10, targetDate: '2026-12-31' }, '存钱计划已创建'],
      ['PATCH', '/api/finance/saving-plans/p1', 'updateSavingPlan', { name: '新旅行' }, '存钱计划已更新'],
      ['DELETE', '/api/finance/saving-plans/p1', 'deleteSavingPlan', undefined, '存钱计划已删除'],
    ] as const

    for (const [method, path, service, body, message] of cases) {
      vi.spyOn(financeService, service as any).mockResolvedValue(service.startsWith('delete') ? undefined : { id: 'resource-1' } as never)
      const response = await httpRequest(method, path, body)
      expect(response.statusCode).toBe(200)
      expect(response.body).toMatchObject({ success: true, message })
      if (service.startsWith('delete')) expect(response.body.data).toBeNull()
    }
  })

  it('maps service not-found and conflict errors through real endpoints', async () => {
    vi.spyOn(financeService, 'updateExpense').mockRejectedValue(new FinanceNotFoundError('消费记录不存在'))
    const notFound = await httpRequest('PATCH', '/api/finance/expenses/other-user-record', { amount: 1 })
    expect(notFound.statusCode).toBe(404)
    expect(notFound.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })
    expect(JSON.stringify(notFound.body)).not.toContain('other-user-record')

    vi.spyOn(financeService, 'createSavingPlan').mockRejectedValue(new FinanceConflictError('当前金额不能超过目标金额'))
    const conflict = await httpRequest('POST', '/api/finance/saving-plans', {
      name: '旅行', targetAmount: 10, currentAmount: 11, targetDate: '2026-12-31',
    })
    expect(conflict.statusCode).toBe(409)
    expect(conflict.body).toMatchObject({ success: false, error: { code: 'CONFLICT' } })
  })

  it('passes unknown service errors to the real error handler as 500', async () => {
    vi.spyOn(financeService, 'getExpenses').mockRejectedValue(new Error('finance exploded'))
    const response = await httpRequest('GET', '/api/finance/expenses')
    expect(response.statusCode).toBe(500)
    expect(response.body).toMatchObject({ success: false, error: { code: 'INTERNAL_ERROR', message: 'finance exploded' } })
  })

  it('passes only the authenticated userId to a cross-user service call and returns 404', async () => {
    const update = vi.spyOn(financeService, 'updateExpense').mockRejectedValue(
      new FinanceNotFoundError('消费记录不存在'),
    )
    const response = await httpRequest('PATCH', '/api/finance/expenses/other-user-record', { amount: 1 })

    expect(response.statusCode).toBe(404)
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND', message: '消费记录不存在' },
    })
    expect(JSON.stringify(response.body)).not.toContain('other-user-record')
    expect(update).toHaveBeenCalledWith('u1', 'other-user-record', { amount: 1 })
    expect(update.mock.calls[0]?.[0]).toBe('u1')
  })
})
