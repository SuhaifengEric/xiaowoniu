import { IRouter, Router } from 'express'
import financeController from '../controllers/finance.controller'
import { authMiddleware } from '../middlewares/auth.middleware'
import { validate } from '../middlewares/validator.middleware'
import {
  createBudgetSchema,
  createExpenseSchema,
  createSavingDepositSchema,
  createSavingPlanSchema,
  deleteSavingDepositSchema,
  emptySchema,
  expenseQuerySchema,
  idParamSchema,
  monthQuerySchema,
  savingDepositQuerySchema,
  updateSavingDepositSchema,
  updateExpenseRouteSchema,
  updateSavingPlanRouteSchema,
} from '../validation/finance.schemas'

const router: IRouter = Router()

router.get('/expenses', authMiddleware, validate(expenseQuerySchema), financeController.listExpenses.bind(financeController))
router.post('/expenses', authMiddleware, validate(createExpenseSchema), financeController.createExpense.bind(financeController))
router.patch('/expenses/:id', authMiddleware, validate(updateExpenseRouteSchema), financeController.updateExpense.bind(financeController))
router.delete('/expenses/:id', authMiddleware, validate(idParamSchema), financeController.deleteExpense.bind(financeController))

router.get('/summary', authMiddleware, validate(monthQuerySchema), financeController.getSummary.bind(financeController))
router.get('/budgets', authMiddleware, validate(monthQuerySchema), financeController.getBudget.bind(financeController))
router.put('/budgets', authMiddleware, validate(createBudgetSchema), financeController.upsertBudget.bind(financeController))

router.get('/saving-plans', authMiddleware, validate(emptySchema), financeController.listSavingPlans.bind(financeController))
router.post('/saving-plans', authMiddleware, validate(createSavingPlanSchema), financeController.createSavingPlan.bind(financeController))
router.patch('/saving-plans/:id', authMiddleware, validate(updateSavingPlanRouteSchema), financeController.updateSavingPlan.bind(financeController))
router.delete('/saving-plans/:id', authMiddleware, validate(idParamSchema), financeController.deleteSavingPlan.bind(financeController))
router.get('/saving-plans/:id/deposits', authMiddleware, validate(savingDepositQuerySchema), financeController.listSavingDeposits.bind(financeController))
router.post('/saving-plans/:id/deposits', authMiddleware, validate(createSavingDepositSchema), financeController.createSavingDeposit.bind(financeController))
router.patch('/saving-plans/:id/deposits/:depositId', authMiddleware, validate(updateSavingDepositSchema), financeController.updateSavingDeposit.bind(financeController))
router.delete('/saving-plans/:id/deposits/:depositId', authMiddleware, validate(deleteSavingDepositSchema), financeController.deleteSavingDeposit.bind(financeController))

export default router
