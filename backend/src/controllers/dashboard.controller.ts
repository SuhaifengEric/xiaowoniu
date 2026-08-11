import { NextFunction, Request, Response } from 'express'
import dashboardService from '../services/dashboard.service'
import { success } from '../utils/response'

export class DashboardController {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await dashboardService.getSummary(req.user!.userId))
    } catch (err) {
      return next(err)
    }
  }
}

export default new DashboardController()
