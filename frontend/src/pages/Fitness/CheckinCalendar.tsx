import type { FitnessCheckinResponse } from '@xiaowoniu/shared'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CheckinCalendarProps {
  records: FitnessCheckinResponse[]
  month: Date
  onMonthChange: (month: Date) => void
  onSelectDate: (date: string) => void
  loading?: boolean
}

const weekdays = ['一', '二', '三', '四', '五', '六', '日']
const activityNames: Record<FitnessCheckinResponse['activityType'], string> = {
  pilates: '普拉提',
  gym_slope: '爬坡机',
  other: '其他运动',
}

export function formatLocalDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function getCalendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const mondayOffset = (first.getDay() + 6) % 7
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset)
  return Array.from({ length: 42 }, (_, index) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
  )
}

export function getCalendarRange(month: Date) {
  const days = getCalendarDays(month)
  return {
    startDate: formatLocalDate(days[0]),
    endDate: formatLocalDate(days[days.length - 1]),
  }
}

function shiftMonth(month: Date, amount: number) {
  return new Date(month.getFullYear(), month.getMonth() + amount, 1)
}

export default function CheckinCalendar({ records, month, onMonthChange, onSelectDate, loading = false }: CheckinCalendarProps) {
  const days = getCalendarDays(month)
  const today = formatLocalDate(new Date())
  const recordsByDate = records.reduce<Record<string, FitnessCheckinResponse[]>>((result, record) => {
    ;(result[record.date] ??= []).push(record)
    return result
  }, {})

  return (
    <section className="fitness-panel" aria-labelledby="checkin-calendar-title" aria-busy={loading}>
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <p className="fitness-kicker">运动日历</p>
          <h2 id="checkin-calendar-title" className="text-xl font-semibold text-stone-900">{month.getFullYear()}年{month.getMonth() + 1}月</h2>
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="icon" className="fitness-icon-button" aria-label="查看上个月" onClick={() => onMonthChange(shiftMonth(month, -1))} disabled={loading}>
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="fitness-icon-button" aria-label="查看下个月" onClick={() => onMonthChange(shiftMonth(month, 1))} disabled={loading}>
            <ChevronRight aria-hidden="true" className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div role="grid" aria-label={`${month.getFullYear()}年${month.getMonth() + 1}月运动日历`} className="mt-4 grid grid-cols-7 gap-1">
        {weekdays.map((day) => <div key={day} role="columnheader" aria-label={`周${day}`} className="py-2 text-center text-xs font-semibold text-stone-500">{day}</div>)}
        {days.map((date) => {
          const dateKey = formatLocalDate(date)
          const dayRecords = recordsByDate[dateKey] ?? []
          const duration = dayRecords.reduce((sum, record) => sum + record.durationMinutes, 0)
          const isToday = dateKey === today
          const isCurrentMonth = date.getMonth() === month.getMonth()
          const state = [isToday ? '今天' : '', dayRecords.length ? `已打卡，${duration}分钟` : '未打卡'].filter(Boolean).join('，')
          const label = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日，${state}`
          return (
            <button key={dateKey} type="button" aria-label={label} onClick={() => onSelectDate(dateKey)}
              className={`fitness-calendar-day ${isCurrentMonth ? '' : 'fitness-calendar-day--outside'} ${isToday ? 'fitness-calendar-day--today' : ''}`}>
              <span className="font-medium">{date.getDate()}</span>
              {dayRecords.length > 0 && <span className="mt-1 flex items-center justify-center gap-0.5 text-[10px] font-semibold text-emerald-800"><Check aria-hidden="true" className="h-3 w-3" />{duration}分</span>}
              {isToday && <span className="mt-0.5 text-[9px] font-semibold text-orange-800">今天</span>}
              {dayRecords.length > 0 && <span className="sr-only">{dayRecords.map(({ activityType }) => activityNames[activityType]).join('、')}</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
