import type {
  ActionOwnerRole,
  AgreementStatus,
  EngagementMode,
  MarriageNodeKey,
  MarriageOrder,
  MarriageRecorderRole,
  PaidStatus,
  TaskStatus,
  VisitOrder,
  WeddingTaskCategory,
} from '@xiaowoniu/shared'

const ActionOwnerRoleLabels: Record<ActionOwnerRole, string> = { male: '男方', female: '女方', both: '双方', family: '家庭' }
const AgreementStatusLabels: Record<AgreementStatus, string> = { not_discussed: '尚未讨论', discussing: '讨论中', agreed: '已达成共识', needs_discussion: '需再沟通' }
const EngagementModeLabels: Record<EngagementMode, string> = { adopt: '采用订婚', skip: '跳过订婚', undecided: '暂不决定' }
const MarriageNodeKeyLabels: Record<MarriageNodeKey, string> = {
  intention: '确认以婚姻为目标', male_visit: '男方上门见女方家长', female_visit: '女方上门见男方家长', parents_meeting: '双方父母正式见面',
  agreement: '确认婚姻基本共识', engagement: '订婚与婚姻约定', registration: '依法办理结婚登记', wedding: '婚礼筹备与婚礼',
}
const MarriageOrderLabels: Record<MarriageOrder, string> = { registration_first: '先领证，后办婚礼', wedding_first: '先办婚礼，后领证', same_or_near: '同日或临近完成' }
const MarriageRecorderRoleLabels: Record<MarriageRecorderRole, string> = { male: '男方视角', female: '女方视角', record_keeper: '记录人视角' }
const VisitOrderLabels: Record<VisitOrder, string> = { male_first: '男方先上门', female_first: '女方先上门' }
export const engagementModeLabels = EngagementModeLabels
export const marriageOrderLabels = MarriageOrderLabels
export const recorderRoleLabels = MarriageRecorderRoleLabels
export const visitOrderLabels = VisitOrderLabels

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

export const marriageNodeOptions: Array<{ value: MarriageNodeKey; label: string }> = Object.entries(MarriageNodeKeyLabels).map(([value, label]) => ({ value: value as MarriageNodeKey, label }))

export const actionOwnerOptions: Array<{ value: ActionOwnerRole; label: string }> = Object.entries(ActionOwnerRoleLabels).map(([value, label]) => ({ value: value as ActionOwnerRole, label }))

export const recorderRoleOptions: Array<{ value: MarriageRecorderRole; label: string }> = Object.entries(MarriageRecorderRoleLabels).map(([value, label]) => ({ value: value as MarriageRecorderRole, label }))

export const visitOrderOptions: Array<{ value: VisitOrder; label: string }> = Object.entries(VisitOrderLabels).map(([value, label]) => ({ value: value as VisitOrder, label }))

export const marriageOrderOptions: Array<{ value: MarriageOrder; label: string }> = Object.entries(MarriageOrderLabels).map(([value, label]) => ({ value: value as MarriageOrder, label }))

export const engagementModeOptions: Array<{ value: EngagementMode; label: string }> = Object.entries(EngagementModeLabels).map(([value, label]) => ({ value: value as EngagementMode, label }))

export const agreementStatusOptions: Array<{ value: AgreementStatus; label: string }> = Object.entries(AgreementStatusLabels).map(([value, label]) => ({ value: value as AgreementStatus, label }))

export const marriageNodeKeyLabels: Record<MarriageNodeKey, string> = {
  intention: '确认以婚姻为目标',
  male_visit: '男方上门见女方家长',
  female_visit: '女方上门见男方家长',
  parents_meeting: '双方父母正式见面',
  agreement: '确认婚姻基本共识',
  engagement: '订婚与婚姻约定',
  registration: '依法办理结婚登记',
  wedding: '婚礼筹备与婚礼',
}

export const marriageNodeStatusLabels: Record<string, string> = {
  not_started: '未开始',
  scheduled: '已安排',
  in_progress: '进行中',
  completed: '已完成',
  paused: '暂缓',
  skipped: '已跳过',
}
