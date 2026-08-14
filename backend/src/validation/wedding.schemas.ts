import {
  ActionOwnerRole,
  AgreementStatus,
  EngagementMode,
  MarriageNodeKey,
  MarriageNodeStatus,
  MarriageOrder,
  MarriageRecorderRole,
  PaidStatus,
  TaskStatus,
  VisitOrder,
  WeddingTaskCategory,
} from '@xiaowoniu/shared'
import { z } from 'zod'

const uuidString = z.string().uuid('必须是有效的 UUID')

const strictDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}, '日期必须是有效的 YYYY-MM-DD')

const moneySchema = z.number().finite().min(0).max(9_999_999_999.99)
  .refine((value) => Math.round(value * 100) / 100 === value, '金额最多保留两位小数')

const trimmedString = (min: number, max: number, label: string) => z.string()
  .transform((value) => value.trim())
  .refine((value) => value.length >= min && value.length <= max, `${label} trim 后长度必须在 ${min} 到 ${max} 个字符之间`)

const optionalNullableNotes = z.string().trim().max(2000).nullable().optional()
  .transform((value) => (value === undefined ? undefined : value === '' || value === null ? null : value.trim()))

const taskName = trimmedString(1, 200, '任务名称')
const itemName = trimmedString(1, 200, '条目名称')

const priority = z.number().int().min(1).max(5)

const boundedInteger = (min: number, max: number) => z.string()
  .regex(/^\d+$/)
  .refine((value) => Number.isSafeInteger(Number(value)) && Number(value) >= min && Number(value) <= max)
  .transform(Number)

const paginationQuery = {
  limit: boundedInteger(1, 100).optional(),
  offset: boundedInteger(0, 1_000_000).optional(),
}

const atLeastOneField = (schema: z.ZodObject<z.ZodRawShape>) => schema.refine((value) => Object.keys(value).length > 0, {
  message: '至少提供一个可更新字段',
})

const createTaskBody = z.object({
  taskName,
  category: z.nativeEnum(WeddingTaskCategory).default(WeddingTaskCategory.OTHER),
  plannedDate: strictDateString.nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: priority.optional(),
  notes: optionalNullableNotes,
  processId: uuidString.nullable().optional(),
  stageKey: z.nativeEnum(MarriageNodeKey).optional(),
  ownerRole: z.nativeEnum(ActionOwnerRole).optional(),
  completionCriteria: z.string().trim().max(500).nullable().optional(),
}).strict()

const updateTaskBody = atLeastOneField(z.object({
  taskName: taskName.optional(),
  category: z.nativeEnum(WeddingTaskCategory).optional(),
  plannedDate: strictDateString.nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: priority.optional(),
  notes: optionalNullableNotes,
  processId: uuidString.nullable().optional(),
  stageKey: z.nativeEnum(MarriageNodeKey).optional(),
  ownerRole: z.nativeEnum(ActionOwnerRole).optional(),
  completionCriteria: z.string().trim().max(500).nullable().optional(),
}).strict())

const taskQuery = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  category: z.nativeEnum(WeddingTaskCategory).optional(),
  ...paginationQuery,
  processId: uuidString.optional(),
  stageKey: z.nativeEnum(MarriageNodeKey).optional(),
}).strict()

const createExpenseBody = z.object({
  taskId: uuidString.nullable().optional(),
  date: strictDateString,
  itemName,
  category: z.nativeEnum(WeddingTaskCategory),
  plannedAmount: moneySchema,
  actualAmount: moneySchema,
  paidStatus: z.nativeEnum(PaidStatus),
  notes: optionalNullableNotes,
}).strict()

const updateExpenseBody = atLeastOneField(z.object({
  taskId: uuidString.nullable().optional(),
  date: strictDateString.optional(),
  itemName: itemName.optional(),
  category: z.nativeEnum(WeddingTaskCategory).optional(),
  plannedAmount: moneySchema.optional(),
  actualAmount: moneySchema.optional(),
  paidStatus: z.nativeEnum(PaidStatus).optional(),
  notes: optionalNullableNotes,
}).strict())

const expenseQuery = z.object({
  startDate: strictDateString.optional(),
  endDate: strictDateString.optional(),
  category: z.nativeEnum(WeddingTaskCategory).optional(),
  paidStatus: z.nativeEnum(PaidStatus).optional(),
  ...paginationQuery,
}).strict().superRefine((value, ctx) => {
  if (value.startDate && value.endDate && value.startDate > value.endDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '开始日期不能晚于结束日期',
      path: ['endDate'],
    })
  }
})

const upsertBudgetBody = z.object({
  totalBudget: moneySchema,
  weddingDate: strictDateString,
}).strict()

const idParams = z.object({ id: uuidString }).strict()
const emptyRequestPart = z.object({}).strict()

export const weddingTaskQuerySchema = z.object({ query: taskQuery })

export const createWeddingTaskSchema = z.object({ body: createTaskBody })

export const updateWeddingTaskRouteSchema = z.object({
  params: idParams,
  body: updateTaskBody,
})

export const weddingExpenseQuerySchema = z.object({ query: expenseQuery })

export const createWeddingExpenseSchema = z.object({ body: createExpenseBody })

export const updateWeddingExpenseRouteSchema = z.object({
  params: idParams,
  body: updateExpenseBody,
})

export const upsertWeddingBudgetSchema = z.object({ body: upsertBudgetBody })

export const weddingIdParamSchema = z.object({ params: idParams })

export const weddingEmptySchema = z.object({
  body: emptyRequestPart,
  query: emptyRequestPart,
  params: emptyRequestPart,
})

const nodeText = (max: number) => z.string().trim().max(max).nullable().optional()

const processSettingsBody = z.object({
  recorderRole: z.nativeEnum(MarriageRecorderRole).optional(),
  visitOrder: z.nativeEnum(VisitOrder).optional(),
  marriageOrder: z.nativeEnum(MarriageOrder).optional(),
  engagementMode: z.nativeEnum(EngagementMode).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: '至少提供一个可更新字段' })

const processCreateBody = z.object({
  recorderRole: z.nativeEnum(MarriageRecorderRole),
  visitOrder: z.nativeEnum(VisitOrder).optional(),
  marriageOrder: z.nativeEnum(MarriageOrder).optional(),
  engagementMode: z.nativeEnum(EngagementMode).optional(),
}).strict()

const nodePatchBody = z.object({
  status: z.nativeEnum(MarriageNodeStatus).optional(),
  plannedDate: strictDateString.nullable().optional(),
  actualDate: strictDateString.nullable().optional(),
  participants: nodeText(500),
  conclusion: nodeText(5000),
  disagreements: nodeText(5000),
  nextStep: nodeText(5000),
  notes: nodeText(5000),
  skipReason: nodeText(500),
  backfilled: z.boolean().optional(),
  reason: z.string().trim().max(500).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: '至少提供一个可更新字段' })

const nodeKeyParams = z.object({ nodeKey: z.nativeEnum(MarriageNodeKey) }).strict()

const agreementCreateBody = z.object({
  title: trimmedString(1, 100, '议题标题'),
  status: z.nativeEnum(AgreementStatus).optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
}).strict()

const agreementPatchBody = z.object({
  title: trimmedString(1, 100, '议题标题').optional(),
  status: z.nativeEnum(AgreementStatus).optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: '至少提供一个可更新字段' })

export const getMarriageProcessSchema = weddingEmptySchema
export const putMarriageProcessSchema = z.object({ body: processCreateBody })
export const updateMarriageSettingsSchema = z.object({ body: processSettingsBody })
export const marriageNodeListSchema = weddingEmptySchema
export const updateMarriageNodeRouteSchema = z.object({ params: nodeKeyParams, body: nodePatchBody })
export const marriageNodeHistoryRouteSchema = z.object({ params: nodeKeyParams, body: emptyRequestPart, query: emptyRequestPart })
export const marriageAgreementListSchema = weddingEmptySchema
export const createMarriageAgreementSchema = z.object({ body: agreementCreateBody })
export const updateMarriageAgreementRouteSchema = z.object({ params: idParams, body: agreementPatchBody })
export const deleteMarriageAgreementRouteSchema = z.object({ params: idParams, body: emptyRequestPart, query: emptyRequestPart })
