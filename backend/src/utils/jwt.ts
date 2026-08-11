import jwt from 'jsonwebtoken'
import { JWTPayload } from '@xiaowoniu/shared'
import { config } from '../config/app'

/**
 * 生成 JWT Token
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  // @ts-ignore - TypeScript 类型定义问题
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  })
}

/**
 * 验证 JWT Token
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, config.jwtSecret) as JWTPayload
}
