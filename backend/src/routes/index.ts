import { Router, IRouter } from 'express'
import authRoutes from './auth.routes'
import fitnessRoutes from './fitness.routes'
import learningRoutes from './learning.routes'

const router: IRouter = Router()

// API 路由
router.use('/auth', authRoutes)
router.use('/fitness', fitnessRoutes)
router.use('/learning', learningRoutes)

export default router
