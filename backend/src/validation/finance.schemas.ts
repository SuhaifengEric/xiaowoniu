import { ExpenseCategory, PaymentMethod } from '@xiaowoniu/shared'
import { z } from 'zod'

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}, '日期必须是有效的 YYYY-MM-DD')

const monthString = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, '月份必须是有效的 YYYY-MM')

const amount = (min: number, max: number) => z.number().finite().min(min).max(max)
  .refine((value) => {
    const scaled = value * 100
    return Math.abs(scaled - Math.round(scaled)) <= Number.EPSILON * Math.max(1, Math.abs(scaled))
  }, '金额最多保留两位小数')

const boundedInteger = (min: number, max: number) => z.string()
  .regex(/^\d+$/)
  .refine((value) => Number.isSafeInteger(Number(value)) && Number(value) >= min && Number(value) <= max)
  .transform(Number)

const name = z.string()
  .refine((value) => value.trim().length >= 1 && value.trim().length <= 100, '名称 trim 后长度必须在 1 到 100 个字符之间')

const expenseAmount = amount(0.01, 9_999_999_999.99)
const budgetAmount = amount(0, 9_999_999_999.99)
const savingTargetAmount = amount(0.01, 9_999_999_999.99)
const savingCurrentAmount = amount(0, 9_999_999_999.99)

const expenseQuery = z.object({
  startDate: dateString.optional(),
  endDate: dateString.optional(),
  category: z.nativeEnum(ExpenseCategory).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  limit: boundedInteger(1, 100).optional(),
  offset: boundedInteger(0, 1_000_000).optional(),
}).strict().refine(({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate, {
  message: '开始日期不能晚于结束日期',
  path: ['endDate'],
})

const updateExpenseBody = z.object({
  date: dateString.optional(),
  amount: expenseAmount.optional(),
  category: z.nativeEnum(ExpenseCategory).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  notes: z.string().max(2000).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: '至少提供一个可更新字段',
})

const updateSavingPlanBody = z.object({
  name: name.optional(),
  targetAmount: savingTargetAmount.optional(),
  currentAmount: savingCurrentAmount.optional(),
  targetDate: dateString.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: '至少提供一个可更新字段',
})

const idParams = z.object({ id: z.string().min(1) }).strict()
const emptyRequestPart = z.object({}).strict()

export const expenseQuerySchema = z.object({ query: expenseQuery })

export const createExpenseSchema = z.object({
  body: z.object({
    date: dateString,
    amount: expenseAmount,
    category: z.nativeEnum(ExpenseCategory),
    paymentMethod: z.nativeEnum(PaymentMethod),
    notes: z.string().max(2000).optional(),
  }).strict(),
})

export const updateExpenseSchema = z.object({ body: updateExpenseBody })

export const updateExpenseRouteSchema = z.object({
  params: idParams,
  body: updateExpenseBody,
})

export const monthQuerySchema = z.object({
  query: z.object({ month: monthString }).strict(),
})

export const createBudgetSchema = z.object({
  body: z.object({
    month: monthString,
    amount: budgetAmount,
  }).strict(),
})

export const createSavingPlanSchema = z.object({
  body: z.object({
    name,
    targetAmount: savingTargetAmount,
    currentAmount: savingCurrentAmount.optional(),
    targetDate: dateString,
  }).strict(),
})

export const updateSavingPlanSchema = z.object({ body: updateSavingPlanBody })

export const updateSavingPlanRouteSchema = z.object({
  params: idParams,
  body: updateSavingPlanBody,
})

export const idParamSchema = z.object({ params: idParams })

export const emptySchema = z.object({
  body: emptyRequestPart,
  query: emptyRequestPart,
  params: emptyRequestPart,
})
