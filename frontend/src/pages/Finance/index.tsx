import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, PiggyBank, Plus, Wallet, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { CreateExpenseRequest, CreateSavingPlanRequest, ExpenseResponse, SavingPlanResponse, UpdateExpenseRequest, UpdateSavingPlanRequest } from '@xiaowoniu/shared'
import AccountMenu from '@/components/navigation/AccountMenu'
import MobileTabBar from '@/components/navigation/MobileTabBar'
import { Button } from '@/components/ui/button'
import BudgetDialog from '@/components/finance/BudgetDialog'
import ExpenseDialog from '@/components/finance/ExpenseDialog'
import FinanceDeleteDialog from '@/components/finance/FinanceDeleteDialog'
import { ExpenseList } from '@/components/finance/ExpenseList'
import { FinanceSummary } from '@/components/finance/FinanceSummary'
import SavingPlanDialog from '@/components/finance/SavingPlanDialog'
import { SavingPlanList } from '@/components/finance/SavingPlanList'
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
type DashboardDialogName = Exclude<DialogName, null>
const dashboardActions: Record<string, DashboardDialogName> = {
  expense: 'expense',
  budget: 'budget',
  'saving-plan': 'savingPlan',
}
type DeleteTarget = { resource: 'expense' | 'savingPlan'; id: string } | null

export default function Finance() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
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
  const [dashboardReturnFocus, setDashboardReturnFocus] = useState<string | null>(null)
  const [editingExpense, setEditingExpense] = useState<ExpenseResponse | null>(null)
  const [editingPlan, setEditingPlan] = useState<SavingPlanResponse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    void fetchDashboard(selectedMonth).catch(() => undefined)
  }, [fetchDashboard])

  const openExpense = (expense: ExpenseResponse | null = null, dashboardAction: string | null = null) => {
    setDashboardReturnFocus(dashboardAction)
    setEditingExpense(expense)
    setStatus('')
    setDialog('expense')
  }
  const openSavingPlan = (plan: SavingPlanResponse | null = null, dashboardAction: string | null = null) => {
    setDashboardReturnFocus(dashboardAction)
    setEditingPlan(plan)
    setStatus('')
    setDialog('savingPlan')
  }

  const openBudget = (dashboardAction: string | null = null) => {
    setDashboardReturnFocus(dashboardAction)
    setStatus('')
    setDialog('budget')
  }

  useEffect(() => {
    const action = searchParams.get('action')
    if (!action) return

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('action')
    setSearchParams(nextParams, { replace: true })

    const dialogName = dashboardActions[action]
    if (dialogName === 'expense') openExpense(null, action)
    if (dialogName === 'savingPlan') openSavingPlan(null, action)
    if (dialogName === 'budget') openBudget(action)
  }, [searchParams, setSearchParams])

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

  return (
    <main className="app-page finance-page has-mobile-tabbar" data-dialog-return-focus={dashboardReturnFocus ?? undefined}>
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <nav className="app-nav flex min-h-11 items-center justify-between gap-3 border-b pb-4" aria-label="页面导航">
          <Button variant="ghost" className="app-nav-action min-h-11 gap-2 px-2" onClick={() => navigate('/dashboard')}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />返回世界仪表盘
          </Button>
          <AccountMenu />
        </nav>

        <header className="app-page-header finance-toolbar flex flex-col gap-5 py-9 md:flex-row md:items-end md:justify-between">
          <div><h1 className="app-page-title">省省省</h1><p className="app-page-description mt-3 max-w-xl">记录每一笔消费，看看预算还剩多少，再把余力放进想要的目标。</p></div>
          <section aria-label="财务操作" className="app-actions grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button className="min-h-11 gap-2" data-dialog-focus="expense" onClick={() => openExpense()} disabled={loading}><Plus aria-hidden="true" className="h-4 w-4" />记一笔</Button>
            <Button variant="outline" className="min-h-11 gap-2" data-dialog-focus="budget" onClick={() => openBudget()} disabled={loading}><Wallet aria-hidden="true" className="h-4 w-4" />设置预算</Button>
            <Button variant="outline" className="min-h-11 gap-2" data-dialog-focus="saving-plan" onClick={() => openSavingPlan()} disabled={loading}><PiggyBank aria-hidden="true" className="h-4 w-4" />新建存钱计划</Button>
          </section>
        </header>

        <section className="finance-month-control mb-5 flex min-h-14 items-center justify-between gap-3 border-y border-border py-2" aria-label="月份选择">
          <Button type="button" variant="ghost" size="icon" className="finance-icon-button" aria-label="查看上个月" onClick={() => changeMonth(shiftMonth(selectedMonth, -1))}><ChevronLeft aria-hidden="true" className="h-5 w-5" /></Button>
          <h2 className="text-lg font-semibold">{monthLabel(selectedMonth)}</h2>
          <Button type="button" variant="ghost" size="icon" className="finance-icon-button" aria-label="查看下个月" onClick={() => changeMonth(shiftMonth(selectedMonth, 1))}><ChevronRight aria-hidden="true" className="h-5 w-5" /></Button>
        </section>

        {error && <div role="alert" className="app-alert mb-5 flex items-center justify-between gap-4 border px-4 py-3 text-sm"><span>{error}</span><Button type="button" variant="ghost" size="icon" className="finance-icon-button" aria-label="关闭错误提示" onClick={clearError}><X aria-hidden="true" className="h-4 w-4" /></Button></div>}
        {status && <div role="status" className="app-status mb-5 border px-4 py-3 text-sm font-medium">{status}</div>}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="grid min-w-0 gap-5"><FinanceSummary summary={summary} loading={loading} onEditBudget={openBudget} /><ExpenseList expenses={expenses} loading={loading} onCreate={() => openExpense()} onEdit={openExpense} onDelete={(expense) => setDeleteTarget({ resource: 'expense', id: expense.id })} /></div>
          <SavingPlanList plans={savingPlans} loading={loading} onCreate={() => openSavingPlan()} onEdit={openSavingPlan} onDelete={(plan) => setDeleteTarget({ resource: 'savingPlan', id: plan.id })} />
        </div>
      </div>

      <ExpenseDialog open={dialog === 'expense'} expense={editingExpense} initialDate={`${selectedMonth}-01`} onOpenChange={(open) => !open && setDialog(null)} onSubmit={submitExpense} />
      <BudgetDialog open={dialog === 'budget'} month={selectedMonth} budget={budget} onOpenChange={(open) => !open && setDialog(null)} onSubmit={submitBudget} />
      <SavingPlanDialog open={dialog === 'savingPlan'} plan={editingPlan} onOpenChange={(open) => !open && setDialog(null)} onSubmit={submitSavingPlan} />
      <FinanceDeleteDialog open={deleteTarget !== null} resource={deleteTarget?.resource ?? 'expense'} submitting={deleteSubmitting} onOpenChange={(open) => !open && setDeleteTarget(null)} onConfirm={confirmDelete} />
      <MobileTabBar />
    </main>
  )
}

export { monthLabel, shiftMonth }
