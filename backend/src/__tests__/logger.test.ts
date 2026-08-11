import { describe, expect, it } from 'vitest'
import { redactLogValue } from '../utils/logger'

describe('structured log redaction', () => {
  it('redacts sensitive fields recursively while preserving operational fields', () => {
    const value = redactLogValue({
      requestId: 'request-12345678',
      route: '/api/dashboard/summary',
      authorization: 'Bearer demo-token',
      nested: {
        password: 'demo-password',
        email: 'person@example.com',
      },
      databaseMessage: 'postgresql://user:password@db.example.invalid/xiaowoniu',
    }) as Record<string, any>

    expect(value).toMatchObject({
      requestId: 'request-12345678',
      route: '/api/dashboard/summary',
      authorization: '[REDACTED]',
      nested: {
        password: '[REDACTED]',
        email: '[REDACTED]',
      },
      databaseMessage: '[REDACTED_DATABASE_URL]',
    })
  })

  it('redacts secret-shaped text from errors before JSON logging', () => {
    const error = redactLogValue(new Error('failed with Bearer demo-token for person@example.com')) as Record<string, string>

    expect(error.message).toBe('failed with Bearer [REDACTED] for [REDACTED_EMAIL]')
    expect(error.stack).not.toContain('demo-token')
    expect(error.stack).not.toContain('person@example.com')
  })
})
