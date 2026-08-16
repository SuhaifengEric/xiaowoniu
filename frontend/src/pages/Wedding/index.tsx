import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowLeft, CalendarRange, HeartHandshake, ListTodo, PencilLine, Plus, Receipt, Route, SlidersHorizontal, Wallet, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { engagementModeLabels, marriageNodeKeyLabels, marriageOrderLabels, recorderRoleLabels, visitOrderLabels } from '@/components/wedding/wedding.constants'
import type {
  CreateWeddingExpenseRequest,
  CreateWeddingTaskRequest,
  MarriageNodeResponse,
  MarriageProcessResponse,
  MarriageNodeKey,
  MarriageRecorderRole,
  TaskStatus,
  UpdateWeddingExpenseRequest,
  UpdateWeddingTaskRequest,
  WeddingExpenseResponse,
  WeddingTaskResponse,
} from '@xiaowoniu/shared'
import AccountMenu from '@/components/navigation/AccountMenu'
import MobileTabBar from '@/components/navigation/MobileTabBar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Toast from '@/components/ui/toast'
import { MarriageAgreementList } from '@/components/wedding/MarriageAgreementList'
import MarriageNodeDialog from '@/components/wedding/MarriageNodeDialog'
import { MarriageNodeList } from '@/components/wedding/MarriageNodeList'
import { MarriageProcessCard } from '@/components/wedding/MarriageProcessCard'
import MarriageProcessSettingsDialog from '@/components/wedding/MarriageProcessSettingsDialog'
import WeddingBudgetDialog from '@/components/wedding/WeddingBudgetDialog'
import WeddingDeleteDialog from '@/components/wedding/WeddingDeleteDialog'
import WeddingExpenseDialog from '@/components/wedding/WeddingExpenseDialog'
import { WeddingExpenseList } from '@/components/wedding/WeddingExpenseList'
import { WeddingOverview } from '@/components/wedding/WeddingOverview'
import WeddingTaskDialog from '@/components/wedding/WeddingTaskDialog'
import { WeddingTaskBoard } from '@/components/wedding/WeddingTaskBoard'
import { WeddingTimeline } from '@/components/wedding/WeddingTimeline'
import { useWeddingStore } from '@/store/wedding.store'

type ViewName = 'process' | 'stages' | 'agreements' | 'execution' | 'settings'
type DialogName = 'task' | 'expense' | 'budget' | null
type DashboardDialogName = Exclude<DialogName, null>
type DeleteTarget = { resource: 'task' | 'expense'; id: string } | null

const dashboardActions: Record<string, DashboardDialogName> = { task: 'task', expense: 'expense', budget: 'budget' }

const tabs: Array<{ value: ViewName; label: string; mobileLabel: string; icon: typeof Route }> = [
  { value: 'process', label: '婚姻进程', mobileLabel: '进程', icon: Route },
  { value: 'stages', label: '阶段记录', mobileLabel: '阶段', icon: CalendarRange },
  { value: 'agreements', label: '双方共识', mobileLabel: '共识', icon: HeartHandshake },
  { value: 'execution', label: '婚礼执行', mobileLabel: '执行', icon: ListTodo },
  { value: 'settings', label: '流程设置', mobileLabel: '设置', icon: SlidersHorizontal },
]

function processSettings(process: MarriageProcessResponse | null) {
  return process ? {
    recorderRole: process.recorderRole,
    visitOrder: process.visitOrder,
    marriageOrder: process.marriageOrder,
    engagementMode: process.engagementMode,
  } : null
}

export default function Wedding() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const process = useWeddingStore((state) => state.process)
  const nodes = useWeddingStore((state) => state.nodes)
  const agreements = useWeddingStore((state) => state.agreements)
  const nodeHistory = useWeddingStore((state) => state.nodeHistory)
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
  const createProcess = useWeddingStore((state) => state.createProcess)
  const updateProcessSettings = useWeddingStore((state) => state.updateProcessSettings)
  const updateNode = useWeddingStore((state) => state.updateNode)
  const fetchNodeHistory = useWeddingStore((state) => state.fetchNodeHistory)
  const createAgreement = useWeddingStore((state) => state.createAgreement)
  const updateAgreement = useWeddingStore((state) => state.updateAgreement)
  const archiveAgreement = useWeddingStore((state) => state.archiveAgreement)
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

  const [view, setView] = useState<ViewName>('process')
  const [dialog, setDialog] = useState<DialogName>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editingNode, setEditingNode] = useState<MarriageNodeResponse | null>(null)
  const [historyNode, setHistoryNode] = useState<MarriageNodeResponse | null>(null)
  const [actionStageKey, setActionStageKey] = useState<MarriageNodeKey>('wedding' as MarriageNodeKey)
  const [dashboardReturnFocus, setDashboardReturnFocus] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<WeddingTaskResponse | null>(null)
  const [editingExpense, setEditingExpense] = useState<WeddingExpenseResponse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const tabRefs = useRef<Partial<Record<ViewName, HTMLButtonElement | null>>>({})
  const budgetReturnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    void fetchDashboard().catch(() => undefined)
  }, [fetchDashboard])

  const openTask = (task: WeddingTaskResponse | null = null, stageKey: MarriageNodeKey = 'wedding' as MarriageNodeKey, dashboardAction: string | null = null) => {
    setDashboardReturnFocus(dashboardAction)
    setEditingTask(task)
    setActionStageKey(task?.stageKey ?? stageKey)
    setStatus('')
    setDialog('task')
  }
  const openExpense = (expense: WeddingExpenseResponse | null = null, dashboardAction: string | null = null) => {
    setDashboardReturnFocus(dashboardAction)
    setEditingExpense(expense)
    setStatus('')
    setDialog('expense')
  }
  const openBudget = (dashboardAction: string | null = null, trigger: HTMLElement | null = null) => {
    const focused = document.activeElement instanceof HTMLElement
      && document.activeElement !== document.body
      && document.activeElement !== document.documentElement
      ? document.activeElement
      : null
    const active = trigger?.isConnected ? trigger : focused ?? document.querySelector<HTMLElement>('[data-dialog-focus="budget"]')
    budgetReturnFocusRef.current = active?.isConnected ? active : null
    setDashboardReturnFocus(dashboardAction)
    setStatus('')
    setDialog('budget')
  }

  const closeBudget = () => {
    const target = budgetReturnFocusRef.current
    setDialog(null)
    window.setTimeout(() => {
      const nextTarget = target?.isConnected ? target : document.querySelector<HTMLElement>('[data-dialog-focus="budget"]')
      if (nextTarget?.isConnected) nextTarget.focus({ preventScroll: true })
    }, 0)
  }
  const openSettings = () => {
    setStatus('')
    setSettingsOpen(true)
  }
  const openNode = (node: MarriageNodeResponse) => {
    setEditingNode(node)
  }
  const openHistory = (node: MarriageNodeResponse) => {
    setHistoryNode(node)
    void fetchNodeHistory(node.nodeKey).catch(() => undefined)
  }

  useEffect(() => {
    const action = searchParams.get('action')
    if (!action) return
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('action')
    setSearchParams(nextParams, { replace: true })
    const dialogName = dashboardActions[action]
    if (dialogName === 'task') openTask(null, 'wedding' as MarriageNodeKey, action)
    if (dialogName === 'expense') openExpense(null, action)
    if (dialogName === 'budget') openBudget(action)
  }, [searchParams, setSearchParams])

  const submitSettings = async (data: Parameters<typeof updateProcessSettings>[0]) => {
    if (process) {
      await updateProcessSettings(data)
      setStatus('流程设置已更新')
    } else {
      await createProcess({ recorderRole: data.recorderRole ?? ('record_keeper' as MarriageRecorderRole), visitOrder: data.visitOrder, marriageOrder: data.marriageOrder, engagementMode: data.engagementMode })
      setStatus('婚姻进程已建立')
    }
  }
  const submitNode = async (data: Parameters<typeof updateNode>[1]) => {
    if (!editingNode) return
    await updateNode(editingNode.nodeKey, data)
    setStatus(`${marriageNodeKeyLabels[editingNode.nodeKey]}已更新`)
  }
  const requiresParentsMeetingBackfill = editingNode?.nodeKey === 'parents_meeting'
    && !nodes.filter((node) => node.nodeKey === 'male_visit' || node.nodeKey === 'female_visit').every((node) => node.status === 'completed')
  const submitTask = async (data: CreateWeddingTaskRequest | UpdateWeddingTaskRequest) => {
    if (editingTask) {
      await updateTask(editingTask.id, data as UpdateWeddingTaskRequest)
      setStatus('阶段行动项已更新')
    } else {
      await createTask(data as CreateWeddingTaskRequest)
      setStatus('阶段行动项已创建')
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
  const changeTaskStatus = async (id: string, nextStatus: TaskStatus) => {
    await updateTask(id, { status: nextStatus })
    setStatus('阶段行动项已更新')
  }
  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteSubmitting(true)
    try {
      if (deleteTarget.resource === 'task') {
        await deleteTask(deleteTarget.id)
        setStatus('阶段行动项已删除')
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

  const selectTab = (event: KeyboardEvent, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    const nextTab = tabs[(index + direction + tabs.length) % tabs.length]
    setView(nextTab.value)
    tabRefs.current[nextTab.value]?.focus()
  }

  return (
    <main className="app-page wedding-page has-mobile-tabbar" data-dialog-return-focus={dashboardReturnFocus ?? undefined}>
      <div className="wedding-page-shell mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <nav className="app-nav flex min-h-11 items-center justify-between gap-3 border-b pb-4" aria-label="页面导航">
          <Button variant="ghost" className="app-nav-action min-h-11 gap-2 px-2" aria-label="返回世界仪表盘" onClick={() => navigate('/dashboard')}><ArrowLeft aria-hidden="true" className="h-4 w-4" /><span className="wedding-back-label">返回世界仪表盘</span></Button>
          <AccountMenu />
        </nav>

        <header className="app-page-header wedding-toolbar flex flex-col gap-5 py-9 md:flex-row md:items-end md:justify-between">
          <div><p className="app-kicker wedding-page-kicker">个人婚姻记录工作台</p><h1 className="app-page-title mt-2">嫁嫁嫁</h1><p className="app-page-description wedding-page-description mt-3 max-w-2xl"><span className="wedding-description-desktop">记录你们明确确认的事实、计划和下一步，婚礼预算与执行任务继续在同一个工作台里完成。</span><span className="wedding-description-mobile">记录事实、计划和下一步。</span></p></div>
          <section aria-label="婚礼执行操作" className="app-actions wedding-desktop-actions grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button className="min-h-11 gap-2" data-dialog-focus="task" onClick={() => openTask()} disabled={loading}><Plus aria-hidden="true" className="h-4 w-4" />新增行动项</Button>
            <Button variant="outline" className="min-h-11 gap-2" data-dialog-focus="expense" onClick={() => openExpense()} disabled={loading}><Receipt aria-hidden="true" className="h-4 w-4" />新增花费</Button>
            <Button variant="outline" className="min-h-11 gap-2" data-dialog-focus="budget" onClick={(event) => openBudget(null, event.currentTarget)} disabled={loading}><Wallet aria-hidden="true" className="h-4 w-4" />设置预算</Button>
          </section>
        </header>

        {error && <div role="alert" className="app-alert mb-5 flex items-center justify-between gap-4 border px-4 py-3 text-sm"><span>{error}</span><Button type="button" variant="ghost" size="icon" className="wedding-icon-button" aria-label="关闭错误提示" onClick={clearError}><X aria-hidden="true" className="h-4 w-4" /></Button></div>}
        <Toast message={status} onDismiss={() => setStatus('')} />

        <div role="tablist" aria-label="嫁嫁嫁视图" className="wedding-tabs mt-2 flex min-w-0 gap-1 border-b border-border">
          {tabs.map(({ value, label, mobileLabel, icon: Icon }, index) => <button key={value} ref={(element) => { tabRefs.current[value] = element }} type="button" role="tab" id={`wedding-tab-${value}`} aria-label={label} aria-selected={view === value} aria-controls={`wedding-panel-${value}`} tabIndex={view === value ? 0 : -1} className={`wedding-tab inline-flex min-h-11 min-w-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${view === value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`} onClick={() => setView(value)} onKeyDown={(event) => selectTab(event, index)}><Icon aria-hidden="true" className="wedding-tab-icon h-4 w-4 shrink-0" /><span aria-hidden="true" className="wedding-tab-label wedding-tab-label--desktop">{label}</span><span aria-hidden="true" className="wedding-tab-label wedding-tab-label--mobile">{mobileLabel}</span></button>)}
        </div>

        <div className="wedding-view-content mt-5 grid gap-5">
          {view === 'process' && <div role="tabpanel" id="wedding-panel-process" aria-labelledby="wedding-tab-process" className="grid gap-5"><MarriageProcessCard process={process} nodes={nodes} loading={loading} onCreate={openSettings} onEditNode={openNode} onOpenAgreements={() => setView('agreements')} onOpenSettings={openSettings} /><div className="wedding-process-support-overview"><WeddingOverview overview={overview} loading={loading} onEditBudget={(trigger) => openBudget(null, trigger)} /></div></div>}
          {view === 'stages' && <div role="tabpanel" id="wedding-panel-stages" aria-labelledby="wedding-tab-stages" className="grid gap-5">{process ? <MarriageNodeList nodes={nodes} loading={loading} onEdit={openNode} onHistory={openHistory} onCreateAction={(node) => openTask(null, node.nodeKey)} /> : <MarriageProcessCard process={null} nodes={[]} loading={loading} emptyView="stages" onCreate={openSettings} onEditNode={openNode} onOpenAgreements={() => setView('agreements')} onOpenSettings={openSettings} />}</div>}
          {view === 'agreements' && <div role="tabpanel" id="wedding-panel-agreements" aria-labelledby="wedding-tab-agreements">{process ? <MarriageAgreementList agreements={agreements} loading={loading} onCreate={async (title) => { await createAgreement({ title }); setStatus('共识议题已添加') }} onUpdate={async (id, data) => { await updateAgreement(id, data); setStatus('共识议题已更新') }} onArchive={async (id) => { await archiveAgreement(id); setStatus('共识议题已归档') }} /> : <MarriageProcessCard process={null} nodes={[]} loading={loading} emptyView="agreements" onCreate={openSettings} onEditNode={openNode} onOpenAgreements={() => setView('agreements')} onOpenSettings={openSettings} />}</div>}
          {view === 'execution' && <div role="tabpanel" id="wedding-panel-execution" aria-labelledby="wedding-tab-execution" className="grid gap-5"><section className="wedding-mobile-execution-actions" aria-label="婚礼执行快捷操作"><Button className="wedding-mobile-action" onClick={() => openTask()} disabled={loading}><Plus aria-hidden="true" className="h-4 w-4" /><span>新增行动</span></Button><Button variant="outline" className="wedding-mobile-action" onClick={() => openExpense()} disabled={loading}><Receipt aria-hidden="true" className="h-4 w-4" /><span>记花费</span></Button><Button variant="outline" className="wedding-mobile-action" onClick={(event) => openBudget(null, event.currentTarget)} disabled={loading}><Wallet aria-hidden="true" className="h-4 w-4" /><span>预算</span></Button></section><WeddingOverview overview={overview} loading={loading} onEditBudget={(trigger) => openBudget(null, trigger)} /><WeddingTaskBoard tasks={tasks} loading={loading} hasMore={tasksHasMore} onLoadMore={() => void fetchTasks({ limit: 50, offset: tasks.length }).catch(() => undefined)} onEdit={(task) => openTask(task, task.stageKey ?? ('wedding' as MarriageNodeKey))} onDelete={(task) => setDeleteTarget({ resource: 'task', id: task.id })} onStatusChange={(id, nextStatus) => void changeTaskStatus(id, nextStatus).catch(() => undefined)} /><WeddingTimeline timeline={timeline} loading={loading} /><WeddingExpenseList expenses={expenses} loading={loading} hasMore={expensesHasMore} onLoadMore={() => void fetchExpenses({ limit: 50, offset: expenses.length }).catch(() => undefined)} onCreate={() => openExpense()} onEdit={openExpense} onDelete={(expense) => setDeleteTarget({ resource: 'expense', id: expense.id })} /></div>}
          {view === 'settings' && <div role="tabpanel" id="wedding-panel-settings" aria-labelledby="wedding-tab-settings" className="grid gap-5"><section className="wedding-panel" aria-labelledby="wedding-settings-title"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="wedding-eyebrow">流程设置</p><h2 id="wedding-settings-title" className="mt-1 text-xl font-semibold text-stone-950">决定记录方式和未来安排</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">这些设置不会改变已经发生的节点事实；领证和婚礼也始终分别记录。</p></div><Button type="button" className="min-h-11 gap-2" onClick={openSettings}><PencilLine aria-hidden="true" className="h-4 w-4" />{process ? '编辑流程设置' : '建立婚姻进程'}</Button></div>{process ? <div className="wedding-settings-facts mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="wedding-fact-cell"><span className="wedding-fact-label">记录人视角</span><strong>{recorderRoleLabels[process.recorderRole]}</strong><span>只影响称呼</span></div><div className="wedding-fact-cell"><span className="wedding-fact-label">上门顺序</span><strong>{visitOrderLabels[process.visitOrder]}</strong><span>两次上门独立完成</span></div><div className="wedding-fact-cell"><span className="wedding-fact-label">领证与婚礼</span><strong>{marriageOrderLabels[process.marriageOrder]}</strong><span>实际顺序以记录为准</span></div><div className="wedding-fact-cell"><span className="wedding-fact-label">订婚</span><strong>{engagementModeLabels[process.engagementMode]}</strong><span>可采用、跳过或暂不决定</span></div></div> : <div className="mt-6 border-l-2 border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950">还没有婚姻进程。建立后会初始化 8 个节点和 6 个默认共识议题，不会根据旧任务臆造已经发生的事实。</div>}</section><div className="wedding-process-support-overview"><WeddingOverview overview={overview} loading={loading} onEditBudget={(trigger) => openBudget(null, trigger)} /></div></div>}
        </div>
      </div>

      <MarriageProcessSettingsDialog open={settingsOpen} process={processSettings(process)} onOpenChange={setSettingsOpen} onSubmit={submitSettings} />
      <MarriageNodeDialog open={editingNode !== null} node={editingNode} requiresBackfill={requiresParentsMeetingBackfill} onOpenChange={(open) => !open && setEditingNode(null)} onSubmit={submitNode} />
      <Dialog open={historyNode !== null} onOpenChange={(open) => !open && setHistoryNode(null)}><DialogContent aria-describedby="marriage-history-description"><DialogHeader><DialogTitle>{historyNode ? `${marriageNodeKeyLabels[historyNode.nodeKey]}历史` : '节点历史'}</DialogTitle><DialogDescription id="marriage-history-description">历史记录用于区分计划调整、事实记录和重新打开，不会改写已经发生的日期。</DialogDescription></DialogHeader><div className="grid gap-3">{historyNode && (nodeHistory[historyNode.nodeKey] ?? []).length === 0 ? <p className="py-5 text-sm text-muted-foreground">暂时没有变更历史。</p> : <ol className="grid gap-3">{historyNode && (nodeHistory[historyNode.nodeKey] ?? []).map((item) => <li key={item.id} className="border-l-2 border-rose-200 pl-3 text-sm"><p className="font-semibold text-stone-900">{item.eventType === 'reopened' ? '重新打开节点' : '更新节点记录'}</p><p className="mt-1 text-stone-600">{item.fromStatus ?? '—'} → {item.toStatus ?? '—'} · {item.createdAt.slice(0, 10)}</p>{item.reason && <p className="mt-1 break-words text-stone-600">原因：{item.reason}</p>}</li>)}</ol>}</div></DialogContent></Dialog>
      <WeddingTaskDialog open={dialog === 'task'} task={editingTask} processId={process?.id ?? null} defaultStageKey={actionStageKey} onOpenChange={(open) => !open && setDialog(null)} onSubmit={submitTask} />
      <WeddingExpenseDialog open={dialog === 'expense'} tasks={tasks} expense={editingExpense} onOpenChange={(open) => !open && setDialog(null)} onSubmit={submitExpense} />
      <WeddingBudgetDialog open={dialog === 'budget'} budget={budget} onOpenChange={(open) => !open && closeBudget()} onSubmit={submitBudget} />
      <WeddingDeleteDialog open={deleteTarget !== null} resource={deleteTarget?.resource ?? 'task'} submitting={deleteSubmitting} onOpenChange={(open) => !open && setDeleteTarget(null)} onConfirm={confirmDelete} />
      <MobileTabBar />
    </main>
  )
}
