import type { Server } from 'node:http'
import app from './app'
import { config } from './config/app'
import prisma from './config/database'
import logger from './utils/logger'

let httpServer: Server | undefined
let shuttingDown = false

function listen(): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(config.port)
    const onError = (error: Error) => {
      server.off('listening', onListening)
      reject(error)
    }
    const onListening = () => {
      server.off('error', onError)
      resolve(server)
    }

    server.once('error', onError)
    server.once('listening', onListening)
  })
}

async function closeHttpServer() {
  if (!httpServer) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    httpServer!.close((error) => (error ? reject(error) : resolve()))
  })
}

// 启动服务器
async function start() {
  try {
    // 测试数据库连接
    await prisma.$connect()
    logger.info('database_connected', { event: 'database_connected' })

    // 启动 HTTP 服务器
    httpServer = await listen()
    logger.info('server_started', {
      event: 'server_started',
      port: config.port,
      environment: config.nodeEnv,
    })
  } catch (error) {
    logger.error('server_start_failed', { event: 'server_start_failed', error })
    process.exit(1)
  }
}

async function shutdown(signal: 'SIGTERM' | 'SIGINT') {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  let exitCode = 0
  logger.info('shutdown_started', { event: 'shutdown_started', signal })

  try {
    await closeHttpServer()
  } catch (error) {
    exitCode = 1
    logger.error('http_server_shutdown_failed', { event: 'http_server_shutdown_failed', error })
  }

  try {
    await prisma.$disconnect()
  } catch (error) {
    exitCode = 1
    logger.error('database_disconnect_failed', { event: 'database_disconnect_failed', error })
  }

  logger.info('shutdown_completed', { event: 'shutdown_completed', signal, exitCode })
  process.exit(exitCode)
}

process.once('SIGTERM', () => {
  void shutdown('SIGTERM')
})

process.once('SIGINT', () => {
  void shutdown('SIGINT')
})

void start()
