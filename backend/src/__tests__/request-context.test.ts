import { describe, expect, it, vi } from 'vitest'
import { Request } from 'express'
import { getInboundRequestId, getSafeRequestRoute } from '../utils/request-context'

function requestWithPath(path: string): Request {
  return { path } as Request
}

describe('request context utilities', () => {
  it('accepts only bounded safe inbound request IDs', () => {
    const get = vi.fn().mockReturnValue('gateway-request-001')
    expect(getInboundRequestId({ get } as unknown as Request)).toBe('gateway-request-001')

    get.mockReturnValue('bad id with spaces')
    expect(getInboundRequestId({ get } as unknown as Request)).toBeUndefined()
  })

  it('keeps route templates useful without recording arbitrary path values', () => {
    expect(getSafeRequestRoute(requestWithPath('/api/finance/expenses/550e8400-e29b-41d4-a716-446655440000')))
      .toBe('/api/finance/expenses/:id')
    expect(getSafeRequestRoute(requestWithPath('/api/finance/expenses/person@example.com')))
      .toBe('/api/finance/expenses/:param')
  })
})
