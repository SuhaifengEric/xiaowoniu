/**
 * 统一 API 响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  message?: string
}

/**
 * API 错误格式
 */
export interface ApiError {
  code: string
  message: string
  details?: any
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: Pagination
}

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
