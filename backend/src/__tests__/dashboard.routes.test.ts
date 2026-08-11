import http from 'node:http'
import { AddressInfo } from 'node:net'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import express from 'express'
import routes from '../routes'
import dashboardRoutes from '../routes/dashboard.routes'
import dashboardService from '../services/dashboard.service'
import { errorHandler } from '../middlewares/error.middleware'
import { generateToken } from '../utils/jwt'

const token = generateToken({ userId: 'u1', email: 'u1@example.com' })
const app = express()
app.use(express.json())
app.use('/api', routes)
app.use(errorHandler)
const server = http.createServer(app)

function request(path: string, authorization = `Bearer ${token}`) {
  const address = server.address() as AddressInfo
  return new Promise<{ statusCode: number; body: any }>((resolve, reject) => {
    const client = http.request({
      host: '127.0.0.1', port: address.port, path, method: 'GET',
      headers: authorization ? { authorization } : {},
    }, (response) => {
      let raw = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => { raw += chunk })
      response.on('end', () => resolve({ statusCode: response.statusCode ?? 0, body: JSON.parse(raw) }))
    })
    client.on('error', reject)
    client.end()
  })
}

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve))
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('dashboard routes', () => {
  it('registers the authenticated, validated summary endpoint and mounts it through the API router', () => {
    const layers = (dashboardRoutes as any).stack.filter((layer: any) => layer.route)
    expect(layers).toHaveLength(1)
    expect(Object.keys(layers[0].route.methods)).toEqual(['get'])
    expect(layers[0].route.path).toBe('/summary')
    expect(layers[0].route.stack.map((handler: any) => handler.name)).toEqual([
      'authMiddleware', 'validateRequest', 'bound getSummary',
    ])
    const mounted = (routes as any).stack.find((layer: any) => layer.regexp?.toString().includes('dashboard'))
    expect(mounted?.handle).toBe(dashboardRoutes)
  })

  it('requires authentication', async () => {
    const response = await request('/api/dashboard/summary', '')
    expect(response.statusCode).toBe(401)
    expect(response.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } })
  })

  it('returns the service result in the standard success envelope for the authenticated user', async () => {
    const summary = {
      generatedAt: '2026-08-06T00:00:00.000Z',
      fitness: {}, learning: {}, finance: {}, wedding: {},
    }
    const getSummary = vi.spyOn(dashboardService, 'getSummary').mockResolvedValue(summary as any)

    const response = await request('/api/dashboard/summary')

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ success: true, data: summary })
    expect(getSummary).toHaveBeenCalledWith('u1')
  })

  it('passes unexpected service errors to the shared error handler', async () => {
    vi.spyOn(dashboardService, 'getSummary').mockRejectedValue(new Error('dashboard exploded'))

    const response = await request('/api/dashboard/summary')

    expect(response.statusCode).toBe(500)
    expect(response.body).toMatchObject({ success: false, error: { code: 'INTERNAL_ERROR', message: 'dashboard exploded' } })
  })
})
