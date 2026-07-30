import * as React from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(({ className, value = 0, max = 100, ...props }, ref) => {
  const safeMax = max > 0 ? max : 100
  const safeValue = Math.min(Math.max(value, 0), safeMax)
  return (
    <div ref={ref} role="progressbar" aria-valuemin={0} aria-valuemax={safeMax} aria-valuenow={safeValue} className={cn('relative h-2 w-full overflow-hidden rounded-sm bg-secondary', className)} {...props}>
      <div className="h-full bg-primary transition-transform" style={{ transform: `translateX(-${100 - (safeValue / safeMax) * 100}%)` }} />
    </div>
  )
})
Progress.displayName = 'Progress'

export { Progress }
