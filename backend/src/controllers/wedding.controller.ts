import { NextFunction, Request, Response } from 'express'
import {
  CreateAgreementTopicRequest,
  CreateWeddingExpenseRequest,
  CreateWeddingTaskRequest,
  MarriageNodeKey,
  PutMarriageProcessRequest,
  UpdateWeddingExpenseRequest,
  UpdateWeddingTaskRequest,
  UpsertWeddingBudgetRequest,
  UpdateAgreementTopicRequest,
  UpdateMarriageNodeRequest,
  UpdateMarriageSettingsRequest,
  WeddingExpenseQueryParams,
  WeddingTaskQueryParams,
} from '@xiaowoniu/shared'
import weddingService, { WeddingNotFoundError, WeddingValidationError } from '../services/wedding.service'
import { error, success } from '../utils/response'

export class WeddingController {
  async getMarriageProcess(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await weddingService.getMarriageProcess(req.user!.userId))
    } catch (err) { return this.handle(err, res, next) }
  }

  async putMarriageProcess(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await weddingService.ensureMarriageProcess(req.user!.userId, req.body as PutMarriageProcessRequest), '婚姻进程已建立')
    } catch (err) { return this.handle(err, res, next) }
  }

  async updateMarriageSettings(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await weddingService.updateMarriageSettings(req.user!.userId, req.body as UpdateMarriageSettingsRequest), '流程设置已更新')
    } catch (err) { return this.handle(err, res, next) }
  }

  async listMarriageNodes(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await weddingService.getMarriageNodes(req.user!.userId))
    } catch (err) { return this.handle(err, res, next) }
  }

  async updateMarriageNode(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await weddingService.updateMarriageNode(req.user!.userId, req.params.nodeKey as MarriageNodeKey, req.body as UpdateMarriageNodeRequest), '婚姻节点已更新')
    } catch (err) { return this.handle(err, res, next) }
  }

  async getMarriageNodeHistory(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await weddingService.getMarriageNodeHistory(req.user!.userId, req.params.nodeKey as MarriageNodeKey))
    } catch (err) { return this.handle(err, res, next) }
  }

  async listMarriageAgreements(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await weddingService.getAgreements(req.user!.userId))
    } catch (err) { return this.handle(err, res, next) }
  }

  async createMarriageAgreement(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await weddingService.createAgreement(req.user!.userId, req.body as CreateAgreementTopicRequest), '共识议题已添加')
    } catch (err) { return this.handle(err, res, next) }
  }

  async updateMarriageAgreement(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await weddingService.updateAgreement(req.user!.userId, req.params.id, req.body as UpdateAgreementTopicRequest), '共识议题已更新')
    } catch (err) { return this.handle(err, res, next) }
  }

  async deleteMarriageAgreement(req: Request, res: Response, next: NextFunction) {
    try {
      await weddingService.archiveAgreement(req.user!.userId, req.params.id)
      return success(res, null, '共识议题已归档')
    } catch (err) { return this.handle(err, res, next) }
  }

  async listTasks(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await weddingService.getTasks(req.user!.userId, req.query as WeddingTaskQueryParams))
    } catch (err) { return this.handle(err, res, next) }
  }

  async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await weddingService.createTask(req.user!.userId, req.body as CreateWeddingTaskRequest), '备婚任务已创建')
    } catch (err) { return this.handle(err, res, next) }
  }

  async updateTask(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await weddingService.updateTask(req.user!.userId, req.params.id, req.body as UpdateWeddingTaskRequest), '备婚任务已更新')
    } catch (err) { return this.handle(err, res, next) }
  }

  async deleteTask(req: Request, res: Response, next: NextFunction) {
    try {
      await weddingService.deleteTask(req.user!.userId, req.params.id)
      return success(res, null, '备婚任务已删除')
    } catch (err) { return this.handle(err, res, next) }
  }

  async listExpenses(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await weddingService.getExpenses(req.user!.userId, req.query as WeddingExpenseQueryParams))
    } catch (err) { return this.handle(err, res, next) }
  }

  async createExpense(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await weddingService.createExpense(req.user!.userId, req.body as CreateWeddingExpenseRequest), '备婚花费已创建')
    } catch (err) { return this.handle(err, res, next) }
  }

  async updateExpense(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await weddingService.updateExpense(req.user!.userId, req.params.id, req.body as UpdateWeddingExpenseRequest), '备婚花费已更新')
    } catch (err) { return this.handle(err, res, next) }
  }

  async deleteExpense(req: Request, res: Response, next: NextFunction) {
    try {
      await weddingService.deleteExpense(req.user!.userId, req.params.id)
      return success(res, null, '备婚花费已删除')
    } catch (err) { return this.handle(err, res, next) }
  }

  async getBudget(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await weddingService.getBudget(req.user!.userId))
    } catch (err) { return this.handle(err, res, next) }
  }

  async upsertBudget(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await weddingService.upsertBudget(req.user!.userId, req.body as UpsertWeddingBudgetRequest), '备婚预算已更新')
    } catch (err) { return this.handle(err, res, next) }
  }

  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await weddingService.getOverview(req.user!.userId))
    } catch (err) { return this.handle(err, res, next) }
  }

  async getTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await weddingService.getTimeline(req.user!.userId))
    } catch (err) { return this.handle(err, res, next) }
  }

  private handle(err: unknown, res: Response, next: NextFunction) {
    if (err instanceof WeddingNotFoundError) return error(res, 404, { code: 'NOT_FOUND', message: err.message })
    if (err instanceof WeddingValidationError) return error(res, 400, { code: 'VALIDATION_ERROR', message: err.message })
    return next(err)
  }
}

export default new WeddingController()
