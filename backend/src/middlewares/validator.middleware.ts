import { Request, Response, NextFunction } from 'express'
import { AnyZodObject, ZodError } from 'zod'
import { error } from '../utils/response'

/**
 * Zod 验证中间件工厂
 */
export function validate(schema: AnyZodObject) {
  return async function validateRequest(req: Request, res: Response, next: NextFunction) {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        return error(res, 400, {
          code: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: err.errors,
        })
      }
      next(err)
    }
  }
}
