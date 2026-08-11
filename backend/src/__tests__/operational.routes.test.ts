import http from 'node:http'
import { AddressInfo } from 'node:net'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

const { queryRaw } = vi.hoisted(() => ({ queryRaw: vi.fn() }))

vi.mock('../config/database', () => ({
  default: { $queryRaw: queryRaw },
}))

import app from '../app'

const server = http.createServer(app)

function request(path: string, headers: Record<string, string> = {}) {
  const address = server.address() as AddressInfo
  return new Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: any }>((resolve, reject) => {
    const client = http.request({
      host: '127.0.0.1',
      port: address.port,
      path,
      method: 'GET',
      headers,
    }, (response) => {
      let raw = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => { raw += chunk })
      response.on('end', () => resolve({
        statusCode: response.statusCode || 0,
        headers: response.headers,
        body: JSON.parse(raw),
      }))
    })
    client.on('error', reject)
    client.end()
  })
}

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve))
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
})

afterEach(() => {
  queryRaw.mockReset()
})

describe('operational endpoints', () => {
  it('keeps liveness independent from the database and returns a request correlation ID', async () => {
    const response = await request('/health', { 'x-request-id': 'gateway-request-001' })

    expect(response.statusCode).toBe(200)
    expect(response.body.status).toBe('ok')
    expect(response.headers['x-request-id']).toBe('gateway-request-001')
    expect(queryRaw).not.toHaveBeenCalled()
  })

  it('reports ready only after Prisma can execute a database query', async () => {
    queryRaw.mockResolvedValue([{ result: 1 }])

    const response = await request('/readyz')

    expect(response.statusCode).toBe(200)
    expect(response.body.status).toBe('ready')
    expect(queryRaw).toHaveBeenCalledOnce()
  })

  it('returns a generic readiness failure without exposing database internals', async () => {
    queryRaw.mockRejectedValue(new Error('database unavailable'))

    const response = await request('/readyz')

    expect(response.statusCode).toBe(503)
    expect(response.body.status).toBe('not_ready')
    expect(JSON.stringify(response.body)).not.toContain('database unavailable')
  })

  it('exposes only non-sensitive build identity through the version endpoint', async () => {
    const response = await request('/version')

    expect(response.statusCode).toBe(200)
    expect(response.body).toMatchObject({
      service: 'xiaowoniu-backend',
      version: expect.any(String),
      buildSha: expect.any(String),
      buildTime: expect.any(String),
    })
    expect(JSON.stringify(response.body)).not.toContain('default-secret')
  })
})
