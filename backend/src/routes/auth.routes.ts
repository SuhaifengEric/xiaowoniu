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

const updateProfileSchema = z.object({
  body: z.object({
    nickname: z.union([
      z.string().refine((value) => Array.from(value.trim()).length <= 50, '昵称最多 50 个字符'),
      z.null(),
    ]),
  }).strict(),
})

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
  }).strict(),
})

// 公开路由
router.post('/register', validate(registerSchema), authController.register.bind(authController))
router.post('/login', validate(loginSchema), authController.login.bind(authController))

// 需要认证的路由
router.get('/me', authMiddleware, authController.getMe.bind(authController))
router.patch('/me', authMiddleware, validate(updateProfileSchema), authController.updateProfile.bind(authController))
router.patch('/password', authMiddleware, validate(changePasswordSchema), authController.changePassword.bind(authController))
router.post('/logout', authMiddleware, authController.logout.bind(authController))

export default router
