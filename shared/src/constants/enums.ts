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

/**
 * 嫁嫁嫁婚姻进程节点
 */
export enum MarriageNodeKey {
  INTENTION = 'intention',
  MALE_VISIT = 'male_visit',
  FEMALE_VISIT = 'female_visit',
  PARENTS_MEETING = 'parents_meeting',
  AGREEMENT = 'agreement',
  ENGAGEMENT = 'engagement',
  REGISTRATION = 'registration',
  WEDDING = 'wedding',
}

/**
 * 婚姻进程节点状态
 */
export enum MarriageNodeStatus {
  NOT_STARTED = 'not_started',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  SKIPPED = 'skipped',
}

/**
 * 进程记录人视角，不代表决策权
 */
export enum MarriageRecorderRole {
  MALE = 'male',
  FEMALE = 'female',
  RECORD_KEEPER = 'record_keeper',
}

/**
 * 两次上门的计划顺序
 */
export enum VisitOrder {
  MALE_FIRST = 'male_first',
  FEMALE_FIRST = 'female_first',
}

/**
 * 领证与婚礼的计划顺序
 */
export enum MarriageOrder {
  REGISTRATION_FIRST = 'registration_first',
  WEDDING_FIRST = 'wedding_first',
  SAME_OR_NEAR = 'same_or_near',
}

/**
 * 订婚节点选择
 */
export enum EngagementMode {
  ADOPT = 'adopt',
  SKIP = 'skip',
  UNDECIDED = 'undecided',
}

/**
 * 婚姻共识议题状态
 */
export enum AgreementStatus {
  NOT_DISCUSSED = 'not_discussed',
  DISCUSSING = 'discussing',
  AGREED = 'agreed',
  NEEDS_DISCUSSION = 'needs_discussion',
}

/**
 * 阶段行动项负责人
 */
export enum ActionOwnerRole {
  MALE = 'male',
  FEMALE = 'female',
  BOTH = 'both',
  FAMILY = 'family',
}

/**
 * 节点记录来源
 */
export enum RecordSource {
  DIRECT = 'direct',
  BACKFILLED = 'backfilled',
}
