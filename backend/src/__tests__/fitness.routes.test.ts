import { describe, expect, it } from 'vitest'
import fitnessRoutes from '../routes/fitness.routes'

describe('fitness routes', () => {
  it('defines every endpoint with authentication and validation before its controller', () => {
    const expected = [
      ['get', '/checkins'], ['post', '/checkins'], ['delete', '/checkins/:id'],
      ['get', '/weights'], ['post', '/weights'], ['delete', '/weights/:id'],
      ['get', '/goal'], ['put', '/goal'], ['get', '/stats'],
    ]
    const layers = (fitnessRoutes as any).stack.filter((layer: any) => layer.route)
    expect(layers.map((layer: any) => [Object.keys(layer.route.methods)[0], layer.route.path])).toEqual(expected)
    for (const layer of layers) {
      const names = layer.route.stack.map((handler: any) => handler.name)
      expect(names[0]).toBe('authMiddleware')
      expect(names[1]).toBe('validateRequest')
      expect(names).toHaveLength(3)
    }
  })
})
