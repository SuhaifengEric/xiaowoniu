import { NextFunction, Request, Response } from 'express'
import {
  CreateBudgetRequest,
  CreateExpenseRequest,
  CreateSavingPlanRequest,
  FinanceExpenseQueryParams,
  FinanceMonthQuery,
  UpdateExpenseRequest,
  UpdateSavingPlanRequest,
} from '@xiaowoniu/shared'
import financeService, { FinanceConflictError, FinanceNotFoundError } from '../services/finance.service'
import { error, success } from '../utils/response'

export class FinanceController {
  async listExpenses(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await financeService.getExpenses(req.user!.userId, req.query as FinanceExpenseQueryParams))
    } catch (err) { return this.handle(err, res, next) }
  }

  async createExpense(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await financeService.createExpense(req.user!.userId, req.body as CreateExpenseRequest), '消费记录已创建')
    } catch (err) { return this.handle(err, res, next) }
  }

  async updateExpense(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await financeService.updateExpense(req.user!.userId, req.params.id, req.body as UpdateExpenseRequest), '消费记录已更新')
    } catch (err) { return this.handle(err, res, next) }
  }

  async deleteExpense(req: Request, res: Response, next: NextFunction) {
    try {
      await financeService.deleteExpense(req.user!.userId, req.params.id)
      return success(res, null, '消费记录已删除')
    } catch (err) { return this.handle(err, res, next) }
  }

  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { month } = req.query as unknown as FinanceMonthQuery
      return success(res, await financeService.getSummary(req.user!.userId, month))
    } catch (err) { return this.handle(err, res, next) }
  }

  async getBudget(req: Request, res: Response, next: NextFunction) {
    try {
      const { month } = req.query as unknown as FinanceMonthQuery
      return success(res, await financeService.getBudget(req.user!.userId, month))
    } catch (err) { return this.handle(err, res, next) }
  }

  async upsertBudget(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await financeService.upsertBudget(req.user!.userId, req.body as CreateBudgetRequest), '预算已更新')
    } catch (err) { return this.handle(err, res, next) }
  }

  async listSavingPlans(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await financeService.getSavingPlans(req.user!.userId))
    } catch (err) { return this.handle(err, res, next) }
  }

  async createSavingPlan(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await financeService.createSavingPlan(req.user!.userId, req.body as CreateSavingPlanRequest), '存钱计划已创建')
    } catch (err) { return this.handle(err, res, next) }
  }

  async updateSavingPlan(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await financeService.updateSavingPlan(req.user!.userId, req.params.id, req.body as UpdateSavingPlanRequest), '存钱计划已更新')
    } catch (err) { return this.handle(err, res, next) }
  }

  async deleteSavingPlan(req: Request, res: Response, next: NextFunction) {
    try {
      await financeService.deleteSavingPlan(req.user!.userId, req.params.id)
      return success(res, null, '存钱计划已删除')
    } catch (err) { return this.handle(err, res, next) }
  }

  private handle(err: unknown, res: Response, next: NextFunction) {
    if (err instanceof FinanceNotFoundError) return error(res, 404, { code: 'NOT_FOUND', message: err.message })
    if (err instanceof FinanceConflictError) return error(res, 409, { code: 'CONFLICT', message: err.message })
    return next(err)
  }
}

export default new FinanceController()
