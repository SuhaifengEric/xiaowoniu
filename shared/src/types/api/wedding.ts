import type {
  ActionOwnerRole,
  AgreementStatus,
  EngagementMode,
  MarriageNodeKey,
  MarriageNodeStatus,
  MarriageOrder,
  MarriageRecorderRole,
  PaidStatus,
  RecordSource,
  TaskStatus,
  VisitOrder,
  WeddingTaskCategory,
} from '../../constants/enums'
import type {
  AgreementTopicResponse,
  MarriageNodeHistoryResponse,
  MarriageNodeResponse,
  MarriageOverviewSummary,
  MarriageProcessResponse,
  WeddingBudgetResponse,
  WeddingTimelineNodeItem,
} from '../models/wedding'

/**
 * 创建备婚任务请求
 */
export interface CreateWeddingTaskRequest {
  taskName: string
  /** 未传时仅新建阶段行动项默认使用 other；旧接口行为保持可用。 */
  category?: WeddingTaskCategory
  plannedDate?: string | null
  status?: TaskStatus
  priority?: number
  notes?: string | null
  processId?: string | null
  stageKey?: MarriageNodeKey
  ownerRole?: ActionOwnerRole
  completionCriteria?: string | null
}

/**
 * 更新备婚任务请求（字段缺省表示不修改）
 */
export interface UpdateWeddingTaskRequest {
  taskName?: string
  category?: WeddingTaskCategory
  plannedDate?: string | null
  status?: TaskStatus
  priority?: number
  notes?: string | null
  processId?: string | null
  stageKey?: MarriageNodeKey
  ownerRole?: ActionOwnerRole
  completionCriteria?: string | null
}

/**
 * 备婚任务查询参数
 */
export interface WeddingTaskQueryParams {
  status?: TaskStatus
  category?: WeddingTaskCategory
  limit?: number
  offset?: number
  processId?: string
  stageKey?: MarriageNodeKey
}

/**
 * 创建备婚花费请求
 */
export interface CreateWeddingExpenseRequest {
  taskId?: string | null
  date: string
  itemName: string
  category: WeddingTaskCategory
  plannedAmount: number
  actualAmount: number
  paidStatus: PaidStatus
  notes?: string | null
}

/**
 * 更新备婚花费请求（字段缺省表示不修改，null 表示清空/解除关联）
 */
export interface UpdateWeddingExpenseRequest {
  taskId?: string | null
  date?: string
  itemName?: string
  category?: WeddingTaskCategory
  plannedAmount?: number
  actualAmount?: number
  paidStatus?: PaidStatus
  notes?: string | null
}

/**
 * 备婚花费查询参数
 */
export interface WeddingExpenseQueryParams {
  startDate?: string
  endDate?: string
  category?: WeddingTaskCategory
  paidStatus?: PaidStatus
  limit?: number
  offset?: number
}

/**
 * 幂等设置备婚预算请求（总预算与婚礼日期均必填）
 */
export interface UpsertWeddingBudgetRequest {
  totalBudget: number
  weddingDate: string
}

/**
 * 备婚类别统计汇总
 */
export interface WeddingCategorySummary {
  category: WeddingTaskCategory
  plannedAmount: number
  actualAmount: number
  expenseCount: number
  actualPercentage: number
}

/**
 * 备婚任务数量统计
 */
export interface WeddingTaskCounts {
  pending: number
  inProgress: number
  completed: number
  cancelled: number
  activeTotal: number
  completionPercentage: number
}

/**
 * 备婚概览响应
 */
export interface WeddingOverviewResponse {
  budget: WeddingBudgetResponse | null
  plannedExpenseTotal: number
  actualExpenseTotal: number
  expenseCount: number
  remainingBudget: number | null
  budgetUsedPercentage: number | null
  plannedBudgetPercentage: number | null
  actualVsPlannedPercentage: number | null
  daysUntilWedding: number | null
  taskCounts: WeddingTaskCounts
  categoryBreakdown: WeddingCategorySummary[]
  marriage?: MarriageOverviewSummary | null
}

/**
 * 里程碑时间线条目
 */
export interface WeddingTimelineItem {
  taskId: string
  taskName: string
  category: WeddingTaskCategory
  status: TaskStatus
  priority: number
  plannedDate: string
  completedDate: string | null
  isOverdue: boolean
}

/**
 * 里程碑时间线响应
 */
export interface WeddingTimelineResponse {
  weddingDate: string | null
  daysUntilWedding: number | null
  items: WeddingTimelineItem[]
  marriageNodes?: WeddingTimelineNodeItem[]
}

export interface PutMarriageProcessRequest {
  recorderRole: MarriageRecorderRole
  visitOrder?: VisitOrder
  marriageOrder?: MarriageOrder
  engagementMode?: EngagementMode
}

export interface UpdateMarriageSettingsRequest {
  recorderRole?: MarriageRecorderRole
  visitOrder?: VisitOrder
  marriageOrder?: MarriageOrder
  engagementMode?: EngagementMode
}

export interface UpdateMarriageNodeRequest {
  status?: MarriageNodeStatus
  plannedDate?: string | null
  actualDate?: string | null
  participants?: string | null
  conclusion?: string | null
  disagreements?: string | null
  nextStep?: string | null
  notes?: string | null
  skipReason?: string | null
  backfilled?: boolean
  reason?: string | null
}

export interface CreateAgreementTopicRequest {
  title: string
  status?: AgreementStatus
  notes?: string | null
  sortOrder?: number
}

export interface UpdateAgreementTopicRequest {
  title?: string
  status?: AgreementStatus
  notes?: string | null
  sortOrder?: number
}

export interface MarriageNodeHistoryResult {
  node: MarriageNodeResponse
  history: MarriageNodeHistoryResponse[]
}

export interface MarriageProcessResult {
  process: MarriageProcessResponse | null
}

export type MarriageAgreementResult = AgreementTopicResponse
