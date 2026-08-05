import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarRange, ListTodo, LogOut, Plus, Receipt, Wallet, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type {
  CreateWeddingExpenseRequest,
  CreateWeddingTaskRequest,
  TaskStatus,
  UpdateWeddingExpenseRequest,
  UpdateWeddingTaskRequest,
  WeddingExpenseResponse,
  WeddingTaskResponse,
} from '@xiaowoniu/shared'
import { Button } from '@/components/ui/button'
import WeddingBudgetDialog from '@/components/wedding/WeddingBudgetDialog'
import WeddingDeleteDialog from '@/components/wedding/WeddingDeleteDialog'
import WeddingExpenseDialog from '@/components/wedding/WeddingExpenseDialog'
import { WeddingExpenseList } from '@/components/wedding/WeddingExpenseList'
import { WeddingOverview } from '@/components/wedding/WeddingOverview'
import WeddingTaskDialog from '@/components/wedding/WeddingTaskDialog'
import { WeddingTaskBoard } from '@/components/wedding/WeddingTaskBoard'
import { WeddingTimeline } from '@/components/wedding/WeddingTimeline'
import { useAuth } from '@/hooks/useAuth'
import { useWeddingStore } from '@/store/wedding.store'

type TabName = 'board' | 'timeline' | 'expenses'
type DialogName = 'task' | 'expense' | 'budget' | null
type DeleteTarget = { resource: 'task' | 'expense'; id: string } | null

const tabs: Array<{ value: TabName; label: string; icon: typeof ListTodo }> = [
  { value: 'board', label: '任务看板', icon: ListTodo },
  { value: 'timeline', label: '时间线', icon: CalendarRange },
  { value: 'expenses', label: '花费明细', icon: Receipt },
]

export default function Wedding() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const tasks = useWeddingStore((state) => state.tasks)
  const expenses = useWeddingStore((state) => state.expenses)
  const budget = useWeddingStore((state) => state.budget)
  const overview = useWeddingStore((state) => state.overview)
  const timeline = useWeddingStore((state) => state.timeline)
  const tasksHasMore = useWeddingStore((state) => state.tasksHasMore)
  const expensesHasMore = useWeddingStore((state) => state.expensesHasMore)
  const loading = useWeddingStore((state) => state.loading)
  const error = useWeddingStore((state) => state.error)
  const fetchDashboard = useWeddingStore((state) => state.fetchDashboard)
  const fetchTasks = useWeddingStore((state) => state.fetchTasks)
  const fetchExpenses = useWeddingStore((state) => state.fetchExpenses)
  const createTask = useWeddingStore((state) => state.createTask)
  const updateTask = useWeddingStore((state) => state.updateTask)
  const deleteTask = useWeddingStore((state) => state.deleteTask)
  const createExpense = useWeddingStore((state) => state.createExpense)
  const updateExpense = useWeddingStore((state) => state.updateExpense)
  const deleteExpense = useWeddingStore((state) => state.deleteExpense)
  const upsertBudget = useWeddingStore((state) => state.upsertBudget)
  const clearError = useWeddingStore((state) => state.clearError)

  const [tab, setTab] = useState<TabName>('board')
  const [dialog, setDialog] = useState<DialogName>(null)
  const [editingTask, setEditingTask] = useState<WeddingTaskResponse | null>(null)
  const [editingExpense, setEditingExpense] = useState<WeddingExpenseResponse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    void fetchDashboard().catch(() => undefined)
  }, [fetchDashboard])

  const openTask = (task: WeddingTaskResponse | null = null) => {
    setEditingTask(task)
    setStatus('')
    setDialog('task')
  }
  const openExpense = (expense: WeddingExpenseResponse | null = null) => {
    setEditingExpense(expense)
    setStatus('')
    setDialog('expense')
  }

  const submitTask = async (data: CreateWeddingTaskRequest | UpdateWeddingTaskRequest) => {
    if (editingTask) {
      await updateTask(editingTask.id, data as UpdateWeddingTaskRequest)
      setStatus('备婚任务已更新')
    } else {
      await createTask(data as CreateWeddingTaskRequest)
      setStatus('备婚任务已创建')
    }
  }
  const submitExpense = async (data: CreateWeddingExpenseRequest | UpdateWeddingExpenseRequest) => {
    if (editingExpense) {
      await updateExpense(editingExpense.id, data as UpdateWeddingExpenseRequest)
      setStatus('备婚花费已更新')
    } else {
      await createExpense(data as CreateWeddingExpenseRequest)
      setStatus('备婚花费已创建')
    }
  }
  const submitBudget = async (data: Parameters<typeof upsertBudget>[0]) => {
    await upsertBudget(data)
    setStatus('备婚预算已更新')
  }
  const changeTaskStatus = async (id: string, status: TaskStatus) => {
    await updateTask(id, { status })
    setStatus('备婚任务已更新')
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteSubmitting(true)
    try {
      if (deleteTarget.resource === 'task') {
        await deleteTask(deleteTarget.id)
        setStatus('备婚任务已删除')
      } else {
        await deleteExpense(deleteTarget.id)
        setStatus('备婚花费已删除')
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

  const selectTab = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    const next = (index + direction + tabs.length) % tabs.length
    setTab(tabs[next].value)
  }

  return (
    <main className="wedding-page min-h-screen bg-[#f7f6f2] text-stone-900">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex min-h-11 items-center justify-between gap-3 border-b border-stone-300 pb-4" aria-label="页面导航">
          <Button variant="ghost" className="min-h-11 gap-2 px-2 text-stone-700 hover:bg-stone-200/70" onClick={() => navigate('/dashboard')}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />返回 Dashboard
          </Button>
          <Button variant="ghost" className="min-h-11 gap-2 px-3 text-stone-700 hover:bg-stone-200/70" onClick={handleLogout}>
            <LogOut aria-hidden="true" className="h-4 w-4" />登出
          </Button>
        </nav>

        <header className="wedding-toolbar flex flex-col gap-5 py-8 md:flex-row md:items-end md:justify-between">
          <div><p className="wedding-kicker">Wedding planner</p><h1 className="mt-1 text-3xl font-semibold text-stone-950 sm:text-4xl">备婚工作台</h1><p className="mt-2 max-w-xl text-stone-600">从婚期和预算出发，把每一项备婚任务和花费推进到完成。</p></div>
          <section aria-label="备婚操作" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button className="min-h-11 gap-2" onClick={() => openTask()} disabled={loading}><Plus aria-hidden="true" className="h-4 w-4" />新建任务</Button>
            <Button variant="outline" className="min-h-11 gap-2" onClick={() => openExpense()} disabled={loading}><Receipt aria-hidden="true" className="h-4 w-4" />新增花费</Button>
            <Button variant="outline" className="min-h-11 gap-2" onClick={() => { setStatus(''); setDialog('budget') }} disabled={loading}><Wallet aria-hidden="true" className="h-4 w-4" />设置预算与婚期</Button>
          </section>
        </header>

        {error && <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"><span>{error}</span><Button type="button" variant="ghost" size="icon" className="wedding-icon-button text-red-800 hover:bg-red-100" aria-label="关闭错误提示" onClick={clearError}><X aria-hidden="true" className="h-4 w-4" /></Button></div>}
        {status && <div role="status" className="mb-5 rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">{status}</div>}

        <WeddingOverview overview={overview} loading={loading} onEditBudget={() => { setStatus(''); setDialog('budget') }} />

        <div role="tablist" aria-label="备婚视图" className="wedding-tabs mt-6 flex min-w-0 gap-1 border-b border-stone-300">
          {tabs.map(({ value, label, icon: Icon }, index) => (
            <button
              key={value}
              type="button"
              role="tab"
              id={`wedding-tab-${value}`}
              aria-selected={tab === value}
              aria-controls={`wedding-panel-${value}`}
              tabIndex={tab === value ? 0 : -1}
              className={`inline-flex min-h-11 min-w-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${tab === value ? 'border-pink-700 text-pink-800' : 'border-transparent text-stone-600 hover:text-stone-900'}`}
              onClick={() => setTab(value)}
              onKeyDown={(event) => selectTab(event, index)}
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === 'board' && <div role="tabpanel" id="wedding-panel-board" aria-labelledby="wedding-tab-board"><WeddingTaskBoard tasks={tasks} loading={loading} hasMore={tasksHasMore} onLoadMore={() => void fetchTasks({ limit: 50, offset: tasks.length }).catch(() => undefined)} onEdit={openTask} onDelete={(task) => setDeleteTarget({ resource: 'task', id: task.id })} onStatusChange={(id, nextStatus) => void changeTaskStatus(id, nextStatus).catch(() => undefined)} /></div>}
          {tab === 'timeline' && <div role="tabpanel" id="wedding-panel-timeline" aria-labelledby="wedding-tab-timeline"><WeddingTimeline timeline={timeline} loading={loading} /></div>}
          {tab === 'expenses' && <div role="tabpanel" id="wedding-panel-expenses" aria-labelledby="wedding-tab-expenses"><WeddingExpenseList expenses={expenses} loading={loading} hasMore={expensesHasMore} onLoadMore={() => void fetchExpenses({ limit: 50, offset: expenses.length }).catch(() => undefined)} onCreate={() => openExpense()} onEdit={openExpense} onDelete={(expense) => setDeleteTarget({ resource: 'expense', id: expense.id })} /></div>}
        </div>
      </div>

      <WeddingTaskDialog open={dialog === 'task'} task={editingTask} onOpenChange={(open) => !open && setDialog(null)} onSubmit={submitTask} />
      <WeddingExpenseDialog open={dialog === 'expense'} tasks={tasks} expense={editingExpense} onOpenChange={(open) => !open && setDialog(null)} onSubmit={submitExpense} />
      <WeddingBudgetDialog open={dialog === 'budget'} budget={budget} onOpenChange={(open) => !open && setDialog(null)} onSubmit={submitBudget} />
      <WeddingDeleteDialog open={deleteTarget !== null} resource={deleteTarget?.resource ?? 'task'} submitting={deleteSubmitting} onOpenChange={(open) => !open && setDeleteTarget(null)} onConfirm={confirmDelete} />
    </main>
  )
}
