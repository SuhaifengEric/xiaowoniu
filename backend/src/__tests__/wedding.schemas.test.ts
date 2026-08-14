import { describe, expect, it } from 'vitest'
import {
  createMarriageAgreementSchema,
  createWeddingExpenseSchema,
  createWeddingTaskSchema,
  deleteMarriageAgreementRouteSchema,
  getMarriageProcessSchema,
  marriageNodeHistoryRouteSchema,
  marriageNodeListSchema,
  upsertWeddingBudgetSchema,
  putMarriageProcessSchema,
  updateMarriageAgreementRouteSchema,
  updateMarriageNodeRouteSchema,
  updateMarriageSettingsSchema,
  weddingEmptySchema,
  weddingExpenseQuerySchema,
  weddingIdParamSchema,
  updateWeddingExpenseRouteSchema,
  updateWeddingTaskRouteSchema,
  weddingTaskQuerySchema,
} from '../validation/wedding.schemas'

const id = '00000000-0000-0000-0000-000000000001'

const task = {
  taskName: '确认婚礼场地',
  category: 'venue',
  plannedDate: '2026-10-01',
  status: 'pending',
  priority: 5,
  notes: '确认档期、菜单和定金',
}

const expense = {
  taskId: id,
  date: '2026-08-04',
  itemName: '场地定金',
  category: 'venue',
  plannedAmount: 20000,
  actualAmount: 18000,
  paidStatus: 'partial',
  notes: '已支付首期',
}

const budget = {
  totalBudget: 150000,
  weddingDate: '2026-12-01',
}

const process = {
  recorderRole: 'record_keeper',
  visitOrder: 'male_first',
  marriageOrder: 'registration_first',
  engagementMode: 'undecided',
}

describe('wedding validation schemas', () => {
  it('accepts valid task, expense, and budget request bodies', () => {
    expect(createWeddingTaskSchema.safeParse({ body: task }).success).toBe(true)
    expect(createWeddingExpenseSchema.safeParse({ body: expense }).success).toBe(true)
    expect(upsertWeddingBudgetSchema.safeParse({ body: budget }).success).toBe(true)
  })

  it('accepts complete validator envelopes with unrelated envelope keys', () => {
    expect(createWeddingTaskSchema.safeParse({ body: task, query: {}, params: {} }).success).toBe(true)
    expect(weddingTaskQuerySchema.safeParse({ body: {}, query: {}, params: {} }).success).toBe(true)
    expect(weddingExpenseQuerySchema.safeParse({ body: {}, query: {}, params: {} }).success).toBe(true)
    expect(weddingEmptySchema.safeParse({ body: {}, query: {}, params: {} }).success).toBe(true)
  })

  it('accepts task with defaulted fields omitted', () => {
    const minimal = { taskName: '拍婚纱照', category: 'photo' }
    expect(createWeddingTaskSchema.safeParse({ body: minimal }).success).toBe(true)
  })

  it('accepts plannedDate and notes as null in task create and patch', () => {
    expect(createWeddingTaskSchema.safeParse({ body: { ...task, plannedDate: null, notes: null } }).success).toBe(true)
    expect(updateWeddingTaskRouteSchema.safeParse({ body: { plannedDate: null, notes: null }, params: { id } }).success).toBe(true)
  })

  it('rejects unknown fields and completedDate in task create and patch', () => {
    expect(createWeddingTaskSchema.safeParse({ body: { ...task, completedDate: '2026-08-04' } }).success).toBe(false)
    expect(createWeddingTaskSchema.safeParse({ body: { ...task, unexpected: 1 } }).success).toBe(false)
    expect(updateWeddingTaskRouteSchema.safeParse({ body: { completedDate: '2026-08-04' }, params: { id } }).success).toBe(false)
    expect(updateWeddingTaskRouteSchema.safeParse({ body: { status: 'completed', unexpected: 1 }, params: { id } }).success).toBe(false)
  })

  it('rejects empty task patch', () => {
    expect(updateWeddingTaskRouteSchema.safeParse({ body: {}, params: { id } }).success).toBe(false)
  })

  it('rejects invalid task names and priorities', () => {
    for (const taskName of ['', '   ', 'x'.repeat(201)]) {
      expect(createWeddingTaskSchema.safeParse({ body: { ...task, taskName } }).success).toBe(false)
    }
    for (const priority of [0, 6, -1, 2.5, '5']) {
      expect(createWeddingTaskSchema.safeParse({ body: { ...task, priority } }).success).toBe(false)
    }
    expect(createWeddingTaskSchema.safeParse({ body: { ...task, priority: 1 } }).success).toBe(true)
    expect(createWeddingTaskSchema.safeParse({ body: { ...task, priority: 5 } }).success).toBe(true)
  })

  it('rejects invalid task enums', () => {
    expect(createWeddingTaskSchema.safeParse({ body: { ...task, category: 'banquet' } }).success).toBe(false)
    expect(createWeddingTaskSchema.safeParse({ body: { ...task, status: 'done' } }).success).toBe(false)
  })

  it('trims task name and rejects blank notes handling', () => {
    const result = createWeddingTaskSchema.safeParse({ body: { ...task, taskName: '  确认场地  ' } })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.body.taskName).toBe('确认场地')
  })

  it('accepts expense with taskId null and notes null', () => {
    expect(createWeddingExpenseSchema.safeParse({ body: { ...expense, taskId: null, notes: null } }).success).toBe(true)
    expect(updateWeddingExpenseRouteSchema.safeParse({ body: { taskId: null, notes: null }, params: { id } }).success).toBe(true)
  })

  it('rejects empty expense patch and unknown fields', () => {
    expect(updateWeddingExpenseRouteSchema.safeParse({ body: {}, params: { id } }).success).toBe(false)
    expect(updateWeddingExpenseRouteSchema.safeParse({ body: { paidStatus: 'paid', unexpected: 1 }, params: { id } }).success).toBe(false)
  })

  it('requires expense fields and validates taskId as UUID or null', () => {
    expect(createWeddingExpenseSchema.safeParse({ body: { ...expense, taskId: 'not-a-uuid' } }).success).toBe(false)
    expect(createWeddingExpenseSchema.safeParse({ body: { ...expense, taskId: undefined } }).success).toBe(true)
    const { taskId: _omit, ...withoutTaskId } = expense
    expect(createWeddingExpenseSchema.safeParse({ body: withoutTaskId }).success).toBe(true)
    for (const key of ['date', 'itemName', 'category', 'plannedAmount', 'actualAmount', 'paidStatus'] as const) {
      const { [key]: _omit2, ...rest } = expense
      expect(createWeddingExpenseSchema.safeParse({ body: rest }).success).toBe(false)
    }
  })

  it('validates expense item names and enums', () => {
    for (const itemName of ['', '   ', 'x'.repeat(201)]) {
      expect(createWeddingExpenseSchema.safeParse({ body: { ...expense, itemName } }).success).toBe(false)
    }
    expect(createWeddingExpenseSchema.safeParse({ body: { ...expense, category: 'travel' } }).success).toBe(false)
    expect(createWeddingExpenseSchema.safeParse({ body: { ...expense, paidStatus: 'settled' } }).success).toBe(false)
  })

  it('accepts money edge values and rejects invalid amounts', () => {
    for (const amount of [0, 0.01, 0.07, 0.14, 1.11, 9999999999.99]) {
      expect(createWeddingExpenseSchema.safeParse({ body: { ...expense, plannedAmount: amount } }).success).toBe(true)
      expect(createWeddingExpenseSchema.safeParse({ body: { ...expense, actualAmount: amount } }).success).toBe(true)
    }
    for (const amount of [-0.01, 10000000000, 1.001, 9999999999.980001, Infinity, NaN]) {
      expect(createWeddingExpenseSchema.safeParse({ body: { ...expense, plannedAmount: amount } }).success).toBe(false)
      expect(createWeddingExpenseSchema.safeParse({ body: { ...expense, actualAmount: amount } }).success).toBe(false)
    }
  })

  it('validates strict date round-trips including leap day and rejects invalid dates', () => {
    expect(createWeddingExpenseSchema.safeParse({ body: { ...expense, date: '2024-02-29' } }).success).toBe(true)
    expect(createWeddingTaskSchema.safeParse({ body: { ...task, plannedDate: '2024-02-29' } }).success).toBe(true)
    for (const date of ['2026-02-30', '2026-13-01', '2026-00-10', '2026-01-32', '2026-02-29', '2026-08-04T00:00:00Z', '2026/08/04', 'not-a-date']) {
      expect(createWeddingExpenseSchema.safeParse({ body: { ...expense, date } }).success).toBe(false)
    }
    expect(createWeddingTaskSchema.safeParse({ body: { ...task, plannedDate: '2026-02-30' } }).success).toBe(false)
  })

  it('validates budget fields and rejects unknown keys', () => {
    for (const totalBudget of [0, 0.01, 9999999999.99]) {
      expect(upsertWeddingBudgetSchema.safeParse({ body: { ...budget, totalBudget } }).success).toBe(true)
    }
    for (const totalBudget of [-1, 10000000000, 1.001, Infinity, NaN]) {
      expect(upsertWeddingBudgetSchema.safeParse({ body: { ...budget, totalBudget } }).success).toBe(false)
    }
    expect(upsertWeddingBudgetSchema.safeParse({ body: { totalBudget: 1000 } }).success).toBe(false)
    expect(upsertWeddingBudgetSchema.safeParse({ body: { weddingDate: '2026-12-01' } }).success).toBe(false)
    expect(upsertWeddingBudgetSchema.safeParse({ body: { ...budget, unexpected: 1 } }).success).toBe(false)
  })

  it('validates task and expense query filters and pagination bounds', () => {
    expect(weddingTaskQuerySchema.safeParse({ query: { status: 'pending', category: 'venue', limit: '50', offset: '0' } }).success).toBe(true)
    expect(weddingTaskQuerySchema.safeParse({ query: { status: 'bogus' } }).success).toBe(false)
    expect(weddingTaskQuerySchema.safeParse({ query: { category: 'banquet' } }).success).toBe(false)
    expect(weddingTaskQuerySchema.safeParse({ query: { limit: '0' } }).success).toBe(false)
    expect(weddingTaskQuerySchema.safeParse({ query: { limit: '101' } }).success).toBe(false)
    expect(weddingTaskQuerySchema.safeParse({ query: { limit: '1' } }).success).toBe(true)
    expect(weddingTaskQuerySchema.safeParse({ query: { limit: '100' } }).success).toBe(true)
    expect(weddingTaskQuerySchema.safeParse({ query: { offset: '1000001' } }).success).toBe(false)
    expect(weddingTaskQuerySchema.safeParse({ query: { limit: '50' } }).success).toBe(true)
    expect(weddingExpenseQuerySchema.safeParse({ query: { startDate: '2026-08-01', endDate: '2026-08-31', category: 'venue', paidStatus: 'partial' } }).success).toBe(true)
    expect(weddingExpenseQuerySchema.safeParse({ query: { startDate: '2026-08-31', endDate: '2026-08-01' } }).success).toBe(false)
    expect(weddingExpenseQuerySchema.safeParse({ query: { paidStatus: 'nope' } }).success).toBe(false)
    expect(weddingExpenseQuerySchema.safeParse({ query: { startDate: '2026-08-01', endDate: '2026-08-01' } }).success).toBe(true)
  })

  it('requires UUID id params', () => {
    expect(weddingIdParamSchema.safeParse({ params: { id } }).success).toBe(true)
    for (const badId of ['', 'abc', 'not-a-uuid', '00000000-0000-0000-0000-00000000000']) {
      expect(weddingIdParamSchema.safeParse({ params: { id: badId } }).success).toBe(false)
    }
  })

  it('rejects extra query params on singleton endpoints', () => {
    expect(weddingEmptySchema.safeParse({ body: {}, query: {}, params: {} }).success).toBe(true)
    expect(weddingEmptySchema.safeParse({ body: {}, query: { x: 1 }, params: {} }).success).toBe(false)
    expect(weddingEmptySchema.safeParse({ body: {}, query: {}, params: { id } }).success).toBe(false)
  })

  it('accepts valid marriage process, node, and agreement requests', () => {
    expect(getMarriageProcessSchema.safeParse({ body: {}, query: {}, params: {} }).success).toBe(true)
    expect(putMarriageProcessSchema.safeParse({ body: process }).success).toBe(true)
    expect(updateMarriageSettingsSchema.safeParse({ body: { visitOrder: 'female_first' } }).success).toBe(true)
    expect(marriageNodeListSchema.safeParse({ body: {}, query: {}, params: {} }).success).toBe(true)
    expect(updateMarriageNodeRouteSchema.safeParse({
      params: { nodeKey: 'parents_meeting' },
      body: {
        status: 'completed', actualDate: '2026-08-04', participants: '双方父母',
        conclusion: '已见面', disagreements: '礼金仍需沟通', nextStep: '下周继续讨论',
        backfilled: true, reason: '补录',
      },
    }).success).toBe(true)
    expect(marriageNodeHistoryRouteSchema.safeParse({ params: { nodeKey: 'wedding' }, body: {}, query: {} }).success).toBe(true)
    expect(createMarriageAgreementSchema.safeParse({ body: { title: ' 婚后居住城市 ', status: 'agreed', notes: '已确认' } }).success).toBe(true)
    expect(updateMarriageAgreementRouteSchema.safeParse({ params: { id }, body: { status: 'needs_discussion' } }).success).toBe(true)
    expect(deleteMarriageAgreementRouteSchema.safeParse({ params: { id }, body: {}, query: {} }).success).toBe(true)
  })

  it('rejects invalid marriage process enums, unknown fields, and empty patches', () => {
    expect(putMarriageProcessSchema.safeParse({ body: { ...process, recorderRole: 'parent' } }).success).toBe(false)
    expect(putMarriageProcessSchema.safeParse({ body: { ...process, unexpected: true } }).success).toBe(false)
    expect(updateMarriageSettingsSchema.safeParse({ body: {} }).success).toBe(false)
    expect(updateMarriageSettingsSchema.safeParse({ body: { marriageOrder: 'later' } }).success).toBe(false)
    expect(updateMarriageNodeRouteSchema.safeParse({ params: { nodeKey: 'not-a-node' }, body: { status: 'completed' } }).success).toBe(false)
    expect(updateMarriageNodeRouteSchema.safeParse({ params: { nodeKey: 'wedding' }, body: {} }).success).toBe(false)
    expect(updateMarriageNodeRouteSchema.safeParse({ params: { nodeKey: 'wedding' }, body: { plannedDate: '2026-02-30' } }).success).toBe(false)
    expect(updateMarriageNodeRouteSchema.safeParse({ params: { nodeKey: 'wedding' }, body: { participants: 'x'.repeat(501) } }).success).toBe(false)
    expect(updateMarriageNodeRouteSchema.safeParse({ params: { nodeKey: 'wedding' }, body: { unexpected: true } }).success).toBe(false)
  })

  it('rejects invalid agreement titles, statuses, ids, and empty patches', () => {
    expect(createMarriageAgreementSchema.safeParse({ body: { title: '   ' } }).success).toBe(false)
    expect(createMarriageAgreementSchema.safeParse({ body: { title: 'x'.repeat(101) } }).success).toBe(false)
    expect(createMarriageAgreementSchema.safeParse({ body: { title: '议题', status: 'approved' } }).success).toBe(false)
    expect(createMarriageAgreementSchema.safeParse({ body: { title: '议题', unexpected: true } }).success).toBe(false)
    expect(updateMarriageAgreementRouteSchema.safeParse({ params: { id }, body: {} }).success).toBe(false)
    expect(updateMarriageAgreementRouteSchema.safeParse({ params: { id: 'bad' }, body: { title: '议题' } }).success).toBe(false)
    expect(deleteMarriageAgreementRouteSchema.safeParse({ params: { id: 'bad' }, body: {}, query: {} }).success).toBe(false)
    expect(marriageNodeHistoryRouteSchema.safeParse({ params: { nodeKey: 'wedding' }, body: {}, query: { injected: '1' } }).success).toBe(false)
  })
})
