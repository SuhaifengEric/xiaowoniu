import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import CheckinDialog from '@/components/fitness/CheckinDialog'
import WeightDialog from '@/components/fitness/WeightDialog'
import GoalDialog from '@/components/fitness/GoalDialog'
import { useFitnessStore } from '@/store/fitness.store'

export function formatLocalDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export default function Fitness() {
  const navigate = useNavigate()
  const createCheckin = useFitnessStore((state) => state.createCheckin)
  const createWeight = useFitnessStore((state) => state.createWeight)
  const upsertGoal = useFitnessStore((state) => state.upsertGoal)
  const [dialog, setDialog] = useState<'checkin' | 'weight' | 'goal' | null>(null)
  const today = formatLocalDate(new Date())

  return (
    <main className="min-h-screen bg-background p-6 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" className="mb-8 px-0" onClick={() => navigate('/dashboard')}>返回 Dashboard</Button>
        <header className="mb-8">
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">Fitness</p>
          <h1 className="text-3xl font-semibold tracking-tight">健身记录</h1>
        </header>
        <section aria-label="健身操作" className="grid gap-3 sm:grid-cols-3">
          <Button variant="outline" className="h-12" onClick={() => setDialog('checkin')}>运动打卡</Button>
          <Button variant="outline" className="h-12" onClick={() => setDialog('weight')}>记录体重</Button>
          <Button variant="outline" className="h-12" onClick={() => setDialog('goal')}>设置目标</Button>
        </section>
      </div>
      <CheckinDialog open={dialog === 'checkin'} onOpenChange={(open) => setDialog(open ? 'checkin' : null)} initialDate={today} onSubmit={createCheckin} />
      <WeightDialog open={dialog === 'weight'} onOpenChange={(open) => setDialog(open ? 'weight' : null)} initialDate={today} onSubmit={createWeight} />
      <GoalDialog open={dialog === 'goal'} onOpenChange={(open) => setDialog(open ? 'goal' : null)} initialDate={today} onSubmit={upsertGoal} />
    </main>
  )
}
