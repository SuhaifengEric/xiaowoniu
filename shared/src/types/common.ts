/**
 * API 错误格式
 */
export interface ApiError {
  code: string
  message: string
  details?: unknown
}

/**
 * 统一 API 响应格式（成功）
 */
export interface ApiSuccessResponse<T> {
  success: true
  data: T
  message?: string
}

/**
 * 统一 API 响应格式（失败）
 */
export interface ApiErrorResponse {
  success: false
  error: ApiError
  message?: string
}

/**
 * 统一 API 响应格式
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * 分页响应（成功）
 */
export interface PaginatedSuccessResponse<T> {
  success: true
  data: T[]
  pagination: Pagination
  message?: string
}

/**
 * 分页响应
 */
export type PaginatedResponse<T> = PaginatedSuccessResponse<T> | ApiErrorResponse

/**
 * 分页信息
 */
export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/**
 * 分页请求参数
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
}

/**
 * 日期范围
 */
export interface DateRange {
  startDate: string // ISO 8601 格式
  endDate: string   // ISO 8601 格式
}

/**
 * ID 参数
 */
export interface IdParam {
  id: string
}
