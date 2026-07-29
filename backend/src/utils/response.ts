import { Response } from 'express'
import { ApiResponse, ApiError } from '@xiaowoniu/shared'

/**
 * 成功响应
 */
export function success<T>(res: Response, data: T, message?: string) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  }
  return res.json(response)
}

/**
 * 错误响应
 */
export function error(
  res: Response,
  statusCode: number,
  errorData: ApiError
) {
  const response: ApiResponse<never> = {
    success: false,
    error: errorData,
  }
  return res.status(statusCode).json(response)
}
