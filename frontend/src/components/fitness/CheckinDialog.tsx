import { useEffect, useState, type FormEvent } from 'react'
import type { CreateCheckinRequest } from '@xiaowoniu/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface CheckinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateCheckinRequest) => Promise<unknown>
  initialDate?: string
}

const activityOptions = [
  { value: 'pilates', label: '普拉提' },
  { value: 'gym_slope', label: '爬坡机' },
  { value: 'other', label: '其他运动' },
] as const

type ActivityValue = (typeof activityOptions)[number]['value']
type Errors = Partial<Record<'date' | 'activityType' | 'durationMinutes' | 'notes', string>>


function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : '保存失败，请稍后重试'
}

export default function CheckinDialog({ open, onOpenChange, onSubmit, initialDate = '' }: CheckinDialogProps) {
  const [date, setDate] = useState(initialDate)
  const [activityType, setActivityType] = useState<ActivityValue | ''>('')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setDate(initialDate)
    setActivityType('')
    setDuration('')
    setNotes('')
    setErrors({})
    setSubmitError('')
    setSubmitting(false)
  }, [initialDate, open])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const minutes = Number(duration)
    const nextErrors: Errors = {}
    if (!validDate(date)) nextErrors.date = '请输入合法日期'
    if (!activityOptions.some((option) => option.value === activityType)) nextErrors.activityType = '请选择运动类型'
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) nextErrors.durationMinutes = '运动时长必须为 1 到 1440 之间的整数'
    if (notes.trim().length > 2000) nextErrors.notes = '备注不能超过 2000 个字符'
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    try {
      await onSubmit({ date, activityType: activityType as CreateCheckinRequest['activityType'], durationMinutes: minutes, ...(notes.trim() && { notes: notes.trim() }) })
      onOpenChange(false)
    } catch (error) {
      setSubmitError(errorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}>
      <DialogContent aria-describedby="checkin-description">
        <DialogHeader>
          <DialogTitle>记录运动</DialogTitle>
          <DialogDescription id="checkin-description">记录本次运动内容和时长。</DialogDescription>
        </DialogHeader>
        <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-2">
            <Label htmlFor="checkin-date">日期</Label>
            <Input id="checkin-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'checkin-date-error' : undefined} disabled={submitting} />
            {errors.date && <p id="checkin-date-error" className="text-sm text-destructive">{errors.date}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="checkin-activity">运动类型</Label>
            <Select value={activityType} onValueChange={(value) => setActivityType(value as ActivityValue)} disabled={submitting}>
              <SelectTrigger id="checkin-activity" aria-invalid={Boolean(errors.activityType)} aria-describedby={errors.activityType ? 'checkin-activity-error' : undefined}><SelectValue placeholder="选择运动类型" /></SelectTrigger>
              <SelectContent>{activityOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
            {errors.activityType && <p id="checkin-activity-error" className="text-sm text-destructive">{errors.activityType}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="checkin-duration">运动时长（分钟）</Label>
            <Input id="checkin-duration" type="number" min="1" max="1440" step="1" inputMode="numeric" value={duration} onChange={(event) => setDuration(event.target.value)} aria-invalid={Boolean(errors.durationMinutes)} aria-describedby={errors.durationMinutes ? 'checkin-duration-error' : undefined} disabled={submitting} />
            {errors.durationMinutes && <p id="checkin-duration-error" className="text-sm text-destructive">{errors.durationMinutes}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="checkin-notes">备注（可选）</Label>
            <Textarea id="checkin-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? 'checkin-notes-error' : undefined} disabled={submitting} />
            {errors.notes && <p id="checkin-notes-error" className="text-sm text-destructive">{errors.notes}</p>}
          </div>
          {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button>
            <Button type="submit" disabled={submitting}>{submitting ? '保存中…' : '保存打卡'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
