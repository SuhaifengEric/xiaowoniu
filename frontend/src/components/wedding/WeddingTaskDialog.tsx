import { useEffect, useState, type FormEvent } from 'react'
import { Save } from 'lucide-react'
import type {
  CreateWeddingTaskRequest,
  TaskStatus,
  UpdateWeddingTaskRequest,
  WeddingTaskCategory,
  WeddingTaskResponse,
} from '@xiaowoniu/shared'
import { priorityOptions, taskStatusOptions, weddingCategoryOptions } from './wedding.constants'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type TaskFormData = CreateWeddingTaskRequest | UpdateWeddingTaskRequest
type Field = 'taskName' | 'category' | 'plannedDate' | 'status' | 'priority' | 'notes'
type Errors = Partial<Record<Field, string>>

interface WeddingTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: TaskFormData) => Promise<unknown>
  task?: WeddingTaskResponse | null
}

function validDate(value: string) {
  if (!value) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const priorityLabel = (value: number) => priorityOptions.find(({ value: option }) => option === value)?.label ?? String(value)

export default function WeddingTaskDialog({ open, onOpenChange, onSubmit, task = null }: WeddingTaskDialogProps) {
  const editing = Boolean(task)
  const [taskName, setTaskName] = useState('')
  const [category, setCategory] = useState<WeddingTaskCategory | ''>('')
  const [plannedDate, setPlannedDate] = useState('')
  const [status, setStatus] = useState<TaskStatus>('pending' as TaskStatus)
  const [priority, setPriority] = useState<string>('3')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setTaskName(task?.taskName ?? '')
    setCategory(task?.category ?? '')
    setPlannedDate(task?.plannedDate ?? '')
    setStatus(task?.status ?? 'pending' as TaskStatus)
    setPriority(String(task?.priority ?? 3))
    setNotes(task?.notes ?? '')
    setErrors({})
    setSubmitError('')
    setSubmitting(false)
  }, [task, open])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: Errors = {}
    if (!taskName.trim()) nextErrors.taskName = '请输入任务名称'
    if (taskName.trim().length > 200) nextErrors.taskName = '任务名称不能超过 200 个字符'
    if (!category) nextErrors.category = '请选择任务类别'
    if (plannedDate && !validDate(plannedDate)) nextErrors.plannedDate = '请输入合法日期'
    if (notes.trim().length > 2000) nextErrors.notes = '备注不能超过 2000 个字符'
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length > 0) return

    const trimmedNotes = notes.trim()
    const data: TaskFormData = editing
      ? {
          taskName: taskName.trim(),
          category: category as WeddingTaskCategory,
          plannedDate: plannedDate || null,
          status,
          priority: Number(priority),
          notes: trimmedNotes || null,
        }
      : {
          taskName: taskName.trim(),
          category: category as WeddingTaskCategory,
          ...(plannedDate ? { plannedDate } : { plannedDate: null }),
          status,
          priority: Number(priority),
          ...(trimmedNotes ? { notes: trimmedNotes } : { notes: null }),
        }
    setSubmitting(true)
    try {
      await onSubmit(data)
      onOpenChange(false)
    } catch (error) {
      setSubmitError(error instanceof Error && error.message ? error.message : '保存失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const setFieldError = (field: Field, message: string) => setErrors((current) => ({ ...current, [field]: message || undefined }))

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}>
      <DialogContent aria-describedby="wedding-task-description" onEscapeKeyDown={(event) => submitting && event.preventDefault()} onPointerDownOutside={(event) => submitting && event.preventDefault()} onInteractOutside={(event) => submitting && event.preventDefault()}>
        <DialogHeader><DialogTitle>{editing ? '编辑备婚任务' : '新建备婚任务'}</DialogTitle><DialogDescription id="wedding-task-description">任务名称、类别和优先级用于看板与时间线排序，完成日期由服务端维护。</DialogDescription></DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-2"><Label htmlFor="wedding-task-name">任务名称</Label><Input id="wedding-task-name" className="min-h-11" value={taskName} onChange={(event) => { setTaskName(event.target.value); setFieldError('taskName', '') }} disabled={submitting} aria-invalid={Boolean(errors.taskName)} aria-describedby={errors.taskName ? 'wedding-task-name-error' : undefined} />{errors.taskName && <p id="wedding-task-name-error" role="alert" className="text-sm text-destructive">{errors.taskName}</p>}</div>
          <div className="grid gap-2"><Label htmlFor="wedding-task-category">任务类别</Label><Select value={category} onValueChange={(value) => { setCategory(value as WeddingTaskCategory); setFieldError('category', '') }} disabled={submitting}><SelectTrigger id="wedding-task-category" className="min-h-11" aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? 'wedding-task-category-error' : undefined}><SelectValue placeholder="选择类别" /></SelectTrigger><SelectContent>{weddingCategoryOptions.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>{errors.category && <p id="wedding-task-category-error" className="text-sm text-destructive">{errors.category}</p>}</div>
          <div className="grid gap-2"><Label htmlFor="wedding-task-planned-date">计划日期</Label><DatePicker id="wedding-task-planned-date" value={plannedDate} onValueChange={(value) => { setPlannedDate(value); setFieldError('plannedDate', '') }} clearLabel="清除计划日期" disabled={submitting} aria-invalid={Boolean(errors.plannedDate)} aria-describedby={errors.plannedDate ? 'wedding-task-planned-date-error' : undefined} />{errors.plannedDate && <p id="wedding-task-planned-date-error" className="text-sm text-destructive">{errors.plannedDate}</p>}</div>
          <div className="grid gap-2"><Label htmlFor="wedding-task-status">任务状态</Label><Select value={status} onValueChange={(value) => { setStatus(value as TaskStatus); setFieldError('status', '') }} disabled={submitting}><SelectTrigger id="wedding-task-status" className="min-h-11"><SelectValue>{taskStatusOptions.find(({ value: option }) => option === status)?.label ?? status}</SelectValue></SelectTrigger><SelectContent>{taskStatusOptions.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-2"><Label htmlFor="wedding-task-priority">优先级</Label><Select value={priority} onValueChange={(value) => { setPriority(value); setFieldError('priority', '') }} disabled={submitting}><SelectTrigger id="wedding-task-priority" className="min-h-11"><SelectValue>{priorityLabel(Number(priority))}</SelectValue></SelectTrigger><SelectContent>{priorityOptions.map(({ value, label }) => <SelectItem key={value} value={String(value)}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-2"><Label htmlFor="wedding-task-notes">备注</Label><Textarea id="wedding-task-notes" className="min-h-24" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} disabled={submitting} aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? 'wedding-task-notes-error' : undefined} />{errors.notes && <p id="wedding-task-notes-error" className="text-sm text-destructive">{errors.notes}</p>}</div>
          {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
          <DialogFooter><Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button><Button type="submit" className="min-h-11 gap-2" disabled={submitting}><Save aria-hidden="true" className="h-4 w-4" />{submitting ? '保存中…' : '保存任务'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
