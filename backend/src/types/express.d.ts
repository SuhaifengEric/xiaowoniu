import { JWTPayload } from '@xiaowoniu/shared'

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload
    }
  }
}
