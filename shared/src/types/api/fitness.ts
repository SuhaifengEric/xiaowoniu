import type { ActivityType, TimeOfDay } from '../../constants/enums'

/**
 * 创建健身打卡请求
 */
export interface CreateCheckinRequest {
  date: string // YYYY-MM-DD
  activityType: ActivityType
  durationMinutes: number
  notes?: string
}

/**
 * 创建体重记录请求
 */
export interface CreateWeightRecordRequest {
  date: string // YYYY-MM-DD
  timeOfDay: TimeOfDay
  weightKg: number
  notes?: string
}

/**
 * 创建/更新健身目标请求
 */
export interface UpsertGoalRequest {
  targetWeightKg?: number
  weeklyWorkoutTarget: number
  startDate: string // YYYY-MM-DD
  targetDate?: string // YYYY-MM-DD
}

/**
 * 健身统计响应
 */
export interface FitnessStatsResponse {
  currentWeek: {
    checkinsCount: number
    totalMinutes: number
    goalCompletion: number // 0-100
  }
  currentMonth: {
    checkinsCount: number
    totalMinutes: number
    averagePerWeek: number
  }
  weightTrend: {
    current: number | null
    previous: number | null
    change: number | null
  }
}

/**
 * 查询参数
 */
export interface FitnessQueryParams {
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}
