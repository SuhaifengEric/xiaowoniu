import jwt from 'jsonwebtoken'
import { JWTPayload } from '@xiaowoniu/shared'

const JWT_SECRET: string = process.env.JWT_SECRET || 'default-secret'
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d'

/**
 * 生成 JWT Token
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  // @ts-ignore - TypeScript 类型定义问题
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })
}

/**
 * 验证 JWT Token
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload
}

