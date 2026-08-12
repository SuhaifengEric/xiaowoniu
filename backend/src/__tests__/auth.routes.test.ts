import http from 'node:http'
import { AddressInfo } from 'node:net'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import express from 'express'
import routes from '../routes'
import authRoutes from '../routes/auth.routes'
import authService, {
  InvalidCurrentPasswordError,
  PasswordUnchangedError,
} from '../services/auth.service'
import { errorHandler } from '../middlewares/error.middleware'
import { generateToken } from '../utils/jwt'

const routeLayers = (authRoutes as any).stack.filter((layer: any) => layer.route)
const routeTable = routeLayers.map((layer: any) => ({
  method: Object.keys(layer.route.methods)[0],
  path: layer.route.path,
  middleware: layer.route.stack.map((item: any) => item.name),
}))

const token = generateToken({ userId: 'user-a', email: 'user-a@example.com' })
const app = express()
app.use(express.json())
app.use('/api', routes)
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '路由不存在' } })
})
app.use(errorHandler)
const server = http.createServer(app)

interface HttpResponse {
  statusCode: number
  body: any
}

function httpRequest(
  method: string,
  path: string,
  body?: unknown,
  authorization = `Bearer ${token}`,
): Promise<HttpResponse> {
  const address = server.address() as AddressInfo
  const payload = body === undefined ? undefined : JSON.stringify(body)

  return new Promise((resolve, reject) => {
    const request = http.request({
      host: '127.0.0.1',
      port: address.port,
      method,
      path,
      headers: {
        ...(authorization ? { authorization } : {}),
        ...(payload ? {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload),
        } : {}),
      },
    }, (response) => {
      let raw = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => { raw += chunk })
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode ?? 0,
          body: raw ? JSON.parse(raw) : undefined,
        })
      })
    })
    request.on('error', reject)
    if (payload) request.write(payload)
    request.end()
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

describe('auth routes', () => {
  it('registers profile and password endpoints with auth before validation and controller', () => {
    expect(routeTable.map(({ method, path }: any) => [method, path])).toEqual([
      ['post', '/register'],
      ['post', '/login'],
      ['get', '/me'],
      ['patch', '/me'],
      ['patch', '/password'],
      ['post', '/logout'],
    ])

    const profileRoute = routeTable.find(({ method, path }: any) => method === 'patch' && path === '/me')
    const passwordRoute = routeTable.find(({ method, path }: any) => method === 'patch' && path === '/password')
    expect(profileRoute.middleware).toEqual(['authMiddleware', 'validateRequest', 'bound updateProfile'])
    expect(passwordRoute.middleware).toEqual(['authMiddleware', 'validateRequest', 'bound changePassword'])
  })

  it.each([
    ['PATCH', '/api/auth/me', { nickname: '花花' }],
    ['PATCH', '/api/auth/password', { currentPassword: 'old-password', newPassword: 'new-password' }],
  ])('requires authentication for %s %s', async (method, path, body) => {
    const response = await httpRequest(method, path, body, '')
    expect(response.statusCode).toBe(401)
    expect(response.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } })
  })

  it('updates a profile through the standard success envelope', async () => {
    const user = {
      id: 'user-a', username: 'user-a', email: 'user-a@example.com', nickname: '花花',
      avatarUrl: null, createdAt: 'created', updatedAt: 'updated',
    }
    vi.spyOn(authService, 'updateProfile').mockResolvedValue(user)

    const response = await httpRequest('PATCH', '/api/auth/me', { nickname: '花花' })

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ success: true, data: user, message: '个人资料更新成功' })
    expect(authService.updateProfile).toHaveBeenCalledWith('user-a', { nickname: '花花' })
  })

  it('rejects invalid or unknown profile and password fields before calling services', async () => {
    const updateProfile = vi.spyOn(authService, 'updateProfile')
    const changePassword = vi.spyOn(authService, 'changePassword')
    const cases = [
      ['PATCH', '/api/auth/me', {}],
      ['PATCH', '/api/auth/me', { nickname: 'x'.repeat(51) }],
      ['PATCH', '/api/auth/me', { nickname: '花花', email: 'injected@example.com' }],
      ['PATCH', '/api/auth/password', { currentPassword: '', newPassword: 'new-password' }],
      ['PATCH', '/api/auth/password', { currentPassword: 'old-password', newPassword: 'short' }],
      ['PATCH', '/api/auth/password', {
        currentPassword: 'old-password', newPassword: 'new-password', confirmPassword: 'new-password',
      }],
    ] as const

    for (const [method, path, body] of cases) {
      const response = await httpRequest(method, path, body)
      expect(response.statusCode).toBe(400)
      expect(response.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } })
    }

    expect(updateProfile).not.toHaveBeenCalled()
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('maps password business errors to explicit error codes', async () => {
    vi.spyOn(authService, 'changePassword')
      .mockRejectedValueOnce(new InvalidCurrentPasswordError())
      .mockRejectedValueOnce(new PasswordUnchangedError())

    const invalidCurrentPassword = await httpRequest('PATCH', '/api/auth/password', {
      currentPassword: 'wrong-password', newPassword: 'new-password',
    })
    expect(invalidCurrentPassword.statusCode).toBe(400)
    expect(invalidCurrentPassword.body).toMatchObject({
      success: false, error: { code: 'INVALID_CURRENT_PASSWORD' },
    })

    const unchanged = await httpRequest('PATCH', '/api/auth/password', {
      currentPassword: 'same-password', newPassword: 'same-password',
    })
    expect(unchanged.statusCode).toBe(400)
    expect(unchanged.body).toMatchObject({
      success: false, error: { code: 'PASSWORD_UNCHANGED' },
    })
  })

  it('returns null after a successful password change and keeps service errors centralized', async () => {
    vi.spyOn(authService, 'changePassword').mockResolvedValue(null)
    const response = await httpRequest('PATCH', '/api/auth/password', {
      currentPassword: 'old-password', newPassword: 'new-password',
    })
    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ success: true, data: null, message: '密码修改成功' })

    vi.spyOn(authService, 'updateProfile').mockRejectedValue(new Error('auth service exploded'))
    const failed = await httpRequest('PATCH', '/api/auth/me', { nickname: '花花' })
    expect(failed.statusCode).toBe(500)
    expect(failed.body).toMatchObject({ success: false, error: { code: 'INTERNAL_ERROR' } })
  })
})
