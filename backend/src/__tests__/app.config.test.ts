import { describe, expect, it } from 'vitest'
import { createConfig } from '../config/app'

const stagingEnvironment = {
  NODE_ENV: 'staging',
  JWT_SECRET: 'managed-jwt-secret',
  FRONTEND_URL: 'https://staging.example.invalid',
}

describe('application configuration', () => {
  it('requires a managed JWT secret and frontend origin in staging or production', () => {
    expect(() => createConfig({ ...stagingEnvironment, JWT_SECRET: '' })).toThrow('JWT_SECRET')
    expect(() => createConfig({ ...stagingEnvironment, FRONTEND_URL: '' })).toThrow('FRONTEND_URL')
    expect(() => createConfig({ ...stagingEnvironment, JWT_SECRET: 'default-secret' })).toThrow('JWT_SECRET')
  })

  it('accepts non-sensitive build metadata without putting it in the secret configuration path', () => {
    const config = createConfig({
      ...stagingEnvironment,
      PORT: '3100',
      LOG_LEVEL: 'warn',
      APP_VERSION: '1.2.3',
      BUILD_SHA: 'abc1234',
      BUILD_TIME: '2026-08-11T00:00:00Z',
    })

    expect(config).toMatchObject({
      port: 3100,
      nodeEnv: 'staging',
      logLevel: 'warn',
      appVersion: '1.2.3',
      buildSha: 'abc1234',
      buildTime: '2026-08-11T00:00:00Z',
    })
  })

  it('rejects an invalid listening port before the server starts', () => {
    expect(() => createConfig({ PORT: '0' })).toThrow('PORT')
    expect(() => createConfig({ PORT: 'not-a-port' })).toThrow('PORT')
  })
})
