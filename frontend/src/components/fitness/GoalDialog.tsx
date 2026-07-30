import { useEffect, useState, type FormEvent } from 'react'
import type { UpsertGoalRequest } from '@xiaowoniu/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface GoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: UpsertGoalRequest) => Promise<unknown>
  initialDate?: string
}

type Errors = Partial<Record<'targetWeightKg' | 'weeklyWorkoutTarget' | 'startDate' | 'targetDate', string>>

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export default function GoalDialog({ open, onOpenChange, onSubmit, initialDate = '' }: GoalDialogProps) {
  const [targetWeight, setTargetWeight] = useState('')
  const [weeklyTarget, setWeeklyTarget] = useState('')
  const [startDate, setStartDate] = useState(initialDate)
  const [targetDate, setTargetDate] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setTargetWeight('')
    setWeeklyTarget('')
    setStartDate(initialDate)
    setTargetDate('')
    setErrors({})
    setSubmitError('')
    setSubmitting(false)
  }, [initialDate, open])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const targetWeightKg = Number(targetWeight)
    const weeklyWorkoutTarget = Number(weeklyTarget)
    const nextErrors: Errors = {}
    if (targetWeight && (!Number.isFinite(targetWeightKg) || targetWeightKg <= 0 || targetWeightKg > 999.99)) nextErrors.targetWeightKg = '目标体重必须大于 0 且不超过 999.99 kg'
    if (!weeklyTarget || !Number.isInteger(weeklyWorkoutTarget) || weeklyWorkoutTarget < 0) nextErrors.weeklyWorkoutTarget = '每周目标必须为非负整数'
    if (!validDate(startDate)) nextErrors.startDate = '请输入合法日期'
    if (targetDate && !validDate(targetDate)) nextErrors.targetDate = '请输入合法日期'
    else if (targetDate && validDate(startDate) && targetDate < startDate) nextErrors.targetDate = '目标日期不能早于开始日期'
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    try {
      await onSubmit({ weeklyWorkoutTarget, startDate, ...(targetWeight && { targetWeightKg }), ...(targetDate && { targetDate }) })
      onOpenChange(false)
    } catch (error) {
      setSubmitError(error instanceof Error && error.message ? error.message : '保存失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}>
      <DialogContent aria-describedby="goal-description">
        <DialogHeader><DialogTitle>设置健身目标</DialogTitle><DialogDescription id="goal-description">设定每周运动次数和可选体重目标。</DialogDescription></DialogHeader>
        <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-2">
            <Label htmlFor="goal-weekly">每周运动目标（次）</Label>
            <Input id="goal-weekly" type="number" min="0" step="1" inputMode="numeric" value={weeklyTarget} onChange={(event) => setWeeklyTarget(event.target.value)} aria-invalid={Boolean(errors.weeklyWorkoutTarget)} aria-describedby={errors.weeklyWorkoutTarget ? 'goal-weekly-error' : undefined} disabled={submitting} />
            {errors.weeklyWorkoutTarget && <p id="goal-weekly-error" className="text-sm text-destructive">{errors.weeklyWorkoutTarget}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="goal-weight">目标体重（kg，可选）</Label>
            <Input id="goal-weight" type="number" min="0.01" max="999.99" step="0.01" inputMode="decimal" value={targetWeight} onChange={(event) => setTargetWeight(event.target.value)} aria-invalid={Boolean(errors.targetWeightKg)} aria-describedby={errors.targetWeightKg ? 'goal-weight-error' : undefined} disabled={submitting} />
            {errors.targetWeightKg && <p id="goal-weight-error" className="text-sm text-destructive">{errors.targetWeightKg}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="goal-start">开始日期</Label>
            <Input id="goal-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} aria-invalid={Boolean(errors.startDate)} aria-describedby={errors.startDate ? 'goal-start-error' : undefined} disabled={submitting} />
            {errors.startDate && <p id="goal-start-error" className="text-sm text-destructive">{errors.startDate}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="goal-target">目标日期（可选）</Label>
            <Input id="goal-target" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} aria-invalid={Boolean(errors.targetDate)} aria-describedby={errors.targetDate ? 'goal-target-error' : undefined} disabled={submitting} />
            {errors.targetDate && <p id="goal-target-error" className="text-sm text-destructive">{errors.targetDate}</p>}
          </div>
          {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button><Button type="submit" disabled={submitting}>{submitting ? '保存中…' : '保存目标'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
