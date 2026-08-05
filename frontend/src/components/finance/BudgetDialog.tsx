import { useEffect, useState, type FormEvent } from 'react'
import { Save } from 'lucide-react'
import type { CreateBudgetRequest, MonthlyBudgetResponse } from '@xiaowoniu/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface BudgetDialogProps {
  open: boolean
  month: string
  budget?: MonthlyBudgetResponse | null
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateBudgetRequest) => Promise<unknown>
}

function monthLabel(month: string) {
  const [year, value] = month.split('-')
  return `${year}年${Number(value)}月`
}

function budgetError(value: string) {
  if (!value.trim() || !/^\d+(\.\d+)?$/.test(value.trim())) return '请输入有效金额'
  if ((value.split('.')[1]?.length ?? 0) > 2) return '金额最多保留两位小数'
  const amount = Number(value)
  return !Number.isFinite(amount) || amount < 0 || amount > 9999999999.99 ? '金额必须为 0 至 9999999999.99' : ''
}

export default function BudgetDialog({ open, month, budget = null, onOpenChange, onSubmit }: BudgetDialogProps) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setAmount(budget ? String(budget.amount) : '')
    setError('')
    setSubmitError('')
    setSubmitting(false)
  }, [budget, month, open])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const nextError = budgetError(amount)
    setError(nextError)
    setSubmitError('')
    if (nextError) return
    setSubmitting(true)
    try {
      await onSubmit({ month, amount: Number(amount) })
      onOpenChange(false)
    } catch (value) {
      setSubmitError(value instanceof Error && value.message ? value.message : '保存失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}><DialogContent aria-describedby="finance-budget-description" onEscapeKeyDown={(event) => submitting && event.preventDefault()} onPointerDownOutside={(event) => submitting && event.preventDefault()} onInteractOutside={(event) => submitting && event.preventDefault()}><DialogHeader><DialogTitle>设置{monthLabel(month)}预算</DialogTitle><DialogDescription id="finance-budget-description">预算为 0 表示本月不安排预算。</DialogDescription></DialogHeader><form className="grid gap-5" onSubmit={handleSubmit} noValidate><div className="grid gap-2"><Label htmlFor="finance-budget-amount">预算金额</Label><Input id="finance-budget-amount" type="text" inputMode="decimal" className="min-h-11" value={amount} onChange={(event) => { setAmount(event.target.value); if (error) setError(budgetError(event.target.value)) }} disabled={submitting} aria-invalid={Boolean(error)} aria-describedby={error ? 'finance-budget-amount-error' : undefined} />{error && <p id="finance-budget-amount-error" role="alert" className="text-sm text-destructive">{error}</p>}</div>{submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}<DialogFooter><Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button><Button type="submit" className="min-h-11 gap-2" disabled={submitting}><Save aria-hidden="true" className="h-4 w-4" />{submitting ? '保存中…' : '保存预算'}</Button></DialogFooter></form></DialogContent></Dialog>
}

export { monthLabel, budgetError }
