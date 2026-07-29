# Phase 2: 后端基础架构 - 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 搭建 Express 后端应用，配置 Prisma ORM，实现用户认证系统

**架构：** Express + TypeScript + Prisma + PostgreSQL + JWT 认证

**技术栈：** Express 4.x, Prisma 5.x, PostgreSQL 15+, JWT, bcrypt, Winston, Zod

---

## 文件结构概览

此阶段将创建以下文件和目录：

```
xiaowoniu/
├── backend/                              # 后端应用
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── src/
│   │   ├── server.ts                     # 应用入口
│   │   ├── app.ts                        # Express app 配置
│   │   ├── config/
│   │   │   ├── database.ts               # Prisma 客户端
│   │   │   ├── jwt.ts                    # JWT 配置
│   │   │   └── app.ts                    # 应用配置
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts        # JWT 验证
│   │   │   ├── error.middleware.ts       # 错误处理
│   │   │   ├── validator.middleware.ts   # Zod 验证
│   │   │   └── logger.middleware.ts      # 请求日志
│   │   ├── utils/
│   │   │   ├── jwt.ts                    # JWT 工具
│   │   │   ├── password.ts               # 密码加密
│   │   │   ├── logger.ts                 # Winston 日志
│   │   │   └── response.ts               # 统一响应
│   │   ├── types/
│   │   │   └── express.d.ts              # Express 类型扩展
│   │   ├── controllers/
│   │   │   └── auth.controller.ts        # 认证控制器
│   │   ├── services/
│   │   │   └── auth.service.ts           # 认证服务
│   │   └── routes/
│   │       ├── index.ts                  # 路由聚合
│   │       └── auth.routes.ts            # 认证路由
│   └── prisma/
│       ├── schema.prisma                 # 数据模型
│       └── seed.ts                       # 种子数据
```

---

## 任务 1：初始化后端项目结构

**文件：**
- 创建：`backend/package.json`
- 创建：`backend/tsconfig.json`
- 创建：`backend/.env.example`
- 创建：`backend/.gitignore`

---

- [ ] **步骤 1：创建 backend 目录结构**

```bash
mkdir -p backend/src/{config,middlewares,utils,types,controllers,services,routes}
mkdir -p backend/prisma
```

- [ ] **步骤 2：创建 backend/package.json**

创建文件 `backend/package.json`：

```json
{
  "name": "@xiaowoniu/backend",
  "version": "1.0.0",
  "description": "Backend API for xiaowoniu platform",
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "clean": "rimraf dist"
  },
  "keywords": [
    "express",
    "api",
    "backend"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "@prisma/client": "^5.9.0",
    "@xiaowoniu/shared": "workspace:*",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.4.1",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "winston": "^3.11.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.11.5",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/bcrypt": "^5.0.2",
    "prisma": "^5.9.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "rimraf": "^5.0.5"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

- [ ] **步骤 3：创建 backend/tsconfig.json**

创建文件 `backend/tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **步骤 4：创建 .env.example**

创建文件 `backend/.env.example`：

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/xiaowoniu?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV="development"

# CORS
FRONTEND_URL="http://localhost:5173"
```

- [ ] **步骤 5：创建 backend/.gitignore**

创建文件 `backend/.gitignore`：

```gitignore
# Dependencies
node_modules/

# Build
dist/

# Environment
.env
.env.local

# Logs
*.log

# Prisma
.env
```

- [ ] **步骤 6：验证配置**

```bash
cd backend
cat package.json | grep "@xiaowoniu/backend"
cat tsconfig.json | grep "strict"
cd ..
```

- [ ] **步骤 7：Commit**

```bash
git add backend/
git commit -m "chore(backend): initialize backend project structure"
```

---

## 任务 2：配置 Prisma 和数据库模型

**文件：**
- 创建：`backend/prisma/schema.prisma`
- 创建：`backend/src/config/database.ts`

---

- [ ] **步骤 1：创建 Prisma schema**

创建文件 `backend/prisma/schema.prisma`：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  username  String   @unique
  email     String   @unique
  password  String
  nickname  String?
  avatarUrl String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}
```

- [ ] **步骤 2：创建数据库配置**

创建文件 `backend/src/config/database.ts`：

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

export default prisma
```

- [ ] **步骤 3：安装依赖**

```bash
cd backend
pnpm install
```

- [ ] **步骤 4：生成 Prisma Client**

```bash
pnpm prisma:generate
```

预期：生成 `node_modules/.prisma/client`

- [ ] **步骤 5：Commit**

```bash
cd ..
git add backend/prisma/ backend/src/config/database.ts backend/pnpm-lock.yaml
git commit -m "feat(backend): add Prisma schema and database config"
```

---

## 任务 3：实现工具函数

**文件：**
- 创建：`backend/src/utils/password.ts`
- 创建：`backend/src/utils/jwt.ts`
- 创建：`backend/src/utils/logger.ts`
- 创建：`backend/src/utils/response.ts`

---

- [ ] **步骤 1：实现密码加密工具**

创建文件 `backend/src/utils/password.ts`：

```typescript
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 10

/**
 * 加密密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * 验证密码
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}
```

- [ ] **步骤 2：实现 JWT 工具**

创建文件 `backend/src/utils/jwt.ts`：

```typescript
import jwt from 'jsonwebtoken'
import { JWTPayload } from '@xiaowoniu/shared'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

/**
 * 生成 JWT Token
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })
}

/**
 * 验证 JWT Token
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload
}
```

- [ ] **步骤 3：实现日志工具**

创建文件 `backend/src/utils/logger.ts`：

```typescript
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
})

export default logger
```

- [ ] **步骤 4：实现响应工具**

创建文件 `backend/src/utils/response.ts`：

```typescript
import { Response } from 'express'
import { ApiResponse, ApiError } from '@xiaowoniu/shared'

/**
 * 成功响应
 */
export function success<T>(res: Response, data: T, message?: string) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  }
  return res.json(response)
}

/**
 * 错误响应
 */
export function error(
  res: Response,
  statusCode: number,
  error: ApiError
) {
  const response: ApiResponse = {
    success: false,
    error,
  }
  return res.status(statusCode).json(response)
}
```

- [ ] **步骤 5：验证编译**

```bash
cd backend
pnpm build
```

预期：编译成功

- [ ] **步骤 6：Commit**

```bash
cd ..
git add backend/src/utils/
git commit -m "feat(backend): add utility functions"
```

---

## 任务 4：实现中间件

**文件：**
- 创建：`backend/src/types/express.d.ts`
- 创建：`backend/src/middlewares/auth.middleware.ts`
- 创建：`backend/src/middlewares/error.middleware.ts`
- 创建：`backend/src/middlewares/validator.middleware.ts`
- 创建：`backend/src/middlewares/logger.middleware.ts`

---

- [ ] **步骤 1：创建 Express 类型扩展**

创建文件 `backend/src/types/express.d.ts`：

```typescript
import { JWTPayload } from '@xiaowoniu/shared'

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload
    }
  }
}
```

- [ ] **步骤 2：实现认证中间件**

创建文件 `backend/src/middlewares/auth.middleware.ts`：

```typescript
import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
import { error } from '../utils/response'

/**
 * JWT 认证中间件
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return error(res, 401, {
        code: 'UNAUTHORIZED',
        message: '未提供认证 Token',
      })
    }

    const payload = verifyToken(token)
    req.user = payload
    next()
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 401, {
        code: 'TOKEN_EXPIRED',
        message: 'Token 已过期，请重新登录',
      })
    }

    if (err.name === 'JsonWebTokenError') {
      return error(res, 401, {
        code: 'INVALID_TOKEN',
        message: 'Token 无效',
      })
    }

    return error(res, 401, {
      code: 'UNAUTHORIZED',
      message: '认证失败',
    })
  }
}
```

- [ ] **步骤 3：实现错误处理中间件**

创建文件 `backend/src/middlewares/error.middleware.ts`：

```typescript
import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import logger from '../utils/logger'
import { error as errorResponse } from '../utils/response'

/**
 * 全局错误处理中间件
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 记录错误日志
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.userId,
  })

  // Zod 验证错误
  if (err instanceof ZodError) {
    return errorResponse(res, 400, {
      code: 'VALIDATION_ERROR',
      message: '请求参数验证失败',
      details: err.errors,
    })
  }

  // Prisma 错误
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // 唯一约束冲突
    if (err.code === 'P2002') {
      return errorResponse(res, 409, {
        code: 'CONFLICT',
        message: '记录已存在',
        details: err.meta,
      })
    }

    // 记录不存在
    if (err.code === 'P2025') {
      return errorResponse(res, 404, {
        code: 'NOT_FOUND',
        message: '记录不存在',
      })
    }
  }

  // 默认错误
  return errorResponse(res, 500, {
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : err.message,
  })
}
```

- [ ] **步骤 4：实现验证中间件**

创建文件 `backend/src/middlewares/validator.middleware.ts`：

```typescript
import { Request, Response, NextFunction } from 'express'
import { AnyZodObject, ZodError } from 'zod'
import { error } from '../utils/response'

/**
 * Zod 验证中间件工厂
 */
export function validate(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        return error(res, 400, {
          code: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: err.errors,
        })
      }
      next(err)
    }
  }
}
```

- [ ] **步骤 5：实现日志中间件**

创建文件 `backend/src/middlewares/logger.middleware.ts`：

```typescript
import { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger'

/**
 * 请求日志中间件
 */
export function loggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.userId,
    })
  })

  next()
}
```

- [ ] **步骤 6：验证编译**

```bash
cd backend
pnpm build
```

- [ ] **步骤 7：Commit**

```bash
cd ..
git add backend/src/middlewares/ backend/src/types/
git commit -m "feat(backend): add middlewares"
```

---

## 任务 5：实现认证服务和控制器

**文件：**
- 创建：`backend/src/services/auth.service.ts`
- 创建：`backend/src/controllers/auth.controller.ts`

---

- [ ] **步骤 1：实现认证服务**

创建文件 `backend/src/services/auth.service.ts`：

```typescript
import prisma from '../config/database'
import { hashPassword, comparePassword } from '../utils/password'
import { generateToken } from '../utils/jwt'
import { RegisterRequest, LoginRequest, LoginResponse, UserResponse } from '@xiaowoniu/shared'

export class AuthService {
  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<LoginResponse> {
    // 检查用户是否已存在
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username },
        ],
      },
    })

    if (existingUser) {
      throw new Error('用户名或邮箱已存在')
    }

    // 加密密码
    const hashedPassword = await hashPassword(data.password)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        nickname: data.nickname || null,
      },
    })

    // 生成 Token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    })

    // 返回响应
    return {
      token,
      user: this.toUserResponse(user),
    }
  }

  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (!user) {
      throw new Error('邮箱或密码错误')
    }

    // 验证密码
    const isPasswordValid = await comparePassword(data.password, user.password)

    if (!isPasswordValid) {
      throw new Error('邮箱或密码错误')
    }

    // 生成 Token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    })

    return {
      token,
      user: this.toUserResponse(user),
    }
  }

  /**
   * 获取当前用户信息
   */
  async getMe(userId: string): Promise<UserResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('用户不存在')
    }

    return this.toUserResponse(user)
  }

  /**
   * 转换为用户响应格式
   */
  private toUserResponse(user: any): UserResponse {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }
  }
}

export default new AuthService()
```

- [ ] **步骤 2：实现认证控制器**

创建文件 `backend/src/controllers/auth.controller.ts`：

```typescript
import { Request, Response, NextFunction } from 'express'
import authService from '../services/auth.service'
import { success, error } from '../utils/response'
import { RegisterRequest, LoginRequest } from '@xiaowoniu/shared'

export class AuthController {
  /**
   * 用户注册
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data: RegisterRequest = req.body
      const result = await authService.register(data)
      return success(res, result, '注册成功')
    } catch (err: any) {
      if (err.message.includes('已存在')) {
        return error(res, 409, {
          code: 'CONFLICT',
          message: err.message,
        })
      }
      next(err)
    }
  }

  /**
   * 用户登录
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data: LoginRequest = req.body
      const result = await authService.login(data)
      return success(res, result, '登录成功')
    } catch (err: any) {
      if (err.message.includes('错误')) {
        return error(res, 401, {
          code: 'INVALID_CREDENTIALS',
          message: err.message,
        })
      }
      next(err)
    }
  }

  /**
   * 获取当前用户信息
   */
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId
      const user = await authService.getMe(userId)
      return success(res, user)
    } catch (err: any) {
      if (err.message.includes('不存在')) {
        return error(res, 404, {
          code: 'NOT_FOUND',
          message: err.message,
        })
      }
      next(err)
    }
  }

  /**
   * 用户登出（客户端删除 token）
   */
  async logout(req: Request, res: Response) {
    return success(res, null, '登出成功')
  }
}

export default new AuthController()
```

- [ ] **步骤 3：验证编译**

```bash
cd backend
pnpm build
```

- [ ] **步骤 4：Commit**

```bash
cd ..
git add backend/src/services/ backend/src/controllers/
git commit -m "feat(backend): add auth service and controller"
```

---

## 任务 6：配置路由和 Express 应用

**文件：**
- 创建：`backend/src/routes/auth.routes.ts`
- 创建：`backend/src/routes/index.ts`
- 创建：`backend/src/config/app.ts`
- 创建：`backend/src/app.ts`
- 创建：`backend/src/server.ts`

---

- [ ] **步骤 1：创建认证路由**

创建文件 `backend/src/routes/auth.routes.ts`：

```typescript
import { Router } from 'express'
import authController from '../controllers/auth.controller'
import { authMiddleware } from '../middlewares/auth.middleware'
import { validate } from '../middlewares/validator.middleware'
import { z } from 'zod'

const router = Router()

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
```

- [ ] **步骤 2：创建路由聚合器**

创建文件 `backend/src/routes/index.ts`：

```typescript
import { Router } from 'express'
import authRoutes from './auth.routes'

const router = Router()

// API 路由
router.use('/auth', authRoutes)

export default router
```

- [ ] **步骤 3：创建应用配置**

创建文件 `backend/src/config/app.ts`：

```typescript
export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
}
```

- [ ] **步骤 4：创建 Express 应用**

创建文件 `backend/src/app.ts`：

```typescript
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import routes from './routes'
import { loggerMiddleware } from './middlewares/logger.middleware'
import { errorHandler } from './middlewares/error.middleware'
import { config } from './config/app'

// 加载环境变量
dotenv.config()

const app = express()

// 安全中间件
app.use(helmet())

// CORS 配置
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}))

// 解析请求体
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 日志中间件
app.use(loggerMiddleware)

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API 路由
app.use('/api', routes)

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: '路由不存在',
    },
  })
})

// 错误处理中间件
app.use(errorHandler)

export default app
```

- [ ] **步骤 5：创建服务器入口**

创建文件 `backend/src/server.ts`：

```typescript
import app from './app'
import { config } from './config/app'
import logger from './utils/logger'
import prisma from './config/database'

// 启动服务器
async function start() {
  try {
    // 测试数据库连接
    await prisma.$connect()
    logger.info('数据库连接成功')

    // 启动 HTTP 服务器
    app.listen(config.port, () => {
      logger.info(`服务器运行在 http://localhost:${config.port}`)
      logger.info(`环境: ${config.nodeEnv}`)
    })
  } catch (error) {
    logger.error('服务器启动失败:', error)
    process.exit(1)
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  logger.info('收到 SIGTERM 信号，准备关闭服务器')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('收到 SIGINT 信号，准备关闭服务器')
  await prisma.$disconnect()
  process.exit(0)
})

start()
```

- [ ] **步骤 6：验证编译**

```bash
cd backend
pnpm build
```

- [ ] **步骤 7：Commit**

```bash
cd ..
git add backend/src/routes/ backend/src/config/app.ts backend/src/app.ts backend/src/server.ts
git commit -m "feat(backend): add routes and Express app configuration"
```

---

## 任务 7：数据库迁移和种子数据

**文件：**
- 创建：`backend/prisma/seed.ts`
- 修改：`backend/package.json`（添加 seed 脚本）

---

- [ ] **步骤 1：创建种子数据脚本**

创建文件 `backend/prisma/seed.ts`：

```typescript
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/utils/password'

const prisma = new PrismaClient()

async function main() {
  console.log('开始创建种子数据...')

  // 创建测试用户
  const hashedPassword = await hashPassword('password123')

  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      nickname: '测试用户',
    },
  })

  console.log('创建测试用户:', user.email)
  console.log('种子数据创建完成！')
}

main()
  .catch((e) => {
    console.error('种子数据创建失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

- [ ] **步骤 2：更新 package.json 添加 seed 脚本**

修改 `backend/package.json`，在 scripts 中添加：

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:seed": "tsx prisma/seed.ts",
    "clean": "rimraf dist"
  }
}
```

- [ ] **步骤 3：创建初始数据库迁移**

```bash
cd backend
# 确保 PostgreSQL 数据库已创建
pnpm prisma:migrate
```

输入迁移名称：`init`

预期：创建迁移文件并应用到数据库

- [ ] **步骤 4：运行种子数据**

```bash
pnpm prisma:seed
```

预期：创建测试用户

- [ ] **步骤 5：验证数据**

```bash
pnpm prisma:studio
```

预期：打开 Prisma Studio，看到测试用户

- [ ] **步骤 6：Commit**

```bash
cd ..
git add backend/prisma/ backend/package.json
git commit -m "feat(backend): add database migration and seed data"
```

---

## 任务 8：测试和文档

**文件：**
- 创建：`backend/README.md`
- 创建：`backend/API.md`

---

- [ ] **步骤 1：创建 backend README**

创建文件 `backend/README.md`：

```markdown
# @xiaowoniu/backend

小窝牛平台的后端 API 服务。

## 技术栈

- **框架**: Express 4.x + TypeScript
- **数据库**: PostgreSQL 15+ + Prisma ORM
- **认证**: JWT + bcrypt
- **验证**: Zod
- **日志**: Winston

## 开发环境要求

- Node.js >= 20.0.0
- PostgreSQL >= 15
- pnpm >= 8.0.0

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接等信息。

### 3. 数据库迁移

```bash
pnpm prisma:migrate
```

### 4. 生成 Prisma Client

```bash
pnpm prisma:generate
```

### 5. 运行种子数据（可选）

```bash
pnpm prisma:seed
```

### 6. 启动开发服务器

```bash
pnpm dev
```

服务器将在 `http://localhost:3000` 启动。

## 可用脚本

- `pnpm dev` - 启动开发服务器（热重载）
- `pnpm build` - 编译 TypeScript
- `pnpm start` - 启动生产服务器
- `pnpm prisma:generate` - 生成 Prisma Client
- `pnpm prisma:migrate` - 运行数据库迁移
- `pnpm prisma:studio` - 打开 Prisma Studio
- `pnpm prisma:seed` - 运行种子数据
- `pnpm clean` - 清理构建产物

## 项目结构

```
src/
├── config/          # 配置文件
├── controllers/     # 控制器（处理 HTTP 请求）
├── services/        # 业务逻辑
├── middlewares/     # 中间件
├── routes/          # 路由定义
├── utils/           # 工具函数
├── types/           # TypeScript 类型
├── app.ts           # Express 应用配置
└── server.ts        # 服务器入口
```

## API 文档

详见 [API.md](./API.md)

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | - |
| `JWT_SECRET` | JWT 密钥 | - |
| `JWT_EXPIRES_IN` | JWT 过期时间 | `7d` |
| `PORT` | 服务器端口 | `3000` |
| `NODE_ENV` | 运行环境 | `development` |
| `FRONTEND_URL` | 前端 URL（CORS） | `http://localhost:5173` |

## 测试账号

种子数据创建的测试账号：

- 邮箱：`test@example.com`
- 密码：`password123`
```

- [ ] **步骤 2：创建 API 文档**

创建文件 `backend/API.md`：

```markdown
# API 文档

基础 URL: `http://localhost:3000/api`

## 认证

除登录和注册外，所有 API 都需要在请求头中携带 JWT Token：

```
Authorization: Bearer <token>
```

---

## 认证模块

### 1. 用户注册

**POST** `/auth/register`

**请求体：**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "nickname": "测试用户"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "username": "testuser",
      "email": "test@example.com",
      "nickname": "测试用户",
      "avatarUrl": null,
      "createdAt": "2026-07-29T12:00:00.000Z",
      "updatedAt": "2026-07-29T12:00:00.000Z"
    }
  },
  "message": "注册成功"
}
```

### 2. 用户登录

**POST** `/auth/login`

**请求体：**
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "username": "testuser",
      "email": "test@example.com",
      "nickname": "测试用户",
      "avatarUrl": null,
      "createdAt": "2026-07-29T12:00:00.000Z",
      "updatedAt": "2026-07-29T12:00:00.000Z"
    }
  },
  "message": "登录成功"
}
```

### 3. 获取当前用户信息

**GET** `/auth/me`

**请求头：**
```
Authorization: Bearer <token>
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "testuser",
    "email": "test@example.com",
    "nickname": "测试用户",
    "avatarUrl": null,
    "createdAt": "2026-07-29T12:00:00.000Z",
    "updatedAt": "2026-07-29T12:00:00.000Z"
  }
}
```

### 4. 用户登出

**POST** `/auth/logout`

**请求头：**
```
Authorization: Bearer <token>
```

**响应：**
```json
{
  "success": true,
  "data": null,
  "message": "登出成功"
}
```

**注意**：实际登出由客户端删除 Token 实现，此接口仅用于日志记录。

---

## 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}
  }
}
```

### 常见错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `UNAUTHORIZED` | 401 | 未认证或 Token 无效 |
| `TOKEN_EXPIRED` | 401 | Token 已过期 |
| `INVALID_CREDENTIALS` | 401 | 邮箱或密码错误 |
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `CONFLICT` | 409 | 资源冲突（如用户已存在） |
| `NOT_FOUND` | 404 | 资源不存在 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## 测试示例

### 使用 curl

```bash
# 注册
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123"}'

# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 获取用户信息（替换 <token>）
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"
```
```

- [ ] **步骤 3：测试 API 端点**

```bash
cd backend
pnpm dev
```

在另一个终端测试：

```bash
# 健康检查
curl http://localhost:3000/health

# 注册用户
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","email":"new@example.com","password":"password123"}'

# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"new@example.com","password":"password123"}'
```

- [ ] **步骤 4：Commit**

```bash
cd ..
git add backend/README.md backend/API.md
git commit -m "docs(backend): add backend documentation"
```

- [ ] **步骤 5：创建 Phase 2 标签**

```bash
git tag -a v0.2.0-phase2 -m "Phase 2: Backend infrastructure and authentication completed"
```

---

## 验收标准

Phase 2 完成后，应满足以下条件：

✅ **结构完整**
- backend 目录配置正确
- Prisma schema 定义完整
- 所有中间件实现完成

✅ **功能实现**
- 用户注册功能正常
- 用户登录获取 JWT
- JWT 认证中间件工作正常
- 错误处理统一

✅ **开发体验**
- `pnpm dev` 启动开发服务器
- `pnpm build` 编译成功
- `pnpm prisma:migrate` 迁移数据库

✅ **文档完整**
- backend README 说明清晰
- API 文档完善

✅ **Git 管理**
- 所有变更已提交
- commit 信息规范

---

**Phase 2 计划待完成填充。**
