import express, { Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import routes from './routes'
import { config } from './config/app'
import prisma from './config/database'
import { errorHandler } from './middlewares/error.middleware'
import { loggerMiddleware } from './middlewares/logger.middleware'
import { metricsAuthMiddleware } from './middlewares/metrics.middleware'
import { requestContextMiddleware } from './middlewares/request-context.middleware'
import { runtimeMetrics } from './observability/runtime-metrics'
import logger from './utils/logger'
import { getRequestId } from './utils/request-context'

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

// 请求上下文和日志中间件
app.use(requestContextMiddleware)
app.use(loggerMiddleware)

// 存活检查：只表示 HTTP 进程可响应，不访问数据库。
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 就绪检查：只有 Prisma 能执行最小数据库查询时才可接收流量。
app.get('/readyz', async (req, res) => {
  const startedAt = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    runtimeMetrics.recordReadiness(true, Date.now() - startedAt)
    return res.json({ status: 'ready', timestamp: new Date().toISOString() })
  } catch (error) {
    const durationMs = Date.now() - startedAt
    runtimeMetrics.recordReadiness(false, durationMs)
    runtimeMetrics.recordDatabaseQueryError()
    logger.warn('database_readiness_failed', {
      event: 'database_readiness_failed',
      requestId: getRequestId(res),
      durationMs,
      error,
    })
    return res.status(503).json({ status: 'not_ready', timestamp: new Date().toISOString() })
  }
})

// 非敏感构建标识，供部署观察和故障定位使用。
app.get('/version', (req, res) => {
  res.json({
    service: 'xiaowoniu-backend',
    environment: config.nodeEnv,
    version: config.appVersion,
    buildSha: config.buildSha,
    buildTime: config.buildTime,
  })
})

// 指标端点默认关闭；配置受管 METRICS_TOKEN 后才允许访问。
app.get('/metrics', metricsAuthMiddleware, (req, res) => {
  res.json(runtimeMetrics.snapshot())
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
