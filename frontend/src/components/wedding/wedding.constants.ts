import type { PaidStatus, TaskStatus, WeddingTaskCategory } from '@xiaowoniu/shared'

export const weddingCategoryOptions: Array<{ value: WeddingTaskCategory; label: string }> = [
  { value: 'venue' as WeddingTaskCategory, label: '场地' },
  { value: 'photo' as WeddingTaskCategory, label: '婚纱照' },
  { value: 'invitation' as WeddingTaskCategory, label: '请柬' },
  { value: 'dress' as WeddingTaskCategory, label: '礼服' },
  { value: 'makeup' as WeddingTaskCategory, label: '化妆' },
  { value: 'honeymoon' as WeddingTaskCategory, label: '蜜月' },
  { value: 'other' as WeddingTaskCategory, label: '其他' },
]

export const weddingCategoryLabels: Record<string, string> = Object.fromEntries(
  weddingCategoryOptions.map(({ value, label }) => [value, label]),
)

export const taskStatusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: 'pending' as TaskStatus, label: '待办' },
  { value: 'in_progress' as TaskStatus, label: '进行中' },
  { value: 'completed' as TaskStatus, label: '已完成' },
  { value: 'cancelled' as TaskStatus, label: '已取消' },
]

export const taskStatusLabels: Record<string, string> = Object.fromEntries(
  taskStatusOptions.map(({ value, label }) => [value, label]),
)

export const paidStatusOptions: Array<{ value: PaidStatus; label: string }> = [
  { value: 'unpaid' as PaidStatus, label: '未支付' },
  { value: 'partial' as PaidStatus, label: '部分支付' },
  { value: 'paid' as PaidStatus, label: '已支付' },
]

export const paidStatusLabels: Record<string, string> = Object.fromEntries(
  paidStatusOptions.map(({ value, label }) => [value, label]),
)

export const priorityOptions: Array<{ value: number; label: string }> = [
  { value: 5, label: '最高（5）' },
  { value: 4, label: '高（4）' },
  { value: 3, label: '中（3）' },
  { value: 2, label: '低（2）' },
  { value: 1, label: '最低（1）' },
]
