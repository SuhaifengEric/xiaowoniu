import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const checkinDialogPath = './CheckinDialog'
const weightDialogPath = './WeightDialog'
const goalDialogPath = './GoalDialog'

async function selectFirstOption(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByLabelText(label))
  await user.keyboard('{ArrowDown}{Enter}')
}

describe('CheckinDialog', () => {
  it('rejects missing and invalid check-in values', async () => {
    const CheckinDialog = (await import(/* @vite-ignore */ checkinDialogPath)).default
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<CheckinDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} initialDate="2026-07-30" />)

    await user.clear(screen.getByLabelText('日期'))
    await user.type(screen.getByLabelText('运动时长（分钟）'), '0')
    await user.click(screen.getByRole('button', { name: '保存打卡' }))

    expect(await screen.findByText('请输入合法日期')).toBeInTheDocument()
    expect(screen.getByText('请选择运动类型')).toBeInTheDocument()
    expect(screen.getByText('运动时长必须为 1 到 1440 之间的整数')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects durations above one day', async () => {
    const CheckinDialog = (await import(/* @vite-ignore */ checkinDialogPath)).default
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<CheckinDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} initialDate="2026-07-30" />)

    await selectFirstOption(user, '运动类型')
    await user.type(screen.getByLabelText('运动时长（分钟）'), '1441')
    await user.click(screen.getByRole('button', { name: '保存打卡' }))

    expect(await screen.findByText('运动时长必须为 1 到 1440 之间的整数')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('waits for a valid submit and closes only after success', async () => {
    const CheckinDialog = (await import(/* @vite-ignore */ checkinDialogPath)).default
    const user = userEvent.setup()
    let resolveSubmit!: () => void
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => { resolveSubmit = resolve }))
    const onOpenChange = vi.fn()
    render(<CheckinDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} initialDate="2026-07-30" />)

    await selectFirstOption(user, '运动类型')
    await user.type(screen.getByLabelText('运动时长（分钟）'), '45')
    await user.click(screen.getByRole('button', { name: '保存打卡' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-07-30', durationMinutes: 45, activityType: expect.stringMatching(/^(pilates|gym_slope|other)$/) }))
    expect(screen.getByRole('button', { name: '保存中…' })).toBeDisabled()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    resolveSubmit()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('keeps the dialog open and exposes submit errors', async () => {
    const CheckinDialog = (await import(/* @vite-ignore */ checkinDialogPath)).default
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onSubmit = vi.fn().mockRejectedValue(new Error('打卡保存失败'))
    render(<CheckinDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} initialDate="2026-07-30" />)

    await selectFirstOption(user, '运动类型')
    await user.type(screen.getByLabelText('运动时长（分钟）'), '30')
    await user.click(screen.getByRole('button', { name: '保存打卡' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('打卡保存失败')
    expect(screen.getByRole('dialog', { name: '记录运动' })).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it.each([
    ['allows 2000 trimmed note characters', `${'a'.repeat(2000)}  `, true],
    ['rejects 2001 trimmed note characters', 'a'.repeat(2001), false],
  ])('%s', async (_name, notes, allowed) => {
    const CheckinDialog = (await import(/* @vite-ignore */ checkinDialogPath)).default
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<CheckinDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} initialDate="2026-07-30" />)

    await selectFirstOption(user, '运动类型')
    await user.type(screen.getByLabelText('运动时长（分钟）'), '30')
    const notesInput = screen.getByLabelText('备注（可选）')
    fireEvent.change(notesInput, { target: { value: notes } })
    await user.click(screen.getByRole('button', { name: '保存打卡' }))

    if (allowed) {
      await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ notes: 'a'.repeat(2000) })))
    } else {
      expect(await screen.findByText('备注不能超过 2000 个字符')).toBeInTheDocument()
      expect(notesInput).toHaveAttribute('aria-invalid', 'true')
      expect(notesInput).toHaveAttribute('aria-describedby', 'checkin-notes-error')
      expect(onSubmit).not.toHaveBeenCalled()
    }
  })
})

describe('WeightDialog', () => {
  it('rejects weight boundaries and invalid dates', async () => {
    const WeightDialog = (await import(/* @vite-ignore */ weightDialogPath)).default
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<WeightDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} initialDate="2026-02-30" />)

    await user.type(screen.getByLabelText('体重（kg）'), '1000')
    await user.click(screen.getByRole('button', { name: '保存体重' }))

    expect(await screen.findByText('请输入合法日期')).toBeInTheDocument()
    expect(screen.getByText('体重必须大于 0 且不超过 999.99 kg')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('waits for a valid submit and closes only after success', async () => {
    const WeightDialog = (await import(/* @vite-ignore */ weightDialogPath)).default
    const user = userEvent.setup()
    let resolveSubmit!: () => void
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => { resolveSubmit = resolve }))
    const onOpenChange = vi.fn()
    render(<WeightDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} initialDate="2026-07-30" />)

    await user.type(screen.getByLabelText('体重（kg）'), '55.25')
    await user.click(screen.getByRole('button', { name: '保存体重' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-07-30', weightKg: 55.25 }))
    expect(screen.getByRole('button', { name: '保存中…' })).toBeDisabled()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    resolveSubmit()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('keeps the dialog open and exposes submit errors', async () => {
    const WeightDialog = (await import(/* @vite-ignore */ weightDialogPath)).default
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onSubmit = vi.fn().mockRejectedValue(new Error('网络连接失败'))
    render(<WeightDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} initialDate="2026-07-30" />)

    await user.type(screen.getByLabelText('体重（kg）'), '55.25')
    await user.click(screen.getByRole('button', { name: '保存体重' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('网络连接失败')
    expect(screen.getByRole('dialog', { name: '记录体重' })).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it.each([
    ['allows 2000 trimmed note characters', `${'a'.repeat(2000)}  `, true],
    ['rejects 2001 trimmed note characters', 'a'.repeat(2001), false],
  ])('%s', async (_name, notes, allowed) => {
    const WeightDialog = (await import(/* @vite-ignore */ weightDialogPath)).default
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<WeightDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} initialDate="2026-07-30" />)

    await user.type(screen.getByLabelText('体重（kg）'), '55.25')
    const notesInput = screen.getByLabelText('备注（可选）')
    fireEvent.change(notesInput, { target: { value: notes } })
    await user.click(screen.getByRole('button', { name: '保存体重' }))

    if (allowed) {
      await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ notes: 'a'.repeat(2000) })))
    } else {
      expect(await screen.findByText('备注不能超过 2000 个字符')).toBeInTheDocument()
      expect(notesInput).toHaveAttribute('aria-invalid', 'true')
      expect(notesInput).toHaveAttribute('aria-describedby', 'weight-notes-error')
      expect(onSubmit).not.toHaveBeenCalled()
    }
  })
})

describe('GoalDialog', () => {
  it('rejects non-integer targets and target dates before the start date', async () => {
    const GoalDialog = (await import(/* @vite-ignore */ goalDialogPath)).default
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<GoalDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} initialDate="2026-07-30" />)

    await user.type(screen.getByLabelText('每周运动目标（次）'), '-1.5')
    await user.type(screen.getByLabelText('目标日期（可选）'), '2026-07-29')
    await user.click(screen.getByRole('button', { name: '保存目标' }))

    expect(await screen.findByText('每周目标必须为 0 到 100 之间的整数')).toBeInTheDocument()
    expect(screen.getByText('目标日期不能早于开始日期')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits numeric optional weight and closes after success', async () => {
    const GoalDialog = (await import(/* @vite-ignore */ goalDialogPath)).default
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<GoalDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} initialDate="2026-07-30" />)

    await user.type(screen.getByLabelText('每周运动目标（次）'), '0')
    await user.type(screen.getByLabelText('目标体重（kg，可选）'), '52.5')
    await user.click(screen.getByRole('button', { name: '保存目标' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ weeklyWorkoutTarget: 0, startDate: '2026-07-30', targetWeightKg: 52.5 })))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('prefills an existing goal and preserves unchanged fields', async () => {
    const GoalDialog = (await import(/* @vite-ignore */ goalDialogPath)).default
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<GoalDialog
      open
      onOpenChange={vi.fn()}
      onSubmit={onSubmit}
      initialDate="2026-07-30"
      goal={{
        id: 'goal-1',
        userId: 'user-1',
        targetWeightKg: 52.5,
        weeklyWorkoutTarget: 3,
        startDate: '2026-07-01',
        targetDate: '2026-12-31',
        isActive: true,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      }}
    />)

    expect(screen.getByLabelText('每周运动目标（次）')).toHaveValue(3)
    expect(screen.getByLabelText('目标体重（kg，可选）')).toHaveValue(52.5)
    expect(screen.getByLabelText('开始日期')).toHaveValue('2026-07-01')
    expect(screen.getByLabelText('目标日期（可选）')).toHaveValue('2026-12-31')

    await user.click(screen.getByRole('button', { name: '保存目标' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      weeklyWorkoutTarget: 3,
      startDate: '2026-07-01',
      targetWeightKg: 52.5,
      targetDate: '2026-12-31',
    }))
  })

  it('rejects values above the fitness business limits', async () => {
    const GoalDialog = (await import(/* @vite-ignore */ goalDialogPath)).default
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<GoalDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} initialDate="2026-07-30" />)

    await user.type(screen.getByLabelText('每周运动目标（次）'), '101')
    await user.click(screen.getByRole('button', { name: '保存目标' }))

    expect(await screen.findByText('每周目标必须为 0 到 100 之间的整数')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps the goal dialog open and exposes submit errors', async () => {
    const GoalDialog = (await import(/* @vite-ignore */ goalDialogPath)).default
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onSubmit = vi.fn().mockRejectedValue(new Error('目标保存失败'))
    render(<GoalDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} initialDate="2026-07-30" />)

    await user.type(screen.getByLabelText('每周运动目标（次）'), '3')
    await user.click(screen.getByRole('button', { name: '保存目标' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('目标保存失败')
    expect(screen.getByRole('dialog', { name: '设置健身目标' })).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})
