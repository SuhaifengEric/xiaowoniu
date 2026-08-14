import { useEffect, useState, type FormEvent } from 'react'
import { Save } from 'lucide-react'
import type { EngagementMode, MarriageOrder, MarriageRecorderRole, PutMarriageProcessRequest, UpdateMarriageSettingsRequest, VisitOrder } from '@xiaowoniu/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { engagementModeOptions, marriageOrderOptions, recorderRoleOptions, visitOrderOptions } from './wedding.constants'

interface MarriageProcessSettingsDialogProps {
  open: boolean
  process: { recorderRole: MarriageRecorderRole; visitOrder: VisitOrder; marriageOrder: MarriageOrder; engagementMode: EngagementMode } | null
  onOpenChange: (open: boolean) => void
  onSubmit: (data: PutMarriageProcessRequest | UpdateMarriageSettingsRequest) => Promise<unknown>
}

export default function MarriageProcessSettingsDialog({ open, process, onOpenChange, onSubmit }: MarriageProcessSettingsDialogProps) {
  const creating = !process
  const [recorderRole, setRecorderRole] = useState<MarriageRecorderRole>('record_keeper' as MarriageRecorderRole)
  const [visitOrder, setVisitOrder] = useState<VisitOrder>('male_first' as VisitOrder)
  const [marriageOrder, setMarriageOrder] = useState<MarriageOrder>('registration_first' as MarriageOrder)
  const [engagementMode, setEngagementMode] = useState<EngagementMode>('undecided' as EngagementMode)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setRecorderRole(process?.recorderRole ?? 'record_keeper' as MarriageRecorderRole)
    setVisitOrder(process?.visitOrder ?? 'male_first' as VisitOrder)
    setMarriageOrder(process?.marriageOrder ?? 'registration_first' as MarriageOrder)
    setEngagementMode(process?.engagementMode ?? 'undecided' as EngagementMode)
    setSubmitError('')
    setSubmitting(false)
  }, [open, process])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setSubmitError('')
    try {
      await onSubmit({ recorderRole, visitOrder, marriageOrder, engagementMode })
      onOpenChange(false)
    } catch (error) {
      setSubmitError(error instanceof Error && error.message ? error.message : '保存失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}>
      <DialogContent aria-describedby="marriage-settings-description" onEscapeKeyDown={(event) => submitting && event.preventDefault()} onPointerDownOutside={(event) => submitting && event.preventDefault()} onInteractOutside={(event) => submitting && event.preventDefault()}>
        <DialogHeader><DialogTitle>{creating ? '建立婚姻进程' : '流程设置'}</DialogTitle><DialogDescription id="marriage-settings-description">记录人视角只影响称呼。上门、领证与婚礼顺序都是计划设置，已发生的事实不会被覆盖。</DialogDescription></DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2"><Label htmlFor="marriage-settings-recorder">记录人视角</Label><Select value={recorderRole} onValueChange={(value) => setRecorderRole(value as MarriageRecorderRole)} disabled={submitting}><SelectTrigger id="marriage-settings-recorder" className="min-h-11"><SelectValue /></SelectTrigger><SelectContent>{recorderRoleOptions.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-2"><Label htmlFor="marriage-settings-visit-order">上门计划顺序</Label><Select value={visitOrder} onValueChange={(value) => setVisitOrder(value as VisitOrder)} disabled={submitting}><SelectTrigger id="marriage-settings-visit-order" className="min-h-11"><SelectValue /></SelectTrigger><SelectContent>{visitOrderOptions.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-2"><Label htmlFor="marriage-settings-marriage-order">领证与婚礼计划顺序</Label><Select value={marriageOrder} onValueChange={(value) => setMarriageOrder(value as MarriageOrder)} disabled={submitting}><SelectTrigger id="marriage-settings-marriage-order" className="min-h-11"><SelectValue /></SelectTrigger><SelectContent>{marriageOrderOptions.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-2"><Label htmlFor="marriage-settings-engagement">订婚安排</Label><Select value={engagementMode} onValueChange={(value) => setEngagementMode(value as EngagementMode)} disabled={submitting}><SelectTrigger id="marriage-settings-engagement" className="min-h-11"><SelectValue /></SelectTrigger><SelectContent>{engagementModeOptions.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
          <DialogFooter><Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button><Button type="submit" className="min-h-11 gap-2" disabled={submitting}><Save aria-hidden="true" className="h-4 w-4" />{submitting ? '保存中…' : creating ? '建立进程' : '保存设置'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
