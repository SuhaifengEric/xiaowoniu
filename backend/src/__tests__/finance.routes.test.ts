import { describe, expect, it, vi } from 'vitest'
import express, { NextFunction, Request, Response } from 'express'
import routes from '../routes'
import financeRoutes from '../routes/finance.routes'
import financeController from '../controllers/finance.controller'
import financeService, { FinanceConflictError, FinanceNotFoundError } from '../services/finance.service'
import { authMiddleware } from '../middlewares/auth.middleware'
import { validate } from '../middlewares/validator.middleware'
import {
  createExpenseSchema,
  monthQuerySchema,
} from '../validation/finance.schemas'

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

function responseRecorder() {
  const response = {
    statusCode: 200,
    body: undefined as any,
    status(code: number) {
      response.statusCode = code
      return response
    },
    json(body: unknown) {
      response.body = body
      return response
    },
  }
  return response
}

function request(overrides: Partial<Request> = {}) {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    ...overrides,
  } as Request
}

async function invokeController(
  handler: (req: Request, res: Response, next: NextFunction) => unknown,
  req: Request,
) {
  const res = responseRecorder()
  const next = vi.fn()
  await handler(req, res as unknown as Response, next)
  return { res, next }
}

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

  it('mounts the finance router at /finance from the API router', () => {
    const mounted = (routes as any).stack.find((layer: any) => layer.regexp?.toString().includes('finance'))
    expect(mounted).toBeDefined()
    expect(mounted.handle).toBe(financeRoutes)
  })

  it('returns 401 before validation or controller when auth is missing', () => {
    const res = responseRecorder()
    const next = vi.fn()
    authMiddleware(request(), res as unknown as Response, next)
    expect(res.statusCode).toBe(401)
    expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } })
    expect(next).not.toHaveBeenCalled()
  })

  it.each([
    [{ date: '2026-07-31', amount: 1.001, category: 'food', paymentMethod: 'cash' }, 'amount'],
    [{ date: '2026-02-30', amount: 1, category: 'food', paymentMethod: 'cash' }, 'date'],
  ])('returns 400 VALIDATION_ERROR for invalid expense %s', async (body) => {
    const res = responseRecorder()
    const next = vi.fn()
    await validate(createExpenseSchema)(request({ body }), res as unknown as Response, next)
    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 400 VALIDATION_ERROR for an invalid summary month', async () => {
    const res = responseRecorder()
    const next = vi.fn()
    await validate(monthQuerySchema)(request({ query: { month: '2026-13' } }), res as unknown as Response, next)
    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } })
    expect(next).not.toHaveBeenCalled()
  })

  it('maps finance not-found and conflict errors without exposing cross-user existence', async () => {
    vi.spyOn(financeService, 'updateExpense').mockRejectedValueOnce(new FinanceNotFoundError('消费记录不存在'))
    const notFound = await invokeController(financeController.updateExpense.bind(financeController), request({ user: { userId: 'u1' } as any, params: { id: 'other-user-record' }, body: { amount: 1 } }))
    expect(notFound.res.statusCode).toBe(404)
    expect(notFound.res.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND', message: '消费记录不存在' } })
    expect(JSON.stringify(notFound.res.body)).not.toContain('other-user')
    expect(notFound.next).not.toHaveBeenCalled()

    vi.spyOn(financeService, 'createSavingPlan').mockRejectedValueOnce(new FinanceConflictError('当前金额不能超过目标金额'))
    const conflict = await invokeController(financeController.createSavingPlan.bind(financeController), request({ user: { userId: 'u1' } as any, body: { name: '旅行', targetAmount: 10, currentAmount: 11, targetDate: '2026-12-31' } }))
    expect(conflict.res.statusCode).toBe(409)
    expect(conflict.res.body).toMatchObject({ success: false, error: { code: 'CONFLICT', message: '当前金额不能超过目标金额' } })
    expect(conflict.next).not.toHaveBeenCalled()
  })

  it('returns the unified success envelope and required finance messages', async () => {
    vi.spyOn(financeService, 'createExpense').mockResolvedValue({ id: 'e1' } as any)
    const created = await invokeController(financeController.createExpense.bind(financeController), request({ user: { userId: 'u1' } as any, body: { date: '2026-07-31', amount: 1, category: 'food', paymentMethod: 'cash' } }))
    expect(created.res.body).toEqual({ success: true, data: { id: 'e1' }, message: '消费记录已创建' })

    vi.spyOn(financeService, 'updateExpense').mockResolvedValue({ id: 'e1' } as any)
    const updated = await invokeController(financeController.updateExpense.bind(financeController), request({ user: { userId: 'u1' } as any, params: { id: 'e1' }, body: { amount: 2 } }))
    expect(updated.res.body).toEqual({ success: true, data: { id: 'e1' }, message: '消费记录已更新' })

    vi.spyOn(financeService, 'deleteExpense').mockResolvedValue(undefined)
    const deleted = await invokeController(financeController.deleteExpense.bind(financeController), request({ user: { userId: 'u1' } as any, params: { id: 'e1' } }))
    expect(deleted.res.body).toEqual({ success: true, data: null, message: '消费记录已删除' })

    vi.spyOn(financeService, 'upsertBudget').mockResolvedValue({ id: 'b1' } as any)
    const budget = await invokeController(financeController.upsertBudget.bind(financeController), request({ user: { userId: 'u1' } as any, body: { month: '2026-07', amount: 0 } }))
    expect(budget.res.body).toEqual({ success: true, data: { id: 'b1' }, message: '预算已更新' })

    vi.spyOn(financeService, 'createSavingPlan').mockResolvedValue({ id: 'p1' } as any)
    const planCreated = await invokeController(financeController.createSavingPlan.bind(financeController), request({ user: { userId: 'u1' } as any, body: { name: '旅行', targetAmount: 10, targetDate: '2026-12-31' } }))
    expect(planCreated.res.body).toEqual({ success: true, data: { id: 'p1' }, message: '存钱计划已创建' })

    vi.spyOn(financeService, 'updateSavingPlan').mockResolvedValue({ id: 'p1' } as any)
    const planUpdated = await invokeController(financeController.updateSavingPlan.bind(financeController), request({ user: { userId: 'u1' } as any, params: { id: 'p1' }, body: { name: '新旅行' } }))
    expect(planUpdated.res.body).toEqual({ success: true, data: { id: 'p1' }, message: '存钱计划已更新' })

    vi.spyOn(financeService, 'deleteSavingPlan').mockResolvedValue(undefined)
    const planDeleted = await invokeController(financeController.deleteSavingPlan.bind(financeController), request({ user: { userId: 'u1' } as any, params: { id: 'p1' } }))
    expect(planDeleted.res.body).toEqual({ success: true, data: null, message: '存钱计划已删除' })
  })
})
