import type { ActivityType, TimeOfDay } from '../../constants/enums'

/**
 * 健身打卡响应
 */
export interface FitnessCheckinResponse {
  id: string
  userId: string
  date: string
  activityType: ActivityType
  durationMinutes: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 体重记录响应
 */
export interface WeightRecordResponse {
  id: string
  userId: string
  date: string
  timeOfDay: TimeOfDay
  weightKg: number
  notes: string | null
  createdAt: string
}

/**
 * 健身目标响应
 */
export interface FitnessGoalResponse {
  id: string
  userId: string
  targetWeightKg: number | null
  weeklyWorkoutTarget: number
  startDate: string
  targetDate: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}
