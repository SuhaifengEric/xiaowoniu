import { Router, IRouter } from 'express'
import authController from '../controllers/auth.controller'
import { authMiddleware } from '../middlewares/auth.middleware'
import { validate } from '../middlewares/validator.middleware'
import { z } from 'zod'

const router: IRouter = Router()

// 验证 schema
const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(20),
    email: z.string().email(),
    password: z.string().min(6),
    nickname: z.string().max(50).optional(),
  }),
})

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
})

// 公开路由
router.post('/register', validate(registerSchema), authController.register)
router.post('/login', validate(loginSchema), authController.login)

// 需要认证的路由
router.get('/me', authMiddleware, authController.getMe)
router.post('/logout', authMiddleware, authController.logout)

export default router
