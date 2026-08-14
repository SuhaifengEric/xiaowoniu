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
  createMarriageAgreementSchema,
  deleteMarriageAgreementRouteSchema,
  getMarriageProcessSchema,
  marriageAgreementListSchema,
  marriageNodeHistoryRouteSchema,
  marriageNodeListSchema,
  putMarriageProcessSchema,
  updateMarriageAgreementRouteSchema,
  updateMarriageNodeRouteSchema,
  updateMarriageSettingsSchema,
} from '../validation/wedding.schemas'

const router: IRouter = Router()

router.get('/process', authMiddleware, validate(getMarriageProcessSchema), weddingController.getMarriageProcess.bind(weddingController))
router.put('/process', authMiddleware, validate(putMarriageProcessSchema), weddingController.putMarriageProcess.bind(weddingController))
router.patch('/process/settings', authMiddleware, validate(updateMarriageSettingsSchema), weddingController.updateMarriageSettings.bind(weddingController))
router.get('/process/nodes', authMiddleware, validate(marriageNodeListSchema), weddingController.listMarriageNodes.bind(weddingController))
router.patch('/process/nodes/:nodeKey', authMiddleware, validate(updateMarriageNodeRouteSchema), weddingController.updateMarriageNode.bind(weddingController))
router.get('/process/nodes/:nodeKey/history', authMiddleware, validate(marriageNodeHistoryRouteSchema), weddingController.getMarriageNodeHistory.bind(weddingController))
router.get('/process/agreements', authMiddleware, validate(marriageAgreementListSchema), weddingController.listMarriageAgreements.bind(weddingController))
router.post('/process/agreements', authMiddleware, validate(createMarriageAgreementSchema), weddingController.createMarriageAgreement.bind(weddingController))
router.patch('/process/agreements/:id', authMiddleware, validate(updateMarriageAgreementRouteSchema), weddingController.updateMarriageAgreement.bind(weddingController))
router.delete('/process/agreements/:id', authMiddleware, validate(deleteMarriageAgreementRouteSchema), weddingController.deleteMarriageAgreement.bind(weddingController))

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
