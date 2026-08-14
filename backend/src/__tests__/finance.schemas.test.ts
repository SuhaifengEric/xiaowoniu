import { describe, expect, it } from 'vitest'
import {
  createBudgetSchema,
  createExpenseSchema,
  createSavingDepositSchema,
  createSavingPlanSchema,
  deleteSavingDepositSchema,
  emptySchema,
  expenseQuerySchema,
  idParamSchema,
  monthQuerySchema,
  savingDepositQuerySchema,
  updateExpenseRouteSchema,
  updateExpenseSchema,
  updateSavingDepositSchema,
  updateSavingPlanRouteSchema,
  updateSavingPlanSchema,
} from '../validation/finance.schemas'

const id = '00000000-0000-0000-0000-000000000001'

const expense = {
  date: '2026-07-30',
  amount: 12.34,
  category: 'food',
  paymentMethod: 'alipay',
  notes: '午餐',
}

const budget = {
  month: '2026-07',
  amount: 5000,
}

const savingPlan = {
  name: '旅行基金',
  targetAmount: 10000,
  targetDate: '2027-07-01',
}

const savingDeposit = {
  amount: 500,
  date: '2026-08-14',
  notes: '本周固定存入',
}

describe('finance validation schemas', () => {
  it('accepts valid expense, budget, saving plan, and saving deposit request bodies', () => {
    expect(createExpenseSchema.safeParse({ body: expense }).success).toBe(true)
    expect(createBudgetSchema.safeParse({ body: budget }).success).toBe(true)
    expect(createSavingPlanSchema.safeParse({ body: savingPlan }).success).toBe(true)
    expect(createSavingDepositSchema.safeParse({ params: { id }, body: savingDeposit }).success).toBe(true)
  })

  it('accepts complete validator envelopes with unrelated envelope keys', () => {
    const envelope = { body: expense, query: {}, params: {} }
    expect(createExpenseSchema.safeParse(envelope).success).toBe(true)
    expect(expenseQuerySchema.safeParse({ body: {}, query: {}, params: {} }).success).toBe(true)
    expect(emptySchema.safeParse({ body: {}, query: {}, params: {} }).success).toBe(true)
  })

  it('accepts expense amounts with two decimals including floating point-sensitive values', () => {
    for (const amount of [0.01, 0.07, 0.14, 1.11, 9999999999.99]) {
      expect(createExpenseSchema.safeParse({ body: { ...expense, amount } }).success).toBe(true)
    }
  })

  it('rejects zero, negative, overlarge, non-finite, and more-than-two-decimal expense amounts', () => {
    for (const amount of [0, -0.01, 10000000000, 1.001, 9999999999.980001, 1000000000.0000001, Infinity, NaN]) {
      expect(createExpenseSchema.safeParse({ body: { ...expense, amount } }).success).toBe(false)
    }
  })

  it('accepts zero budget and rejects negative or overlarge budgets', () => {
    expect(createBudgetSchema.safeParse({ body: { ...budget, amount: 0 } }).success).toBe(true)
    expect(createBudgetSchema.safeParse({ body: { ...budget, amount: -0.01 } }).success).toBe(false)
    expect(createBudgetSchema.safeParse({ body: { ...budget, amount: 10000000000 } }).success).toBe(false)
    expect(createBudgetSchema.safeParse({ body: { ...budget, amount: 1.001 } }).success).toBe(false)
  })

  it('rejects malformed dates and months while accepting valid boundaries', () => {
    expect(createExpenseSchema.safeParse({ body: { ...expense, date: '2026-02-30' } }).success).toBe(false)
    expect(createExpenseSchema.safeParse({ body: { ...expense, date: '2026-7-30' } }).success).toBe(false)
    expect(createExpenseSchema.safeParse({ body: { ...expense, date: '2026-13-01' } }).success).toBe(false)
    expect(createBudgetSchema.safeParse({ body: { ...budget, month: '2026-00' } }).success).toBe(false)
    expect(createBudgetSchema.safeParse({ body: { ...budget, month: '2026-13' } }).success).toBe(false)
    expect(monthQuerySchema.safeParse({ query: { month: '2026-7' } }).success).toBe(false)
    expect(monthQuerySchema.safeParse({ query: { month: '2026-02' } }).success).toBe(true)
  })

  it('accepts complete validator envelopes for month queries', () => {
    expect(monthQuerySchema.safeParse({ body: {}, query: { month: '2026-07' }, params: {} }).success).toBe(true)
  })

  it('rejects invalid enums, blank names, and unknown inner fields', () => {
    expect(createExpenseSchema.safeParse({ body: { ...expense, category: 'invalid' } }).success).toBe(false)
    expect(createExpenseSchema.safeParse({ body: { ...expense, paymentMethod: 'invalid' } }).success).toBe(false)
    expect(createSavingPlanSchema.safeParse({ body: { ...savingPlan, name: '   ' } }).success).toBe(false)
    expect(createSavingPlanSchema.safeParse({ body: { ...savingPlan, name: ` ${'x'.repeat(100)} ` } }).success).toBe(true)
    expect(createSavingPlanSchema.safeParse({ body: { ...savingPlan, name: ` ${'x'.repeat(101)} ` } }).success).toBe(false)
    expect(createSavingPlanSchema.safeParse({ body: { ...savingPlan, name: 'x'.repeat(101) } }).success).toBe(false)
    expect(createExpenseSchema.safeParse({ body: { ...expense, injected: true } }).success).toBe(false)
    expect(expenseQuerySchema.safeParse({ query: { category: 'food', injected: true } }).success).toBe(false)
  })

  it('enforces notes boundaries and update-only null notes', () => {
    expect(createExpenseSchema.safeParse({ body: { ...expense, notes: 'x'.repeat(2000) } }).success).toBe(true)
    expect(createExpenseSchema.safeParse({ body: { ...expense, notes: 'x'.repeat(2001) } }).success).toBe(false)
    expect(createExpenseSchema.safeParse({ body: { ...expense, notes: null } }).success).toBe(false)
    expect(updateExpenseSchema.safeParse({ body: { notes: null } }).success).toBe(true)
    expect(updateExpenseSchema.safeParse({ body: { notes: 'x'.repeat(2001) } }).success).toBe(false)
  })

  it('requires at least one field in expense, saving plan, and saving deposit patches', () => {
    expect(updateExpenseSchema.safeParse({ body: {} }).success).toBe(false)
    expect(updateSavingPlanSchema.safeParse({ body: {} }).success).toBe(false)
    expect(updateSavingDepositSchema.safeParse({ params: { id, depositId: 'deposit-1' }, body: {} }).success).toBe(false)
    expect(updateExpenseRouteSchema.safeParse({ params: { id }, body: { amount: 1 } }).success).toBe(true)
    expect(updateSavingPlanRouteSchema.safeParse({ params: { id }, body: { name: 'new name' } }).success).toBe(true)
    expect(updateSavingDepositSchema.safeParse({ params: { id, depositId: 'deposit-1' }, body: { amount: 2 } }).success).toBe(true)
  })

  it('validates IDs and saving plan amount boundaries without enforcing cross-field relations', () => {
    expect(idParamSchema.safeParse({ params: { id } }).success).toBe(true)
    expect(idParamSchema.safeParse({ params: { id: '' } }).success).toBe(false)
    expect(createSavingPlanSchema.safeParse({ body: { ...savingPlan, targetAmount: 0.01 } }).success).toBe(true)
    expect(createSavingPlanSchema.safeParse({ body: { ...savingPlan, targetAmount: 0 } }).success).toBe(false)
    expect(createSavingPlanSchema.safeParse({ body: { ...savingPlan, currentAmount: 1 } }).success).toBe(false)
    expect(updateSavingPlanSchema.safeParse({ body: { currentAmount: 1 } }).success).toBe(false)
  })

  it('enforces saving deposit amount, date, notes, and strict parameter boundaries', () => {
    for (const amount of [0.01, 0.07, 0.14, 1.11, 9_999_999_999.99]) {
      expect(createSavingDepositSchema.safeParse({ params: { id }, body: { ...savingDeposit, amount } }).success).toBe(true)
    }
    for (const amount of [0, -0.01, 1.001, 10_000_000_000, Infinity, NaN]) {
      expect(createSavingDepositSchema.safeParse({ params: { id }, body: { ...savingDeposit, amount } }).success).toBe(false)
    }
    expect(createSavingDepositSchema.safeParse({ params: { id }, body: { ...savingDeposit, date: '2026-02-30' } }).success).toBe(false)
    expect(createSavingDepositSchema.safeParse({ params: { id }, body: { ...savingDeposit, notes: 'x'.repeat(2001) } }).success).toBe(false)
    expect(createSavingDepositSchema.safeParse({ params: { id }, body: { ...savingDeposit, injected: true } }).success).toBe(false)
    expect(updateSavingDepositSchema.safeParse({ params: { id, depositId: '' }, body: { amount: 1 } }).success).toBe(false)
    expect(updateSavingDepositSchema.safeParse({ params: { id, depositId: 'deposit-1' }, body: { date: null } }).success).toBe(false)
    expect(updateSavingDepositSchema.safeParse({ params: { id, depositId: 'deposit-1' }, body: { notes: null } }).success).toBe(true)
    expect(deleteSavingDepositSchema.safeParse({ params: { id, depositId: 'deposit-1' } }).success).toBe(true)
  })

  it('supports saving deposit pagination and rejects unknown query fields', () => {
    expect(savingDepositQuerySchema.safeParse({ params: { id }, query: { limit: '50', offset: '0' } }).success).toBe(true)
    expect(savingDepositQuerySchema.safeParse({ params: { id }, query: { limit: '0' } }).success).toBe(false)
    expect(savingDepositQuerySchema.safeParse({ params: { id }, query: { limit: '101' } }).success).toBe(false)
    expect(savingDepositQuerySchema.safeParse({ params: { id }, query: { offset: '-1' } }).success).toBe(false)
    expect(savingDepositQuerySchema.safeParse({ params: { id }, query: { injected: true } }).success).toBe(false)
  })

  it('supports expense filters and conservative nonnegative pagination', () => {
    expect(expenseQuerySchema.safeParse({ query: {
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      category: 'food',
      paymentMethod: 'alipay',
      limit: '100',
      offset: '0',
    } }).success).toBe(true)
    expect(expenseQuerySchema.safeParse({ query: { limit: '0' } }).success).toBe(false)
    expect(expenseQuerySchema.safeParse({ query: { limit: '101' } }).success).toBe(false)
    expect(expenseQuerySchema.safeParse({ query: { offset: '-1' } }).success).toBe(false)
    expect(expenseQuerySchema.safeParse({ query: { offset: '1000001' } }).success).toBe(false)
    expect(expenseQuerySchema.safeParse({ query: { limit: '1.5' } }).success).toBe(false)
  })

  it('requires strict empty body, query, and params for empty requests', () => {
    expect(emptySchema.safeParse({ body: { injected: true }, query: {}, params: {} }).success).toBe(false)
    expect(emptySchema.safeParse({ body: {}, query: { injected: true }, params: {} }).success).toBe(false)
    expect(emptySchema.safeParse({ body: {}, query: {}, params: { injected: true } }).success).toBe(false)
  })
})
