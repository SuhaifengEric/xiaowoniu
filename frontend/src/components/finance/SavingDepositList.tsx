import type { SavingDepositResponse } from '@xiaowoniu/shared'
import { Pencil, PiggyBank, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { money } from './FinanceSummary'

interface SavingDepositListProps {
  planId: string
  deposits: SavingDepositResponse[]
  loading: boolean
  hasMore: boolean
  error: string | null
  onCreate: () => void
  onLoadMore: () => void
  onEdit: (deposit: SavingDepositResponse) => void
  onDelete: (deposit: SavingDepositResponse) => void
}

function depositDateLabel(value: string | null) {
  if (!value) return '日期未知'
  const [year, month, day] = value.split('-')
  return `${year}年${Number(month)}月${Number(day)}日`
}

export default function SavingDepositList({
  planId,
  deposits,
  loading,
  hasMore,
  error,
  onCreate,
  onLoadMore,
  onEdit,
  onDelete,
}: SavingDepositListProps) {
  const listId = `saving-deposits-${planId}`

  return (
    <section id={listId} className="saving-deposit-list mt-4 border-t border-border/70 pt-4" aria-label="存入记录" aria-busy={loading}>
      {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      {loading && deposits.length === 0 ? (
        <div className="grid gap-2" aria-label="存入记录加载中" aria-busy="true">
          <div className="finance-skeleton h-14" />
          <div className="finance-skeleton h-14" />
        </div>
      ) : deposits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-center">
          <PiggyBank className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm text-muted-foreground">还没有存入记录，存下第一笔吧</p>
          <Button type="button" variant="link" className="mt-1 min-h-11" onClick={onCreate}>存一笔</Button>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border/60">
            {deposits.map((deposit) => {
              const date = depositDateLabel(deposit.date)
              return (
                <li key={deposit.id} className="saving-deposit-row flex min-w-0 items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className="font-medium">{date}</span>
                      {deposit.source === 'legacy_import' && <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">历史金额</span>}
                    </div>
                    {deposit.notes && <p className="mt-1 break-words text-sm text-muted-foreground">{deposit.notes}</p>}
                  </div>
                  <span className="shrink-0 pt-0.5 text-right font-semibold">{money(deposit.amount)}</span>
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" variant="ghost" size="icon" className="finance-icon-button" aria-label={`编辑${date}存入记录`} onClick={() => onEdit(deposit)}>
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="finance-icon-button text-muted-foreground hover:bg-red-50 hover:text-red-800" aria-label={`删除${date}存入记录`} onClick={() => onDelete(deposit)}>
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
          {hasMore && <Button type="button" variant="outline" className="mt-3 min-h-11 w-full" onClick={onLoadMore} disabled={loading}>{loading ? '加载中…' : '加载更多存入记录'}</Button>}
        </>
      )}
    </section>
  )
}

export { depositDateLabel }
export type { SavingDepositListProps }
