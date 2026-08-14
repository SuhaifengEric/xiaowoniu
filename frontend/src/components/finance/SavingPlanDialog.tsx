import { useEffect, useState, type FormEvent } from 'react'
import { Save } from 'lucide-react'
import type { CreateSavingPlanRequest, SavingPlanResponse, UpdateSavingPlanRequest } from '@xiaowoniu/shared'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SavingPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateSavingPlanRequest | UpdateSavingPlanRequest) => Promise<unknown>
  plan?: SavingPlanResponse | null
}

type Errors = Partial<Record<'name' | 'targetAmount' | 'targetDate', string>>

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
function moneyError(value: string, minimum: number) {
  if (!value.trim() || !/^\d+(\.\d+)?$/.test(value.trim())) return '请输入有效金额'
  if ((value.split('.')[1]?.length ?? 0) > 2) return '金额最多保留两位小数'
  const amount = Number(value)
  return !Number.isFinite(amount) || amount < minimum || amount > 9999999999.99 ? `金额必须为 ${minimum === 0 ? '0' : '0.01'} 至 9999999999.99` : ''
}

export default function SavingPlanDialog({ open, onOpenChange, onSubmit, plan = null }: SavingPlanDialogProps) {
  const editing = Boolean(plan)
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(plan?.name ?? '')
    setTargetAmount(plan ? String(plan.targetAmount) : '')
    setTargetDate(plan?.targetDate ?? '')
    setErrors({})
    setSubmitError('')
    setSubmitting(false)
  }, [open, plan])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: Errors = {}
    const trimmedName = name.trim()
    const targetError = moneyError(targetAmount, 0.01)
    const target = Number(targetAmount)
    if (!trimmedName) nextErrors.name = '请输入计划名称'
    else if (trimmedName.length > 100) nextErrors.name = '计划名称不能超过 100 个字符'
    if (targetError) nextErrors.targetAmount = targetError
    else if (editing && plan && target < plan.currentAmount) nextErrors.targetAmount = `目标金额不能小于已存总额 ¥${plan.currentAmount.toFixed(2)}`
    if (!validDate(targetDate)) nextErrors.targetDate = '请输入合法日期'
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length > 0) return
    const data: CreateSavingPlanRequest | UpdateSavingPlanRequest = { name: trimmedName, targetAmount: target, targetDate }
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
  return <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}><DialogContent aria-describedby="finance-saving-description" onEscapeKeyDown={(event) => submitting && event.preventDefault()} onPointerDownOutside={(event) => submitting && event.preventDefault()} onInteractOutside={(event) => submitting && event.preventDefault()}><DialogHeader><DialogTitle>{editing ? '编辑存钱计划' : '新建存钱计划'}</DialogTitle><DialogDescription id="finance-saving-description">先设置目标；建立后可通过“存一笔”记录每次实际存入。</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={handleSubmit} noValidate><div className="grid gap-2"><Label htmlFor="finance-saving-name">计划名称</Label><Input id="finance-saving-name" className="min-h-11" value={name} maxLength={100} onChange={(event) => { setName(event.target.value); if (errors.name) updateError('name', '') }} disabled={submitting} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'finance-saving-name-error' : undefined} />{errors.name && <p id="finance-saving-name-error" className="text-sm text-destructive">{errors.name}</p>}</div><div className="grid gap-2"><Label htmlFor="finance-saving-target">目标金额</Label><Input id="finance-saving-target" type="text" inputMode="decimal" className="min-h-11" value={targetAmount} onChange={(event) => { setTargetAmount(event.target.value); if (errors.targetAmount) updateError('targetAmount', moneyError(event.target.value, 0.01)) }} disabled={submitting} aria-invalid={Boolean(errors.targetAmount)} aria-describedby={errors.targetAmount ? 'finance-saving-target-error' : undefined} />{errors.targetAmount && <p id="finance-saving-target-error" role="alert" className="text-sm text-destructive">{errors.targetAmount}</p>}</div><div className="grid gap-2"><Label htmlFor="finance-saving-date">目标日期</Label><DatePicker id="finance-saving-date" value={targetDate} onValueChange={(value) => { setTargetDate(value); if (errors.targetDate) updateError('targetDate', '') }} clearLabel="清除目标日期" disabled={submitting} aria-invalid={Boolean(errors.targetDate)} aria-describedby={errors.targetDate ? 'finance-saving-date-error' : undefined} />{errors.targetDate && <p id="finance-saving-date-error" className="text-sm text-destructive">{errors.targetDate}</p>}</div>{submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}<DialogFooter><Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button><Button type="submit" className="min-h-11 gap-2" disabled={submitting}><Save aria-hidden="true" className="h-4 w-4" />{submitting ? '保存中…' : editing ? '保存计划' : '创建存钱计划'}</Button></DialogFooter></form></DialogContent></Dialog>
}

export { validDate, moneyError }
