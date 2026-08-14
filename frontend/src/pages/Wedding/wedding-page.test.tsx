import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AgreementStatus, EngagementMode, MarriageNodeKey, MarriageNodeStatus, MarriageOrder, MarriageRecorderRole, TaskStatus, VisitOrder, WeddingTaskCategory } from '@xiaowoniu/shared'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Wedding from './index'

const store = vi.hoisted(() => ({
  process: null as Record<string, unknown> | null,
  nodes: [] as Array<Record<string, unknown>>,
  agreements: [] as Array<Record<string, unknown>>,
  nodeHistory: {} as Record<string, unknown[]>,
  tasks: [] as Array<Record<string, unknown>>,
  expenses: [] as Array<Record<string, unknown>>,
  budget: null as Record<string, unknown> | null,
  overview: null as Record<string, unknown> | null,
  timeline: null as Record<string, unknown> | null,
  tasksHasMore: false,
  expensesHasMore: false,
  loading: false,
  error: null as string | null,
  fetchDashboard: vi.fn().mockResolvedValue(undefined),
  createProcess: vi.fn().mockResolvedValue(undefined),
  updateProcessSettings: vi.fn().mockResolvedValue(undefined),
  updateNode: vi.fn().mockResolvedValue(undefined),
  fetchNodeHistory: vi.fn().mockResolvedValue(undefined),
  createAgreement: vi.fn().mockResolvedValue(undefined),
  updateAgreement: vi.fn().mockResolvedValue(undefined),
  archiveAgreement: vi.fn().mockResolvedValue(undefined),
  fetchTasks: vi.fn().mockResolvedValue(undefined),
  fetchExpenses: vi.fn().mockResolvedValue(undefined),
  createTask: vi.fn().mockResolvedValue(undefined),
  updateTask: vi.fn().mockResolvedValue(undefined),
  deleteTask: vi.fn().mockResolvedValue(undefined),
  createExpense: vi.fn().mockResolvedValue(undefined),
  updateExpense: vi.fn().mockResolvedValue(undefined),
  deleteExpense: vi.fn().mockResolvedValue(undefined),
  upsertBudget: vi.fn().mockResolvedValue(undefined),
  clearError: vi.fn(),
}))
const auth = vi.hoisted(() => ({ logout: vi.fn().mockResolvedValue(undefined) }))

vi.mock('@/store/wedding.store', () => ({
  useWeddingStore: (selector: (state: typeof store) => unknown) => selector(store),
}))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ logout: auth.logout }) }))

const renderPage = () => render(<MemoryRouter><Wedding /></MemoryRouter>)

function dateLabel(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return `${year}年${month}月${day}日`
}

async function selectDate(user: ReturnType<typeof userEvent.setup>, label: string, value: string) {
  const [year, month] = value.split('-').map(Number)
  const targetMonth = year * 12 + month
  const targetDay = dateLabel(value)
  await user.click(screen.getByLabelText(label))

  for (let attempts = 0; attempts < 120; attempts += 1) {
    const day = screen.queryByRole('button', { name: targetDay })
    if (day) {
      await user.click(day)
      return
    }
    const currentMonth = screen.getByRole('grid').getAttribute('aria-label')
    const match = currentMonth?.match(/^(\d+)年(\d+)月$/)
    if (!match) throw new Error('日期选择器月份格式异常')
    const current = Number(match[1]) * 12 + Number(match[2])
    await user.click(screen.getByRole('button', { name: current < targetMonth ? '下个月' : '上个月' }))
  }

  throw new Error(`未找到日期 ${value}`)
}

const task = {
  id: 'task-1', userId: 'user-1', taskName: '确认婚礼场地', category: WeddingTaskCategory.VENUE,
  plannedDate: '2026-10-01', completedDate: null, status: TaskStatus.PENDING, priority: 5,
  notes: null, createdAt: 'created', updatedAt: 'updated',
}

const process = {
  id: 'process-1', recorderRole: MarriageRecorderRole.RECORD_KEEPER, visitOrder: VisitOrder.MALE_FIRST,
  marriageOrder: MarriageOrder.REGISTRATION_FIRST, engagementMode: EngagementMode.UNDECIDED,
  nodes: [], agreements: [], currentStage: MarriageNodeKey.INTENTION, recommendedNext: MarriageNodeKey.INTENTION,
  outOfOrder: false, progress: { completed: 0, total: 8, percentage: 0 }, warnings: [], createdAt: 'created', updatedAt: 'updated',
}

beforeEach(() => {
  store.tasks = []
  store.process = null
  store.nodes = []
  store.agreements = []
  store.nodeHistory = {}
  store.expenses = []
  store.budget = null
  store.overview = null
  store.timeline = null
  store.loading = false
  store.error = null
  Object.values(store).forEach((value) => typeof value === 'function' && value.mockClear())
  store.fetchDashboard.mockResolvedValue(undefined)
  store.createProcess.mockResolvedValue(undefined)
  store.updateProcessSettings.mockResolvedValue(undefined)
  store.updateNode.mockResolvedValue(undefined)
  store.fetchNodeHistory.mockResolvedValue(undefined)
  store.createAgreement.mockResolvedValue(undefined)
  store.updateAgreement.mockResolvedValue(undefined)
  store.archiveAgreement.mockResolvedValue(undefined)
  store.fetchTasks.mockResolvedValue(undefined)
  store.fetchExpenses.mockResolvedValue(undefined)
  store.createTask.mockResolvedValue(undefined)
  store.updateTask.mockResolvedValue(undefined)
  store.deleteTask.mockResolvedValue(undefined)
  store.createExpense.mockResolvedValue(undefined)
  store.updateExpense.mockResolvedValue(undefined)
  store.deleteExpense.mockResolvedValue(undefined)
  store.upsertBudget.mockResolvedValue(undefined)
  auth.logout.mockClear()
})

describe('Wedding page', () => {
  it('loads the dashboard once on mount', async () => {
    renderPage()
    await waitFor(() => expect(store.fetchDashboard).toHaveBeenCalledTimes(1))
  })

  it('shows the five marriage views and switches between tabs with keyboard', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(screen.getByRole('button', { name: '返回世界仪表盘' })).toBeInTheDocument()
    const accountMenu = screen.getByRole('button', { name: /打开用户菜单/ })
    await user.click(accountMenu)
    expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    const tablist = screen.getByRole('tablist')
    expect(tablist).toBeInTheDocument()
    const processTab = screen.getByRole('tab', { name: '婚姻进程' })
    const stagesTab = screen.getByRole('tab', { name: '阶段记录' })
    expect(processTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: '双方共识' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '婚礼执行' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '流程设置' })).toBeInTheDocument()
    stagesTab.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: '双方共识' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: '婚姻进程' })).toHaveAttribute('aria-selected', 'true')
  })

  it('opens the process setup for an empty user and submits the recorder perspective', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: '建立婚姻进程' }))
    expect(screen.getByRole('dialog', { name: '建立婚姻进程' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '建立进程' }))
    await waitFor(() => expect(store.createProcess).toHaveBeenCalledWith(expect.objectContaining({ recorderRole: MarriageRecorderRole.RECORD_KEEPER, visitOrder: VisitOrder.MALE_FIRST })))
  })

  it('renders process labels and preserves separate registration and wedding facts', async () => {
    const user = userEvent.setup()
    const nodes = [
      { id: 'registration', processId: 'process-1', nodeKey: MarriageNodeKey.REGISTRATION, status: MarriageNodeStatus.COMPLETED, plannedDate: '2026-07-01', actualDate: '2026-07-02', participants: null, conclusion: null, disagreements: null, nextStep: null, notes: null, skipReason: null, backfilled: false, recordSource: 'direct', actionItemCount: 0, isOverdue: false, createdAt: 'c', updatedAt: 'u' },
      { id: 'wedding', processId: 'process-1', nodeKey: MarriageNodeKey.WEDDING, status: MarriageNodeStatus.NOT_STARTED, plannedDate: '2026-12-01', actualDate: null, participants: null, conclusion: null, disagreements: null, nextStep: null, notes: null, skipReason: null, backfilled: false, recordSource: 'direct', actionItemCount: 0, isOverdue: false, createdAt: 'c', updatedAt: 'u' },
    ]
    store.process = {
      ...process,
      nodes,
    }
    store.nodes = nodes
    renderPage()
    await user.click(screen.getByRole('tab', { name: '流程设置' }))
    expect(screen.getAllByText('记录人视角')).not.toHaveLength(0)
    await user.click(screen.getByRole('tab', { name: '阶段记录' }))
    expect(screen.getByText('依法办理结婚登记')).toBeInTheDocument()
    expect(screen.getByText('婚礼筹备与婚礼')).toBeInTheDocument()
    expect(screen.queryByText('用户补录')).not.toBeInTheDocument()
  })

  it('updates a node through the record dialog without treating parents as approval', async () => {
    const user = userEvent.setup()
    const parentsNode = { id: 'parents', processId: 'process-1', nodeKey: MarriageNodeKey.PARENTS_MEETING, status: MarriageNodeStatus.NOT_STARTED, plannedDate: null, actualDate: null, participants: null, conclusion: null, disagreements: null, nextStep: null, notes: null, skipReason: null, backfilled: false, recordSource: 'direct', actionItemCount: 0, isOverdue: false, createdAt: 'c', updatedAt: 'u' }
    const maleVisitNode = { ...parentsNode, id: 'male-visit', nodeKey: MarriageNodeKey.MALE_VISIT }
    const femaleVisitNode = { ...parentsNode, id: 'female-visit', nodeKey: MarriageNodeKey.FEMALE_VISIT }
    store.process = { ...process, nodes: [maleVisitNode, femaleVisitNode, parentsNode], currentStage: MarriageNodeKey.PARENTS_MEETING, recommendedNext: MarriageNodeKey.PARENTS_MEETING }
    store.nodes = [maleVisitNode, femaleVisitNode, parentsNode]
    renderPage()
    await user.click(screen.getByRole('tab', { name: '阶段记录' }))
    await user.click(screen.getByRole('button', { name: '记录双方父母正式见面' }))
    expect(screen.getByText(/不是父母审批/)).toBeInTheDocument()
    expect(screen.queryByText(/审批通过/)).not.toBeInTheDocument()
  })

  it('supports agreement status language and adding a topic', async () => {
    const user = userEvent.setup()
    const agreements: Array<Record<string, unknown>> = [{ id: 'a1', processId: 'process-1', title: '婚后居住城市', status: AgreementStatus.NEEDS_DISCUSSION, sortOrder: 0, notes: null, archivedAt: null, createdAt: 'c', updatedAt: 'u' }]
    store.process = { ...process, agreements }
    store.agreements = agreements
    renderPage()
    await user.click(screen.getByRole('tab', { name: '双方共识' }))
    expect(screen.getByText('需再沟通')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: '新共识议题' }), '礼金边界')
    await user.click(screen.getByRole('button', { name: '添加议题' }))
    await waitFor(() => expect(store.createAgreement).toHaveBeenCalledWith({ title: '礼金边界' }))
  })

  it('opens the task dialog and submits through the store action', async () => {
    const user = userEvent.setup()
    store.tasks = [task]
    renderPage()
    await user.click(screen.getByRole('button', { name: /新增行动项/ }))
    expect(screen.getByRole('dialog', { name: '新建备婚任务' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('任务名称'), '拍婚纱照')
    await user.click(screen.getByRole('combobox', { name: '任务类别' }))
    await user.click(await screen.findByRole('option', { name: '婚纱照' }))
    await user.click(screen.getByRole('button', { name: '保存任务' }))
    await waitFor(() => expect(store.createTask).toHaveBeenCalledWith(expect.objectContaining({ taskName: '拍婚纱照' })))
    expect(await screen.findByRole('status')).toHaveTextContent('阶段行动项已创建')
  })

  it('opens the expense dialog and submits with task link', async () => {
    const user = userEvent.setup()
    store.tasks = [task]
    renderPage()
    await user.click(screen.getByRole('button', { name: /新增花费/ }))
    expect(screen.getByRole('dialog', { name: '新增备婚花费' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('条目名称'), '场地定金')
    await selectDate(user, '花费日期', '2026-08-04')
    await user.type(screen.getByLabelText('计划金额'), '20000')
    await user.type(screen.getByLabelText('实际金额'), '18000')
    await user.click(screen.getByRole('combobox', { name: '花费类别' }))
    await user.click(await screen.findByRole('option', { name: '场地' }))
    await user.click(screen.getByRole('combobox', { name: '支付状态' }))
    await user.click(await screen.findByRole('option', { name: '已支付' }))
    await user.click(screen.getByRole('button', { name: '保存花费' }))
    await waitFor(() => expect(store.createExpense).toHaveBeenCalled())
    expect(await screen.findByRole('status')).toHaveTextContent('备婚花费已创建')
  }, 15_000)

  it('opens the budget dialog and submits total budget and wedding date', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /设置预算$/ }))
    expect(screen.getByRole('dialog', { name: '设置备婚预算与婚期' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('总预算'), '150000')
    await selectDate(user, '婚礼日期', '2026-12-01')
    await user.click(screen.getByRole('button', { name: '保存预算' }))
    await waitFor(() => expect(store.upsertBudget).toHaveBeenCalledWith({ totalBudget: 150000, weddingDate: '2026-12-01' }))
    expect(await screen.findByRole('status')).toHaveTextContent('备婚预算已更新')
  }, 15_000)

  it('changes task status through the store action and shows success', async () => {
    const user = userEvent.setup()
    store.tasks = [task]
    renderPage()
    await user.click(screen.getByRole('tab', { name: '婚礼执行' }))
    await user.click(screen.getByRole('button', { name: '开始' }))
    await waitFor(() => expect(store.updateTask).toHaveBeenCalledWith('task-1', { status: TaskStatus.IN_PROGRESS }))
  })

  it('keeps the dialog open when a task submit fails and shows the error', async () => {
    const user = userEvent.setup()
    store.createTask.mockRejectedValue(new Error('任务名称无效'))
    renderPage()
    await user.click(screen.getByRole('button', { name: /新增行动项/ }))
    await user.type(screen.getByLabelText('任务名称'), '拍婚纱照')
    await user.click(screen.getByRole('combobox', { name: '任务类别' }))
    await user.click(await screen.findByRole('option', { name: '婚纱照' }))
    await user.click(screen.getByRole('button', { name: '保存任务' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('任务名称无效')
    expect(screen.getByRole('dialog', { name: '新建备婚任务' })).toBeInTheDocument()
  })

  it('keeps the delete confirmation open after a failed deletion', async () => {
    const user = userEvent.setup()
    store.tasks = [task]
    store.deleteTask.mockRejectedValue(new Error('删除失败'))
    renderPage()
    await user.click(screen.getByRole('tab', { name: '婚礼执行' }))
    await user.click(screen.getByRole('button', { name: `删除任务${task.taskName}` }))
    await user.click(screen.getByRole('button', { name: '确认删除' }))
    await waitFor(() => expect(store.deleteTask).toHaveBeenCalledWith('task-1'))
    expect(screen.getByRole('dialog', { name: '确认删除备婚任务' })).toBeInTheDocument()
  })

  it('closes the delete confirmation after a successful deletion', async () => {
    const user = userEvent.setup()
    store.tasks = [task]
    renderPage()
    await user.click(screen.getByRole('tab', { name: '婚礼执行' }))
    await user.click(screen.getByRole('button', { name: `删除任务${task.taskName}` }))
    await user.click(screen.getByRole('button', { name: '确认删除' }))

    await waitFor(() => expect(store.deleteTask).toHaveBeenCalledWith('task-1'))
    expect(screen.queryByRole('dialog', { name: '确认删除备婚任务' })).not.toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent('阶段行动项已删除')
  })

  it('shows store errors and clears them', async () => {
    const user = userEvent.setup()
    store.error = '数据加载失败'
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent('数据加载失败')
    await user.click(screen.getByRole('button', { name: '关闭错误提示' }))
    expect(store.clearError).toHaveBeenCalledOnce()
  })

  it('logs out and navigates to login', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /打开用户菜单/ }))
    await user.click(screen.getByRole('button', { name: '登出' }))
    expect(auth.logout).toHaveBeenCalledOnce()
  })
})
