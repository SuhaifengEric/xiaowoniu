import { IRouter, Router } from 'express'
import dashboardController from '../controllers/dashboard.controller'
import { authMiddleware } from '../middlewares/auth.middleware'
import { validate } from '../middlewares/validator.middleware'
import { dashboardSummarySchema } from '../validation/dashboard.schemas'

const router: IRouter = Router()

router.get('/summary', authMiddleware, validate(dashboardSummarySchema), dashboardController.getSummary.bind(dashboardController))

export default router
