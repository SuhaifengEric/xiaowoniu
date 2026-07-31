import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatLocalDate, getCalendarDays } from '@/pages/Fitness/CheckinCalendar'

interface Activity {
  date: string
  checkinsCount: number
  studyHours: number
  completedChaptersCount: number
}

interface StudyCalendarProps {
  month: Date
  activities: Activity[]
  loading?: boolean
  onMonthChange: (month: Date) => void
  onSelectDate: (date: string) => void
}

const weekdays = ['一', '二', '三', '四', '五', '六', '日']

function shiftMonth(month: Date, amount: number) {
  return new Date(month.getFullYear(), month.getMonth() + amount, 1)
}

function activityLabel(activity: Activity) {
  return `${activity.studyHours} 小时，${activity.checkinsCount} 次打卡，${activity.completedChaptersCount} 章`
}

export default function StudyCalendar({ month, activities, loading = false, onMonthChange, onSelectDate }: StudyCalendarProps) {
  const days = getCalendarDays(month)
  const today = formatLocalDate(new Date())
  const activityByDate = activities.reduce<Record<string, Activity>>((result, activity) => {
    result[activity.date] = activity
    return result
  }, {})

  return (
    <section className="learning-panel" aria-labelledby="study-calendar-title" aria-busy={loading}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="learning-kicker">学习日历</p>
          <h2 id="study-calendar-title" className="mt-1 text-xl font-semibold text-slate-950">{month.getFullYear()}年{month.getMonth() + 1}月</h2>
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="icon" className="learning-icon-button" aria-label="查看上个月" onClick={() => onMonthChange(shiftMonth(month, -1))} disabled={loading}><ChevronLeft aria-hidden="true" className="h-5 w-5" /></Button>
          <Button type="button" variant="ghost" size="icon" className="learning-icon-button" aria-label="查看下个月" onClick={() => onMonthChange(shiftMonth(month, 1))} disabled={loading}><ChevronRight aria-hidden="true" className="h-5 w-5" /></Button>
        </div>
      </div>
      <div role="grid" aria-label={`${month.getFullYear()}年${month.getMonth() + 1}月学习日历`} className="mt-4 grid grid-cols-7 gap-1">
        {weekdays.map((day) => <div key={day} role="columnheader" aria-label={`周${day}`} className="py-2 text-center text-xs font-semibold text-slate-500">{day}</div>)}
        {days.map((date) => {
          const dateKey = formatLocalDate(date)
          const activity = activityByDate[dateKey] ?? { date: dateKey, checkinsCount: 0, studyHours: 0, completedChaptersCount: 0 }
          const isCurrentMonth = date.getMonth() === month.getMonth()
          const isToday = dateKey === today
          const label = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日，${activityLabel(activity)}`
          return (
            <button key={dateKey} type="button" aria-label={label} onClick={() => onSelectDate(dateKey)} className={`learning-calendar-day ${isCurrentMonth ? '' : 'learning-calendar-day--outside'} ${isToday ? 'learning-calendar-day--today' : ''}`}>
              <span className="font-medium">{date.getDate()}</span>
              {activity.checkinsCount > 0 ? <span className="mt-1 text-[10px] font-semibold text-blue-800">{activity.checkinsCount} 次 · {activity.studyHours}h</span> : <span className="mt-1 text-[10px] text-slate-400">无记录</span>}
            </button>
          )
        })}
      </div>
      {loading && <p role="status" className="mt-3 text-sm text-slate-500">学习日历加载中…</p>}
      {!loading && activities.every((activity) => activity.checkinsCount === 0) && <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="text-sm text-slate-500">这个范围还没有学习记录。</p><Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => onSelectDate(formatLocalDate(new Date()))}><Plus aria-hidden="true" className="h-4 w-4" />记录今天</Button></div>}
    </section>
  )
}

export { activityLabel }
