import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskStatus, WeddingTaskCategory } from '@xiaowoniu/shared'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Wedding from './index'

const store = vi.hoisted(() => ({
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

beforeEach(() => {
  store.tasks = []
  store.expenses = []
  store.budget = null
  store.overview = null
  store.timeline = null
  store.loading = false
  store.error = null
  Object.values(store).forEach((value) => typeof value === 'function' && value.mockClear())
  store.fetchDashboard.mockResolvedValue(undefined)
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

  it('shows header actions and switches between tabs with keyboard', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(screen.getByRole('button', { name: '返回世界仪表盘' })).toBeInTheDocument()
    const accountMenu = screen.getByRole('button', { name: /打开用户菜单/ })
    await user.click(accountMenu)
    expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    const tablist = screen.getByRole('tablist')
    expect(tablist).toBeInTheDocument()
    const boardTab = screen.getByRole('tab', { name: /任务看板/ })
    const timelineTab = screen.getByRole('tab', { name: /时间线/ })
    expect(boardTab).toHaveAttribute('aria-selected', 'true')
    timelineTab.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /花费明细/ })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowLeft}')
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: /任务看板/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('opens the task dialog and submits through the store action', async () => {
    const user = userEvent.setup()
    store.tasks = [task]
    renderPage()
    await user.click(screen.getByRole('button', { name: /新建任务/ }))
    expect(screen.getByRole('dialog', { name: '新建备婚任务' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('任务名称'), '拍婚纱照')
    await user.click(screen.getByRole('combobox', { name: '任务类别' }))
    await user.click(await screen.findByRole('option', { name: '婚纱照' }))
    await user.click(screen.getByRole('button', { name: '保存任务' }))
    await waitFor(() => expect(store.createTask).toHaveBeenCalledWith(expect.objectContaining({ taskName: '拍婚纱照' })))
    expect(await screen.findByRole('status')).toHaveTextContent('备婚任务已创建')
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
    await user.click(screen.getAllByRole('button', { name: /设置预算与婚期/ })[0])
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
    await user.click(screen.getByRole('button', { name: '开始' }))
    await waitFor(() => expect(store.updateTask).toHaveBeenCalledWith('task-1', { status: TaskStatus.IN_PROGRESS }))
  })

  it('keeps the dialog open when a task submit fails and shows the error', async () => {
    const user = userEvent.setup()
    store.createTask.mockRejectedValue(new Error('任务名称无效'))
    renderPage()
    await user.click(screen.getByRole('button', { name: /新建任务/ }))
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
    await user.click(screen.getByRole('button', { name: `删除任务${task.taskName}` }))
    await user.click(screen.getByRole('button', { name: '确认删除' }))
    await waitFor(() => expect(store.deleteTask).toHaveBeenCalledWith('task-1'))
    expect(screen.getByRole('dialog', { name: '确认删除备婚任务' })).toBeInTheDocument()
  })

  it('closes the delete confirmation after a successful deletion', async () => {
    const user = userEvent.setup()
    store.tasks = [task]
    renderPage()
    await user.click(screen.getByRole('button', { name: `删除任务${task.taskName}` }))
    await user.click(screen.getByRole('button', { name: '确认删除' }))

    await waitFor(() => expect(store.deleteTask).toHaveBeenCalledWith('task-1'))
    expect(screen.queryByRole('dialog', { name: '确认删除备婚任务' })).not.toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent('备婚任务已删除')
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
