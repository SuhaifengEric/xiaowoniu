import http from 'node:http'
import { AddressInfo } from 'node:net'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import express from 'express'
import routes from '../routes'
import weddingRoutes from '../routes/wedding.routes'
import weddingService, { WeddingNotFoundError } from '../services/wedding.service'
import { errorHandler } from '../middlewares/error.middleware'
import { generateToken } from '../utils/jwt'

const routeLayers = (weddingRoutes as any).stack.filter((layer: any) => layer.route)
const routeTable = routeLayers.map((layer: any) => ({
  method: Object.keys(layer.route.methods)[0],
  path: layer.route.path,
  middleware: layer.route.stack.map((item: any) => item.name),
}))

const expectedRoutes = [
  ['get', '/tasks'],
  ['post', '/tasks'],
  ['patch', '/tasks/:id'],
  ['delete', '/tasks/:id'],
  ['get', '/expenses'],
  ['post', '/expenses'],
  ['patch', '/expenses/:id'],
  ['delete', '/expenses/:id'],
  ['get', '/budget'],
  ['put', '/budget'],
  ['get', '/overview'],
  ['get', '/timeline'],
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

const taskBody = {
  taskName: '确认婚礼场地', category: 'venue', plannedDate: '2026-10-01',
  status: 'pending', priority: 5, notes: '确认档期',
}
const expenseBody = {
  taskId: '00000000-0000-0000-0000-000000000001', date: '2026-08-04', itemName: '场地定金',
  category: 'venue', plannedAmount: 20000, actualAmount: 18000, paidStatus: 'partial',
}

describe('wedding routes', () => {
  it('registers exactly all wedding endpoints with auth before validation and controller', () => {
    expect(routeTable).toHaveLength(expectedRoutes.length)
    expect(routeTable.map(({ method, path }: any) => [method, path])).toEqual(expectedRoutes)
    for (const route of routeTable) {
      expect(route.middleware[0]).toBe('authMiddleware')
      expect(route.middleware[1]).toBe('validateRequest')
      expect(route.middleware[2]).toMatch(/bound /)
      expect(route.middleware).toHaveLength(3)
    }
  })

  it('mounts wedding through the real API router', async () => {
    const mounted = (routes as any).stack.find((layer: any) => layer.regexp?.toString().includes('wedding'))
    expect(mounted).toBeDefined()
    expect(mounted.handle).toBe(weddingRoutes)

    vi.spyOn(weddingService, 'getTasks').mockResolvedValue([])
    const response = await httpRequest('GET', '/api/wedding/tasks')
    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ success: true, data: [] })
  })

  it.each(expectedRoutes)('requires authentication for %s %s', async (method, path) => {
    const requestPath = path.replace(':id', 'missing-id')
    const response = await httpRequest(method.toUpperCase(), `/api/wedding${requestPath}`, undefined, '')
    expect(response.statusCode).toBe(401)
    expect(response.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } })
  })

  it('rejects schema-specific invalid requests for every endpoint through real HTTP', async () => {
    const cases = [
      { method: 'GET', path: '/api/wedding/tasks?limit=0', service: 'getTasks' },
      { method: 'GET', path: '/api/wedding/tasks?offset=-1', service: 'getTasks' },
      { method: 'GET', path: '/api/wedding/tasks?status=bogus', service: 'getTasks' },
      { method: 'GET', path: '/api/wedding/tasks?category=banquet', service: 'getTasks' },
      { method: 'POST', path: '/api/wedding/tasks', service: 'createTask', body: {} },
      { method: 'POST', path: '/api/wedding/tasks', service: 'createTask', body: { ...taskBody, taskName: '   ' } },
      { method: 'POST', path: '/api/wedding/tasks', service: 'createTask', body: { ...taskBody, priority: 6 } },
      { method: 'POST', path: '/api/wedding/tasks', service: 'createTask', body: { ...taskBody, plannedDate: '2026-02-30' } },
      { method: 'POST', path: '/api/wedding/tasks', service: 'createTask', body: { ...taskBody, completedDate: '2026-08-04' } },
      { method: 'POST', path: '/api/wedding/tasks', service: 'createTask', body: { ...taskBody, unknownField: 1 } },
      { method: 'PATCH', path: '/api/wedding/tasks/e1', service: 'updateTask', body: {} },
      { method: 'PATCH', path: '/api/wedding/tasks/e1', service: 'updateTask', body: { completedDate: '2026-08-04' } },
      { method: 'PATCH', path: '/api/wedding/tasks/e1', service: 'updateTask', body: { status: 'bogus' } },
      { method: 'PATCH', path: '/api/wedding/tasks/not-a-uuid', service: 'updateTask', body: { status: 'completed' } },
      { method: 'DELETE', path: '/api/wedding/tasks/not-a-uuid', service: 'deleteTask' },
      { method: 'GET', path: '/api/wedding/expenses?startDate=2026-08-31&endDate=2026-08-01', service: 'getExpenses' },
      { method: 'GET', path: '/api/wedding/expenses?paidStatus=nope', service: 'getExpenses' },
      { method: 'GET', path: '/api/wedding/expenses?limit=101', service: 'getExpenses' },
      { method: 'POST', path: '/api/wedding/expenses', service: 'createExpense', body: {} },
      { method: 'POST', path: '/api/wedding/expenses', service: 'createExpense', body: { ...expenseBody, plannedAmount: -1 } },
      { method: 'POST', path: '/api/wedding/expenses', service: 'createExpense', body: { ...expenseBody, actualAmount: 1.001 } },
      { method: 'POST', path: '/api/wedding/expenses', service: 'createExpense', body: { ...expenseBody, taskId: 'not-a-uuid' } },
      { method: 'POST', path: '/api/wedding/expenses', service: 'createExpense', body: { ...expenseBody, date: '2026-13-01' } },
      { method: 'PATCH', path: '/api/wedding/expenses/00000000-0000-0000-0000-00000000000b', service: 'updateExpense', body: {} },
      { method: 'PATCH', path: '/api/wedding/expenses/00000000-0000-0000-0000-00000000000b', service: 'updateExpense', body: { itemName: '' } },
      { method: 'PATCH', path: '/api/wedding/expenses/00000000-0000-0000-0000-00000000000b', service: 'updateExpense', body: { paidStatus: 'settled' } },
      { method: 'GET', path: '/api/wedding/budget?injected=1', service: 'getBudget' },
      { method: 'GET', path: '/api/wedding/budget', service: 'getBudget', body: { injected: true } },
      { method: 'PUT', path: '/api/wedding/budget', service: 'upsertBudget', body: {} },
      { method: 'PUT', path: '/api/wedding/budget', service: 'upsertBudget', body: { totalBudget: 1000 } },
      { method: 'PUT', path: '/api/wedding/budget', service: 'upsertBudget', body: { totalBudget: -1, weddingDate: '2026-12-01' } },
      { method: 'PUT', path: '/api/wedding/budget', service: 'upsertBudget', body: { totalBudget: 1000, weddingDate: '2026-02-30' } },
      { method: 'GET', path: '/api/wedding/overview?injected=1', service: 'getOverview' },
      { method: 'GET', path: '/api/wedding/timeline?injected=1', service: 'getTimeline' },
    ] as const

    for (const route of cases) {
      vi.restoreAllMocks()
      const serviceMethod = vi.spyOn(weddingService, route.service as any)
      const response = await httpRequest(route.method, route.path, (route as any).body)
      expect(response.statusCode, `${route.method} ${route.path}`).toBe(400)
      expect(response.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } })
      expect(serviceMethod).not.toHaveBeenCalled()
    }
  })

  it('returns the complete success envelope for every endpoint through real requests', async () => {
    const cases = [
      {
        method: 'GET', path: '/api/wedding/tasks', service: 'getTasks', body: undefined,
        result: [{ id: 't1' }], args: ['u1', {}],
        expected: { success: true, data: [{ id: 't1' }] },
      },
      {
        method: 'POST', path: '/api/wedding/tasks', service: 'createTask', body: taskBody,
        result: { id: 't1', taskName: '确认婚礼场地' },
        args: ['u1', taskBody],
        expected: { success: true, data: { id: 't1', taskName: '确认婚礼场地' }, message: '备婚任务已创建' },
      },
      {
        method: 'PATCH', path: '/api/wedding/tasks/00000000-0000-0000-0000-00000000000a', service: 'updateTask', body: { status: 'completed' },
        result: { id: 't1', status: 'completed' },
        args: ['u1', '00000000-0000-0000-0000-00000000000a', { status: 'completed' }],
        expected: { success: true, data: { id: 't1', status: 'completed' }, message: '备婚任务已更新' },
      },
      {
        method: 'DELETE', path: '/api/wedding/tasks/00000000-0000-0000-0000-00000000000a', service: 'deleteTask', body: undefined,
        result: undefined, args: ['u1', '00000000-0000-0000-0000-00000000000a'],
        expected: { success: true, data: null, message: '备婚任务已删除' },
      },
      {
        method: 'GET', path: '/api/wedding/expenses', service: 'getExpenses', body: undefined,
        result: [{ id: 'e1' }], args: ['u1', {}],
        expected: { success: true, data: [{ id: 'e1' }] },
      },
      {
        method: 'POST', path: '/api/wedding/expenses', service: 'createExpense', body: expenseBody,
        result: { id: 'e1', itemName: '场地定金' },
        args: ['u1', expenseBody],
        expected: { success: true, data: { id: 'e1', itemName: '场地定金' }, message: '备婚花费已创建' },
      },
      {
        method: 'PATCH', path: '/api/wedding/expenses/00000000-0000-0000-0000-00000000000b', service: 'updateExpense', body: { taskId: null },
        result: { id: 'e1', taskId: null },
        args: ['u1', '00000000-0000-0000-0000-00000000000b', { taskId: null }],
        expected: { success: true, data: { id: 'e1', taskId: null }, message: '备婚花费已更新' },
      },
      {
        method: 'DELETE', path: '/api/wedding/expenses/00000000-0000-0000-0000-00000000000b', service: 'deleteExpense', body: undefined,
        result: undefined, args: ['u1', '00000000-0000-0000-0000-00000000000b'],
        expected: { success: true, data: null, message: '备婚花费已删除' },
      },
      {
        method: 'GET', path: '/api/wedding/budget', service: 'getBudget', body: undefined,
        result: null, args: ['u1'],
        expected: { success: true, data: null },
      },
      {
        method: 'PUT', path: '/api/wedding/budget', service: 'upsertBudget',
        body: { totalBudget: 150000, weddingDate: '2026-12-01' },
        result: { id: 'b1', totalBudget: 150000 },
        args: ['u1', { totalBudget: 150000, weddingDate: '2026-12-01' }],
        expected: { success: true, data: { id: 'b1', totalBudget: 150000 }, message: '备婚预算已更新' },
      },
      {
        method: 'GET', path: '/api/wedding/overview', service: 'getOverview', body: undefined,
        result: { actualExpenseTotal: 0 }, args: ['u1'],
        expected: { success: true, data: { actualExpenseTotal: 0 } },
      },
      {
        method: 'GET', path: '/api/wedding/timeline', service: 'getTimeline', body: undefined,
        result: { items: [] }, args: ['u1'],
        expected: { success: true, data: { items: [] } },
      },
    ] as const

    for (const route of cases) {
      const serviceMethod = vi.spyOn(weddingService, route.service as any).mockResolvedValue(route.result as never)
      const response = await httpRequest(route.method, route.path, route.body)
      expect(response.statusCode, `${route.method} ${route.path}`).toBe(200)
      expect(serviceMethod).toHaveBeenCalledWith(...route.args)
      expect(response.body).toEqual(route.expected)
    }
  })

  it('maps service not-found errors to 404 without leaking resource identity', async () => {
    vi.spyOn(weddingService, 'updateTask').mockRejectedValue(new WeddingNotFoundError('备婚任务不存在'))
    const notFound = await httpRequest('PATCH', '/api/wedding/tasks/00000000-0000-0000-0000-0000000000ac', { status: 'completed' })
    expect(notFound.statusCode).toBe(404)
    expect(notFound.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })
    expect(JSON.stringify(notFound.body)).not.toContain('00000000-0000-0000-0000-0000000000ac')

    vi.spyOn(weddingService, 'deleteExpense').mockRejectedValue(new WeddingNotFoundError('备婚花费不存在'))
    const missing = await httpRequest('DELETE', '/api/wedding/expenses/00000000-0000-0000-0000-0000000000df')
    expect(missing.statusCode).toBe(404)
    expect(missing.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })
  })

  it('passes unknown service errors to the real error handler as 500', async () => {
    vi.spyOn(weddingService, 'getOverview').mockRejectedValue(new Error('wedding exploded'))
    const response = await httpRequest('GET', '/api/wedding/overview')
    expect(response.statusCode).toBe(500)
    expect(response.body).toMatchObject({ success: false, error: { code: 'INTERNAL_ERROR', message: 'wedding exploded' } })
  })

  it('does not expose /api/v1/wedding and rejects injected userIds in body', async () => {
    const v1 = await httpRequest('GET', '/api/v1/wedding/tasks')
    expect(v1.statusCode).toBe(404)

    const userId = 'attacker-id'
    vi.spyOn(weddingService, 'createTask').mockResolvedValue({ id: 't1' } as never)
    const injected = await httpRequest('POST', '/api/wedding/tasks', { ...taskBody, userId })
    expect(injected.statusCode).toBe(400)
    expect(weddingService.createTask).not.toHaveBeenCalled()
  })

  it('passes only the authenticated userId to service calls', async () => {
    const create = vi.spyOn(weddingService, 'createTask').mockResolvedValue({ id: 't1' } as never)
    await httpRequest('POST', '/api/wedding/tasks', { ...taskBody, userId: 'attacker-id' } as never)
    expect(create).not.toHaveBeenCalled()

    vi.restoreAllMocks()
    const get = vi.spyOn(weddingService, 'getTasks').mockResolvedValue([])
    await httpRequest('GET', '/api/wedding/tasks')
    expect(get).toHaveBeenCalledWith('u1', {})
  })
})
