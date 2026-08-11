import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn('flex min-h-24 w-full resize-y rounded-xl border border-input bg-card/85 px-3.5 py-2.5 text-sm text-foreground shadow-[0_1px_0_hsl(var(--card))_inset] ring-offset-background transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted-foreground focus-visible:border-ring/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', className)}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export { Textarea }
