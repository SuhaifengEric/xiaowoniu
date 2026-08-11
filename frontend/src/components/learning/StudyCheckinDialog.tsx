import { useEffect, useState, type FormEvent } from 'react'
import type {
  CreateStudyCheckinRequest,
  StudySubjectResponse,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type Errors = Partial<Record<'date' | 'subjectId' | 'completedChapters' | 'studyHours' | 'notes', string>>

interface StudyCheckinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateStudyCheckinRequest) => Promise<unknown>
  subjects: StudySubjectResponse[]
  initialDate?: string
  initialSubjectId?: string
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

function parseChapters(value: string) {
  const parts = value.split(',')
  if (parts.some((part) => part.trim() === '')) return { error: '章节输入不能包含空项' }
  if (parts.some((part) => !/^\d+$/.test(part.trim()))) {
    return { error: '章节必须为正整数，并使用逗号分隔' }
  }
  const chapters = parts.map((part) => Number(part.trim()))
  if (new Set(chapters).size !== chapters.length) return { error: '章节不能重复' }
  return { chapters }
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : '保存失败，请稍后重试'
}

export default function StudyCheckinDialog({
  open,
  onOpenChange,
  onSubmit,
  subjects,
  initialDate = '',
  initialSubjectId = '',
}: StudyCheckinDialogProps) {
  const [date, setDate] = useState(initialDate)
  const [subjectId, setSubjectId] = useState(initialSubjectId)
  const [chapters, setChapters] = useState('')
  const [studyHours, setStudyHours] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedSubject = subjects.find((subject) => subject.id === subjectId)

  useEffect(() => {
    if (!open) return
    setDate(initialDate)
    setSubjectId(initialSubjectId || subjects[0]?.id || '')
    setChapters('')
    setStudyHours('')
    setNotes('')
    setErrors({})
    setSubmitError('')
    setSubmitting(false)
  }, [initialDate, initialSubjectId, open])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: Errors = {}
    const parsed = parseChapters(chapters)
    const hours = Number(studyHours)
    if (!validDate(date)) nextErrors.date = '请输入合法日期'
    if (!selectedSubject) nextErrors.subjectId = '请选择科目'
    if ('error' in parsed) nextErrors.completedChapters = parsed.error
    else if (selectedSubject && parsed.chapters.some((chapter) => chapter > selectedSubject.totalChapters)) {
      nextErrors.completedChapters = `章节不能超过该科目总章节数 ${selectedSubject.totalChapters}`
    }
    if (!studyHours || !Number.isFinite(hours) || hours < 0.01 || hours > 24 || !Number.isInteger(hours * 100)) {
      nextErrors.studyHours = '学习时长必须为 0.01 到 24 之间且最多两位小数'
    }
    if (notes.trim().length > 2000) nextErrors.notes = '备注不能超过 2000 个字符'
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length > 0 || 'error' in parsed || !selectedSubject) return

    setSubmitting(true)
    try {
      await onSubmit({
        subjectId,
        date,
        completedChapters: parsed.chapters,
        studyHours: hours,
        ...(notes.trim() && { notes: notes.trim() }),
      })
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
        aria-describedby="study-checkin-dialog-description"
        onEscapeKeyDown={(event) => submitting && event.preventDefault()}
        onPointerDownOutside={(event) => submitting && event.preventDefault()}
        onInteractOutside={(event) => submitting && event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>学习打卡</DialogTitle>
          <DialogDescription id="study-checkin-dialog-description">记录当天完成的章节和学习时长。</DialogDescription>
        </DialogHeader>
        <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-2">
            <Label htmlFor="study-checkin-date">日期</Label>
            <DatePicker id="study-checkin-date" value={date} onValueChange={setDate} disabled={submitting} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'study-checkin-date-error' : undefined} />
            {errors.date && <p id="study-checkin-date-error" className="text-sm text-destructive">{errors.date}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="study-checkin-subject">科目</Label>
            <Select value={subjectId} onValueChange={setSubjectId} disabled={submitting}>
              <SelectTrigger id="study-checkin-subject" aria-invalid={Boolean(errors.subjectId)} aria-describedby={errors.subjectId ? 'study-checkin-subject-error' : undefined}>
                <SelectValue placeholder="选择科目" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.subjectName}（共 {subject.totalChapters} 章）</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.subjectId && <p id="study-checkin-subject-error" className="text-sm text-destructive">{errors.subjectId}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="study-checkin-chapters">完成章节</Label>
            <Input id="study-checkin-chapters" placeholder="例如：1,2,3" value={chapters} onChange={(event) => setChapters(event.target.value)} disabled={submitting} aria-invalid={Boolean(errors.completedChapters)} aria-describedby={errors.completedChapters ? 'study-checkin-chapters-error' : undefined} />
            <p className="text-xs text-muted-foreground">使用半角逗号分隔正整数；当前科目共 {selectedSubject?.totalChapters ?? 0} 章。</p>
            {errors.completedChapters && <p id="study-checkin-chapters-error" className="text-sm text-destructive">{errors.completedChapters}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="study-checkin-hours">学习时长（小时）</Label>
            <Input id="study-checkin-hours" type="number" min="0.01" max="24" step="0.01" inputMode="decimal" value={studyHours} onChange={(event) => setStudyHours(event.target.value)} disabled={submitting} aria-invalid={Boolean(errors.studyHours)} aria-describedby={errors.studyHours ? 'study-checkin-hours-error' : undefined} />
            {errors.studyHours && <p id="study-checkin-hours-error" className="text-sm text-destructive">{errors.studyHours}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="study-checkin-notes">备注（可选）</Label>
            <Textarea id="study-checkin-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} disabled={submitting} aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? 'study-checkin-notes-error' : undefined} />
            {errors.notes && <p id="study-checkin-notes-error" className="text-sm text-destructive">{errors.notes}</p>}
          </div>
          {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button>
            <Button type="submit" disabled={submitting || subjects.length === 0}>{submitting ? '保存中…' : '保存打卡'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { parseChapters }
