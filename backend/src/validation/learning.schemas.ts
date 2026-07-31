import { z } from 'zod'

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}, '日期必须是有效的 YYYY-MM-DD')

const uuid = z.string().uuid()
const boundedInteger = (min: number, max: number) => z.string()
  .regex(/^\d+$/)
  .refine((value) => Number.isSafeInteger(Number(value)) && Number(value) >= min && Number(value) <= max)
  .transform(Number)

const name = z.string().trim().min(1).max(100)
const dateRange = z.object({
  examId: uuid.optional(),
  subjectId: uuid.optional(),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
  limit: boundedInteger(1, 100).optional(),
  offset: boundedInteger(0, 1_000_000).optional(),
}).strict().refine(({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate, {
  message: '开始日期不能晚于结束日期',
  path: ['endDate'],
})

export const idParamSchema = z.object({ params: z.object({ id: z.string().min(1) }).strict() }).strict()

export const createExamSchema = z.object({
  body: z.object({
    examName: name,
    examDate: dateString,
  }).strict(),
}).strict()

export const updateExamSchema = z.object({
  body: z.object({
    examName: name.optional(),
    examDate: dateString.optional(),
    isArchived: z.boolean().optional(),
  }).strict().refine((value) => Object.keys(value).length > 0, {
    message: '至少提供一个可更新字段',
  }),
}).strict()

export const createSubjectSchema = z.object({
  body: z.object({
    examId: uuid,
    subjectName: name,
    totalChapters: z.number().int().safe().min(1).max(10_000),
    targetCompletionDate: dateString.nullable().optional(),
  }).strict(),
}).strict()

export const updateSubjectSchema = z.object({
  body: z.object({
    subjectName: name.optional(),
    totalChapters: z.number().int().safe().min(1).max(10_000).optional(),
    targetCompletionDate: dateString.nullable().optional(),
  }).strict().refine((value) => Object.keys(value).length > 0, {
    message: '至少提供一个可更新字段',
  }),
}).strict()

export const createCheckinSchema = z.object({
  body: z.object({
    subjectId: uuid,
    date: dateString,
    completedChapters: z.array(z.number().int().positive().safe()).min(1).max(1000)
      .refine((chapters) => new Set(chapters).size === chapters.length, '章节编号不能重复'),
    studyHours: z.number().finite().min(0.01).max(24)
      .refine((value) => Number.isInteger(value * 100), '学习时长最多保留两位小数'),
    notes: z.string().max(2000).optional(),
  }).strict(),
}).strict()

export const learningQuerySchema = z.object({ query: dateRange }).strict()
export const progressQuerySchema = z.object({
  query: z.object({
    examId: uuid,
    startDate: dateString.optional(),
    endDate: dateString.optional(),
  }).strict().refine(({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate, {
    message: '开始日期不能晚于结束日期',
    path: ['endDate'],
  }),
}).strict()

export const emptySchema = z.object({}).strict()
