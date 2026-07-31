import { describe, expect, it } from 'vitest'
import learningRoutes from '../routes/learning.routes'

const routes = (learningRoutes as any).stack
  .filter((layer: any) => layer.route)
  .map((layer: any) => ({
    path: layer.route.path,
    method: Object.keys(layer.route.methods)[0],
    middleware: layer.route.stack.map((item: any) => item.name),
  }))

const expected = [
  ['get', '/exams'], ['post', '/exams'], ['patch', '/exams/:id'], ['delete', '/exams/:id'],
  ['get', '/subjects'], ['post', '/subjects'], ['patch', '/subjects/:id'], ['delete', '/subjects/:id'],
  ['get', '/checkins'], ['post', '/checkins'], ['delete', '/checkins/:id'], ['get', '/progress'],
] as const

describe('learning routes', () => {
  it('registers every learning endpoint with auth before validation and controller', () => {
    expect(routes).toHaveLength(expected.length)
    for (const [method, path] of expected) {
      const route = routes.find((item: any) => item.method === method && item.path === path)
      expect(route).toBeDefined()
      expect(route.middleware[0]).toBe('authMiddleware')
      expect(route.middleware[1]).toBe('validateRequest')
      expect(route.middleware[2]).toMatch(/bound /)
    }
  })
})
