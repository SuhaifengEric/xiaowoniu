import { useEffect, useState } from 'react'
import { ArrowLeft, Dumbbell, Plus, Scale, Target, Trash2, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import CheckinDialog from '@/components/fitness/CheckinDialog'
import GoalDialog from '@/components/fitness/GoalDialog'
import WeightDialog from '@/components/fitness/WeightDialog'
import AccountMenu from '@/components/navigation/AccountMenu'
import MobileTabBar from '@/components/navigation/MobileTabBar'
import { Button } from '@/components/ui/button'
import Toast from '@/components/ui/toast'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useFitnessStore } from '@/store/fitness.store'
import CheckinCalendar, { formatLocalDate, getCalendarRange } from './CheckinCalendar'
import GoalProgress from './GoalProgress'
import WeightChart, { sortWeightRecords } from './WeightChart'

export { formatLocalDate } from './CheckinCalendar'

type DialogName = 'checkin' | 'weight' | 'goal'
const dashboardActions: Record<string, DialogName> = {
  checkin: 'checkin',
  weight: 'weight',
  goal: 'goal',
}
const timeNames = { morning: '早上', evening: '晚上' } as const

function chineseDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return `${year}年${month}月${day}日`
}

export default function Fitness() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const checkins = useFitnessStore((state) => state.checkins)
  const weights = useFitnessStore((state) => state.weights)
  const goal = useFitnessStore((state) => state.goal)
  const stats = useFitnessStore((state) => state.stats)
  const loading = useFitnessStore((state) => state.loading)
  const error = useFitnessStore((state) => state.error)
  const fetchDashboard = useFitnessStore((state) => state.fetchDashboard)
  const fetchCheckins = useFitnessStore((state) => state.fetchCheckins)
  const createCheckin = useFitnessStore((state) => state.createCheckin)
  const createWeight = useFitnessStore((state) => state.createWeight)
  const deleteWeight = useFitnessStore((state) => state.deleteWeight)
  const upsertGoal = useFitnessStore((state) => state.upsertGoal)
  const clearError = useFitnessStore((state) => state.clearError)
  const [dialog, setDialog] = useState<DialogName | null>(null)
  const [dashboardReturnFocus, setDashboardReturnFocus] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => formatLocalDate(new Date()))
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [initialCalendarRange] = useState(() => getCalendarRange(month))
  const [status, setStatus] = useState('')
  const [weightToDelete, setWeightToDelete] = useState<string | null>(null)
  const [deletingWeight, setDeletingWeight] = useState(false)

  useEffect(() => {
    void fetchDashboard?.(initialCalendarRange).catch(() => undefined)
  }, [fetchDashboard, initialCalendarRange])

  const openDialog = (name: DialogName, date = formatLocalDate(new Date()), dashboardAction: string | null = null) => {
    setDashboardReturnFocus(dashboardAction)
    setSelectedDate(date)
    setStatus('')
    setDialog(name)
  }

  useEffect(() => {
    const action = searchParams.get('action')
    if (!action) return

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('action')
    setSearchParams(nextParams, { replace: true })

    const dialogName = dashboardActions[action]
    if (dialogName) openDialog(dialogName, formatLocalDate(new Date()), action)
  }, [searchParams, setSearchParams])

  const changeMonth = (nextMonth: Date) => {
    setMonth(nextMonth)
    void fetchCheckins?.(getCalendarRange(nextMonth)).catch(() => undefined)
  }

  const submitCheckin: typeof createCheckin = async (data) => {
    await createCheckin(data)
    setStatus('打卡已保存')
  }
  const submitWeight: typeof createWeight = async (data) => {
    await createWeight(data)
    setStatus('体重已记录')
  }
  const submitGoal: typeof upsertGoal = async (data) => {
    await upsertGoal(data)
    setStatus('目标已更新')
  }

  const handleDeleteWeight = async () => {
    if (!weightToDelete) return
    setStatus('')
    setDeletingWeight(true)
    try {
      await deleteWeight(weightToDelete)
      setWeightToDelete(null)
      setStatus('体重记录已删除')
    } catch {
      // The store owns the error message shown by the page.
    } finally {
      setDeletingWeight(false)
    }
  }

  const recentWeights = sortWeightRecords(weights).slice(-5).reverse()

  return (
    <main className="app-page fitness-page has-mobile-tabbar" data-dialog-return-focus={dashboardReturnFocus ?? undefined}>
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <nav className="app-nav flex min-h-11 items-center justify-between gap-3 border-b pb-4" aria-label="页面导航">
          <Button variant="ghost" className="app-nav-action min-h-11 gap-2 px-2" onClick={() => navigate('/dashboard')}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />返回世界仪表盘
          </Button>
          <AccountMenu />
        </nav>

        <header className="app-page-header flex flex-col gap-5 py-9 md:flex-row md:items-end md:justify-between">
          <div><h1 className="app-page-title">瘦瘦瘦</h1><p className="app-page-description mt-3 max-w-xl">把运动、体重和本周目标放在同一个工作台。</p></div>
          <section aria-label="健身操作" className="app-actions grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button className="fitness-action fitness-action--green" data-dialog-focus="checkin" onClick={() => openDialog('checkin')}><Dumbbell aria-hidden="true" className="h-4 w-4" />运动打卡</Button>
            <Button variant="outline" className="fitness-action" data-dialog-focus="weight" onClick={() => openDialog('weight')}><Scale aria-hidden="true" className="h-4 w-4" />记录体重</Button>
            <Button variant="outline" className="fitness-action" data-dialog-focus="goal" onClick={() => openDialog('goal')}><Target aria-hidden="true" className="h-4 w-4" />设置目标</Button>
          </section>
        </header>

        {error && <div role="alert" className="app-alert mb-5 flex items-center justify-between gap-4 border px-4 py-3 text-sm"><span>{error}</span><Button type="button" variant="ghost" size="icon" aria-label="关闭错误提示" onClick={clearError}><X aria-hidden="true" className="h-4 w-4" /></Button></div>}
        <Toast message={status} onDismiss={() => setStatus('')} />
        {loading && <div aria-label="健身数据加载中" className="mb-5 grid grid-cols-3 gap-3" aria-busy="true"><span className="fitness-skeleton h-2" /><span className="fitness-skeleton h-2" /><span className="fitness-skeleton h-2" /></div>}

        <section aria-label="健身统计" className="app-stat-grid mb-5 grid gap-px sm:grid-cols-3">
          <div className="app-stat p-5"><p className="app-stat-label">本周运动</p><p className="app-stat-value mt-2">{stats?.currentWeek.checkinsCount ?? 0} 次</p><p className="app-stat-note mt-1">{stats?.currentWeek.totalMinutes ?? 0} 分钟</p></div>
          <div className="app-stat p-5"><p className="app-stat-label">本月打卡</p><p className="app-stat-value mt-2">{stats?.currentMonth.checkinsCount ?? 0} 次</p><p className="app-stat-note mt-1">共 {stats?.currentMonth.totalMinutes ?? 0} 分钟</p></div>
          <div className="app-stat p-5"><p className="app-stat-label">当前体重</p><p className="app-stat-value mt-2">{stats?.weightTrend.current !== null && stats?.weightTrend.current !== undefined ? `${stats.weightTrend.current} kg` : '暂无'}</p><p className="app-stat-note mt-1">{stats?.weightTrend.change === null || stats?.weightTrend.change === undefined ? '等待更多记录' : `较上次 ${stats.weightTrend.change > 0 ? '+' : ''}${stats.weightTrend.change} kg`}</p></div>
        </section>

        <div className="mb-5"><GoalProgress goal={goal} stats={stats} loading={loading} onEdit={() => openDialog('goal')} /></div>

        <div className="grid items-start gap-5 lg:grid-cols-2">
          <CheckinCalendar records={checkins} month={month} onMonthChange={changeMonth} onSelectDate={(date) => openDialog('checkin', date)} loading={loading} />
          <WeightChart records={weights} loading={loading} />
        </div>

        <section className="fitness-panel mt-5" aria-labelledby="recent-weight-title">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4"><div><p className="fitness-kicker">记录管理</p><h2 id="recent-weight-title" className="mt-1 text-xl font-semibold">最近体重</h2></div><Button variant="outline" className="min-h-11 gap-2" onClick={() => openDialog('weight')}><Plus aria-hidden="true" className="h-4 w-4" />新增</Button></div>
          {recentWeights.length === 0 ? <p className="py-8 text-center text-sm text-stone-500">暂无可管理的体重记录</p> : <ul>{recentWeights.map((record) => <li key={record.id} className="flex min-h-14 items-center justify-between gap-3 border-b border-stone-100 py-2"><div><p className="font-medium">{record.weightKg} kg</p><p className="text-sm text-stone-500">{chineseDate(record.date)} · {timeNames[record.timeOfDay]}</p></div><Button type="button" variant="ghost" size="icon" className="fitness-icon-button text-stone-500 hover:bg-red-50 hover:text-red-800" aria-label={`删除${chineseDate(record.date)}${timeNames[record.timeOfDay]}的体重记录`} onClick={() => setWeightToDelete(record.id)} disabled={loading}><Trash2 aria-hidden="true" className="h-4 w-4" /></Button></li>)}</ul>}
        </section>
      </div>

      <CheckinDialog open={dialog === 'checkin'} onOpenChange={(open) => setDialog(open ? 'checkin' : null)} initialDate={selectedDate} onSubmit={submitCheckin} />
      <WeightDialog open={dialog === 'weight'} onOpenChange={(open) => setDialog(open ? 'weight' : null)} initialDate={selectedDate} onSubmit={submitWeight} />
      <GoalDialog open={dialog === 'goal'} onOpenChange={(open) => setDialog(open ? 'goal' : null)} initialDate={selectedDate} goal={goal} onSubmit={submitGoal} />
      <Dialog open={weightToDelete !== null} onOpenChange={(open) => !open && !deletingWeight && setWeightToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除体重记录</DialogTitle>
            <DialogDescription>删除后无法恢复。确定要删除这条体重记录吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={deletingWeight}>取消</Button>
            </DialogClose>
            <Button type="button" variant="destructive" disabled={deletingWeight} onClick={handleDeleteWeight}>
              {deletingWeight ? '删除中…' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <MobileTabBar />
    </main>
  )
}
