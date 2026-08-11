import { useEffect, useState, type FormEvent } from 'react'
import type {
  CreateExamRequest,
  ExamCountdownResponse,
  UpdateExamRequest,
} from '@xiaowoniu/shared'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ExamFormData = CreateExamRequest | UpdateExamRequest
type Errors = Partial<Record<'examName' | 'examDate', string>>

interface ExamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ExamFormData) => Promise<unknown>
  exam?: ExamCountdownResponse | null
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : '保存失败，请稍后重试'
}

export default function ExamDialog({ open, onOpenChange, onSubmit, exam = null }: ExamDialogProps) {
  const editing = Boolean(exam)
  const [examName, setExamName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [isArchived, setIsArchived] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setExamName(exam?.examName ?? '')
    setExamDate(exam?.examDate ?? '')
    setIsArchived(exam?.isArchived ?? false)
    setErrors({})
    setSubmitError('')
    setSubmitting(false)
  }, [exam, open])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedName = examName.trim()
    const nextErrors: Errors = {}
    if (!trimmedName) nextErrors.examName = '请输入考试名称'
    else if (trimmedName.length > 100) nextErrors.examName = '考试名称不能超过 100 个字符'
    if (!validDate(examDate)) nextErrors.examDate = '请输入合法日期'
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      const data: ExamFormData = editing
        ? { examName: trimmedName, examDate, isArchived }
        : { examName: trimmedName, examDate }
      await onSubmit(data)
      onOpenChange(false)
    } catch (error) {
      setSubmitError(errorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}>
      <DialogContent
        aria-describedby="exam-dialog-description"
        onEscapeKeyDown={(event) => submitting && event.preventDefault()}
        onPointerDownOutside={(event) => submitting && event.preventDefault()}
        onInteractOutside={(event) => submitting && event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{editing ? '编辑考试' : '新建考试'}</DialogTitle>
          <DialogDescription id="exam-dialog-description">
            设置考试名称和考试日期。
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-2">
            <Label htmlFor="exam-name">考试名称</Label>
            <Input
              id="exam-name"
              value={examName}
              onChange={(event) => setExamName(event.target.value)}
              maxLength={100}
              disabled={submitting}
              aria-invalid={Boolean(errors.examName)}
              aria-describedby={errors.examName ? 'exam-name-error' : undefined}
            />
            {errors.examName && <p id="exam-name-error" className="text-sm text-destructive">{errors.examName}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="exam-date">考试日期</Label>
            <DatePicker
              id="exam-date"
              value={examDate}
              onValueChange={setExamDate}
              disabled={submitting}
              aria-invalid={Boolean(errors.examDate)}
              aria-describedby={errors.examDate ? 'exam-date-error' : undefined}
            />
            {errors.examDate && <p id="exam-date-error" className="text-sm text-destructive">{errors.examDate}</p>}
          </div>
          {editing && (
            <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={isArchived}
                onChange={(event) => setIsArchived(event.target.checked)}
                disabled={submitting}
                className="h-4 w-4 accent-primary"
              />
              归档考试
            </label>
          )}
          {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button>
            <Button type="submit" disabled={submitting}>{submitting ? '保存中…' : editing ? '保存考试' : '创建考试'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
