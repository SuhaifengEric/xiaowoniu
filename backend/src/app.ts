import express, { Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import routes from './routes'
import { loggerMiddleware } from './middlewares/logger.middleware'
import { errorHandler } from './middlewares/error.middleware'
import { config } from './config/app'

// 加载环境变量
dotenv.config()

const app: Express = express()

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
