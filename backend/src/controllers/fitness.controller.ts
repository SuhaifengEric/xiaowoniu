import { NextFunction, Request, Response } from 'express'
import { CreateCheckinRequest, CreateWeightRecordRequest, FitnessQueryParams, UpsertGoalRequest } from '@xiaowoniu/shared'
import fitnessService, { FitnessNotFoundError } from '../services/fitness.service'
import { error, success } from '../utils/response'

export class FitnessController {
  async getCheckins(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await fitnessService.getCheckins(req.user!.userId, req.query as FitnessQueryParams))
    } catch (err) { next(err) }
  }

  async createCheckin(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await fitnessService.createCheckin(req.user!.userId, req.body as CreateCheckinRequest), '打卡成功')
    } catch (err) { next(err) }
  }

  async deleteCheckin(req: Request, res: Response, next: NextFunction) {
    try {
      await fitnessService.deleteCheckin(req.user!.userId, req.params.id)
      return success(res, null, '删除成功')
    } catch (err) { return this.handleNotFound(err, res, next) }
  }

  async getWeights(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await fitnessService.getWeights(req.user!.userId, req.query as FitnessQueryParams))
    } catch (err) { next(err) }
  }

  async createWeight(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await fitnessService.createWeight(req.user!.userId, req.body as CreateWeightRecordRequest), '记录成功')
    } catch (err) { next(err) }
  }

  async deleteWeight(req: Request, res: Response, next: NextFunction) {
    try {
      await fitnessService.deleteWeight(req.user!.userId, req.params.id)
      return success(res, null, '删除成功')
    } catch (err) { return this.handleNotFound(err, res, next) }
  }

  async getGoal(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await fitnessService.getGoal(req.user!.userId))
    } catch (err) { next(err) }
  }

  async upsertGoal(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await fitnessService.upsertGoal(req.user!.userId, req.body as UpsertGoalRequest), '目标已更新')
    } catch (err) { next(err) }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await fitnessService.getStats(req.user!.userId))
    } catch (err) { next(err) }
  }

  private handleNotFound(err: unknown, res: Response, next: NextFunction) {
    if (err instanceof FitnessNotFoundError) {
      return error(res, 404, { code: 'NOT_FOUND', message: err.message })
    }
    next(err)
  }
}

export default new FitnessController()
