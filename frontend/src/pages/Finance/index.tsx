import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, LogOut, PiggyBank, Plus, Wallet, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { CreateExpenseRequest, CreateSavingPlanRequest, ExpenseResponse, SavingPlanResponse, UpdateExpenseRequest, UpdateSavingPlanRequest } from '@xiaowoniu/shared'
import { Button } from '@/components/ui/button'
import BudgetDialog from '@/components/finance/BudgetDialog'
import ExpenseDialog from '@/components/finance/ExpenseDialog'
import FinanceDeleteDialog from '@/components/finance/FinanceDeleteDialog'
import { ExpenseList } from '@/components/finance/ExpenseList'
import { FinanceSummary } from '@/components/finance/FinanceSummary'
import SavingPlanDialog from '@/components/finance/SavingPlanDialog'
import { SavingPlanList } from '@/components/finance/SavingPlanList'
import { useAuth } from '@/hooks/useAuth'
import { formatMonth, useFinanceStore } from '@/store/finance.store'

function monthLabel(month: string) {
  const [year, value] = month.split('-')
  return `${year}年${Number(value)}月`
}

function shiftMonth(month: string, offset: number) {
  const [year, value] = month.split('-').map(Number)
  return formatMonth(new Date(year, value - 1 + offset, 1))
}

type DialogName = 'expense' | 'budget' | 'savingPlan' | null
type DeleteTarget = { resource: 'expense' | 'savingPlan'; id: string } | null

export default function Finance() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const expenses = useFinanceStore((state) => state.expenses)
  const summary = useFinanceStore((state) => state.summary)
  const budget = useFinanceStore((state) => state.budget)
  const savingPlans = useFinanceStore((state) => state.savingPlans)
  const selectedMonth = useFinanceStore((state) => state.selectedMonth)
  const loading = useFinanceStore((state) => state.loading)
  const error = useFinanceStore((state) => state.error)
  const fetchDashboard = useFinanceStore((state) => state.fetchDashboard)
  const setMonth = useFinanceStore((state) => state.setMonth)
  const createExpense = useFinanceStore((state) => state.createExpense)
  const updateExpense = useFinanceStore((state) => state.updateExpense)
  const deleteExpense = useFinanceStore((state) => state.deleteExpense)
  const upsertBudget = useFinanceStore((state) => state.upsertBudget)
  const createSavingPlan = useFinanceStore((state) => state.createSavingPlan)
  const updateSavingPlan = useFinanceStore((state) => state.updateSavingPlan)
  const deleteSavingPlan = useFinanceStore((state) => state.deleteSavingPlan)
  const clearError = useFinanceStore((state) => state.clearError)

  const [dialog, setDialog] = useState<DialogName>(null)
  const [editingExpense, setEditingExpense] = useState<ExpenseResponse | null>(null)
  const [editingPlan, setEditingPlan] = useState<SavingPlanResponse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    void fetchDashboard(selectedMonth).catch(() => undefined)
  }, [fetchDashboard])

  const openExpense = (expense: ExpenseResponse | null = null) => {
    setEditingExpense(expense)
    setStatus('')
    setDialog('expense')
  }
  const openSavingPlan = (plan: SavingPlanResponse | null = null) => {
    setEditingPlan(plan)
    setStatus('')
    setDialog('savingPlan')
  }
  const changeMonth = (month: string) => {
    setStatus('')
    setMonth(month)
    void fetchDashboard(month).catch(() => undefined)
  }

  const submitExpense = async (data: CreateExpenseRequest | UpdateExpenseRequest) => {
    if (editingExpense) {
      await updateExpense(editingExpense.id, data as UpdateExpenseRequest)
      setStatus('消费记录已更新')
    } else {
      await createExpense(data as CreateExpenseRequest)
      setStatus('消费记录已创建')
    }
  }
  const submitBudget = async (data: Parameters<typeof upsertBudget>[0]) => {
    await upsertBudget(data)
    setStatus('预算已更新')
  }
  const submitSavingPlan = async (data: CreateSavingPlanRequest | UpdateSavingPlanRequest) => {
    if (editingPlan) {
      await updateSavingPlan(editingPlan.id, data as UpdateSavingPlanRequest)
      setStatus('存钱计划已更新')
    } else {
      await createSavingPlan(data as CreateSavingPlanRequest)
      setStatus('存钱计划已创建')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteSubmitting(true)
    try {
      if (deleteTarget.resource === 'expense') {
        await deleteExpense(deleteTarget.id)
        setStatus('消费记录已删除')
      } else {
        await deleteSavingPlan(deleteTarget.id)
        setStatus('存钱计划已删除')
      }
      setDeleteTarget(null)
    } catch {
      // The store error remains visible while the confirmation stays open.
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch {
      // Auth state owns logout failures.
    }
  }

  return (
    <main className="finance-page min-h-screen bg-[#f7f6f2] text-stone-900">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex min-h-11 items-center justify-between gap-3 border-b border-stone-300 pb-4" aria-label="页面导航">
          <Button variant="ghost" className="min-h-11 gap-2 px-2 text-stone-700 hover:bg-stone-200/70" onClick={() => navigate('/dashboard')}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />返回 Dashboard
          </Button>
          <Button variant="ghost" className="min-h-11 gap-2 px-3 text-stone-700 hover:bg-stone-200/70" onClick={handleLogout}>
            <LogOut aria-hidden="true" className="h-4 w-4" />登出
          </Button>
        </nav>

        <header className="finance-toolbar flex flex-col gap-5 py-8 md:flex-row md:items-end md:justify-between">
          <div><p className="finance-kicker">Finance journal</p><h1 className="mt-1 text-3xl font-semibold text-stone-950 sm:text-4xl">财务记录</h1><p className="mt-2 max-w-xl text-stone-600">记录每一笔消费，看看预算还剩多少，再把余力放进想要的目标。</p></div>
          <section aria-label="财务操作" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button className="min-h-11 gap-2 bg-emerald-800 hover:bg-emerald-900" onClick={() => openExpense()} disabled={loading}><Plus aria-hidden="true" className="h-4 w-4" />记一笔</Button>
            <Button variant="outline" className="min-h-11 gap-2" onClick={() => { setStatus(''); setDialog('budget') }} disabled={loading}><Wallet aria-hidden="true" className="h-4 w-4" />设置预算</Button>
            <Button variant="outline" className="min-h-11 gap-2" onClick={() => openSavingPlan()} disabled={loading}><PiggyBank aria-hidden="true" className="h-4 w-4" />新建存钱计划</Button>
          </section>
        </header>

        <section className="finance-month-control mb-5 flex min-h-14 items-center justify-between gap-3 border-y border-stone-300 py-2" aria-label="月份选择">
          <Button type="button" variant="ghost" size="icon" className="finance-icon-button" aria-label="查看上个月" onClick={() => changeMonth(shiftMonth(selectedMonth, -1))}><ChevronLeft aria-hidden="true" className="h-5 w-5" /></Button>
          <h2 className="text-lg font-semibold text-stone-950">{monthLabel(selectedMonth)}</h2>
          <Button type="button" variant="ghost" size="icon" className="finance-icon-button" aria-label="查看下个月" onClick={() => changeMonth(shiftMonth(selectedMonth, 1))}><ChevronRight aria-hidden="true" className="h-5 w-5" /></Button>
        </section>

        {error && <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"><span>{error}</span><Button type="button" variant="ghost" size="icon" className="finance-icon-button text-red-800 hover:bg-red-100" aria-label="关闭错误提示" onClick={clearError}><X aria-hidden="true" className="h-4 w-4" /></Button></div>}
        {status && <div role="status" className="mb-5 rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">{status}</div>}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="grid min-w-0 gap-5"><FinanceSummary summary={summary} loading={loading} onEditBudget={() => { setStatus(''); setDialog('budget') }} /><ExpenseList expenses={expenses} loading={loading} onCreate={() => openExpense()} onEdit={openExpense} onDelete={(expense) => setDeleteTarget({ resource: 'expense', id: expense.id })} /></div>
          <SavingPlanList plans={savingPlans} loading={loading} onCreate={() => openSavingPlan()} onEdit={openSavingPlan} onDelete={(plan) => setDeleteTarget({ resource: 'savingPlan', id: plan.id })} />
        </div>
      </div>

      <ExpenseDialog open={dialog === 'expense'} expense={editingExpense} initialDate={`${selectedMonth}-01`} onOpenChange={(open) => !open && setDialog(null)} onSubmit={submitExpense} />
      <BudgetDialog open={dialog === 'budget'} month={selectedMonth} budget={budget} onOpenChange={(open) => !open && setDialog(null)} onSubmit={submitBudget} />
      <SavingPlanDialog open={dialog === 'savingPlan'} plan={editingPlan} onOpenChange={(open) => !open && setDialog(null)} onSubmit={submitSavingPlan} />
      <FinanceDeleteDialog open={deleteTarget !== null} resource={deleteTarget?.resource ?? 'expense'} submitting={deleteSubmitting} onOpenChange={(open) => !open && setDeleteTarget(null)} onConfirm={confirmDelete} />
    </main>
  )
}

export { monthLabel, shiftMonth }
