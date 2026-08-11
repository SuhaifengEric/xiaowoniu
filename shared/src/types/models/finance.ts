import type { ExpenseCategory, PaymentMethod } from '../../constants/enums'

/**
 * 消费记录响应
 */
export interface ExpenseResponse {
  id: string
  userId: string
  date: string
  amount: number
  category: ExpenseCategory
  paymentMethod: PaymentMethod
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 月度预算响应
 */
export interface MonthlyBudgetResponse {
  id: string
  month: string // YYYY-MM
  amount: number
  createdAt: string
  updatedAt: string
}

/**
 * 储蓄计划响应
 */
export interface SavingPlanResponse {
  id: string
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  progressPercentage: number
  remainingAmount: number
  isCompleted: boolean
  createdAt: string
  updatedAt: string
}
