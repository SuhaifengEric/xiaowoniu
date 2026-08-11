import winston from 'winston'
import { config } from '../config/app'

const sensitiveKeyPattern = /authorization|cookie|password|token|secret|database.?url|connection.?string|credential|jwt|email|phone|mobile|user.?id|identity|id.?card/i

function redactText(value: string): string {
  return value
    .replace(/\bBearer\s+[^\s,]+/gi, 'Bearer [REDACTED]')
    .replace(/\bpostgres(?:ql)?:\/\/[^\s'"`]+/gi, '[REDACTED_DATABASE_URL]')
    .replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_JWT]')
    .replace(/\b(authorization|cookie|password|token|secret|jwt)\s*[=:]\s*[^\s,&]+/gi, '$1=[REDACTED]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
}

export function redactLogValue(value: unknown, key?: string, seen = new WeakSet<object>()): unknown {
  if (key && sensitiveKeyPattern.test(key)) {
    return '[REDACTED]'
  }

  if (typeof value === 'string') {
    return redactText(value)
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactText(value.message),
      stack: value.stack ? redactText(value.stack) : undefined,
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactLogValue(item, undefined, seen))
  }

  if (value && typeof value === 'object') {
    if (seen.has(value)) {
      return '[CIRCULAR]'
    }

    seen.add(value)
    const redacted: Record<string, unknown> = {}
    for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      redacted[nestedKey] = redactLogValue(nestedValue, nestedKey, seen)
    }
    return redacted
  }

  return value
}

const redactFormat = winston.format((info) => {
  for (const key of Object.keys(info)) {
    if (key !== 'level') {
      info[key] = redactLogValue(info[key], key)
    }
  }

  return info
})

const logger = winston.createLogger({
  level: config.logLevel,
  defaultMeta: {
    service: 'xiaowoniu-backend',
    environment: config.nodeEnv,
    version: config.appVersion,
    buildSha: config.buildSha,
  },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    redactFormat(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
})

export default logger
