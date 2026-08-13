import { describe, expect, it } from 'vitest'
import { shouldRedirectToLogin } from './api'

describe('api authentication response handling', () => {
  it('does not treat login and registration 401 responses as expired sessions', () => {
    expect(shouldRedirectToLogin({ url: '/api/auth/login' })).toBe(false)
    expect(shouldRedirectToLogin({ url: '/api/auth/register' })).toBe(false)
    expect(shouldRedirectToLogin({ url: '/api/auth/register/' })).toBe(false)
    expect(shouldRedirectToLogin({ url: 'http://localhost:3000/api/auth/login' })).toBe(false)
  })

  it('still treats protected and unknown 401 responses as expired sessions', () => {
    expect(shouldRedirectToLogin({ url: '/api/auth/me' })).toBe(true)
    expect(shouldRedirectToLogin({ url: '/api/wedding/tasks' })).toBe(true)
    expect(shouldRedirectToLogin()).toBe(true)
  })
})
