import { CheckCircle2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from './button'

interface ToastProps {
  message: string
  onDismiss: () => void
  duration?: number
}

export default function Toast({ message, onDismiss, duration = 3000 }: ToastProps) {
  const dismissRef = useRef(onDismiss)

  useEffect(() => {
    dismissRef.current = onDismiss
  }, [onDismiss])

  useEffect(() => {
    if (!message) return

    const timeoutId = window.setTimeout(() => dismissRef.current(), duration)
    return () => window.clearTimeout(timeoutId)
  }, [duration, message])

  if (!message) return null

  return (
    <div className="app-toast" role="status" aria-live="polite" aria-atomic="true">
      <span className="app-toast__icon" aria-hidden="true">
        <CheckCircle2 className="h-4 w-4" />
      </span>
      <span className="app-toast__message">{message}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="app-toast__close"
        aria-label="关闭成功提示"
        onClick={onDismiss}
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </Button>
    </div>
  )
}
