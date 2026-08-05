import type { WeddingTimelineResponse } from '@xiaowoniu/shared'
import { taskStatusLabels, weddingCategoryLabels } from './wedding.constants'
import { CalendarHeart, CalendarX2, Flag, MapPin } from 'lucide-react'

export interface WeddingTimelineProps {
  timeline: WeddingTimelineResponse | null
  loading: boolean
}

const dateLabel = (value: string) => { const [year, month, day] = value.split('-'); return `${year}年${Number(month)}月${Number(day)}日` }

export function WeddingTimeline({ timeline, loading }: WeddingTimelineProps) {
  if (loading && !timeline) return <section className="wedding-panel" role="status" aria-busy="true" aria-label="时间线加载中"><div className="wedding-skeleton h-6 w-40" /><div className="mt-4 grid gap-4"><div className="wedding-skeleton h-24" /><div className="wedding-skeleton h-24" /></div></section>
  const items = timeline?.items ?? []
  return <section className="wedding-panel" aria-labelledby="wedding-timeline-title">
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-4">
      <div><p className="wedding-kicker">Milestones</p><h2 id="wedding-timeline-title" className="mt-1 text-xl font-semibold text-stone-950">婚期里程碑时间线</h2></div>
      <p className="flex items-center gap-2 text-sm text-stone-600"><Flag aria-hidden="true" className="h-4 w-4 text-pink-700" />{timeline?.weddingDate ? `婚礼日期 ${dateLabel(timeline.weddingDate)}` : '未设置婚期'}</p>
    </div>
    {items.length === 0 ? <div className="py-10 text-center"><CalendarX2 className="mx-auto h-8 w-8 text-stone-400" aria-hidden="true" /><p className="mt-3 text-sm text-stone-600">暂无里程碑，为任务设置计划日期后会显示在这里</p></div> : <ol className="wedding-timeline-list mt-4" aria-label="里程碑列表">
      {items.map((item) => <li key={item.taskId} className="relative min-w-0 border-l-2 border-pink-100 pl-5 pb-6 last:pb-0">
        <span aria-hidden="true" className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full ${item.status === 'completed' ? 'bg-sky-600' : 'bg-pink-600'}`} />
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><time className="text-sm font-semibold text-stone-900">{dateLabel(item.plannedDate)}</time><span className="rounded-sm bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">{taskStatusLabels[item.status] ?? item.status}</span><span className="rounded-sm bg-pink-50 px-1.5 py-0.5 text-xs text-pink-800">{weddingCategoryLabels[item.category] ?? item.category}</span></div><h3 className="mt-1 break-words font-medium text-stone-950">{item.taskName}</h3><p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">{item.isOverdue && <span className="font-medium text-red-800">已逾期</span>}{item.completedDate && <span className="flex items-center gap-1"><MapPin aria-hidden="true" className="h-3.5 w-3.5" />完成于 {dateLabel(item.completedDate)}</span>}<span className="flex items-center gap-1"><CalendarHeart aria-hidden="true" className="h-3.5 w-3.5" />优先级 {item.priority}</span></p></div>
      </li>)}
    </ol>}
  </section>
}
