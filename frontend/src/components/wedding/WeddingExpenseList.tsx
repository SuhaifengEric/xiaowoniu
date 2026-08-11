import type { WeddingExpenseResponse } from '@xiaowoniu/shared'
import { paidStatusLabels, weddingCategoryLabels } from './wedding.constants'
import { Plus, Receipt, Loader2, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const money = (value: number) => `¥${value.toFixed(2)}`
const dateLabel = (value: string) => { const [year, month, day] = value.split('-'); return `${year}年${Number(month)}月${Number(day)}日` }

export interface WeddingExpenseListProps {
  expenses: WeddingExpenseResponse[]
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onEdit: (expense: WeddingExpenseResponse) => void
  onDelete: (expense: WeddingExpenseResponse) => void
  onCreate: () => void
}

export function WeddingExpenseList({ expenses, loading, hasMore, onLoadMore, onEdit, onDelete, onCreate }: WeddingExpenseListProps) {
  return <section className="wedding-panel" aria-labelledby="wedding-expenses-title">
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-4">
      <div><h2 id="wedding-expenses-title" className="text-xl font-semibold text-stone-950">备婚花费明细</h2></div>
      <Button type="button" className="min-h-11 gap-2" onClick={onCreate}><Plus aria-hidden="true" className="h-4 w-4" />新增花费</Button>
    </div>
    {loading && expenses.length === 0 ? <div className="mt-4 grid gap-3" role="status" aria-label="花费加载中" aria-busy="true"><div className="wedding-skeleton h-16" /><div className="wedding-skeleton h-16" /></div> : expenses.length === 0 ? <div className="py-10 text-center"><Receipt className="mx-auto h-8 w-8 text-stone-400" aria-hidden="true" /><p className="mt-3 text-sm text-stone-600">还没有备婚花费</p><Button type="button" variant="link" className="mt-2 min-h-11" onClick={onCreate}>记下第一笔花费</Button></div> : <>
      <ul className="mt-2">
        {expenses.map((expense) => <li key={expense.id} className="wedding-expense-row flex min-w-0 flex-col gap-2 border-b border-stone-100 py-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1"><div className="flex min-w-0 flex-wrap items-center gap-2"><span className="break-words font-medium text-stone-900">{expense.itemName}</span><span className="rounded-sm bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">{weddingCategoryLabels[expense.category] ?? expense.category}</span><span className="rounded-sm bg-pink-50 px-1.5 py-0.5 text-xs text-pink-800">{paidStatusLabels[expense.paidStatus] ?? expense.paidStatus}</span></div><p className="mt-1 truncate text-sm text-stone-600">{dateLabel(expense.date)} · {expense.task ? `关联：${expense.task.taskName}` : '未关联任务'}{expense.notes ? ` · ${expense.notes}` : ''}</p></div>
          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 sm:justify-end">
            <span className="text-sm text-stone-600">计划 <span className="font-medium text-stone-900">{money(expense.plannedAmount)}</span></span>
            <span className="text-sm text-stone-600">实际 <span className="font-semibold text-stone-950">{money(expense.actualAmount)}</span></span>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" className="wedding-icon-button" aria-label={`编辑花费${expense.itemName}`} onClick={() => onEdit(expense)}><Pencil aria-hidden="true" className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="wedding-icon-button text-stone-500 hover:bg-red-50 hover:text-red-800" aria-label={`删除花费${expense.itemName}`} onClick={() => onDelete(expense)}><Trash2 aria-hidden="true" className="h-4 w-4" /></Button>
            </div>
          </div>
        </li>)}
      </ul>
      {hasMore && <div className="mt-4 text-center"><Button type="button" variant="outline" className="min-h-11 gap-2" onClick={onLoadMore}><Loader2 aria-hidden="true" className="h-4 w-4" />加载更多花费</Button></div>}
    </>}
  </section>
}
