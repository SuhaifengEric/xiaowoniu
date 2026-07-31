import { useEffect, useState, type FormEvent } from 'react'
import type {
  CreateStudySubjectRequest,
  ExamCountdownResponse,
  StudySubjectResponse,
  UpdateStudySubjectRequest,
} from '@xiaowoniu/shared'
import { Button } from '@/components/ui/button'
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

type SubjectFormData = CreateStudySubjectRequest | UpdateStudySubjectRequest
type Errors = Partial<Record<'subjectName' | 'totalChapters' | 'targetCompletionDate', string>>

interface SubjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: SubjectFormData) => Promise<unknown>
  exam: ExamCountdownResponse | null
  subject?: StudySubjectResponse | null
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

export default function SubjectDialog({ open, onOpenChange, onSubmit, exam, subject = null }: SubjectDialogProps) {
  const editing = Boolean(subject)
  const [subjectName, setSubjectName] = useState('')
  const [totalChapters, setTotalChapters] = useState('')
  const [targetCompletionDate, setTargetCompletionDate] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setSubjectName(subject?.subjectName ?? '')
    setTotalChapters(subject?.totalChapters.toString() ?? '')
    setTargetCompletionDate(subject?.targetCompletionDate ?? '')
    setErrors({})
    setSubmitError('')
    setSubmitting(false)
  }, [open, subject])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedName = subjectName.trim()
    const chapters = Number(totalChapters)
    const nextErrors: Errors = {}
    if (!trimmedName) nextErrors.subjectName = '请输入科目名称'
    else if (trimmedName.length > 100) nextErrors.subjectName = '科目名称不能超过 100 个字符'
    if (!Number.isSafeInteger(chapters) || chapters < 1 || chapters > 10000) {
      nextErrors.totalChapters = '总章节数必须为 1 到 10000 之间的整数'
    } else if (subject && chapters < subject.currentChapter) {
      nextErrors.totalChapters = `总章节数不能少于已完成章节数 ${subject.currentChapter}`
    }
    if (targetCompletionDate && !validDate(targetCompletionDate)) {
      nextErrors.targetCompletionDate = '请输入合法日期'
    } else if (targetCompletionDate && exam && targetCompletionDate < exam.examDate) {
      nextErrors.targetCompletionDate = '目标完成日期不能早于考试日期'
    }
    if (!exam) nextErrors.subjectName = '请先选择考试'
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length > 0 || !exam) return

    setSubmitting(true)
    try {
      const data: SubjectFormData = editing
        ? {
            subjectName: trimmedName,
            totalChapters: chapters,
            targetCompletionDate: targetCompletionDate || null,
          }
        : {
            examId: exam.id,
            subjectName: trimmedName,
            totalChapters: chapters,
            ...(targetCompletionDate && { targetCompletionDate }),
          }
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
        aria-describedby="subject-dialog-description"
        onEscapeKeyDown={(event) => submitting && event.preventDefault()}
        onPointerDownOutside={(event) => submitting && event.preventDefault()}
        onInteractOutside={(event) => submitting && event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{editing ? '编辑科目' : '新建科目'}</DialogTitle>
          <DialogDescription id="subject-dialog-description">
            {exam ? `所属考试：${exam.examName}` : '请先选择考试。'}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
          {!editing && (
            <div className="grid gap-2">
              <Label htmlFor="subject-exam">所属考试</Label>
              <Input id="subject-exam" value={exam?.examName ?? '未选择考试'} readOnly disabled />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="subject-name">科目名称</Label>
            <Input
              id="subject-name"
              value={subjectName}
              onChange={(event) => setSubjectName(event.target.value)}
              maxLength={100}
              disabled={submitting}
              aria-invalid={Boolean(errors.subjectName)}
              aria-describedby={errors.subjectName ? 'subject-name-error' : undefined}
            />
            {errors.subjectName && <p id="subject-name-error" className="text-sm text-destructive">{errors.subjectName}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="subject-chapters">总章节数</Label>
            <Input
              id="subject-chapters"
              type="number"
              min="1"
              max="10000"
              step="1"
              inputMode="numeric"
              value={totalChapters}
              onChange={(event) => setTotalChapters(event.target.value)}
              disabled={submitting}
              aria-invalid={Boolean(errors.totalChapters)}
              aria-describedby={errors.totalChapters ? 'subject-chapters-error' : undefined}
            />
            {errors.totalChapters && <p id="subject-chapters-error" className="text-sm text-destructive">{errors.totalChapters}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="subject-target-date">目标完成日期（可选）</Label>
            <Input
              id="subject-target-date"
              type="date"
              value={targetCompletionDate}
              onChange={(event) => setTargetCompletionDate(event.target.value)}
              disabled={submitting}
              aria-invalid={Boolean(errors.targetCompletionDate)}
              aria-describedby={errors.targetCompletionDate ? 'subject-target-date-error' : undefined}
            />
            {errors.targetCompletionDate && <p id="subject-target-date-error" className="text-sm text-destructive">{errors.targetCompletionDate}</p>}
          </div>
          {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button>
            <Button type="submit" disabled={submitting || !exam}>{submitting ? '保存中…' : editing ? '保存科目' : '创建科目'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
