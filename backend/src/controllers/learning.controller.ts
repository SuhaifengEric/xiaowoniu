import { NextFunction, Request, Response } from 'express'
import {
  CreateExamRequest,
  CreateStudyCheckinRequest,
  CreateStudySubjectRequest,
  LearningQueryParams,
  UpdateExamRequest,
  UpdateStudySubjectRequest,
} from '@xiaowoniu/shared'
import learningService, { LearningConflictError, LearningNotFoundError } from '../services/learning.service'
import { error, success } from '../utils/response'

export class LearningController {
  async listExams(req: Request, res: Response, next: NextFunction) {
    try { return success(res, await learningService.listExams(req.user!.userId)) } catch (err) { next(err) }
  }

  async createExam(req: Request, res: Response, next: NextFunction) {
    try { return success(res, await learningService.createExam(req.user!.userId, req.body as CreateExamRequest), '考试已创建') } catch (err) { this.handle(err, res, next) }
  }

  async updateExam(req: Request, res: Response, next: NextFunction) {
    try { return success(res, await learningService.updateExam(req.user!.userId, req.params.id, req.body as UpdateExamRequest), '考试已更新') } catch (err) { this.handle(err, res, next) }
  }

  async deleteExam(req: Request, res: Response, next: NextFunction) {
    try { await learningService.deleteExam(req.user!.userId, req.params.id); return success(res, null, '考试已删除') } catch (err) { this.handle(err, res, next) }
  }

  async listSubjects(req: Request, res: Response, next: NextFunction) {
    try { return success(res, await learningService.listSubjects(req.user!.userId, String(req.query.examId))) } catch (err) { this.handle(err, res, next) }
  }

  async createSubject(req: Request, res: Response, next: NextFunction) {
    try { return success(res, await learningService.createSubject(req.user!.userId, req.body as CreateStudySubjectRequest), '科目已创建') } catch (err) { this.handle(err, res, next) }
  }

  async updateSubject(req: Request, res: Response, next: NextFunction) {
    try { return success(res, await learningService.updateSubject(req.user!.userId, req.params.id, req.body as UpdateStudySubjectRequest), '科目已更新') } catch (err) { this.handle(err, res, next) }
  }

  async deleteSubject(req: Request, res: Response, next: NextFunction) {
    try { await learningService.deleteSubject(req.user!.userId, req.params.id); return success(res, null, '科目已删除') } catch (err) { this.handle(err, res, next) }
  }

  async listCheckins(req: Request, res: Response, next: NextFunction) {
    try { return success(res, await learningService.listCheckins(req.user!.userId, req.query as LearningQueryParams)) } catch (err) { this.handle(err, res, next) }
  }

  async createCheckin(req: Request, res: Response, next: NextFunction) {
    try { return success(res, await learningService.createCheckin(req.user!.userId, req.body as CreateStudyCheckinRequest), '学习打卡已保存') } catch (err) { this.handle(err, res, next) }
  }

  async deleteCheckin(req: Request, res: Response, next: NextFunction) {
    try { await learningService.deleteCheckin(req.user!.userId, req.params.id); return success(res, null, '学习打卡已删除') } catch (err) { this.handle(err, res, next) }
  }

  async getProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query as LearningQueryParams
      return success(res, await learningService.getProgress(req.user!.userId, String(query.examId), query))
    } catch (err) { this.handle(err, res, next) }
  }

  private handle(err: unknown, res: Response, next: NextFunction) {
    if (err instanceof LearningNotFoundError) return error(res, 404, { code: 'NOT_FOUND', message: err.message })
    if (err instanceof LearningConflictError) return error(res, 409, { code: 'CONFLICT', message: err.message })
    return next(err)
  }
}

export default new LearningController()
