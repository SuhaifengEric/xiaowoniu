import { AlertCircle, HeartHandshake, PencilLine, RotateCcw } from 'lucide-react'
import type { MarriageNodeResponse, MarriageProcessResponse } from '@xiaowoniu/shared'
import { marriageNodeKeyLabels, marriageNodeStatusLabels } from './wedding.constants'
import { Button } from '@/components/ui/button'

interface MarriageProcessCardProps {
  process: MarriageProcessResponse | null
  nodes: MarriageNodeResponse[]
  loading: boolean
  emptyView?: 'process' | 'stages' | 'agreements'
  onCreate: () => void
  onEditNode: (node: MarriageNodeResponse) => void
  onOpenAgreements: () => void
  onOpenSettings: () => void
}

const formatDate = (value: string | null) => value ? value.replace(/-/g, '.') : '待安排'

const emptyViewCopy = {
  process: {
    eyebrow: '嫁嫁嫁 · 婚姻进程',
    title: '先把你们正在经历的阶段记下来',
    description: '从确认婚姻意愿到领证与婚礼，系统只记录你明确确认的事实和计划。记录人视角只影响称呼，不代表谁拥有决定权。',
  },
  stages: {
    eyebrow: '嫁嫁嫁 · 阶段记录',
    title: '从第一个阶段开始记录',
    description: '建立婚姻进程后，这里会按真实发生的节点展示上门、见面、登记和婚礼等阶段。尚未发生的事保持待安排，不会替你们推断。',
  },
  agreements: {
    eyebrow: '嫁嫁嫁 · 双方共识',
    title: '把重要共识留在这里',
    description: '建立婚姻进程后，这里会准备六个默认议题，记录你们的决定、分歧和下一步。共识不是审批，也不会替你们做决定。',
  },
} as const

export function MarriageProcessCard({ process, nodes, loading, emptyView, onCreate, onEditNode, onOpenAgreements, onOpenSettings }: MarriageProcessCardProps) {
  if (loading && !process) {
    return <section className="wedding-process-hero wedding-panel" role="status" aria-busy="true" aria-label="婚姻进程加载中"><div className="wedding-skeleton h-8 w-52" /><div className="wedding-skeleton mt-4 h-5 w-80 max-w-full" /><div className="wedding-skeleton mt-8 h-3 w-full" /></section>
  }

  if (!process) {
    const view = emptyView ?? 'process'
    const copy = emptyViewCopy[view]
    return <section className="wedding-process-hero wedding-panel" aria-labelledby="marriage-process-empty-title">
      <p className="wedding-eyebrow">{copy.eyebrow}</p>
      <h2 id="marriage-process-empty-title" className="wedding-process-title mt-3 text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">{copy.title}</h2>
      <p className="wedding-process-empty-copy mt-3 max-w-2xl text-sm leading-7 text-stone-600">{copy.description}</p>
      <Button type="button" className="wedding-process-primary mt-7 min-h-11 gap-2" onClick={onCreate}><HeartHandshake aria-hidden="true" className="h-4 w-4" />建立婚姻进程</Button>
    </section>
  }

  const nextName = process.recommendedNext ? marriageNodeKeyLabels[process.recommendedNext] : '两个节点都已记录'
  const currentName = process.currentStage ? marriageNodeKeyLabels[process.currentStage] : '婚姻阶段已完成'
  const visits = nodes.filter((node) => node.nodeKey === 'male_visit' || node.nodeKey === 'female_visit')
  const legal = nodes.find((node) => node.nodeKey === 'registration')
  const ceremony = nodes.find((node) => node.nodeKey === 'wedding')
  const riskCount = process.warnings.filter((warning) => warning.level !== 'info').length

  return <section className="wedding-process-hero wedding-panel" aria-labelledby="marriage-process-title">
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <p className="wedding-eyebrow">嫁嫁嫁 · 婚姻进程</p>
        <h2 id="marriage-process-title" className="wedding-process-title mt-2 text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">{currentName}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">推荐下一步：<span className="font-semibold text-stone-900">{nextName}</span>。推荐是提醒，不是必须遵循的法律或家庭顺序。</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={onOpenSettings}><PencilLine aria-hidden="true" className="h-4 w-4" />流程设置</Button>
        <Button type="button" variant="ghost" className="min-h-11 gap-2" onClick={onOpenAgreements}><HeartHandshake aria-hidden="true" className="h-4 w-4" />共识记录</Button>
      </div>
    </div>

    <div className="mt-7" aria-label={`婚姻进程完成度 ${process.progress.percentage}%`}>
      <div className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-stone-800">主线记录进度</span><span className="text-stone-600">{process.progress.completed} / {process.progress.total} 个节点</span></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-rose-100"><span className="block h-full rounded-full bg-rose-700 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${process.progress.percentage}%` }} /></div>
    </div>

    <div className="wedding-process-facts mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="wedding-fact-cell"><span className="wedding-fact-label">两次上门</span><strong>{visits.filter((node) => node.status === 'completed').length} / 2</strong><span>{visits.every((node) => node.status === 'completed') ? '两场都已记录' : '仍需分别安排和记录'}</span></div>
      <div className="wedding-fact-cell"><span className="wedding-fact-label">需要再沟通</span><strong>{riskCount}</strong><span>{riskCount ? '打开共识记录查看' : '当前没有高优先级提醒'}</span></div>
      <div className="wedding-fact-cell"><span className="wedding-fact-label">依法办理结婚登记</span><strong>{legal?.status === 'completed' ? '已记录' : formatDate(legal?.plannedDate ?? null)}</strong><span>{legal?.status === 'completed' ? `实际日期 ${formatDate(legal.actualDate)}` : '法律节点独立记录'}</span></div>
      <div className="wedding-fact-cell"><span className="wedding-fact-label">婚礼</span><strong>{ceremony?.status === 'completed' ? '已完成' : formatDate(ceremony?.plannedDate ?? null)}</strong><span>{ceremony?.status === 'completed' ? `实际日期 ${formatDate(ceremony.actualDate)}` : '仪式节点独立记录'}</span></div>
    </div>

    {process.outOfOrder && <div className="mt-5 flex items-start gap-3 border-l-2 border-amber-500 bg-amber-50/70 px-4 py-3 text-sm text-amber-950" role="status"><RotateCcw aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><p>你已经提前记录了后续事实，系统保留实际发生顺序；未完成节点仍可单独安排。</p></div>}
    {process.warnings.length > 0 && <div className="mt-5 grid gap-2" aria-label="进程提醒">{process.warnings.slice(0, 3).map((warning) => <button key={`${warning.code}-${warning.agreementId ?? warning.nodeKey ?? ''}`} type="button" className="flex min-w-0 items-start gap-3 border border-stone-200 bg-stone-50 px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400" onClick={() => warning.nodeKey ? onEditNode(nodes.find((node) => node.nodeKey === warning.nodeKey) ?? nodes[0]) : onOpenAgreements}><AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><span className="min-w-0 break-words">{warning.message}</span></button>)}</div>}
  </section>
}

export function nodeStatusText(node: MarriageNodeResponse) {
  return `${marriageNodeKeyLabels[node.nodeKey]}：${marriageNodeStatusLabels[node.status]}`
}
