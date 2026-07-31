import { IRouter, Router } from 'express'
import { z } from 'zod'
import learningController from '../controllers/learning.controller'
import { authMiddleware } from '../middlewares/auth.middleware'
import { validate } from '../middlewares/validator.middleware'
import {
  createCheckinSchema,
  createExamSchema,
  createSubjectSchema,
  emptySchema,
  idParamSchema,
  learningQuerySchema,
  progressQuerySchema,
  subjectQuerySchema,
  updateExamSchema,
  updateSubjectSchema,
} from '../validation/learning.schemas'

const router: IRouter = Router()

router.get('/exams', authMiddleware, validate(emptySchema), learningController.listExams.bind(learningController))
router.post('/exams', authMiddleware, validate(createExamSchema), learningController.createExam.bind(learningController))
router.patch('/exams/:id', authMiddleware, validate(z.object({ params: idParamSchema.shape.params, body: updateExamSchema.shape.body })), learningController.updateExam.bind(learningController))
router.delete('/exams/:id', authMiddleware, validate(idParamSchema), learningController.deleteExam.bind(learningController))

router.get('/subjects', authMiddleware, validate(subjectQuerySchema), learningController.listSubjects.bind(learningController))
router.post('/subjects', authMiddleware, validate(createSubjectSchema), learningController.createSubject.bind(learningController))
router.patch('/subjects/:id', authMiddleware, validate(z.object({ params: idParamSchema.shape.params, body: updateSubjectSchema.shape.body })), learningController.updateSubject.bind(learningController))
router.delete('/subjects/:id', authMiddleware, validate(idParamSchema), learningController.deleteSubject.bind(learningController))

router.get('/checkins', authMiddleware, validate(learningQuerySchema), learningController.listCheckins.bind(learningController))
router.post('/checkins', authMiddleware, validate(createCheckinSchema), learningController.createCheckin.bind(learningController))
router.delete('/checkins/:id', authMiddleware, validate(idParamSchema), learningController.deleteCheckin.bind(learningController))

router.get('/progress', authMiddleware, validate(progressQuerySchema), learningController.getProgress.bind(learningController))

export default router
