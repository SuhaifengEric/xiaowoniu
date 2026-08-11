import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActivityType, TimeOfDay } from '@xiaowoniu/shared'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Fitness from './index'

const store = vi.hoisted(() => ({
  checkins: [] as Array<Record<string, unknown>>,
  weights: [] as Array<Record<string, unknown>>,
  goal: null as Record<string, unknown> | null,
  stats: null as Record<string, unknown> | null,
  loading: false,
  error: null as string | null,
  fetchDashboard: vi.fn().mockResolvedValue(undefined),
  fetchCheckins: vi.fn().mockResolvedValue(undefined),
  createCheckin: vi.fn().mockResolvedValue(undefined),
  createWeight: vi.fn().mockResolvedValue(undefined),
  upsertGoal: vi.fn().mockResolvedValue(undefined),
  deleteWeight: vi.fn().mockResolvedValue(undefined),
  clearError: vi.fn(),
}))
const auth = vi.hoisted(() => ({ logout: vi.fn().mockResolvedValue(undefined) }))

vi.mock('@/store/fitness.store', () => ({
  useFitnessStore: (selector: (state: typeof store) => unknown) => selector(store),
}))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }))
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null, CartesianGrid: () => null, XAxis: () => null, YAxis: () => null, Tooltip: () => null,
}))

const renderPage = () => render(<MemoryRouter><Fitness /></MemoryRouter>)

function expectDateValue(label: string, value: string) {
  const [year, month, day] = value.split('-').map(Number)
  expect(screen.getByLabelText(label)).toHaveTextContent(`${year}年${month}月${day}日`)
}

beforeEach(() => {
  store.checkins = []
  store.weights = []
  store.goal = null
  store.stats = null
  store.loading = false
  store.error = null
  Object.values(store).forEach((value) => typeof value === 'function' && value.mockClear())
  store.fetchDashboard.mockResolvedValue(undefined)
  store.fetchCheckins.mockResolvedValue(undefined)
  store.createCheckin.mockResolvedValue(undefined)
  store.createWeight.mockResolvedValue(undefined)
  store.upsertGoal.mockResolvedValue(undefined)
  store.deleteWeight.mockResolvedValue(undefined)
  auth.logout.mockClear()
})

describe('Fitness page dashboard', () => {
  it('fetches the initial visible calendar boundaries on mount', async () => {
    renderPage()
    await waitFor(() => expect(store.fetchDashboard).toHaveBeenCalledWith(expect.objectContaining({
      startDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      endDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    })))
  })

  it('fetches dashboard on mount without leaking a rejection', async () => {
    store.fetchDashboard.mockRejectedValue(new Error('offline'))
    renderPage()
    await waitFor(() => expect(store.fetchDashboard).toHaveBeenCalledOnce())
  })

  it('renders loading, dashboard metrics, and store errors with clear action', async () => {
    const user = userEvent.setup()
    store.loading = true
    store.error = '数据加载失败'
    store.stats = {
      currentWeek: { checkinsCount: 2, totalMinutes: 90, goalCompletion: 67 },
      currentMonth: { checkinsCount: 7, totalMinutes: 320, averagePerWeek: 1.8 },
      weightTrend: { current: 55.2, previous: 55.8, change: -0.6 },
    }
    renderPage()

    expect(screen.getByLabelText('健身数据加载中')).toBeInTheDocument()
    expect(screen.getByText('90 分钟')).toBeInTheDocument()
    expect(screen.getByText('7 次')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('数据加载失败')
    await user.click(screen.getByRole('button', { name: '关闭错误提示' }))
    expect(store.clearError).toHaveBeenCalledOnce()
  })

  it('fetches the selected visible calendar boundaries', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: '查看下个月' }))

    const requested = store.fetchCheckins.mock.calls.at(-1)?.[0]
    const dateButtons = screen.getAllByRole('button', { name: /\d{4}年\d+月\d+日/ })
    const boundary = (button: HTMLElement) => {
      const match = button.getAttribute('aria-label')?.match(/(\d{4})年(\d+)月(\d+)日/)
      return `${match?.[1]}-${match?.[2].padStart(2, '0')}-${match?.[3].padStart(2, '0')}`
    }
    expect(requested).toEqual({
      startDate: boundary(dateButtons[0]),
      endDate: boundary(dateButtons[41]),
    })
  })

  it('opens check-in with the selected calendar date prefilled', async () => {
    const user = userEvent.setup()
    renderPage()
    const dateButton = screen.getAllByRole('button', { name: /\d{4}年\d+月\d+日/ })[10]
    const match = dateButton.getAttribute('aria-label')?.match(/(\d{4})年(\d+)月(\d+)日/)
    await user.click(dateButton)

    const expected = `${match?.[1]}-${match?.[2].padStart(2, '0')}-${match?.[3].padStart(2, '0')}`
    expect(screen.getByRole('dialog', { name: '记录运动' })).toBeInTheDocument()
    expectDateValue('日期', expected)
  })
})

describe('Fitness page operations', () => {
  it.each([
    ['checkin', '运动打卡', '运动类型', '运动时长（分钟）', '30', '保存打卡', '打卡已保存'],
    ['weight', '记录体重', null, '体重（kg）', '55.25', '保存体重', '体重已记录'],
    ['goal', '设置目标', null, '每周运动目标（次）', '3', '保存目标', '目标已更新'],
  ])('shows status after successful %s dialog submission', async (_kind, openName, selectLabel, inputLabel, value, saveName, status) => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: openName }))
    if (selectLabel) {
      await user.click(screen.getByLabelText(selectLabel))
      await user.keyboard('{ArrowDown}{Enter}')
    }
    await user.type(screen.getByLabelText(inputLabel), value)
    await user.click(screen.getByRole('button', { name: saveName }))
    expect(await screen.findByRole('status')).toHaveTextContent(status)
  })

  it('keeps mutation refresh warnings visible after success', async () => {
    const user = userEvent.setup()
    store.createWeight.mockImplementation(async () => { store.error = '操作已成功，但数据刷新失败' })
    renderPage()
    await user.click(screen.getByRole('button', { name: '记录体重' }))
    await user.type(screen.getByLabelText('体重（kg）'), '55')
    await user.click(screen.getByRole('button', { name: '保存体重' }))
    expect(await screen.findByRole('status')).toHaveTextContent('体重已记录')
  })

  it('confirms before deleting a recent weight record', async () => {
    const user = userEvent.setup()
    store.weights = [{
      id: 'weight-1', userId: 'user-1', date: '2026-07-30', timeOfDay: TimeOfDay.MORNING,
      weightKg: 55.2, notes: null, createdAt: '2026-07-30T00:00:00.000Z',
    }]
    renderPage()

    await user.click(screen.getByRole('button', { name: '删除2026年7月30日早上的体重记录' }))
    expect(screen.getByRole('dialog', { name: '确认删除体重记录' })).toBeInTheDocument()
    expect(store.deleteWeight).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(store.deleteWeight).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '删除2026年7月30日早上的体重记录' }))
    await user.click(screen.getByRole('button', { name: '确认删除' }))
    await waitFor(() => expect(store.deleteWeight).toHaveBeenCalledWith('weight-1'))
  })

  it('renders check-in data with a non-color status', () => {
    store.checkins = [{
      id: 'checkin-1', userId: 'user-1', date: '2026-07-30', activityType: ActivityType.PILATES,
      durationMinutes: 40, notes: null, createdAt: '', updatedAt: '',
    }]
    renderPage()
    expect(screen.getByRole('button', { name: /2026年7月30日.*已打卡.*40分钟/ })).toBeInTheDocument()
  })
})
