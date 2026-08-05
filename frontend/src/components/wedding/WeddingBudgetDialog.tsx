import { useEffect, useState, type FormEvent } from 'react'
import { Save } from 'lucide-react'
import type { UpsertWeddingBudgetRequest, WeddingBudgetResponse } from '@xiaowoniu/shared'
import { moneyError } from './WeddingExpenseDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface WeddingBudgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: UpsertWeddingBudgetRequest) => Promise<unknown>
  budget?: WeddingBudgetResponse | null
}

function validDate(value: string) {
  if (!value) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export default function WeddingBudgetDialog({ open, onOpenChange, onSubmit, budget = null }: WeddingBudgetDialogProps) {
  const [totalBudget, setTotalBudget] = useState('')
  const [weddingDate, setWeddingDate] = useState('')
  const [errors, setErrors] = useState<{ totalBudget?: string; weddingDate?: string }>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setTotalBudget(budget ? String(budget.totalBudget) : '')
    setWeddingDate(budget?.weddingDate ?? '')
    setErrors({})
    setSubmitError('')
    setSubmitting(false)
  }, [budget, open])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: { totalBudget?: string; weddingDate?: string } = {}
    const budgetMessage = moneyError(totalBudget, 0)
    if (budgetMessage) nextErrors.totalBudget = budgetMessage
    if (!validDate(weddingDate)) nextErrors.weddingDate = '请输入合法婚礼日期'
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      await onSubmit({ totalBudget: Number(totalBudget), weddingDate })
      onOpenChange(false)
    } catch (error) {
      setSubmitError(error instanceof Error && error.message ? error.message : '保存失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}>
      <DialogContent aria-describedby="wedding-budget-description" onEscapeKeyDown={(event) => submitting && event.preventDefault()} onPointerDownOutside={(event) => submitting && event.preventDefault()} onInteractOutside={(event) => submitting && event.preventDefault()}>
        <DialogHeader><DialogTitle>设置备婚预算与婚期</DialogTitle><DialogDescription id="wedding-budget-description">总预算用于计算预算使用情况，婚礼日期用于倒计时与里程碑终点。</DialogDescription></DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-2"><Label htmlFor="wedding-budget-total">总预算</Label><Input id="wedding-budget-total" type="text" inputMode="decimal" className="min-h-11" value={totalBudget} onChange={(event) => { setTotalBudget(event.target.value); setErrors((current) => ({ ...current, totalBudget: moneyError(event.target.value, 0) || undefined })) }} disabled={submitting} aria-invalid={Boolean(errors.totalBudget)} aria-describedby={errors.totalBudget ? 'wedding-budget-total-error' : undefined} />{errors.totalBudget && <p id="wedding-budget-total-error" role="alert" className="text-sm text-destructive">{errors.totalBudget}</p>}</div>
          <div className="grid gap-2"><Label htmlFor="wedding-budget-date">婚礼日期</Label><Input id="wedding-budget-date" type="date" className="min-h-11" value={weddingDate} onChange={(event) => { setWeddingDate(event.target.value); setErrors((current) => ({ ...current, weddingDate: undefined })) }} disabled={submitting} aria-invalid={Boolean(errors.weddingDate)} aria-describedby={errors.weddingDate ? 'wedding-budget-date-error' : undefined} />{errors.weddingDate && <p id="wedding-budget-date-error" className="text-sm text-destructive">{errors.weddingDate}</p>}</div>
          {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
          <DialogFooter><Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button><Button type="submit" className="min-h-11 gap-2" disabled={submitting}><Save aria-hidden="true" className="h-4 w-4" />{submitting ? '保存中…' : '保存预算'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
