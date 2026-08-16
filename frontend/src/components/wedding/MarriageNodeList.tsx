import { CalendarDays, History, Pencil, Plus } from 'lucide-react'
import type { MarriageNodeResponse } from '@xiaowoniu/shared'
import { marriageNodeKeyLabels, marriageNodeStatusLabels } from './wedding.constants'
import { Button } from '@/components/ui/button'

interface MarriageNodeListProps {
  nodes: MarriageNodeResponse[]
  loading: boolean
  onEdit: (node: MarriageNodeResponse) => void
  onHistory: (node: MarriageNodeResponse) => void
  onCreateAction: (node: MarriageNodeResponse) => void
}

const statusClass: Record<string, string> = {
  not_started: 'bg-stone-100 text-stone-700', scheduled: 'bg-sky-50 text-sky-800', in_progress: 'bg-amber-50 text-amber-900', completed: 'bg-emerald-50 text-emerald-800', paused: 'bg-violet-50 text-violet-800', skipped: 'bg-stone-100 text-stone-600',
}

export function MarriageNodeList({ nodes, loading, onEdit, onHistory, onCreateAction }: MarriageNodeListProps) {
  if (loading && nodes.length === 0) return <section className="wedding-panel" role="status" aria-label="阶段记录加载中"><div className="grid gap-3"><div className="wedding-skeleton h-32" /><div className="wedding-skeleton h-32" /></div></section>
  return <section className="wedding-panel" aria-labelledby="marriage-nodes-title">
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-4"><div><p className="wedding-eyebrow">阶段记录</p><h2 id="marriage-nodes-title" className="mt-1 text-xl font-semibold text-stone-950">把发生过的事和准备做的事分开记</h2></div><span className="text-sm text-stone-500">计划日期不会自动完成节点</span></div>
    <div className="mt-4 grid gap-3">
      {nodes.map((node, index) => <article key={node.nodeKey} className={`marriage-node-row ${node.status === 'completed' ? 'marriage-node-row--complete' : ''}`}>
        <div className="marriage-node-index" aria-hidden="true">{node.status === 'completed' ? '✓' : String(index + 1).padStart(2, '0')}</div>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words text-base font-semibold text-stone-900">{marriageNodeKeyLabels[node.nodeKey]}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[node.status]}`}>{marriageNodeStatusLabels[node.status]}</span>{node.backfilled && <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800">用户补录</span>}</div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600"><span className="inline-flex items-center gap-1"><CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />计划 {node.plannedDate ?? '待安排'}</span>{node.actualDate && <span>实际 {node.actualDate}</span>}{node.isOverdue && <span className="font-semibold text-red-700">计划已过</span>}</div>{node.conclusion && <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-stone-600">{node.conclusion}</p>}</div>
        <div className="wedding-node-actions flex shrink-0 flex-wrap justify-end gap-1"><Button type="button" variant="ghost" className="wedding-node-action wedding-icon-button" aria-label={`记录${marriageNodeKeyLabels[node.nodeKey]}`} onClick={() => onEdit(node)}><Pencil aria-hidden="true" className="h-4 w-4" /><span>记录</span></Button><Button type="button" variant="ghost" className="wedding-node-action wedding-icon-button" aria-label={`查看${marriageNodeKeyLabels[node.nodeKey]}历史`} onClick={() => onHistory(node)}><History aria-hidden="true" className="h-4 w-4" /><span>历史</span></Button><Button type="button" variant="ghost" className="wedding-node-action wedding-icon-button" aria-label={`为${marriageNodeKeyLabels[node.nodeKey]}添加行动项`} onClick={() => onCreateAction(node)}><Plus aria-hidden="true" className="h-4 w-4" /><span>行动</span></Button></div>
      </article>)}
    </div>
  </section>
}
