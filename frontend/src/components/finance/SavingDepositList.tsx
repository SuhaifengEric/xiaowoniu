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
    <section id={listId} className="saving-deposit-list mt-5 border-t border-border/70 pt-5" aria-label="存入记录" aria-busy={loading}>
      {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      {loading && deposits.length === 0 ? (
        <div className="grid gap-2" aria-label="存入记录加载中" aria-busy="true">
          <div className="finance-skeleton h-14" />
          <div className="finance-skeleton h-14" />
        </div>
      ) : deposits.length === 0 ? (
        <div className="saving-deposit-empty flex flex-wrap items-center justify-between gap-3 border border-dashed border-border p-4">
          <div className="flex min-w-0 items-center gap-3"><PiggyBank className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden="true" /><p className="text-sm text-muted-foreground">还没有存入记录，存下第一笔吧</p></div>
          <Button type="button" variant="link" className="min-h-11 shrink-0 px-0" onClick={onCreate}>存一笔</Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2"><div><h4 className="text-sm font-semibold">存入记录</h4><p className="mt-1 text-xs text-muted-foreground">按日期回看每次实际存入</p></div><span className="text-xs text-muted-foreground">{deposits.length}{hasMore ? '+' : ''} 条已加载</span></div>
          <ul className="mt-2 divide-y divide-border/60">
            {deposits.map((deposit) => {
              const date = depositDateLabel(deposit.date)
              return (
                <li key={deposit.id} className="saving-deposit-row grid min-w-0 gap-x-4 gap-y-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className="font-medium">{date}</span>
                      {deposit.source === 'legacy_import' && <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">历史金额</span>}
                    </div>
                    {deposit.notes && <p className="mt-1 break-words [overflow-wrap:anywhere] text-sm leading-6 text-muted-foreground">{deposit.notes}</p>}
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:row-span-2 sm:items-start sm:justify-end"><span className="shrink-0 pt-0.5 text-right font-semibold tabular-nums">{money(deposit.amount)}</span><div className="flex shrink-0 gap-1">
                    <Button type="button" variant="ghost" size="icon" className="finance-icon-button" aria-label={`编辑${date}存入记录`} onClick={() => onEdit(deposit)}>
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="finance-icon-button text-muted-foreground hover:bg-red-50 hover:text-red-800" aria-label={`删除${date}存入记录`} onClick={() => onDelete(deposit)}>
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div></div>
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
