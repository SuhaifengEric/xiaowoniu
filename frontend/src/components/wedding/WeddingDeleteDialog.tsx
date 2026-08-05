import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface WeddingDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<unknown>
  resource: 'task' | 'expense'
  submitting?: boolean
}

export default function WeddingDeleteDialog({ open, onOpenChange, onConfirm, resource, submitting = false }: WeddingDeleteDialogProps) {
  const isTask = resource === 'task'
  const title = isTask ? '确认删除备婚任务' : '确认删除备婚花费'
  const description = isTask
    ? '删除任务后无法恢复；关联花费会保留并解除关联。确定要删除这个任务吗？'
    : '删除后无法恢复。确定要删除这条备婚花费吗？'
  const handleConfirm = async () => { if (!submitting) await onConfirm() }
  return <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}><DialogContent aria-describedby="wedding-delete-description" onEscapeKeyDown={(event) => submitting && event.preventDefault()} onPointerDownOutside={(event) => submitting && event.preventDefault()} onInteractOutside={(event) => submitting && event.preventDefault()}><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription id="wedding-delete-description">{description}</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" className="min-h-11" disabled={submitting} onClick={() => onOpenChange(false)}>取消</Button><Button type="button" variant="destructive" className="min-h-11" disabled={submitting} onClick={handleConfirm}>{submitting ? '删除中…' : '确认删除'}</Button></DialogFooter></DialogContent></Dialog>
}
