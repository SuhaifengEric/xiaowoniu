import type { PaidStatus, TaskStatus, WeddingTaskCategory } from '../../constants/enums'

/**
 * 备婚任务响应
 */
export interface WeddingTaskResponse {
  id: string
  userId: string
  taskName: string
  category: WeddingTaskCategory
  plannedDate: string | null
  completedDate: string | null
  status: TaskStatus
  priority: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 花费关联任务的轻量引用
 */
export interface WeddingExpenseTaskReference {
  id: string
  taskName: string
}

/**
 * 备婚花费响应
 */
export interface WeddingExpenseResponse {
  id: string
  userId: string
  taskId: string | null
  task: WeddingExpenseTaskReference | null
  date: string
  itemName: string
  category: WeddingTaskCategory
  plannedAmount: number
  actualAmount: number
  paidStatus: PaidStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 备婚预算响应
 */
export interface WeddingBudgetResponse {
  id: string
  totalBudget: number
  weddingDate: string
  createdAt: string
  updatedAt: string
}
