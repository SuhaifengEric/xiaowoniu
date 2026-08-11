import { useEffect, useState, type FormEvent } from 'react'
import { Save } from 'lucide-react'
import type { CreateExpenseRequest, ExpenseResponse, UpdateExpenseRequest, ExpenseCategory, PaymentMethod } from '@xiaowoniu/shared'
import { financeCategoryOptions, financePaymentMethodOptions } from './finance.constants'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type ExpenseFormData = CreateExpenseRequest | UpdateExpenseRequest
type Field = 'date' | 'amount' | 'category' | 'paymentMethod' | 'notes'
type Errors = Partial<Record<Field, string>>

interface ExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ExpenseFormData) => Promise<unknown>
  expense?: ExpenseResponse | null
  initialDate?: string
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const categoryValues = financeCategoryOptions
const paymentMethodValues = financePaymentMethodOptions

function moneyError(value: string, minimum: number) {
  if (!value.trim()) return '请输入有效金额'
  if (!/^\d+(\.\d+)?$/.test(value.trim())) return '请输入有效金额'
  if ((value.split('.')[1]?.length ?? 0) > 2) return '金额最多保留两位小数'
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < minimum || amount > 9999999999.99) return `金额必须为 ${minimum === 0.01 ? '0.01' : '0'} 至 9999999999.99`
  return ''
}

export default function ExpenseDialog({ open, onOpenChange, onSubmit, expense = null, initialDate = '' }: ExpenseDialogProps) {
  const editing = Boolean(expense)
  const [date, setDate] = useState(initialDate)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory | ''>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setDate(expense?.date ?? initialDate)
    setAmount(expense ? String(expense.amount) : '')
    setCategory(expense?.category ?? '')
    setPaymentMethod(expense?.paymentMethod ?? '')
    setNotes(expense?.notes ?? '')
    setErrors({})
    setSubmitError('')
    setSubmitting(false)
  }, [expense, initialDate, open])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: Errors = {}
    const amountMessage = moneyError(amount, 0.01)
    if (!validDate(date)) nextErrors.date = '请输入合法日期'
    if (amountMessage) nextErrors.amount = amountMessage
    if (!category) nextErrors.category = '请选择消费类别'
    if (!paymentMethod) nextErrors.paymentMethod = '请选择支付方式'
    if (notes.trim().length > 2000) nextErrors.notes = '备注不能超过 2000 个字符'
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length > 0) return

    const trimmedNotes = notes.trim()
    const data: ExpenseFormData = editing
      ? { date, amount: Number(amount), category: category as ExpenseCategory, paymentMethod: paymentMethod as PaymentMethod, notes: trimmedNotes || null }
      : { date, amount: Number(amount), category: category as ExpenseCategory, paymentMethod: paymentMethod as PaymentMethod, ...(trimmedNotes ? { notes: trimmedNotes } : {}) }
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
      <DialogContent aria-describedby="finance-expense-description" onEscapeKeyDown={(event) => submitting && event.preventDefault()} onPointerDownOutside={(event) => submitting && event.preventDefault()} onInteractOutside={(event) => submitting && event.preventDefault()}>
        <DialogHeader><DialogTitle>{editing ? '编辑消费记录' : '记一笔消费'}</DialogTitle><DialogDescription id="finance-expense-description">记录日期、金额和支付方式，方便按月回顾。</DialogDescription></DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-2"><Label htmlFor="finance-expense-date">日期</Label><DatePicker id="finance-expense-date" value={date} onValueChange={setDate} disabled={submitting} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'finance-expense-date-error' : undefined} />{errors.date && <p id="finance-expense-date-error" className="text-sm text-destructive">{errors.date}</p>}</div>
          <div className="grid gap-2"><Label htmlFor="finance-expense-amount">金额</Label><Input id="finance-expense-amount" type="text" inputMode="decimal" className="min-h-11" value={amount} onChange={(event) => { setAmount(event.target.value); setFieldError('amount', moneyError(event.target.value, 0.01)) }} disabled={submitting} aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? 'finance-expense-amount-error' : undefined} />{errors.amount && <p id="finance-expense-amount-error" role="alert" className="text-sm text-destructive">{errors.amount}</p>}</div>
          <div className="grid gap-2"><Label htmlFor="finance-expense-category">消费类别</Label><Select value={category} onValueChange={(value) => { setCategory(value as ExpenseCategory); setFieldError('category', '') }} disabled={submitting}><SelectTrigger id="finance-expense-category" className="min-h-11" aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? 'finance-expense-category-error' : undefined}><SelectValue placeholder="选择类别" /></SelectTrigger><SelectContent>{categoryValues.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>{errors.category && <p id="finance-expense-category-error" className="text-sm text-destructive">{errors.category}</p>}</div>
          <div className="grid gap-2"><Label htmlFor="finance-expense-payment">支付方式</Label><Select value={paymentMethod} onValueChange={(value) => { setPaymentMethod(value as PaymentMethod); setFieldError('paymentMethod', '') }} disabled={submitting}><SelectTrigger id="finance-expense-payment" className="min-h-11" aria-invalid={Boolean(errors.paymentMethod)} aria-describedby={errors.paymentMethod ? 'finance-expense-payment-error' : undefined}><SelectValue placeholder="选择支付方式" /></SelectTrigger><SelectContent>{paymentMethodValues.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>{errors.paymentMethod && <p id="finance-expense-payment-error" className="text-sm text-destructive">{errors.paymentMethod}</p>}</div>
          <div className="grid gap-2"><Label htmlFor="finance-expense-notes">备注</Label><Textarea id="finance-expense-notes" className="min-h-24" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} disabled={submitting} aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? 'finance-expense-notes-error' : undefined} />{errors.notes && <p id="finance-expense-notes-error" className="text-sm text-destructive">{errors.notes}</p>}</div>
          {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
          <DialogFooter><Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button><Button type="submit" className="min-h-11 gap-2" disabled={submitting}><Save aria-hidden="true" className="h-4 w-4" />{submitting ? '保存中…' : editing ? '保存消费' : '保存消费'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { validDate, moneyError }
