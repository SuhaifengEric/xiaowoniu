import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActivityType, TimeOfDay } from '@xiaowoniu/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CheckinCalendar, { getCalendarDays, getCalendarRange } from './CheckinCalendar'
import GoalProgress from './GoalProgress'
import WeightChart, { sortWeightRecords } from './WeightChart'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-chart">{children}</div>,
  LineChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => <div data-testid="line-chart" data-points={data.length}>{children}</div>,
  Line: ({ dot }: { dot?: boolean | object }) => <div data-testid="chart-line" data-dot={String(Boolean(dot))} />,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}))

afterEach(() => vi.useRealTimers())

const checkin = {
  id: 'checkin-1', userId: 'user-1', date: '2026-08-03', activityType: ActivityType.PILATES,
  durationMinutes: 45, notes: null, createdAt: '2026-08-03T10:00:00.000Z', updatedAt: '2026-08-03T10:00:00.000Z',
}

const weight = (id: string, date: string, timeOfDay: TimeOfDay, weightKg: number) => ({
  id, userId: 'user-1', date, timeOfDay, weightKg, notes: null, createdAt: `${date}T10:00:00.000Z`,
})

describe('calendar helpers', () => {
  it('builds a stable six-week Monday-first calendar', () => {
    const days = getCalendarDays(new Date(2026, 7, 1))
    expect(days).toHaveLength(42)
    expect(days[0].getDay()).toBe(1)
    expect([days[0].getFullYear(), days[0].getMonth(), days[0].getDate()]).toEqual([2026, 6, 27])
    expect([days[41].getFullYear(), days[41].getMonth(), days[41].getDate()]).toEqual([2026, 8, 6])
  })

  it('returns the visible six-week boundaries without UTC conversion', () => {
    expect(getCalendarRange(new Date(2026, 7, 1))).toEqual({ startDate: '2026-07-27', endDate: '2026-09-06' })
  })
})

describe('CheckinCalendar', () => {
  it('renders 42 date buttons and returns a local YYYY-MM-DD selection', async () => {
    const user = userEvent.setup()
    const onSelectDate = vi.fn()
    render(<CheckinCalendar records={[checkin]} month={new Date(2026, 7, 1)} onMonthChange={vi.fn()} onSelectDate={onSelectDate} />)

    expect(screen.getAllByRole('button', { name: /2026年.*月.*日/ })).toHaveLength(42)
    expect(screen.getByRole('columnheader', { name: '周一' })).toBeInTheDocument()
    const checkedDay = screen.getByRole('button', { name: /2026年8月3日.*已打卡.*45分钟/ })
    expect(checkedDay).toBeInTheDocument()
    await user.click(checkedDay)
    expect(onSelectDate).toHaveBeenCalledWith('2026-08-03')
  })

  it('shows today with visible text instead of color alone', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 3, 12))
    render(<CheckinCalendar records={[]} month={new Date(2026, 7, 1)} onMonthChange={vi.fn()} onSelectDate={vi.fn()} />)
    expect(screen.getByText('今天')).not.toHaveClass('sr-only')
    vi.useRealTimers()
  })

  it('changes month from accessible icon buttons', async () => {
    const user = userEvent.setup()
    const onMonthChange = vi.fn()
    render(<CheckinCalendar records={[]} month={new Date(2026, 7, 1)} onMonthChange={onMonthChange} onSelectDate={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '查看上个月' }))
    await user.click(screen.getByRole('button', { name: '查看下个月' }))
    expect(onMonthChange.mock.calls[0][0]).toEqual(new Date(2026, 6, 1))
    expect(onMonthChange.mock.calls[1][0]).toEqual(new Date(2026, 8, 1))
  })
})

describe('WeightChart', () => {
  it('sorts by date then morning before evening without mutating input', () => {
    const records = [
      weight('late-evening', '2026-08-02', TimeOfDay.EVENING, 55.2),
      weight('early-evening', '2026-08-01', TimeOfDay.EVENING, 55.5),
      weight('early-morning', '2026-08-01', TimeOfDay.MORNING, 55.7),
    ]
    const originalOrder = records.map(({ id }) => id)
    expect(sortWeightRecords(records).map(({ id }) => id)).toEqual(['early-morning', 'early-evening', 'late-evening'])
    expect(records.map(({ id }) => id)).toEqual(originalOrder)
  })

  it('shows a clear empty state with no records', () => {
    render(<WeightChart records={[]} />)
    expect(screen.getByText('还没有体重记录')).toBeInTheDocument()
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument()
  })

  it('keeps a single record visible as a chart dot', () => {
    render(<WeightChart records={[weight('only', '2026-08-01', TimeOfDay.MORNING, 55.7)]} />)
    expect(screen.getByTestId('line-chart')).toHaveAttribute('data-points', '1')
    expect(screen.getByTestId('chart-line')).toHaveAttribute('data-dot', 'true')
    expect(screen.getByText(/55.7 kg/)).toBeInTheDocument()
  })
})

describe('GoalProgress', () => {
  it('shows a setup action when no goal exists', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(<GoalProgress goal={null} stats={null} loading={false} onEdit={onEdit} />)
    expect(screen.getByText('还没有健身目标')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '创建目标' }))
    expect(onEdit).toHaveBeenCalledOnce()
  })

  it('clamps weekly progress and only displays supplied goal facts', () => {
    render(<GoalProgress goal={{
      id: 'goal-1', userId: 'user-1', targetWeightKg: 52, weeklyWorkoutTarget: 3,
      startDate: '2026-07-01', targetDate: '2026-12-31', isActive: true,
      createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z',
    }} stats={{
      currentWeek: { checkinsCount: 5, totalMinutes: 200, goalCompletion: 166.7 },
      currentMonth: { checkinsCount: 8, totalMinutes: 360, averagePerWeek: 2 },
      weightTrend: { current: 55, previous: 56, change: -1 },
    }} loading={false} onEdit={vi.fn()} />)

    expect(screen.getByText('5 / 3 次')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('52 kg')).toBeInTheDocument()
    expect(screen.getByText('2026年12月31日')).toBeInTheDocument()
    expect(screen.queryByText(/减重进度/)).not.toBeInTheDocument()
  })
})
