import { Router, IRouter } from 'express'
import authRoutes from './auth.routes'

const router: IRouter = Router()

// API 路由
router.use('/auth', authRoutes)

export default router
