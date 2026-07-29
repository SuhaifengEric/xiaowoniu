import {
  ActivityType,
  TimeOfDay,
  ExpenseCategory,
  PaymentMethod,
  WeddingTaskCategory,
  TaskStatus,
  PaidStatus,
} from './enums'

/**
 * 运动类型中文标签
 */
export const ActivityTypeLabels: Record<ActivityType, string> = {
  [ActivityType.PILATES]: '普拉提',
  [ActivityType.GYM_SLOPE]: '爬坡机',
  [ActivityType.OTHER]: '其他运动',
}

/**
 * 时段中文标签
 */
export const TimeOfDayLabels: Record<TimeOfDay, string> = {
  [TimeOfDay.MORNING]: '早上',
  [TimeOfDay.EVENING]: '晚上',
}

/**
 * 消费类别中文标签
 */
export const ExpenseCategoryLabels: Record<ExpenseCategory, string> = {
  [ExpenseCategory.FOOD]: '餐饮',
  [ExpenseCategory.TRANSPORT]: '交通',
  [ExpenseCategory.SHOPPING]: '购物',
  [ExpenseCategory.ENTERTAINMENT]: '娱乐',
  [ExpenseCategory.HEALTH]: '健康',
  [ExpenseCategory.OTHER]: '其他',
}

/**
 * 支付方式中文标签
 */
export const PaymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: '现金',
  [PaymentMethod.ALIPAY]: '支付宝',
  [PaymentMethod.WECHAT]: '微信支付',
  [PaymentMethod.CARD]: '银行卡',
  [PaymentMethod.OTHER]: '其他',
}

/**
 * 备婚任务类别中文标签
 */
export const WeddingTaskCategoryLabels: Record<WeddingTaskCategory, string> = {
  [WeddingTaskCategory.VENUE]: '场地',
  [WeddingTaskCategory.PHOTO]: '婚纱照',
  [WeddingTaskCategory.INVITATION]: '请柬',
  [WeddingTaskCategory.DRESS]: '礼服',
  [WeddingTaskCategory.MAKEUP]: '化妆',
  [WeddingTaskCategory.HONEYMOON]: '蜜月',
  [WeddingTaskCategory.OTHER]: '其他',
}

/**
 * 任务状态中文标签
 */
export const TaskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: '待办',
  [TaskStatus.IN_PROGRESS]: '进行中',
  [TaskStatus.COMPLETED]: '已完成',
  [TaskStatus.CANCELLED]: '已取消',
}

/**
 * 支付状态中文标签
 */
export const PaidStatusLabels: Record<PaidStatus, string> = {
  [PaidStatus.UNPAID]: '未支付',
  [PaidStatus.PARTIAL]: '部分支付',
  [PaidStatus.PAID]: '已支付',
}
