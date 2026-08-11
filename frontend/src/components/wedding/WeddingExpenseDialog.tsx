import { useEffect, useState, type FormEvent } from 'react'
import { Save, Unlink } from 'lucide-react'
import type {
  CreateWeddingExpenseRequest,
  PaidStatus,
  UpdateWeddingExpenseRequest,
  WeddingExpenseResponse,
  WeddingTaskCategory,
  WeddingTaskResponse,
} from '@xiaowoniu/shared'
import { paidStatusOptions, weddingCategoryOptions } from './wedding.constants'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type ExpenseFormData = CreateWeddingExpenseRequest | UpdateWeddingExpenseRequest
type Field = 'date' | 'itemName' | 'category' | 'plannedAmount' | 'actualAmount' | 'paidStatus' | 'taskId' | 'notes'
type Errors = Partial<Record<Field, string>>

interface WeddingExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ExpenseFormData) => Promise<unknown>
  tasks: WeddingTaskResponse[]
  expense?: WeddingExpenseResponse | null
  initialDate?: string
}

function validDate(value: string) {
  if (!value) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function moneyError(value: string, minimum = 0) {
  if (!value.trim()) return '请输入有效金额'
  if (!/^\d+(\.\d+)?$/.test(value.trim())) return '请输入有效金额'
  if ((value.split('.')[1]?.length ?? 0) > 2) return '金额最多保留两位小数'
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < minimum || amount > 9999999999.99) return `金额必须为 ${minimum === 0.01 ? '0.01' : '0'} 至 9999999999.99`
  return ''
}

export default function WeddingExpenseDialog({ open, onOpenChange, onSubmit, tasks, expense = null, initialDate = '' }: WeddingExpenseDialogProps) {
  const editing = Boolean(expense)
  const [date, setDate] = useState(initialDate)
  const [itemName, setItemName] = useState('')
  const [category, setCategory] = useState<WeddingTaskCategory | ''>('')
  const [plannedAmount, setPlannedAmount] = useState('')
  const [actualAmount, setActualAmount] = useState('')
  const [paidStatus, setPaidStatus] = useState<PaidStatus | ''>('')
  const [taskId, setTaskId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setDate(expense?.date ?? initialDate)
    setItemName(expense?.itemName ?? '')
    setCategory(expense?.category ?? '')
    setPlannedAmount(expense ? String(expense.plannedAmount) : '')
    setActualAmount(expense ? String(expense.actualAmount) : '')
    setPaidStatus(expense?.paidStatus ?? '')
    setTaskId(expense?.taskId ?? '')
    setNotes(expense?.notes ?? '')
    setErrors({})
    setSubmitError('')
    setSubmitting(false)
  }, [expense, initialDate, open])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: Errors = {}
    if (!validDate(date)) nextErrors.date = '请输入合法日期'
    if (!itemName.trim()) nextErrors.itemName = '请输入条目名称'
    if (itemName.trim().length > 200) nextErrors.itemName = '条目名称不能超过 200 个字符'
    if (!category) nextErrors.category = '请选择花费类别'
    const plannedMessage = moneyError(plannedAmount, 0)
    const actualMessage = moneyError(actualAmount, 0)
    if (plannedMessage) nextErrors.plannedAmount = plannedMessage
    if (actualMessage) nextErrors.actualAmount = actualMessage
    if (!paidStatus) nextErrors.paidStatus = '请选择支付状态'
    if (notes.trim().length > 2000) nextErrors.notes = '备注不能超过 2000 个字符'
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length > 0) return

    const trimmedNotes = notes.trim()
    const data: ExpenseFormData = editing
      ? {
          taskId: taskId || null,
          date,
          itemName: itemName.trim(),
          category: category as WeddingTaskCategory,
          plannedAmount: Number(plannedAmount),
          actualAmount: Number(actualAmount),
          paidStatus: paidStatus as PaidStatus,
          notes: trimmedNotes || null,
        }
      : {
          ...(taskId ? { taskId } : {}),
          date,
          itemName: itemName.trim(),
          category: category as WeddingTaskCategory,
          plannedAmount: Number(plannedAmount),
          actualAmount: Number(actualAmount),
          paidStatus: paidStatus as PaidStatus,
          ...(trimmedNotes ? { notes: trimmedNotes } : {}),
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
      <DialogContent aria-describedby="wedding-expense-description" onEscapeKeyDown={(event) => submitting && event.preventDefault()} onPointerDownOutside={(event) => submitting && event.preventDefault()} onInteractOutside={(event) => submitting && event.preventDefault()}>
        <DialogHeader><DialogTitle>{editing ? '编辑备婚花费' : '新增备婚花费'}</DialogTitle><DialogDescription id="wedding-expense-description">记录花费日期、类别、计划与实际金额；类别独立保存，不随关联任务变化。</DialogDescription></DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-2"><Label htmlFor="wedding-expense-date">花费日期</Label><DatePicker id="wedding-expense-date" value={date} onValueChange={(value) => { setDate(value); setFieldError('date', '') }} disabled={submitting} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'wedding-expense-date-error' : undefined} />{errors.date && <p id="wedding-expense-date-error" role="alert" className="text-sm text-destructive">{errors.date}</p>}</div>
          <div className="grid gap-2"><Label htmlFor="wedding-expense-item-name">条目名称</Label><Input id="wedding-expense-item-name" className="min-h-11" value={itemName} onChange={(event) => { setItemName(event.target.value); setFieldError('itemName', '') }} disabled={submitting} aria-invalid={Boolean(errors.itemName)} aria-describedby={errors.itemName ? 'wedding-expense-item-name-error' : undefined} />{errors.itemName && <p id="wedding-expense-item-name-error" role="alert" className="text-sm text-destructive">{errors.itemName}</p>}</div>
          <div className="grid gap-2"><Label htmlFor="wedding-expense-category">花费类别</Label><Select value={category} onValueChange={(value) => { setCategory(value as WeddingTaskCategory); setFieldError('category', '') }} disabled={submitting}><SelectTrigger id="wedding-expense-category" className="min-h-11" aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? 'wedding-expense-category-error' : undefined}><SelectValue placeholder="选择类别" /></SelectTrigger><SelectContent>{weddingCategoryOptions.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>{errors.category && <p id="wedding-expense-category-error" className="text-sm text-destructive">{errors.category}</p>}</div>
          <div className="grid gap-2"><Label htmlFor="wedding-expense-planned-amount">计划金额</Label><Input id="wedding-expense-planned-amount" type="text" inputMode="decimal" className="min-h-11" value={plannedAmount} onChange={(event) => { setPlannedAmount(event.target.value); setFieldError('plannedAmount', moneyError(event.target.value, 0)) }} disabled={submitting} aria-invalid={Boolean(errors.plannedAmount)} aria-describedby={errors.plannedAmount ? 'wedding-expense-planned-amount-error' : undefined} />{errors.plannedAmount && <p id="wedding-expense-planned-amount-error" role="alert" className="text-sm text-destructive">{errors.plannedAmount}</p>}</div>
          <div className="grid gap-2"><Label htmlFor="wedding-expense-actual-amount">实际金额</Label><Input id="wedding-expense-actual-amount" type="text" inputMode="decimal" className="min-h-11" value={actualAmount} onChange={(event) => { setActualAmount(event.target.value); setFieldError('actualAmount', moneyError(event.target.value, 0)) }} disabled={submitting} aria-invalid={Boolean(errors.actualAmount)} aria-describedby={errors.actualAmount ? 'wedding-expense-actual-amount-error' : undefined} />{errors.actualAmount && <p id="wedding-expense-actual-amount-error" role="alert" className="text-sm text-destructive">{errors.actualAmount}</p>}</div>
          <div className="grid gap-2"><Label htmlFor="wedding-expense-paid-status">支付状态</Label><Select value={paidStatus} onValueChange={(value) => { setPaidStatus(value as PaidStatus); setFieldError('paidStatus', '') }} disabled={submitting}><SelectTrigger id="wedding-expense-paid-status" className="min-h-11" aria-invalid={Boolean(errors.paidStatus)} aria-describedby={errors.paidStatus ? 'wedding-expense-paid-status-error' : undefined}><SelectValue placeholder="选择支付状态" /></SelectTrigger><SelectContent>{paidStatusOptions.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>{errors.paidStatus && <p id="wedding-expense-paid-status-error" className="text-sm text-destructive">{errors.paidStatus}</p>}</div>
          <div className="grid gap-2"><Label htmlFor="wedding-expense-task">关联任务</Label><div className="flex gap-2"><Select value={taskId} onValueChange={(value) => { setTaskId(value); setFieldError('taskId', '') }} disabled={submitting}><SelectTrigger id="wedding-expense-task" className="min-h-11 flex-1"><SelectValue placeholder="无关联任务" /></SelectTrigger><SelectContent><SelectItem value="__none__">无关联任务</SelectItem>{tasks.map(({ id, taskName }) => <SelectItem key={id} value={id}>{taskName}</SelectItem>)}</SelectContent></Select>{taskId && <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => setTaskId('')} disabled={submitting}><Unlink aria-hidden="true" className="h-4 w-4" />解除任务关联</Button>}</div></div>
          <div className="grid gap-2"><Label htmlFor="wedding-expense-notes">备注</Label><Textarea id="wedding-expense-notes" className="min-h-24" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} disabled={submitting} aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? 'wedding-expense-notes-error' : undefined} />{errors.notes && <p id="wedding-expense-notes-error" className="text-sm text-destructive">{errors.notes}</p>}</div>
          {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
          <DialogFooter><Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button><Button type="submit" className="min-h-11 gap-2" disabled={submitting}><Save aria-hidden="true" className="h-4 w-4" />{submitting ? '保存中…' : '保存花费'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
