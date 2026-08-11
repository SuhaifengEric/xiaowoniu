import http from 'node:http'
import { AddressInfo } from 'node:net'
import express from 'express'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { config } from '../config/app'
import { metricsAuthMiddleware, tokensMatch } from '../middlewares/metrics.middleware'

const originalMetricsToken = config.metricsToken
const app = express()
app.get('/metrics', metricsAuthMiddleware, (req, res) => {
  res.json({ status: 'available' })
})
const server = http.createServer(app)

function request(authorization?: string) {
  const address = server.address() as AddressInfo
  return new Promise<{ statusCode: number; body: any }>((resolve, reject) => {
    const client = http.request({
      host: '127.0.0.1',
      port: address.port,
      path: '/metrics',
      method: 'GET',
      headers: authorization ? { authorization } : {},
    }, (response) => {
      let raw = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => { raw += chunk })
      response.on('end', () => resolve({
        statusCode: response.statusCode || 0,
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

beforeEach(() => {
  config.metricsToken = 'operator-token'
})

afterEach(() => {
  config.metricsToken = originalMetricsToken
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
})

describe('metrics endpoint protection', () => {
  it('accepts only an exact configured token', () => {
    expect(tokensMatch('operator-token', 'operator-token')).toBe(true)
    expect(tokensMatch('operator-token', 'operator-token-extra')).toBe(false)
    expect(tokensMatch('operator-token', undefined)).toBe(false)
  })

  it('rejects requests without the configured bearer token', async () => {
    const response = await request()

    expect(response.statusCode).toBe(401)
    expect(response.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } })
  })

  it('allows the configured bearer token', async () => {
    const response = await request('Bearer operator-token')

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ status: 'available' })
  })

  it('hides the endpoint when no metrics token is configured', async () => {
    config.metricsToken = undefined

    const response = await request()

    expect(response.statusCode).toBe(404)
    expect(response.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })
  })
})
