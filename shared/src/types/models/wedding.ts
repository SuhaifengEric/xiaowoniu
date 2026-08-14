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

/**
 * 备婚任务响应
 */
export interface WeddingTaskResponse {
  id: string
  userId: string
  taskName: string
  category: WeddingTaskCategory
  plannedDate: string | null
  completedDate: string | null
  status: TaskStatus
  priority: number
  notes: string | null
  processId?: string | null
  stageKey?: MarriageNodeKey | null
  ownerRole?: ActionOwnerRole
  completionCriteria?: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 花费关联任务的轻量引用
 */
export interface WeddingExpenseTaskReference {
  id: string
  taskName: string
}

/**
 * 备婚花费响应
 */
export interface WeddingExpenseResponse {
  id: string
  userId: string
  taskId: string | null
  task: WeddingExpenseTaskReference | null
  date: string
  itemName: string
  category: WeddingTaskCategory
  plannedAmount: number
  actualAmount: number
  paidStatus: PaidStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 备婚预算响应
 */
export interface WeddingBudgetResponse {
  id: string
  totalBudget: number
  weddingDate: string
  createdAt: string
  updatedAt: string
}

export interface MarriageNodeResponse {
  id: string
  processId: string
  nodeKey: MarriageNodeKey
  status: MarriageNodeStatus
  plannedDate: string | null
  actualDate: string | null
  participants: string | null
  conclusion: string | null
  disagreements: string | null
  nextStep: string | null
  notes: string | null
  skipReason: string | null
  backfilled: boolean
  recordSource: RecordSource
  actionItemCount: number
  isOverdue: boolean
  createdAt: string
  updatedAt: string
}

export interface MarriageNodeHistoryResponse {
  id: string
  nodeId: string
  eventType: string
  fromStatus: MarriageNodeStatus | null
  toStatus: MarriageNodeStatus | null
  fromPlannedDate: string | null
  toPlannedDate: string | null
  fromActualDate: string | null
  toActualDate: string | null
  reason: string | null
  createdAt: string
}

export interface AgreementTopicResponse {
  id: string
  processId: string
  title: string
  status: AgreementStatus
  sortOrder: number
  notes: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface MarriageWarning {
  code: string
  level: 'info' | 'warning' | 'risk'
  message: string
  nodeKey?: MarriageNodeKey
  agreementId?: string
}

export interface MarriageProcessProgress {
  completed: number
  total: number
  percentage: number
}

export interface MarriageProcessResponse {
  id: string
  recorderRole: MarriageRecorderRole
  visitOrder: VisitOrder
  marriageOrder: MarriageOrder
  engagementMode: EngagementMode
  nodes: MarriageNodeResponse[]
  agreements: AgreementTopicResponse[]
  currentStage: MarriageNodeKey | null
  recommendedNext: MarriageNodeKey | null
  outOfOrder: boolean
  progress: MarriageProcessProgress
  warnings: MarriageWarning[]
  createdAt: string
  updatedAt: string
}

export interface MarriageOverviewSummary {
  processId: string
  currentStage: MarriageNodeKey | null
  recommendedNext: MarriageNodeKey | null
  progress: MarriageProcessProgress
  warnings: MarriageWarning[]
  registrationDate: string | null
  weddingDate: string | null
  registrationCompleted: boolean
  weddingCompleted: boolean
  marriageStageCompleted: boolean
  visitOrder: VisitOrder
  marriageOrder: MarriageOrder
  engagementMode: EngagementMode
}

export interface WeddingTimelineNodeItem {
  nodeId: string
  nodeKey: MarriageNodeKey
  nodeName: string
  status: MarriageNodeStatus
  plannedDate: string | null
  actualDate: string | null
  isOverdue: boolean
  backfilled: boolean
}
