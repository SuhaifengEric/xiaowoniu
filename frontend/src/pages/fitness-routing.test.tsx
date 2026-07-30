import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.fn()
const fitnessPagePath = '@/pages/Fitness'
const fitnessActions = vi.hoisted(() => ({
  createCheckin: vi.fn().mockResolvedValue(undefined),
  createWeight: vi.fn().mockResolvedValue(undefined),
  upsertGoal: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/store/fitness.store', () => ({
  useFitnessStore: (selector: (state: typeof fitnessActions) => unknown) => selector(fitnessActions),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { username: 'tester', nickname: '测试用户', email: 'test@example.com', createdAt: '2026-07-01' },
    logout: vi.fn(),
  }),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigate }
})

describe('fitness routing', () => {
  beforeEach(() => {
    navigate.mockReset()
    Object.values(fitnessActions).forEach((action) => action.mockClear())
  })

  it('registers the protected /fitness route', async () => {
    window.history.pushState({}, '', '/fitness')
    const AppRoutes = (await import('@/routes')).default
    render(<AppRoutes />)

    expect(await screen.findByRole('heading', { name: '健身记录' })).toBeInTheDocument()
  })

  it('navigates from the fitness dashboard card by click', async () => {
    const Dashboard = (await import('@/pages/Dashboard')).default
    const user = userEvent.setup()
    render(<MemoryRouter><Dashboard /></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: /瘦瘦瘦/ }))
    expect(navigate).toHaveBeenCalledWith('/fitness')
  })

  it('navigates from the fitness dashboard card by keyboard', async () => {
    const Dashboard = (await import('@/pages/Dashboard')).default
    const user = userEvent.setup()
    render(<MemoryRouter><Dashboard /></MemoryRouter>)

    screen.getByRole('button', { name: /瘦瘦瘦/ }).focus()
    await user.keyboard('{Enter}')
    expect(navigate).toHaveBeenCalledWith('/fitness')
  })

  it('renders a fitness shell with all three dialogs opening and cancelling', async () => {
    const Fitness = (await import(/* @vite-ignore */ fitnessPagePath)).default
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/fitness']}>
        <Routes><Route path="/fitness" element={<Fitness />} /></Routes>
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: '健身记录' })).toBeInTheDocument()
    for (const [openName, dialogName] of [
      ['运动打卡', '记录运动'],
      ['记录体重', '记录体重'],
      ['设置目标', '设置健身目标'],
    ]) {
      await user.click(screen.getByRole('button', { name: openName }))
      expect(screen.getByRole('dialog', { name: dialogName })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: '取消' }))
      expect(screen.queryByRole('dialog', { name: dialogName })).not.toBeInTheDocument()
    }
  })

  it('submits each fitness form through its store action', async () => {
    const Fitness = (await import(/* @vite-ignore */ fitnessPagePath)).default
    const user = userEvent.setup()
    render(<MemoryRouter><Fitness /></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: '运动打卡' }))
    await user.click(screen.getByLabelText('运动类型'))
    await user.keyboard('{ArrowDown}{Enter}')
    await user.type(screen.getByLabelText('运动时长（分钟）'), '30')
    await user.click(screen.getByRole('button', { name: '保存打卡' }))
    await waitFor(() => expect(fitnessActions.createCheckin).toHaveBeenCalledWith(expect.objectContaining({ durationMinutes: 30 })))

    await user.click(screen.getByRole('button', { name: '记录体重' }))
    await user.type(screen.getByLabelText('体重（kg）'), '55.25')
    await user.click(screen.getByRole('button', { name: '保存体重' }))
    await waitFor(() => expect(fitnessActions.createWeight).toHaveBeenCalledWith(expect.objectContaining({ weightKg: 55.25 })))

    await user.click(screen.getByRole('button', { name: '设置目标' }))
    await user.type(screen.getByLabelText('每周运动目标（次）'), '3')
    await user.click(screen.getByRole('button', { name: '保存目标' }))
    await waitFor(() => expect(fitnessActions.upsertGoal).toHaveBeenCalledWith(expect.objectContaining({ weeklyWorkoutTarget: 3 })))
  })
})

describe('formatLocalDate', () => {
  it('uses local calendar getters at a timezone midnight boundary', async () => {
    const { formatLocalDate } = await import(/* @vite-ignore */ fitnessPagePath)
    const date = new Date('2026-08-01T00:30:00+08:00')
    const expected = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-')

    expect(formatLocalDate(date)).toBe(expected)
  })
})
