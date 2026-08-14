import { useState } from 'react'
import type { SavingDepositResponse, SavingPlanResponse } from '@xiaowoniu/shared'
import { Check, Pencil, PiggyBank, Target, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { dateLabel, money } from './FinanceSummary'
import SavingDepositList from './SavingDepositList'

interface SavingPlanListProps {
  plans: SavingPlanResponse[]
  loading: boolean
  onCreate: () => void
  onEdit: (plan: SavingPlanResponse) => void
  onDelete: (plan: SavingPlanResponse) => void
  onDeposit?: (plan: SavingPlanResponse) => void
  onEditDeposit?: (plan: SavingPlanResponse, deposit: SavingDepositResponse) => void
  onDeleteDeposit?: (plan: SavingPlanResponse, deposit: SavingDepositResponse) => void
  onLoadDeposits?: (planId: string) => void
  onLoadMoreDeposits?: (planId: string, offset: number) => void
  depositsByPlan?: Record<string, SavingDepositResponse[]>
  depositsHasMoreByPlan?: Record<string, boolean>
  depositsLoadingByPlan?: Record<string, boolean>
  depositsErrorByPlan?: Record<string, string | null>
}

const emptyDeposits: Record<string, SavingDepositResponse[]> = {}
const emptyFlags: Record<string, boolean> = {}
const emptyErrors: Record<string, string | null> = {}
const noop = () => undefined

export function SavingPlanList({
  plans,
  loading,
  onCreate,
  onEdit,
  onDelete,
  onDeposit = noop,
  onEditDeposit = noop,
  onDeleteDeposit = noop,
  onLoadDeposits = noop,
  onLoadMoreDeposits = noop,
  depositsByPlan = emptyDeposits,
  depositsHasMoreByPlan = emptyFlags,
  depositsLoadingByPlan = emptyFlags,
  depositsErrorByPlan = emptyErrors,
}: SavingPlanListProps) {
  const [expandedPlanIds, setExpandedPlanIds] = useState<Set<string>>(new Set())

  const toggleDeposits = (planId: string) => {
    const expanded = expandedPlanIds.has(planId)
    setExpandedPlanIds((current) => {
      const next = new Set(current)
      if (expanded) next.delete(planId)
      else next.add(planId)
      return next
    })
    if (!expanded && !Object.prototype.hasOwnProperty.call(depositsByPlan, planId)) onLoadDeposits(planId)
  }

  return (
    <section className="finance-panel" aria-labelledby="finance-plans-title">
      <div className="flex items-end justify-between gap-3 border-b border-border pb-4">
        <div><h2 id="finance-plans-title" className="text-xl font-semibold">存钱计划</h2></div>
        <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={onCreate}><PiggyBank aria-hidden="true" className="h-4 w-4" />新建存钱计划</Button>
      </div>
      {loading && plans.length === 0 ? <div className="mt-4 grid gap-3" aria-label="存钱计划加载中" aria-busy="true"><div className="finance-skeleton h-24" /><div className="finance-skeleton h-24" /></div> : plans.length === 0 ? <div className="py-10 text-center"><Target className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm text-muted-foreground">还没有存钱计划</p><Button type="button" variant="link" className="mt-2 min-h-11" onClick={onCreate}>创建第一个计划</Button></div> : <div className="mt-4 grid gap-3 md:grid-cols-2">{plans.map((plan) => {
        const expanded = expandedPlanIds.has(plan.id)
        const deposits = depositsByPlan[plan.id] ?? []
        const depositCount = plan.depositCount ?? 0
        return <article key={plan.id} className="finance-plan-card min-w-0 p-4" aria-labelledby={`saving-plan-${plan.id}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><h3 id={`saving-plan-${plan.id}`} className="break-words font-semibold">{plan.name}</h3><p className="mt-1 text-sm text-muted-foreground">目标日期：{dateLabel(plan.targetDate)}</p></div>
            <div className="flex shrink-0 gap-1"><Button type="button" variant="ghost" size="icon" className="finance-icon-button" aria-label={`编辑存钱计划${plan.name}`} onClick={() => onEdit(plan)}><Pencil aria-hidden="true" className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" className="finance-icon-button text-muted-foreground hover:bg-red-50 hover:text-red-800" aria-label={`删除存钱计划${plan.name}`} onClick={() => onDelete(plan)}><Trash2 aria-hidden="true" className="h-4 w-4" /></Button></div>
          </div>
          <Button type="button" className="mt-4 min-h-11 w-full gap-2 sm:w-auto" onClick={() => onDeposit(plan)}><PiggyBank aria-hidden="true" className="h-4 w-4" />存一笔</Button>
          <div className="mt-4 flex items-center gap-3"><Progress value={plan.progressPercentage} aria-label={`${plan.name}进度 ${plan.progressPercentage}%`} /><span className="shrink-0 text-sm font-semibold">{plan.progressPercentage}%</span></div>
          <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm text-muted-foreground"><span>已存 {money(plan.currentAmount)} / {money(plan.targetAmount)}</span><span>剩余 {money(plan.remainingAmount)}</span></div>
          {plan.isCompleted && <p className="mt-3 flex items-center gap-1 text-sm font-medium text-primary"><Check aria-hidden="true" className="h-4 w-4" />已完成</p>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-sm"><span className="text-muted-foreground">{depositCount} 条存入记录</span><Button type="button" variant="link" className="min-h-11 px-0" aria-expanded={expanded} aria-controls={`saving-deposits-${plan.id}`} onClick={() => toggleDeposits(plan.id)}>{expanded ? '收起存入记录' : '查看存入记录'}</Button></div>
          {expanded && <SavingDepositList planId={plan.id} deposits={deposits} loading={depositsLoadingByPlan[plan.id] ?? false} hasMore={depositsHasMoreByPlan[plan.id] ?? false} error={depositsErrorByPlan[plan.id] ?? null} onCreate={() => onDeposit(plan)} onLoadMore={() => onLoadMoreDeposits(plan.id, deposits.length)} onEdit={(deposit) => onEditDeposit(plan, deposit)} onDelete={(deposit) => onDeleteDeposit(plan, deposit)} />}
        </article>
      })}</div>}
    </section>
  )
}

export type { SavingPlanListProps }
