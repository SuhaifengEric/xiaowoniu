/**
 * 运动类型
 */
export enum ActivityType {
  PILATES = 'pilates',
  GYM_SLOPE = 'gym_slope',
  OTHER = 'other',
}

/**
 * 时段（早晚）
 */
export enum TimeOfDay {
  MORNING = 'morning',
  EVENING = 'evening',
}

/**
 * 消费类别
 */
export enum ExpenseCategory {
  FOOD = 'food',
  TRANSPORT = 'transport',
  SHOPPING = 'shopping',
  ENTERTAINMENT = 'entertainment',
  HEALTH = 'health',
  OTHER = 'other',
}

/**
 * 支付方式
 */
export enum PaymentMethod {
  CASH = 'cash',
  ALIPAY = 'alipay',
  WECHAT = 'wechat',
  CARD = 'card',
  OTHER = 'other',
}

/**
 * 备婚任务类别
 */
export enum WeddingTaskCategory {
  VENUE = 'venue',
  PHOTO = 'photo',
  INVITATION = 'invitation',
  DRESS = 'dress',
  MAKEUP = 'makeup',
  HONEYMOON = 'honeymoon',
  OTHER = 'other',
}

/**
 * 任务状态
 */
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * 支付状态
 */
export enum PaidStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
}
