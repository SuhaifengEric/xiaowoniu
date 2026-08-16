import { useState } from 'react'
import { CalendarDays, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  id: string
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  clearLabel?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
}

function parseLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined
}

function formatDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateLabel(date: Date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function DatePicker({
  id,
  value,
  onValueChange,
  placeholder = '选择日期',
  disabled = false,
  className,
  clearLabel = '清除日期',
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: DatePickerProps) {
  const selected = parseLocalDate(value)
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            className={cn(
              'date-picker-trigger min-h-11 w-full justify-start gap-2 px-3 text-left font-normal',
              !selected && 'text-muted-foreground',
              selected && 'pr-12',
              'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive',
              className,
            )}
          >
            <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{selected ? formatDateLabel(selected) : placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="date-picker-popover" align="start">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(nextDate) => {
              if (!nextDate) return
              onValueChange(formatDateValue(nextDate))
              setOpen(false)
            }}
            aria-label="选择日期"
          />
        </PopoverContent>
      </Popover>
      {selected && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 h-11 w-11 -translate-y-1/2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={() => onValueChange('')}
          aria-label={clearLabel}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

export { DatePicker, formatDateLabel, formatDateValue, parseLocalDate }
export type { DatePickerProps }
