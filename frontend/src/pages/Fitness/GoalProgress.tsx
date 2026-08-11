import type { FitnessGoalResponse, FitnessStatsResponse } from '@xiaowoniu/shared'
import { CalendarClock, Pencil, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface GoalProgressProps {
  goal: FitnessGoalResponse | null
  stats: FitnessStatsResponse | null
  loading: boolean
  onEdit: () => void
}

function chineseDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return `${year}年${month}月${day}日`
}

export default function GoalProgress({ goal, stats, loading, onEdit }: GoalProgressProps) {
  if (loading && !goal) return <section className="fitness-panel" aria-label="目标加载中" aria-busy="true"><div className="fitness-skeleton h-5 w-28" /><div className="fitness-skeleton mt-5 h-20 w-full" /></section>

  if (!goal) return (
    <section className="fitness-panel flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center" aria-labelledby="goal-empty-title">
      <div className="flex items-start gap-3"><span className="fitness-symbol fitness-symbol--coral"><Target aria-hidden="true" className="h-5 w-5" /></span><div><h2 id="goal-empty-title" className="font-semibold text-stone-900">还没有健身目标</h2><p className="mt-1 text-sm text-stone-600">设置每周运动次数，让进度有清晰参照。</p></div></div>
      <Button type="button" onClick={onEdit} className="min-h-11">创建目标</Button>
    </section>
  )

  const completed = stats?.currentWeek.checkinsCount ?? 0
  const target = goal.weeklyWorkoutTarget
  const rawProgress = target > 0 ? (completed / target) * 100 : completed > 0 ? 100 : 0
  const progress = Math.min(100, Math.max(0, rawProgress))
  const status = target === 0 ? '本周未设置次数要求' : completed >= target ? '本周目标已完成' : `还差 ${target - completed} 次完成本周目标`

  return (
    <section className="fitness-panel" aria-labelledby="goal-title">
      <div className="flex items-start justify-between gap-4">
        <div><p className="fitness-kicker">本周目标</p><h2 id="goal-title" className="text-xl font-semibold text-stone-900">{completed} / {target} 次</h2></div>
        <Button type="button" variant="ghost" size="icon" className="fitness-icon-button" aria-label="编辑目标" onClick={onEdit}><Pencil aria-hidden="true" className="h-4 w-4" /></Button>
      </div>
      <Progress value={progress} aria-label="本周运动目标完成度" className="mt-5 bg-secondary [&>div]:bg-primary" />
      <p className={`mt-2 text-sm font-medium ${completed >= target && target > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{status}</p>
      <dl className="mt-5 grid gap-3 border-t border-stone-200 pt-4 sm:grid-cols-2">
        {goal.targetWeightKg !== null && <div className="flex items-center gap-3"><span className="fitness-symbol"><Target aria-hidden="true" className="h-4 w-4" /></span><div><dt className="text-xs text-stone-500">目标体重</dt><dd className="font-semibold text-stone-900">{goal.targetWeightKg} kg</dd></div></div>}
        {goal.targetDate && <div className="flex items-center gap-3"><span className="fitness-symbol"><CalendarClock aria-hidden="true" className="h-4 w-4" /></span><div><dt className="text-xs text-stone-500">目标期限</dt><dd className="font-semibold text-stone-900">{chineseDate(goal.targetDate)}</dd></div></div>}
      </dl>
    </section>
  )
}
