import { IRouter, Router } from 'express'
import weddingController from '../controllers/wedding.controller'
import { authMiddleware } from '../middlewares/auth.middleware'
import { validate } from '../middlewares/validator.middleware'
import {
  createWeddingExpenseSchema,
  createWeddingTaskSchema,
  updateWeddingExpenseRouteSchema,
  updateWeddingTaskRouteSchema,
  upsertWeddingBudgetSchema,
  weddingEmptySchema,
  weddingExpenseQuerySchema,
  weddingIdParamSchema,
  weddingTaskQuerySchema,
} from '../validation/wedding.schemas'

const router: IRouter = Router()

router.get('/tasks', authMiddleware, validate(weddingTaskQuerySchema), weddingController.listTasks.bind(weddingController))
router.post('/tasks', authMiddleware, validate(createWeddingTaskSchema), weddingController.createTask.bind(weddingController))
router.patch('/tasks/:id', authMiddleware, validate(updateWeddingTaskRouteSchema), weddingController.updateTask.bind(weddingController))
router.delete('/tasks/:id', authMiddleware, validate(weddingIdParamSchema), weddingController.deleteTask.bind(weddingController))

router.get('/expenses', authMiddleware, validate(weddingExpenseQuerySchema), weddingController.listExpenses.bind(weddingController))
router.post('/expenses', authMiddleware, validate(createWeddingExpenseSchema), weddingController.createExpense.bind(weddingController))
router.patch('/expenses/:id', authMiddleware, validate(updateWeddingExpenseRouteSchema), weddingController.updateExpense.bind(weddingController))
router.delete('/expenses/:id', authMiddleware, validate(weddingIdParamSchema), weddingController.deleteExpense.bind(weddingController))

router.get('/budget', authMiddleware, validate(weddingEmptySchema), weddingController.getBudget.bind(weddingController))
router.put('/budget', authMiddleware, validate(upsertWeddingBudgetSchema), weddingController.upsertBudget.bind(weddingController))

router.get('/overview', authMiddleware, validate(weddingEmptySchema), weddingController.getOverview.bind(weddingController))
router.get('/timeline', authMiddleware, validate(weddingEmptySchema), weddingController.getTimeline.bind(weddingController))

export default router
