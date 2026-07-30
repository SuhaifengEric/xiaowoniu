import { Router, IRouter } from 'express'
import authRoutes from './auth.routes'
import fitnessRoutes from './fitness.routes'

const router: IRouter = Router()

// API 路由
router.use('/auth', authRoutes)
router.use('/fitness', fitnessRoutes)

export default router
