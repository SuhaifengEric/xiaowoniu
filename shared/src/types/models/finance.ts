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
  /** 由存入记录聚合得到，只读，不是计划编辑接口的写入字段。 */
  currentAmount: number
  targetDate: string
  depositCount: number
  progressPercentage: number
  remainingAmount: number
  isCompleted: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 存入记录来源。
 * legacy_import 表示由旧 SavingPlan.currentAmount 回填而来。
 */
export type SavingDepositSource = 'manual' | 'legacy_import'

/**
 * 一次实际存入记录响应。
 */
export interface SavingDepositResponse {
  id: string
  savingPlanId: string
  amount: number
  date: string | null
  notes: string | null
  source: SavingDepositSource
  createdAt: string
  updatedAt: string
}
