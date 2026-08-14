import { useEffect, useState, type FormEvent } from 'react'
import { Save } from 'lucide-react'
import type {
  CreateSavingDepositRequest,
  SavingDepositResponse,
  SavingPlanResponse,
  UpdateSavingDepositRequest,
} from '@xiaowoniu/shared'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SavingDepositDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateSavingDepositRequest | UpdateSavingDepositRequest) => Promise<unknown>
  plan: SavingPlanResponse
  deposit?: SavingDepositResponse | null
  initialDate?: string
}

type Errors = Partial<Record<'amount' | 'date' | 'notes', string>>

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function moneyError(value: string, minimum = 0.01) {
  if (!value.trim() || !/^\d+(\.\d+)?$/.test(value.trim())) return '请输入有效金额'
  if ((value.split('.')[1]?.length ?? 0) > 2) return '金额最多保留两位小数'
  const amount = Number(value)
  return !Number.isFinite(amount) || amount < minimum || amount > 9999999999.99
    ? '金额必须为 0.01 至 9999999999.99'
    : ''
}

const money = (value: number) => `¥${value.toFixed(2)}`

export default function SavingDepositDialog({
  open,
  onOpenChange,
  onSubmit,
  plan,
  deposit = null,
  initialDate,
}: SavingDepositDialogProps) {
  const editing = Boolean(deposit)
  const remaining = Math.max(0, plan.remainingAmount)
  const available = remaining + (deposit?.amount ?? 0)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(initialDate ?? todayDate())
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setAmount(deposit ? String(deposit.amount) : '')
    setDate(deposit ? (deposit.date ?? '') : initialDate ?? todayDate())
    setNotes(deposit?.notes ?? '')
    setErrors({})
    setSubmitError('')
    setSubmitting(false)
  }, [deposit, initialDate, open])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: Errors = {}
    const amountError = moneyError(amount)
    const numericAmount = Number(amount)
    const trimmedNotes = notes.trim()
    if (amountError) nextErrors.amount = amountError
    else if (numericAmount > available) nextErrors.amount = `本次存入不能超过剩余 ${money(available)}`
    if (!editing && !validDate(date)) nextErrors.date = '请输入合法日期'
    else if (date && !validDate(date)) nextErrors.date = '请输入合法日期'
    else if (date > todayDate()) nextErrors.date = '存入日期不能晚于今天'
    else if (editing && !date && deposit?.date) nextErrors.date = '日期不能清空'
    if (trimmedNotes.length > 2000) nextErrors.notes = '备注不能超过 2000 个字符'
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length > 0) return

    const data: CreateSavingDepositRequest | UpdateSavingDepositRequest = {
      amount: numericAmount,
      ...(editing ? { ...(date ? { date } : {}), notes: trimmedNotes || null } : { date, ...(trimmedNotes ? { notes: trimmedNotes } : {}) }),
    }
    setSubmitting(true)
    try {
      await onSubmit(data)
      onOpenChange(false)
    } catch (value) {
      setSubmitError(value instanceof Error && value.message ? value.message : '保存失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const updateError = (field: keyof Errors, message: string) => setErrors((current) => ({ ...current, [field]: message || undefined }))

  const amountLimitError = amount.trim() && !moneyError(amount) && Number(amount) > available ? `本次存入不能超过剩余 ${money(available)}` : ''
  const amountMessage = errors.amount || amountLimitError
  return <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}><DialogContent aria-describedby="finance-saving-deposit-description" onEscapeKeyDown={(event) => submitting && event.preventDefault()} onPointerDownOutside={(event) => submitting && event.preventDefault()} onInteractOutside={(event) => submitting && event.preventDefault()}><DialogHeader><DialogTitle>{editing ? `编辑「${plan.name}」的存入记录` : `给「${plan.name}」存一笔`}</DialogTitle><DialogDescription id="finance-saving-deposit-description">当前已存 {money(plan.currentAmount)}，距离目标还差 {money(remaining)}。{editing ? `本笔修改后最多可为 ${money(available)}。` : ''}</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={handleSubmit} noValidate><div className="grid gap-2"><Label htmlFor="finance-saving-deposit-amount">存入金额</Label><Input id="finance-saving-deposit-amount" type="text" inputMode="decimal" className="min-h-11" value={amount} onChange={(event) => { setAmount(event.target.value); if (errors.amount) updateError('amount', '') }} disabled={submitting} aria-invalid={Boolean(amountMessage)} aria-describedby={amountMessage ? 'finance-saving-deposit-amount-error' : undefined} />{amountMessage && <p id="finance-saving-deposit-amount-error" role="alert" className="text-sm text-destructive">{amountMessage}</p>}</div><div className="grid gap-2"><Label htmlFor="finance-saving-deposit-date">存入日期</Label><DatePicker id="finance-saving-deposit-date" value={date} onValueChange={(value) => { setDate(value); if (errors.date) updateError('date', '') }} clearLabel="清除存入日期" disabled={submitting} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'finance-saving-deposit-date-error' : undefined} />{errors.date && <p id="finance-saving-deposit-date-error" role="alert" className="text-sm text-destructive">{errors.date}</p>}</div><div className="grid gap-2"><Label htmlFor="finance-saving-deposit-notes">备注</Label><Input id="finance-saving-deposit-notes" type="text" className="min-h-11" value={notes} maxLength={2000} onChange={(event) => { setNotes(event.target.value); if (errors.notes) updateError('notes', '') }} disabled={submitting} aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? 'finance-saving-deposit-notes-error' : undefined} />{errors.notes && <p id="finance-saving-deposit-notes-error" role="alert" className="text-sm text-destructive">{errors.notes}</p>}</div>{submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}<DialogFooter><Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button><Button type="submit" className="min-h-11 gap-2" disabled={submitting}><Save aria-hidden="true" className="h-4 w-4" />{submitting ? '保存中…' : '保存存入记录'}</Button></DialogFooter></form></DialogContent></Dialog>
}

export { moneyError, todayDate, validDate }
export type { SavingDepositDialogProps }
