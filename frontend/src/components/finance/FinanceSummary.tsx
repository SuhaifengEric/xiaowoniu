import type { ExpenseResponse, FinanceSummaryResponse } from '@xiaowoniu/shared'
import { CalendarDays, Pencil, Plus, Receipt, Wallet, Trash2 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { financeCategoryLabels } from './finance.constants'

const money = (value: number) => `¥${value.toFixed(2)}`
const dateLabel = (value: string) => {
  const [year, month, day] = value.split('-')
  return `${year}年${Number(month)}月${Number(day)}日`
}

interface FinanceSummaryProps {
  summary: FinanceSummaryResponse | null
  loading: boolean
  onEditBudget: () => void
}

export interface ExpenseListProps {
  expenses: ExpenseResponse[]
  loading: boolean
  onCreate: () => void
  onEdit: (expense: ExpenseResponse) => void
  onDelete: (expense: ExpenseResponse) => void
}

export function FinanceSummary({ summary, loading, onEditBudget }: FinanceSummaryProps) {
  if (loading && !summary) {
    return (
      <section className="finance-panel" aria-labelledby="finance-summary-loading-title" aria-busy="true">
        <h2 id="finance-summary-loading-title" className="sr-only">本月概览加载中</h2>
        <div className="finance-skeleton h-6 w-36" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="finance-skeleton h-20" />
          <div className="finance-skeleton h-20" />
          <div className="finance-skeleton h-20" />
        </div>
      </section>
    )
  }

  const budget = summary?.budget ?? null
  const categories = summary?.categoryBreakdown ?? []
  const daily = summary?.dailyBreakdown ?? []
  const remaining = budget?.remaining ?? null

  return (
    <section className="finance-panel" aria-labelledby="finance-summary-title">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 id="finance-summary-title" className="text-xl font-semibold">本月概览</h2>
        </div>
        <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={onEditBudget}>
          <Wallet aria-hidden="true" className="h-4 w-4" />{budget ? '调整预算' : '设置预算'}
        </Button>
      </div>

      <div className="app-stat-grid finance-summary-grid mt-4 grid gap-px sm:grid-cols-3">
        <div className="app-stat p-4"><p className="app-stat-label">总支出</p><p className="app-stat-value mt-2">{money(summary?.totalExpense ?? 0)}</p><p className="app-stat-note mt-1">{summary?.expenseCount ?? 0} 笔消费</p></div>
        <div className="app-stat p-4"><p className="app-stat-label">月度预算</p><p className="app-stat-value mt-2">{budget ? money(budget.amount) : '未设置'}</p><p className="app-stat-note mt-1">{budget ? `已使用 ${budget.usedPercentage}%` : '先设置一个预算'}</p></div>
        <div className="app-stat p-4"><p className="app-stat-label">预算余量</p><p className={`app-stat-value mt-2 ${remaining !== null && remaining < 0 ? 'text-destructive' : ''}`}>{remaining === null ? '—' : money(remaining)}</p><p className={`app-stat-note mt-1 ${remaining !== null && remaining < 0 ? 'font-medium text-destructive' : ''}`}>{remaining !== null && remaining < 0 ? '已超支' : remaining === null ? '没有预算数据' : '可继续安排'}</p></div>
      </div>

      {budget && <div className="mt-5"><div className="mb-2 flex justify-between text-sm"><span>预算使用率</span><span>{budget.usedPercentage}%</span></div><Progress value={budget.usedPercentage} aria-label="预算使用率" /></div>}

      <div className="mt-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Receipt aria-hidden="true" className="h-4 w-4 text-primary" />分类统计</h3>
        <div className="mt-3 grid gap-2">
          {categories.map((item) => (
            <div key={item.category} className="finance-category-row grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border/60 py-2 text-sm">
              <span className="truncate">{financeCategoryLabels[item.category] ?? item.category}</span>
              <span className="text-muted-foreground">{item.count} 笔</span>
              <span className="font-semibold">{money(item.amount)} <span className="ml-1 text-xs font-normal text-muted-foreground">{item.percentage}%</span></span>
            </div>
          ))}
        </div>
      </div>

      <div className="finance-trend mt-6" aria-label="每日支出趋势">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><CalendarDays aria-hidden="true" className="h-4 w-4 text-primary" />每日支出趋势</h3>
        {daily.length === 0 ? <p className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">暂无每日支出数据</p> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e6dce7" />
              <XAxis dataKey="date" tickFormatter={(value) => value.slice(8)} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={42} />
              <Tooltip formatter={(value: number) => money(value)} labelFormatter={(value) => dateLabel(String(value))} />
              <Bar dataKey="amount" name="支出" fill="#bd2c69" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}

export function ExpenseList({ expenses, loading, onCreate, onEdit, onDelete }: ExpenseListProps) {
  return (
    <section className="finance-panel" aria-labelledby="finance-expenses-title">
      <div className="flex items-end justify-between gap-3 border-b border-border pb-4">
        <div><h2 id="finance-expenses-title" className="text-xl font-semibold">消费记录</h2></div>
        <Button type="button" className="min-h-11 gap-2" onClick={onCreate}><Plus aria-hidden="true" className="h-4 w-4" />新增消费</Button>
      </div>
      {loading && expenses.length === 0 ? <div className="mt-4 grid gap-3" aria-label="消费记录加载中" aria-busy="true"><div className="finance-skeleton h-16" /><div className="finance-skeleton h-16" /></div> : expenses.length === 0 ? <div className="py-10 text-center"><Receipt className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm text-muted-foreground">本月还没有消费记录</p><Button type="button" variant="link" className="mt-2 min-h-11" onClick={onCreate}>记下第一笔消费</Button></div> : <ul className="mt-2">{expenses.map((expense) => <li key={expense.id} className="flex min-w-0 items-center gap-3 border-b border-border/60 py-3"><div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-2"><span className="truncate font-medium">{financeCategoryLabels[expense.category]}</span><span className="shrink-0 text-xs text-muted-foreground">{dateLabel(expense.date)}</span></div><p className="mt-1 truncate text-sm text-muted-foreground">{expense.notes || `${expense.paymentMethod} · 无备注`}</p></div><span className="shrink-0 text-right font-semibold">{money(expense.amount)}</span><div className="flex shrink-0 gap-1"><Button type="button" variant="ghost" size="icon" className="finance-icon-button" aria-label={`编辑${dateLabel(expense.date)}消费`} onClick={() => onEdit(expense)}><Pencil aria-hidden="true" className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" className="finance-icon-button text-muted-foreground hover:bg-red-50 hover:text-red-800" aria-label={`删除${dateLabel(expense.date)}消费`} onClick={() => onDelete(expense)}><Trash2 aria-hidden="true" className="h-4 w-4" /></Button></div></li>)}</ul>}
    </section>
  )
}

export { money, dateLabel }
