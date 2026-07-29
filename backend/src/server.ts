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
