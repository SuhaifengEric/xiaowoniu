import {
  ActivityType,
  TimeOfDay,
  ExpenseCategory,
  PaymentMethod,
  WeddingTaskCategory,
  TaskStatus,
  PaidStatus,
  MarriageNodeKey,
  MarriageNodeStatus,
  MarriageRecorderRole,
  VisitOrder,
  MarriageOrder,
  EngagementMode,
  AgreementStatus,
  ActionOwnerRole,
  RecordSource,
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

export const MarriageNodeKeyLabels: Record<MarriageNodeKey, string> = {
  [MarriageNodeKey.INTENTION]: '确认以婚姻为目标',
  [MarriageNodeKey.MALE_VISIT]: '男方上门见女方家长',
  [MarriageNodeKey.FEMALE_VISIT]: '女方上门见男方家长',
  [MarriageNodeKey.PARENTS_MEETING]: '双方父母正式见面',
  [MarriageNodeKey.AGREEMENT]: '确认婚姻基本共识',
  [MarriageNodeKey.ENGAGEMENT]: '订婚与婚姻约定',
  [MarriageNodeKey.REGISTRATION]: '依法办理结婚登记',
  [MarriageNodeKey.WEDDING]: '婚礼筹备与婚礼',
}

export const MarriageNodeStatusLabels: Record<MarriageNodeStatus, string> = {
  [MarriageNodeStatus.NOT_STARTED]: '未开始',
  [MarriageNodeStatus.SCHEDULED]: '已安排',
  [MarriageNodeStatus.IN_PROGRESS]: '进行中',
  [MarriageNodeStatus.COMPLETED]: '已完成',
  [MarriageNodeStatus.PAUSED]: '暂缓',
  [MarriageNodeStatus.SKIPPED]: '已跳过',
}

export const MarriageRecorderRoleLabels: Record<MarriageRecorderRole, string> = {
  [MarriageRecorderRole.MALE]: '男方视角',
  [MarriageRecorderRole.FEMALE]: '女方视角',
  [MarriageRecorderRole.RECORD_KEEPER]: '记录人视角',
}

export const VisitOrderLabels: Record<VisitOrder, string> = {
  [VisitOrder.MALE_FIRST]: '男方先上门',
  [VisitOrder.FEMALE_FIRST]: '女方先上门',
}

export const MarriageOrderLabels: Record<MarriageOrder, string> = {
  [MarriageOrder.REGISTRATION_FIRST]: '先领证，后办婚礼',
  [MarriageOrder.WEDDING_FIRST]: '先办婚礼，后领证',
  [MarriageOrder.SAME_OR_NEAR]: '同日或临近完成',
}

export const EngagementModeLabels: Record<EngagementMode, string> = {
  [EngagementMode.ADOPT]: '采用订婚',
  [EngagementMode.SKIP]: '跳过订婚',
  [EngagementMode.UNDECIDED]: '暂不决定',
}

export const AgreementStatusLabels: Record<AgreementStatus, string> = {
  [AgreementStatus.NOT_DISCUSSED]: '尚未讨论',
  [AgreementStatus.DISCUSSING]: '讨论中',
  [AgreementStatus.AGREED]: '已达成共识',
  [AgreementStatus.NEEDS_DISCUSSION]: '需再沟通',
}

export const ActionOwnerRoleLabels: Record<ActionOwnerRole, string> = {
  [ActionOwnerRole.MALE]: '男方',
  [ActionOwnerRole.FEMALE]: '女方',
  [ActionOwnerRole.BOTH]: '双方',
  [ActionOwnerRole.FAMILY]: '家庭',
}

export const RecordSourceLabels: Record<RecordSource, string> = {
  [RecordSource.DIRECT]: '直接记录',
  [RecordSource.BACKFILLED]: '用户补录',
}
