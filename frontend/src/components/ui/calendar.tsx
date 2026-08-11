import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { DayPicker, type DayPickerProps } from 'react-day-picker'
import { zhCN } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import { cn } from '@/lib/utils'

function Calendar({ className, components, ...props }: DayPickerProps) {
  return (
    <DayPicker
      className={cn('date-picker-calendar', className)}
      locale={zhCN}
      weekStartsOn={1}
      showOutsideDays
      fixedWeeks
      navLayout="around"
      animate
      labels={{
        labelDayButton: (date) => `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`,
        labelGrid: (date) => `${date.getFullYear()}年${date.getMonth() + 1}月`,
        labelNav: () => '月份导航',
        labelNext: () => '下个月',
        labelPrevious: () => '上个月',
      }}
      components={{
        Chevron: ({ orientation, className: iconClassName }) => {
          const Icon = orientation === 'left'
            ? ChevronLeft
            : orientation === 'right'
              ? ChevronRight
              : orientation === 'up'
                ? ChevronUp
                : ChevronDown
          return <Icon aria-hidden="true" className={cn('h-4 w-4', iconClassName)} />
        },
        ...components,
      }}
      {...props}
    />
  )
}

export { Calendar }
