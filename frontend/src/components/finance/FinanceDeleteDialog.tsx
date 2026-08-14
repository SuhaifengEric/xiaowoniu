import type { SavingDepositResponse } from '@xiaowoniu/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface FinanceDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<unknown>
  resource: 'expense' | 'savingPlan' | 'savingDeposit'
  deposit?: SavingDepositResponse | null
  submitting?: boolean
}

function depositDateLabel(value: string | null | undefined) {
  if (!value) return '日期未知'
  const [year, month, day] = value.split('-')
  return `${year}年${Number(month)}月${Number(day)}日`
}

export default function FinanceDeleteDialog({ open, onOpenChange, onConfirm, resource, deposit = null, submitting = false }: FinanceDeleteDialogProps) {
  const isExpense = resource === 'expense'
  const isDeposit = resource === 'savingDeposit'
  const title = isExpense ? '确认删除消费记录' : isDeposit ? '确认删除存入记录' : '确认删除存钱计划'
  const description = isExpense
    ? '删除后无法恢复。确定要删除这条消费记录吗？'
    : isDeposit && deposit
      ? `确定删除 ${depositDateLabel(deposit.date)} 存入的 ¥${deposit.amount.toFixed(2)} 吗？删除后计划累计金额会减少 ¥${deposit.amount.toFixed(2)}。`
      : '删除后无法恢复，计划中的全部存入记录也会被删除。确定要删除这个存钱计划吗？'
  const handleConfirm = async () => { if (!submitting) await onConfirm() }
  return <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}><DialogContent aria-describedby="finance-delete-description" onEscapeKeyDown={(event) => submitting && event.preventDefault()} onPointerDownOutside={(event) => submitting && event.preventDefault()} onInteractOutside={(event) => submitting && event.preventDefault()}><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription id="finance-delete-description">{description}</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" className="min-h-11" disabled={submitting} onClick={() => onOpenChange(false)}>取消</Button><Button type="button" variant="destructive" className="min-h-11" disabled={submitting} onClick={handleConfirm}>{submitting ? '删除中…' : '确认删除'}</Button></DialogFooter></DialogContent></Dialog>
}
