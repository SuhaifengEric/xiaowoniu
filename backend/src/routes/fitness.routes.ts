import { IRouter, Router } from 'express'
import fitnessController from '../controllers/fitness.controller'
import { authMiddleware } from '../middlewares/auth.middleware'
import { validate } from '../middlewares/validator.middleware'
import {
  createCheckinSchema,
  createWeightSchema,
  emptySchema,
  fitnessQuerySchema,
  goalSchema,
  idParamSchema,
} from '../validation/fitness.schemas'

const router: IRouter = Router()

router.get('/checkins', authMiddleware, validate(fitnessQuerySchema), fitnessController.getCheckins.bind(fitnessController))
router.post('/checkins', authMiddleware, validate(createCheckinSchema), fitnessController.createCheckin.bind(fitnessController))
router.delete('/checkins/:id', authMiddleware, validate(idParamSchema), fitnessController.deleteCheckin.bind(fitnessController))
router.get('/weights', authMiddleware, validate(fitnessQuerySchema), fitnessController.getWeights.bind(fitnessController))
router.post('/weights', authMiddleware, validate(createWeightSchema), fitnessController.createWeight.bind(fitnessController))
router.delete('/weights/:id', authMiddleware, validate(idParamSchema), fitnessController.deleteWeight.bind(fitnessController))
router.get('/goal', authMiddleware, validate(emptySchema), fitnessController.getGoal.bind(fitnessController))
router.put('/goal', authMiddleware, validate(goalSchema), fitnessController.upsertGoal.bind(fitnessController))
router.get('/stats', authMiddleware, validate(emptySchema), fitnessController.getStats.bind(fitnessController))

export default router
