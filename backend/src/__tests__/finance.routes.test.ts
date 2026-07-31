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
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: '路由不存在' },
  })
})
app.use(errorHandler)
const server = http.createServer(app)

interface HttpResponse {
  statusCode: number
  body: any
}

interface ValidatorResponse {
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

async function invokeRouteValidator(
  method: string,
  path: string,
  parts: { body?: unknown; query?: unknown; params?: unknown },
): Promise<{ response: ValidatorResponse; next: ReturnType<typeof vi.fn> }> {
  const layer = routeLayers.find((candidate: any) => (
    candidate.route.path === path && candidate.route.methods[method]
  ))
  expect(layer).toBeDefined()

  const response: ValidatorResponse & {
    status: (code: number) => ValidatorResponse
    json: (body: unknown) => ValidatorResponse
  } = {
    statusCode: 200,
    body: undefined,
    status(code) {
      response.statusCode = code
      return response
    },
    json(body) {
      response.body = body
      return response
    },
  }
  const next = vi.fn()
  await layer.route.stack[1].handle({
    body: parts.body ?? {},
    query: parts.query ?? {},
    params: parts.params ?? {},
  }, response, next)
  return { response, next }
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

  it('rejects schema-specific invalid requests for every endpoint through real HTTP', async () => {
    const cases = [
      {
        method: 'GET', path: '/api/finance/expenses?month=2026-07',
        service: 'getExpenses', body: undefined,
      },
      {
        method: 'GET', path: '/api/finance/expenses?limit=0',
        service: 'getExpenses', body: undefined,
      },
      {
        method: 'GET', path: '/api/finance/expenses?offset=-1',
        service: 'getExpenses', body: undefined,
      },
      {
        method: 'GET', path: '/api/finance/expenses?category=unknown',
        service: 'getExpenses', body: undefined,
      },
      {
        method: 'GET', path: '/api/finance/expenses?paymentMethod=unknown',
        service: 'getExpenses', body: undefined,
      },
      {
        method: 'GET', path: '/api/finance/expenses?startDate=2026-02-30',
        service: 'getExpenses', body: undefined,
      },
      {
        method: 'GET', path: '/api/finance/expenses?endDate=2026-02-30',
        service: 'getExpenses', body: undefined,
      },
      {
        method: 'GET', path: '/api/finance/expenses?startDate=2026-08-01&endDate=2026-07-01',
        service: 'getExpenses', body: undefined,
      },
      {
        method: 'POST', path: '/api/finance/expenses',
        service: 'createExpense', body: {},
      },
      {
        method: 'POST', path: '/api/finance/expenses',
        service: 'createExpense', body: {
          date: '2026-02-30', amount: 1, category: 'food', paymentMethod: 'cash',
        },
      },
      {
        method: 'POST', path: '/api/finance/expenses',
        service: 'createExpense', body: {
          date: '2026-07-31', amount: 0, category: 'food', paymentMethod: 'cash',
        },
      },
      {
        method: 'POST', path: '/api/finance/expenses',
        service: 'createExpense', body: {
          date: '2026-07-31', amount: 1.001, category: 'food', paymentMethod: 'cash',
        },
      },
      {
        method: 'POST', path: '/api/finance/expenses',
        service: 'createExpense', body: {
          date: '2026-07-31', amount: 10000000000, category: 'food', paymentMethod: 'cash',
        },
      },
      {
        method: 'POST', path: '/api/finance/expenses',
        service: 'createExpense', body: {
          date: '2026-07-31', amount: 1, category: 'unknown', paymentMethod: 'cash',
        },
      },
      {
        method: 'POST', path: '/api/finance/expenses',
        service: 'createExpense', body: {
          date: '2026-07-31', amount: 1, category: 'food', paymentMethod: 'unknown',
        },
      },
      {
        method: 'POST', path: '/api/finance/expenses',
        service: 'createExpense', body: {
          date: '2026-07-31', amount: 1, category: 'food', paymentMethod: 'cash', notes: 'x'.repeat(2001),
        },
      },
      {
        method: 'POST', path: '/api/finance/expenses',
        service: 'createExpense', body: { name: '旅行', targetAmount: 10, targetDate: '2026-12-31' },
      },
      {
        method: 'PATCH', path: '/api/finance/expenses/e1',
        service: 'updateExpense', body: { name: '新旅行' },
      },
      {
        method: 'PATCH', path: '/api/finance/expenses/e1',
        service: 'updateExpense', body: { date: '2026-02-30' },
      },
      {
        method: 'PATCH', path: '/api/finance/expenses/e1',
        service: 'updateExpense', body: { amount: 0 },
      },
      {
        method: 'PATCH', path: '/api/finance/expenses/e1',
        service: 'updateExpense', body: { amount: 1.001 },
      },
      {
        method: 'PATCH', path: '/api/finance/expenses/e1',
        service: 'updateExpense', body: { amount: 10000000000 },
      },
      {
        method: 'PATCH', path: '/api/finance/expenses/e1',
        service: 'updateExpense', body: { category: 'unknown' },
      },
      {
        method: 'PATCH', path: '/api/finance/expenses/e1',
        service: 'updateExpense', body: { paymentMethod: 'unknown' },
      },
      {
        method: 'PATCH', path: '/api/finance/expenses/e1',
        service: 'updateExpense', body: { notes: 'x'.repeat(2001) },
      },
      {
        method: 'GET', path: '/api/finance/summary?month=2026-13',
        service: 'getSummary', body: undefined,
      },
      {
        method: 'GET', path: '/api/finance/summary?limit=1',
        service: 'getSummary', body: undefined,
      },
      {
        method: 'GET', path: '/api/finance/budgets?month=2026-13',
        service: 'getBudget', body: undefined,
      },
      {
        method: 'GET', path: '/api/finance/budgets?limit=1',
        service: 'getBudget', body: undefined,
      },
      {
        method: 'PUT', path: '/api/finance/budgets',
        service: 'upsertBudget', body: { month: '2026-07', amount: -1 },
      },
      {
        method: 'PUT', path: '/api/finance/budgets',
        service: 'upsertBudget', body: { month: '2026-07', amount: 1.001 },
      },
      {
        method: 'PUT', path: '/api/finance/budgets',
        service: 'upsertBudget', body: { month: '2026-13', amount: 1 },
      },
      {
        method: 'PUT', path: '/api/finance/budgets',
        service: 'upsertBudget', body: { name: '旅行', targetAmount: 10, targetDate: '2026-12-31' },
      },
      {
        method: 'GET', path: '/api/finance/saving-plans?month=2026-07',
        service: 'getSavingPlans', body: undefined,
      },
      {
        method: 'GET', path: '/api/finance/saving-plans',
        service: 'getSavingPlans', body: { injected: true },
      },
      {
        method: 'GET', path: '/api/finance/saving-plans?injected=true',
        service: 'getSavingPlans', body: undefined,
      },
      {
        method: 'POST', path: '/api/finance/saving-plans',
        service: 'createSavingPlan', body: {},
      },
      {
        method: 'POST', path: '/api/finance/saving-plans',
        service: 'createSavingPlan', body: { name: '   ', targetAmount: 10, targetDate: '2026-12-31' },
      },
      {
        method: 'POST', path: '/api/finance/saving-plans',
        service: 'createSavingPlan', body: { name: '旅行', targetAmount: 0, targetDate: '2026-12-31' },
      },
      {
        method: 'POST', path: '/api/finance/saving-plans',
        service: 'createSavingPlan', body: { name: '旅行', targetAmount: 1.001, targetDate: '2026-12-31' },
      },
      {
        method: 'POST', path: '/api/finance/saving-plans',
        service: 'createSavingPlan', body: { name: '旅行', targetAmount: 10000000000, targetDate: '2026-12-31' },
      },
      {
        method: 'POST', path: '/api/finance/saving-plans',
        service: 'createSavingPlan', body: { name: '旅行', targetAmount: 10, currentAmount: -1, targetDate: '2026-12-31' },
      },
      {
        method: 'POST', path: '/api/finance/saving-plans',
        service: 'createSavingPlan', body: { name: '旅行', targetAmount: 10, currentAmount: 1.001, targetDate: '2026-12-31' },
      },
      {
        method: 'POST', path: '/api/finance/saving-plans',
        service: 'createSavingPlan', body: { name: '旅行', targetAmount: 10, currentAmount: 10000000000, targetDate: '2026-12-31' },
      },
      {
        method: 'POST', path: '/api/finance/saving-plans',
        service: 'createSavingPlan', body: { name: '旅行', targetAmount: 10, targetDate: '2026-02-30' },
      },
      {
        method: 'POST', path: '/api/finance/saving-plans',
        service: 'createSavingPlan', body: { date: '2026-07-31', amount: 1, category: 'food', paymentMethod: 'cash' },
      },
      {
        method: 'PATCH', path: '/api/finance/saving-plans/p1',
        service: 'updateSavingPlan', body: { paymentMethod: 'cash' },
      },
      {
        method: 'PATCH', path: '/api/finance/saving-plans/p1',
        service: 'updateSavingPlan', body: { targetDate: '2026-02-30' },
      },
      {
        method: 'PATCH', path: '/api/finance/saving-plans/p1',
        service: 'updateSavingPlan', body: { name: '   ' },
      },
      {
        method: 'PATCH', path: '/api/finance/saving-plans/p1',
        service: 'updateSavingPlan', body: { targetAmount: 0 },
      },
      {
        method: 'PATCH', path: '/api/finance/saving-plans/p1',
        service: 'updateSavingPlan', body: { targetAmount: 1.001 },
      },
      {
        method: 'PATCH', path: '/api/finance/saving-plans/p1',
        service: 'updateSavingPlan', body: { targetAmount: 10000000000 },
      },
      {
        method: 'PATCH', path: '/api/finance/saving-plans/p1',
        service: 'updateSavingPlan', body: { currentAmount: -1 },
      },
    ] as const

    for (const route of cases) {
      vi.restoreAllMocks()
      const serviceMethod = vi.spyOn(financeService, route.service as any)
      const response = await httpRequest(route.method, route.path, route.body)
      expect(response.statusCode, `${route.method} ${route.path}`).toBe(400)
      expect(response.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } })
      expect(serviceMethod).not.toHaveBeenCalled()
    }
  })

  it('covers route-param validator middleware contract directly, including empty IDs', async () => {
    // Express does not match /:id for an empty path segment, so empty IDs are
    // covered here by invoking the validator middleware contract directly.
    const invalidExpenseUpdate = await invokeRouteValidator('patch', '/expenses/:id', {
      params: { id: '' }, body: { amount: 2 },
    })
    expect(invalidExpenseUpdate.response.statusCode).toBe(400)
    expect(invalidExpenseUpdate.next).not.toHaveBeenCalled()

    const invalidSavingPlanUpdate = await invokeRouteValidator('patch', '/saving-plans/:id', {
      params: { id: '' }, body: { name: '新旅行' },
    })
    expect(invalidSavingPlanUpdate.response.statusCode).toBe(400)
    expect(invalidSavingPlanUpdate.next).not.toHaveBeenCalled()

    for (const [method, path] of [['delete', '/expenses/:id'], ['delete', '/saving-plans/:id']] as const) {
      const invalid = await invokeRouteValidator(method, path, { params: { id: '' } })
      expect(invalid.response.statusCode).toBe(400)
      expect(invalid.next).not.toHaveBeenCalled()
    }

    for (const parts of [
      { body: { injected: true } },
      { query: { injected: true } },
      { params: { injected: true } },
    ]) {
      const invalid = await invokeRouteValidator('get', '/saving-plans', parts)
      expect(invalid.response.statusCode).toBe(400)
      expect(invalid.next).not.toHaveBeenCalled()
    }

    const validEmptyRequest = await invokeRouteValidator('get', '/saving-plans', {})
    expect(validEmptyRequest.response.statusCode).toBe(200)
    expect(validEmptyRequest.next).toHaveBeenCalledOnce()

    const validExpenseUpdate = await invokeRouteValidator('patch', '/expenses/:id', {
      params: { id: 'e1' }, body: { amount: 2 },
    })
    expect(validExpenseUpdate.response.statusCode).toBe(200)
    expect(validExpenseUpdate.next).toHaveBeenCalledOnce()

    const validSavingPlanUpdate = await invokeRouteValidator('patch', '/saving-plans/:id', {
      params: { id: 'p1' }, body: { name: '新旅行' },
    })
    expect(validSavingPlanUpdate.response.statusCode).toBe(200)
    expect(validSavingPlanUpdate.next).toHaveBeenCalledOnce()

    for (const path of ['/expenses/:id', '/saving-plans/:id']) {
      const valid = await invokeRouteValidator('delete', path, { params: { id: 'resource-1' } })
      expect(valid.response.statusCode).toBe(200)
      expect(valid.next).toHaveBeenCalledOnce()
    }
  })

  it('returns the complete success envelope for every endpoint through real requests', async () => {
    const cases = [
      {
        method: 'GET', path: '/api/finance/expenses', service: 'getExpenses', body: undefined,
        result: [{ id: 'e1' }], args: ['u1', {}],
        expected: { success: true, data: [{ id: 'e1' }] },
      },
      {
        method: 'POST', path: '/api/finance/expenses', service: 'createExpense',
        body: { date: '2026-07-31', amount: 1, category: 'food', paymentMethod: 'cash' },
        result: { id: 'e1', amount: 1 }, args: ['u1', { date: '2026-07-31', amount: 1, category: 'food', paymentMethod: 'cash' }],
        expected: { success: true, data: { id: 'e1', amount: 1 }, message: '消费记录已创建' },
      },
      {
        method: 'PATCH', path: '/api/finance/expenses/e1', service: 'updateExpense', body: { amount: 2 },
        result: { id: 'e1', amount: 2 }, args: ['u1', 'e1', { amount: 2 }],
        expected: { success: true, data: { id: 'e1', amount: 2 }, message: '消费记录已更新' },
      },
      {
        method: 'DELETE', path: '/api/finance/expenses/e1', service: 'deleteExpense', body: { amount: 0 },
        result: undefined, args: ['u1', 'e1'],
        expected: { success: true, data: null, message: '消费记录已删除' },
      },
      {
        method: 'GET', path: '/api/finance/summary?month=2026-07', service: 'getSummary', body: undefined,
        result: { month: '2026-07', total: 12 }, args: ['u1', '2026-07'],
        expected: { success: true, data: { month: '2026-07', total: 12 } },
      },
      {
        method: 'GET', path: '/api/finance/budgets?month=2026-07', service: 'getBudget', body: undefined,
        result: null, args: ['u1', '2026-07'],
        expected: { success: true, data: null },
      },
      {
        method: 'PUT', path: '/api/finance/budgets', service: 'upsertBudget', body: { month: '2026-07', amount: 0 },
        result: { id: 'b1', amount: 0 }, args: ['u1', { month: '2026-07', amount: 0 }],
        expected: { success: true, data: { id: 'b1', amount: 0 }, message: '预算已更新' },
      },
      {
        method: 'GET', path: '/api/finance/saving-plans', service: 'getSavingPlans', body: undefined,
        result: [{ id: 'p1' }], args: ['u1'],
        expected: { success: true, data: [{ id: 'p1' }] },
      },
      {
        method: 'POST', path: '/api/finance/saving-plans', service: 'createSavingPlan',
        body: { name: '旅行', targetAmount: 10, targetDate: '2026-12-31' },
        result: { id: 'p1', targetAmount: 10 }, args: ['u1', { name: '旅行', targetAmount: 10, targetDate: '2026-12-31' }],
        expected: { success: true, data: { id: 'p1', targetAmount: 10 }, message: '存钱计划已创建' },
      },
      {
        method: 'PATCH', path: '/api/finance/saving-plans/p1', service: 'updateSavingPlan', body: { name: '新旅行' },
        result: { id: 'p1', name: '新旅行' }, args: ['u1', 'p1', { name: '新旅行' }],
        expected: { success: true, data: { id: 'p1', name: '新旅行' }, message: '存钱计划已更新' },
      },
      {
        method: 'DELETE', path: '/api/finance/saving-plans/p1', service: 'deleteSavingPlan', body: { amount: 0 },
        result: undefined, args: ['u1', 'p1'],
        expected: { success: true, data: null, message: '存钱计划已删除' },
      },
    ] as const

    for (const route of cases) {
      const serviceMethod = vi.spyOn(financeService, route.service as any).mockResolvedValue(route.result as never)
      const response = await httpRequest(route.method, route.path, route.body)
      expect(response.statusCode).toBe(200)
      expect(serviceMethod).toHaveBeenCalledWith(...route.args)
      expect(response.body).toEqual(route.expected)
    }
  })

  it('returns route-level 404 for missing delete route segments without invoking services', async () => {
    for (const [resource, service] of [
      ['expenses', 'deleteExpense'],
      ['saving-plans', 'deleteSavingPlan'],
    ] as const) {
      const serviceMethod = vi.spyOn(financeService, service)
      const missing = await httpRequest('DELETE', `/api/finance/${resource}/`)
      expect(missing.statusCode).toBe(404)
      expect(missing.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })
      expect(serviceMethod).not.toHaveBeenCalled()
    }
  })

  it('maps unknown non-empty delete IDs to service not found through real HTTP routes', async () => {
    for (const [resource, service] of [
      ['expenses', 'deleteExpense'],
      ['saving-plans', 'deleteSavingPlan'],
    ] as const) {
      const serviceMethod = vi.spyOn(financeService, service).mockRejectedValue(new FinanceNotFoundError('财务记录不存在'))
      const unknown = await httpRequest('DELETE', `/api/finance/${resource}/missing-id`)
      expect(unknown.statusCode).toBe(404)
      expect(unknown.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })
      expect(serviceMethod).toHaveBeenCalledWith('u1', 'missing-id')
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
