import type { PaidStatus, TaskStatus, WeddingTaskCategory } from '../../constants/enums'
import type { WeddingBudgetResponse } from '../models/wedding'

/**
 * 创建备婚任务请求
 */
export interface CreateWeddingTaskRequest {
  taskName: string
  category: WeddingTaskCategory
  plannedDate?: string | null
  status?: TaskStatus
  priority?: number
  notes?: string | null
}

/**
 * 更新备婚任务请求（字段缺省表示不修改）
 */
export interface UpdateWeddingTaskRequest {
  taskName?: string
  category?: WeddingTaskCategory
  plannedDate?: string | null
  status?: TaskStatus
  priority?: number
  notes?: string | null
}

/**
 * 备婚任务查询参数
 */
export interface WeddingTaskQueryParams {
  status?: TaskStatus
  category?: WeddingTaskCategory
  limit?: number
  offset?: number
}

/**
 * 创建备婚花费请求
 */
export interface CreateWeddingExpenseRequest {
  taskId?: string | null
  date: string
  itemName: string
  category: WeddingTaskCategory
  plannedAmount: number
  actualAmount: number
  paidStatus: PaidStatus
  notes?: string | null
}

/**
 * 更新备婚花费请求（字段缺省表示不修改，null 表示清空/解除关联）
 */
export interface UpdateWeddingExpenseRequest {
  taskId?: string | null
  date?: string
  itemName?: string
  category?: WeddingTaskCategory
  plannedAmount?: number
  actualAmount?: number
  paidStatus?: PaidStatus
  notes?: string | null
}

/**
 * 备婚花费查询参数
 */
export interface WeddingExpenseQueryParams {
  startDate?: string
  endDate?: string
  category?: WeddingTaskCategory
  paidStatus?: PaidStatus
  limit?: number
  offset?: number
}

/**
 * 幂等设置备婚预算请求（总预算与婚礼日期均必填）
 */
export interface UpsertWeddingBudgetRequest {
  totalBudget: number
  weddingDate: string
}

/**
 * 备婚类别统计汇总
 */
export interface WeddingCategorySummary {
  category: WeddingTaskCategory
  plannedAmount: number
  actualAmount: number
  expenseCount: number
  actualPercentage: number
}

/**
 * 备婚任务数量统计
 */
export interface WeddingTaskCounts {
  pending: number
  inProgress: number
  completed: number
  cancelled: number
  activeTotal: number
  completionPercentage: number
}

/**
 * 备婚概览响应
 */
export interface WeddingOverviewResponse {
  budget: WeddingBudgetResponse | null
  plannedExpenseTotal: number
  actualExpenseTotal: number
  expenseCount: number
  remainingBudget: number | null
  budgetUsedPercentage: number | null
  plannedBudgetPercentage: number | null
  actualVsPlannedPercentage: number | null
  daysUntilWedding: number | null
  taskCounts: WeddingTaskCounts
  categoryBreakdown: WeddingCategorySummary[]
}

/**
 * 里程碑时间线条目
 */
export interface WeddingTimelineItem {
  taskId: string
  taskName: string
  category: WeddingTaskCategory
  status: TaskStatus
  priority: number
  plannedDate: string
  completedDate: string | null
  isOverdue: boolean
}

/**
 * 里程碑时间线响应
 */
export interface WeddingTimelineResponse {
  weddingDate: string | null
  daysUntilWedding: number | null
  items: WeddingTimelineItem[]
}
