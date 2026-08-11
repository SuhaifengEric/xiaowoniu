import { useState } from 'react'
import type { TaskStatus, WeddingTaskResponse } from '@xiaowoniu/shared'
import { taskStatusLabels, weddingCategoryLabels } from './wedding.constants'
import { Archive, CalendarDays, CheckCircle2, ChevronDown, ListTodo, Loader2, Pencil, PlayCircle, RotateCcw, Trash2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const money = (value: number) => `¥${value.toFixed(2)}`
const dateLabel = (value: string) => { const [year, month, day] = value.split('-'); return `${year}年${Number(month)}月${Number(day)}日` }

export interface WeddingTaskBoardProps {
  tasks: WeddingTaskResponse[]
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onEdit: (task: WeddingTaskResponse) => void
  onDelete: (task: WeddingTaskResponse) => void
  onStatusChange: (id: string, status: TaskStatus) => void
}

const columns = [
  { status: 'pending' as TaskStatus, title: '待办', icon: ListTodo },
  { status: 'in_progress' as TaskStatus, title: '进行中', icon: PlayCircle },
  { status: 'completed' as TaskStatus, title: '已完成', icon: CheckCircle2 },
]

interface TaskCardProps {
  task: WeddingTaskResponse
  onEdit: (task: WeddingTaskResponse) => void
  onDelete: (task: WeddingTaskResponse) => void
  onStatusChange: (id: string, status: TaskStatus) => void
}

function TaskCard({ task, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const overdue = task.status !== 'completed' && task.plannedDate !== null && task.plannedDate < new Date().toISOString().slice(0, 10)
  return <article className="wedding-task-card min-w-0 border border-stone-200 bg-white p-3">
    <div className="flex min-w-0 items-start justify-between gap-2">
      <div className="min-w-0">
        <h4 className="break-words font-semibold text-stone-950">{task.taskName}</h4>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-600">
          <span className="rounded-sm bg-pink-50 px-1.5 py-0.5 text-pink-800">{weddingCategoryLabels[task.category] ?? task.category}</span>
          <span>优先级 {task.priority}</span>
          {task.plannedDate && <span className={`flex items-center gap-1 ${overdue ? 'font-medium text-red-800' : ''}`}><CalendarDays aria-hidden="true" className="h-3 w-3" />{dateLabel(task.plannedDate)}</span>}
          {overdue && <span className="font-medium text-red-800">已逾期</span>}
          {task.status === 'completed' && task.completedDate && <span>完成于 {dateLabel(task.completedDate)}</span>}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button type="button" variant="ghost" size="icon" className="wedding-icon-button" aria-label={`编辑任务${task.taskName}`} onClick={() => onEdit(task)}><Pencil aria-hidden="true" className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className="wedding-icon-button text-stone-500 hover:bg-red-50 hover:text-red-800" aria-label={`删除任务${task.taskName}`} onClick={() => onDelete(task)}><Trash2 aria-hidden="true" className="h-4 w-4" /></Button>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      {task.status === 'pending' && <Button type="button" size="sm" className="min-h-9 gap-1" onClick={() => onStatusChange(task.id, 'in_progress' as TaskStatus)}><PlayCircle aria-hidden="true" className="h-3.5 w-3.5" />开始</Button>}
      {task.status === 'in_progress' && <Button type="button" size="sm" className="min-h-9 gap-1" onClick={() => onStatusChange(task.id, 'completed' as TaskStatus)}><CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />完成</Button>}
      {task.status === 'in_progress' && <Button type="button" size="sm" variant="outline" className="min-h-9 gap-1" onClick={() => onStatusChange(task.id, 'pending' as TaskStatus)}><RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />恢复待办</Button>}
      {task.status === 'completed' && <Button type="button" size="sm" variant="outline" className="min-h-9 gap-1" onClick={() => onStatusChange(task.id, 'pending' as TaskStatus)}><RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />恢复待办</Button>}
      <Button type="button" size="sm" variant="ghost" className="min-h-9 gap-1 text-stone-500" onClick={() => onStatusChange(task.id, 'cancelled' as TaskStatus)}><XCircle aria-hidden="true" className="h-3.5 w-3.5" />取消</Button>
    </div>
  </article>
}

export function WeddingTaskBoard({ tasks, loading, hasMore, onLoadMore, onEdit, onDelete, onStatusChange }: WeddingTaskBoardProps) {
  const [archiveOpen, setArchiveOpen] = useState(false)
  const active = tasks.filter((task) => task.status !== 'cancelled')
  const cancelled = tasks.filter((task) => task.status === 'cancelled')

  return <section className="wedding-panel" aria-labelledby="wedding-board-title">
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-4">
      <div><h2 id="wedding-board-title" className="text-xl font-semibold text-stone-950">备婚任务看板</h2></div>
      {hasMore && <Button type="button" variant="outline" className="min-h-11" onClick={onLoadMore}><Loader2 aria-hidden="true" className="mr-2 h-4 w-4" />加载更多任务</Button>}
    </div>
    {loading && tasks.length === 0 ? <div className="mt-4 grid gap-4 md:grid-cols-3" role="status" aria-label="任务加载中" aria-busy="true"><div className="wedding-skeleton h-40" /><div className="wedding-skeleton h-40" /><div className="wedding-skeleton h-40" /></div> : active.length === 0 ? <div className="py-10 text-center"><ListTodo className="mx-auto h-8 w-8 text-stone-400" aria-hidden="true" /><p className="mt-3 text-sm text-stone-600">还没有备婚任务</p></div> : <div className="wedding-board-grid mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {columns.map(({ status, title, icon: Icon }) => <div key={status} className="rounded-sm border border-stone-200 bg-stone-50 p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-800"><Icon aria-hidden="true" className="h-4 w-4 text-pink-700" />{title}</h3>
        <div className="mt-3 grid gap-3">{active.filter((task) => task.status === status).map((task) => <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />)}</div>
      </div>)}
    </div>}
    {cancelled.length > 0 && <div className="mt-5">
      <Button type="button" variant="ghost" className="min-h-11 gap-2 text-stone-600" aria-expanded={archiveOpen} aria-controls="wedding-cancelled-archive" onClick={() => setArchiveOpen((value) => !value)}><Archive aria-hidden="true" className="h-4 w-4" />已取消归档（{cancelled.length}）<ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${archiveOpen ? 'rotate-180' : ''}`} /></Button>
      {archiveOpen && <div id="wedding-cancelled-archive" className="mt-2 grid gap-3 rounded-sm border border-stone-200 bg-stone-50 p-3 md:grid-cols-2 lg:grid-cols-3">
        {cancelled.map((task) => <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />)}
      </div>}
    </div>}
  </section>
}

export { money, dateLabel, taskStatusLabels }
