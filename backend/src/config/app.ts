import dotenv from 'dotenv'

dotenv.config()

function readOptional(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]?.trim()
  return value || undefined
}

function readRequired(env: NodeJS.ProcessEnv, name: string, nodeEnv: string): string {
  const value = readOptional(env, name)
  if (!value) {
    throw new Error(`${name} must be configured when NODE_ENV=${nodeEnv}`)
  }

  return value
}

function parsePort(value: string | undefined): number {
  const port = Number(value || 3000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  return port
}

export function createConfig(env: NodeJS.ProcessEnv) {
  const nodeEnv = readOptional(env, 'NODE_ENV') || 'development'
  const isManagedEnvironment = nodeEnv === 'staging' || nodeEnv === 'production'
  const configuredJwtSecret = readOptional(env, 'JWT_SECRET')

  if (isManagedEnvironment && (!configuredJwtSecret || configuredJwtSecret === 'default-secret')) {
    throw new Error(`JWT_SECRET must be configured with a managed secret when NODE_ENV=${nodeEnv}`)
  }

  return {
    port: parsePort(readOptional(env, 'PORT')),
    nodeEnv,
    jwtSecret: configuredJwtSecret || 'default-secret',
    jwtExpiresIn: readOptional(env, 'JWT_EXPIRES_IN') || '7d',
    frontendUrl: isManagedEnvironment
      ? readRequired(env, 'FRONTEND_URL', nodeEnv)
      : readOptional(env, 'FRONTEND_URL') || 'http://localhost:5173',
    logLevel: readOptional(env, 'LOG_LEVEL') || 'info',
    appVersion: readOptional(env, 'APP_VERSION') || '1.0.0',
    buildSha: readOptional(env, 'BUILD_SHA') || 'unknown',
    buildTime: readOptional(env, 'BUILD_TIME') || 'unknown',
    metricsToken: readOptional(env, 'METRICS_TOKEN'),
  }
}

export const config = createConfig(process.env)
