import type { ExpenseCategory, PaymentMethod } from '../../constants/enums'
import type { MonthlyBudgetResponse } from '../models/finance'

/**
 * 创建消费记录请求
 */
export interface CreateExpenseRequest {
  date: string
  amount: number
  category: ExpenseCategory
  paymentMethod: PaymentMethod
  notes?: string
}

/**
 * 更新消费记录请求
 */
export interface UpdateExpenseRequest {
  date?: string
  amount?: number
  category?: ExpenseCategory
  paymentMethod?: PaymentMethod
  notes?: string | null
}

/**
 * 消费记录查询参数
 */
export interface FinanceExpenseQueryParams {
  startDate?: string
  endDate?: string
  category?: ExpenseCategory
  paymentMethod?: PaymentMethod
  limit?: number
  offset?: number
}

/**
 * 创建月度预算请求
 */
export interface CreateBudgetRequest {
  month: string
  amount: number
}

/**
 * 财务月份查询参数
 */
export interface FinanceMonthQuery {
  month: string
}

/**
 * 创建储蓄计划请求
 */
export interface CreateSavingPlanRequest {
  name: string
  targetAmount: number
  currentAmount?: number
  targetDate: string
}

/**
 * 更新储蓄计划请求
 */
export interface UpdateSavingPlanRequest {
  name?: string
  targetAmount?: number
  currentAmount?: number
  targetDate?: string
}

/**
 * 消费类别汇总
 */
export interface FinanceCategorySummary {
  category: ExpenseCategory
  amount: number
  percentage: number
  count: number
}

/**
 * 每日消费汇总
 */
export interface FinanceDailySummary {
  date: string
  amount: number
  count: number
}

/**
 * 财务汇总响应
 */
export interface FinanceSummaryResponse {
  month: string
  totalExpense: number
  expenseCount: number
  budget: (MonthlyBudgetResponse & {
    spent: number
    remaining: number
    usedPercentage: number
  }) | null
  categoryBreakdown: FinanceCategorySummary[]
  dailyBreakdown: FinanceDailySummary[]
}
