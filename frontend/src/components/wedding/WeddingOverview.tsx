import type { WeddingOverviewResponse } from '@xiaowoniu/shared'
import { weddingCategoryLabels } from './wedding.constants'
import { CalendarHeart, CheckCircle2, HeartHandshake, PiggyBank, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'

export const money = (value: number) => `¥${value.toFixed(2)}`

export interface WeddingOverviewProps {
  overview: WeddingOverviewResponse | null
  loading: boolean
  onEditBudget: () => void
}

function countdownText(days: number | null) {
  if (days === null) return '未设置婚期'
  if (days > 0) return `还有 ${days} 天`
  if (days === 0) return '婚礼就是今天'
  return `婚礼已过去 ${Math.abs(days)} 天`
}

export function WeddingOverview({ overview, loading, onEditBudget }: WeddingOverviewProps) {
  if (loading && !overview) {
    return <section className="wedding-panel" aria-busy="true" role="status"><div className="wedding-skeleton h-6 w-40" /><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="wedding-skeleton h-24" /><div className="wedding-skeleton h-24" /><div className="wedding-skeleton h-24" /><div className="wedding-skeleton h-24" /></div></section>
  }
  const budget = overview?.budget ?? null
  const remaining = overview?.remainingBudget ?? null
  const usedPercentage = overview?.budgetUsedPercentage ?? null
  const categories = overview?.categoryBreakdown ?? []
  return <section className="wedding-panel" aria-labelledby="wedding-overview-title">
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-4">
      <div>
        <h2 id="wedding-overview-title" className="text-xl font-semibold text-stone-950">备婚概览</h2>
      </div>
      <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={onEditBudget}><Wallet aria-hidden="true" className="h-4 w-4" />{budget ? '调整预算与婚期' : '设置预算与婚期'}</Button>
    </div>
    <div className="wedding-overview-grid mt-4 grid gap-px overflow-hidden rounded-sm border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-white p-4"><p className="text-xs font-semibold uppercase text-stone-500">婚期倒计时</p><p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-stone-950"><CalendarHeart aria-hidden="true" className="h-5 w-5 shrink-0 text-pink-700" /><span className="break-words">{countdownText(overview?.daysUntilWedding ?? null)}</span></p><p className="mt-1 text-sm text-stone-600">{budget ? `婚礼日期 ${budget.weddingDate}` : '设置婚期后显示倒计时'}</p></div>
      <div className="bg-white p-4"><p className="text-xs font-semibold uppercase text-stone-500">总预算</p><p className="mt-2 text-2xl font-semibold text-stone-950">{budget ? money(budget.totalBudget) : '未设置'}</p><p className="mt-1 text-sm text-stone-600">{budget ? `已用 ${usedPercentage ?? 0}%` : '先设置一个预算'}</p></div>
      <div className="bg-white p-4"><p className="text-xs font-semibold uppercase text-stone-500">实际花费</p><p className="mt-2 text-2xl font-semibold text-stone-950">{money(overview?.actualExpenseTotal ?? 0)}</p><p className="mt-1 text-sm text-stone-600">{overview?.expenseCount ?? 0} 笔花费</p></div>
      <div className="bg-white p-4"><p className="text-xs font-semibold uppercase text-stone-500">预算余量</p><p className={`mt-2 text-2xl font-semibold ${remaining !== null && remaining < 0 ? 'text-red-800' : 'text-stone-950'}`}>{remaining === null ? '—' : money(remaining)}</p><p className={`mt-1 text-sm ${remaining !== null && remaining < 0 ? 'font-medium text-red-800' : 'text-stone-600'}`}>{remaining !== null && remaining < 0 ? `已超支 ${money(Math.abs(remaining))}` : remaining === null ? '没有预算数据' : '可继续安排'}</p></div>
    </div>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <div className="rounded-sm border border-stone-200 bg-white p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-800"><CheckCircle2 aria-hidden="true" className="h-4 w-4 text-sky-700" />任务进度</h3>
        <p className="mt-2 text-2xl font-semibold text-stone-950">{overview?.taskCounts.completionPercentage ?? 0}%</p>
        <p className="mt-1 text-sm text-stone-600">已完成 {overview?.taskCounts.completed ?? 0} / {overview?.taskCounts.activeTotal ?? 0} 个任务（不含已取消）</p>
      </div>
      <div className="rounded-sm border border-stone-200 bg-white p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-800"><PiggyBank aria-hidden="true" className="h-4 w-4 text-pink-700" />计划花费</h3>
        <p className="mt-2 text-2xl font-semibold text-stone-950">{money(overview?.plannedExpenseTotal ?? 0)}</p>
        <p className="mt-1 text-sm text-stone-600">{overview?.actualVsPlannedPercentage == null ? '暂无计划花费' : `实际占计划 ${overview.actualVsPlannedPercentage}%`}</p>
      </div>
    </div>
    <div className="mt-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-800"><HeartHandshake aria-hidden="true" className="h-4 w-4 text-pink-700" />分类统计</h3>
      <div className="mt-3 grid gap-2" aria-label="分类花费汇总">
        {categories.map((item) => <div key={item.category} className="wedding-category-row grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-stone-100 py-2 text-sm"><span className="truncate">{weddingCategoryLabels[item.category] ?? item.category}</span><span className="text-stone-600">{item.expenseCount} 笔</span><span className="font-medium">{money(item.actualAmount)} <span className="ml-1 text-xs text-stone-500">{item.actualPercentage}%</span></span></div>)}
      </div>
      <div className="mt-4 min-h-[220px] min-w-0 overflow-hidden" aria-label="类别计划与实际花费对比">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={categories.map((item) => ({ name: weddingCategoryLabels[item.category] ?? item.category, planned: item.plannedAmount, actual: item.actualAmount }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e7e5e4" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={52} />
            <Tooltip formatter={(value: number) => money(value)} />
            <Bar dataKey="planned" name="计划" fill="#0e7490" radius={[2, 2, 0, 0]} />
            <Bar dataKey="actual" name="实际" fill="#be185d" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </section>
}
