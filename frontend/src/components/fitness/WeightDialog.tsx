import { useEffect, useState, type FormEvent } from 'react'
import type { CreateWeightRecordRequest } from '@xiaowoniu/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface WeightDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateWeightRecordRequest) => Promise<unknown>
  initialDate?: string
}

const timeOptions = [
  { value: 'morning', label: '早上' },
  { value: 'evening', label: '晚上' },
] as const

type TimeValue = (typeof timeOptions)[number]['value']
type Errors = Partial<Record<'date' | 'weightKg' | 'notes', string>>

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export default function WeightDialog({ open, onOpenChange, onSubmit, initialDate = '' }: WeightDialogProps) {
  const [date, setDate] = useState(initialDate)
  const [timeOfDay, setTimeOfDay] = useState<TimeValue>('morning')
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setDate(initialDate)
    setTimeOfDay('morning')
    setWeight('')
    setNotes('')
    setErrors({})
    setSubmitError('')
    setSubmitting(false)
  }, [initialDate, open])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const weightKg = Number(weight)
    const nextErrors: Errors = {}
    if (!validDate(date)) nextErrors.date = '请输入合法日期'
    if (!weight || !Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 999.99) nextErrors.weightKg = '体重必须大于 0 且不超过 999.99 kg'
    if (notes.trim().length > 2000) nextErrors.notes = '备注不能超过 2000 个字符'
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    try {
      await onSubmit({ date, timeOfDay: timeOfDay as CreateWeightRecordRequest['timeOfDay'], weightKg, ...(notes.trim() && { notes: notes.trim() }) })
      onOpenChange(false)
    } catch (error) {
      setSubmitError(error instanceof Error && error.message ? error.message : '保存失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}>
      <DialogContent aria-describedby="weight-description">
        <DialogHeader><DialogTitle>记录体重</DialogTitle><DialogDescription id="weight-description">记录当前体重和测量时段。</DialogDescription></DialogHeader>
        <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-2">
            <Label htmlFor="weight-date">日期</Label>
            <Input id="weight-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'weight-date-error' : undefined} disabled={submitting} />
            {errors.date && <p id="weight-date-error" className="text-sm text-destructive">{errors.date}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="weight-time">测量时段</Label>
            <Select value={timeOfDay} onValueChange={(value) => setTimeOfDay(value as TimeValue)} disabled={submitting}>
              <SelectTrigger id="weight-time"><SelectValue /></SelectTrigger>
              <SelectContent>{timeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="weight-kg">体重（kg）</Label>
            <Input id="weight-kg" type="number" min="0.01" max="999.99" step="0.01" inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} aria-invalid={Boolean(errors.weightKg)} aria-describedby={errors.weightKg ? 'weight-kg-error' : undefined} disabled={submitting} />
            {errors.weightKg && <p id="weight-kg-error" className="text-sm text-destructive">{errors.weightKg}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="weight-notes">备注（可选）</Label>
            <Textarea id="weight-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? 'weight-notes-error' : undefined} disabled={submitting} />
            {errors.notes && <p id="weight-notes-error" className="text-sm text-destructive">{errors.notes}</p>}
          </div>
          {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button><Button type="submit" disabled={submitting}>{submitting ? '保存中…' : '保存体重'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
