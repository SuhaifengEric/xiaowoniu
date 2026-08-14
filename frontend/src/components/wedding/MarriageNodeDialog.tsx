import { useEffect, useState, type FormEvent } from 'react'
import { Save } from 'lucide-react'
import type { MarriageNodeKey, MarriageNodeResponse, MarriageNodeStatus, UpdateMarriageNodeRequest } from '@xiaowoniu/shared'
import { marriageNodeKeyLabels, marriageNodeStatusLabels } from './wedding.constants'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface MarriageNodeDialogProps {
  open: boolean
  node: MarriageNodeResponse | null
  requiresBackfill?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: UpdateMarriageNodeRequest) => Promise<unknown>
}

type Field = 'status' | 'plannedDate' | 'actualDate' | 'participants' | 'conclusion' | 'disagreements' | 'nextStep' | 'notes' | 'skipReason'
type Errors = Partial<Record<Field, string>>

const statuses = Object.keys(marriageNodeStatusLabels) as MarriageNodeStatus[]

function validDate(value: string) {
  if (!value) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export default function MarriageNodeDialog({ open, node, requiresBackfill = false, onOpenChange, onSubmit }: MarriageNodeDialogProps) {
  const [status, setStatus] = useState<MarriageNodeStatus>('not_started' as MarriageNodeStatus)
  const [plannedDate, setPlannedDate] = useState('')
  const [actualDate, setActualDate] = useState('')
  const [participants, setParticipants] = useState('')
  const [conclusion, setConclusion] = useState('')
  const [disagreements, setDisagreements] = useState('')
  const [nextStep, setNextStep] = useState('')
  const [notes, setNotes] = useState('')
  const [skipReason, setSkipReason] = useState('')
  const [backfilled, setBackfilled] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !node) return
    setStatus(node.status)
    setPlannedDate(node.plannedDate ?? '')
    setActualDate(node.actualDate ?? '')
    setParticipants(node.participants ?? '')
    setConclusion(node.conclusion ?? '')
    setDisagreements(node.disagreements ?? '')
    setNextStep(node.nextStep ?? '')
    setNotes(node.notes ?? '')
    setSkipReason(node.skipReason ?? '')
    setBackfilled(node.backfilled)
    setErrors({})
    setSubmitError('')
    setSubmitting(false)
  }, [node, open])

  const setFieldError = (field: Field, message: string) => setErrors((current) => ({ ...current, [field]: message || undefined }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!node) return
    const nextErrors: Errors = {}
    if (plannedDate && !validDate(plannedDate)) nextErrors.plannedDate = '请输入合法计划日期'
    if (actualDate && !validDate(actualDate)) nextErrors.actualDate = '请输入合法实际日期'
    if (status === 'completed' && !actualDate) nextErrors.actualDate = '标记为已完成时必须填写实际日期'
    if (participants.length > 500) nextErrors.participants = '参与人记录不能超过 500 个字符'
    if (conclusion.length > 5000) nextErrors.conclusion = '结论不能超过 5000 个字符'
    if (disagreements.length > 5000) nextErrors.disagreements = '分歧记录不能超过 5000 个字符'
    if (nextStep.length > 5000) nextErrors.nextStep = '下一步不能超过 5000 个字符'
    if (notes.length > 5000) nextErrors.notes = '备注不能超过 5000 个字符'
    if (skipReason.length > 500) nextErrors.skipReason = '跳过原因不能超过 500 个字符'
    if (requiresBackfill && node.nodeKey === 'parents_meeting' && status === 'completed' && !node.backfilled && !backfilled) {
      // This is a visible confirmation for the exceptional out-of-order path.
      nextErrors.status = '两次上门尚未都完成时，请勾选“这是对已发生见面的补录”'
    }
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length > 0) return

    const blankToNull = (value: string) => value.trim() || null
    const data: UpdateMarriageNodeRequest = {
      status,
      plannedDate: plannedDate || null,
      actualDate: actualDate || null,
      participants: blankToNull(participants),
      conclusion: blankToNull(conclusion),
      disagreements: blankToNull(disagreements),
      nextStep: blankToNull(nextStep),
      notes: blankToNull(notes),
      skipReason: blankToNull(skipReason),
      backfilled,
    }
    setSubmitting(true)
    try {
      await onSubmit(data)
      onOpenChange(false)
    } catch (error) {
      setSubmitError(error instanceof Error && error.message ? error.message : '保存失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (!node) return null
  const canSkip = node.nodeKey === 'engagement'
  const statusOptions = canSkip ? statuses : statuses.filter((value) => value !== ('skipped' as MarriageNodeStatus))
  const title = marriageNodeKeyLabels[node.nodeKey as MarriageNodeKey]

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}>
      <DialogContent aria-describedby="marriage-node-description" className="max-w-2xl" onEscapeKeyDown={(event) => submitting && event.preventDefault()} onPointerDownOutside={(event) => submitting && event.preventDefault()} onInteractOutside={(event) => submitting && event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>记录：{title}</DialogTitle>
          <DialogDescription id="marriage-node-description">计划日期和实际日期分别记录；计划日期到了也不会自动完成节点。</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-2"><Label htmlFor="marriage-node-status">节点状态</Label><Select value={status} onValueChange={(value) => { setStatus(value as MarriageNodeStatus); setFieldError('status', '') }} disabled={submitting}><SelectTrigger id="marriage-node-status" className="min-h-11"><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map((value) => <SelectItem key={value} value={value}>{marriageNodeStatusLabels[value]}</SelectItem>)}</SelectContent></Select>{errors.status && <p role="alert" className="text-sm text-destructive">{errors.status}</p>}</div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="marriage-node-planned-date">计划日期</Label><DatePicker id="marriage-node-planned-date" value={plannedDate} onValueChange={(value) => { setPlannedDate(value); setFieldError('plannedDate', '') }} clearLabel="清除计划日期" disabled={submitting} aria-invalid={Boolean(errors.plannedDate)} />{errors.plannedDate && <p role="alert" className="text-sm text-destructive">{errors.plannedDate}</p>}</div><div className="grid gap-2"><Label htmlFor="marriage-node-actual-date">实际日期</Label><DatePicker id="marriage-node-actual-date" value={actualDate} onValueChange={(value) => { setActualDate(value); setFieldError('actualDate', '') }} clearLabel="清除实际日期" disabled={submitting} aria-invalid={Boolean(errors.actualDate)} />{errors.actualDate && <p role="alert" className="text-sm text-destructive">{errors.actualDate}</p>}</div></div>
          {(node.nodeKey === 'male_visit' || node.nodeKey === 'female_visit' || node.nodeKey === 'parents_meeting') && <div className="grid gap-2"><Label htmlFor="marriage-node-participants">参与人</Label><Textarea id="marriage-node-participants" value={participants} onChange={(event) => { setParticipants(event.target.value); setFieldError('participants', '') }} maxLength={500} placeholder="记录实际参与人或家庭成员" disabled={submitting} />{errors.participants && <p role="alert" className="text-sm text-destructive">{errors.participants}</p>}</div>}
          {(node.nodeKey === 'parents_meeting' || node.nodeKey === 'agreement' || node.nodeKey === 'engagement') && <div className="grid gap-2"><Label htmlFor="marriage-node-conclusion">结论</Label><Textarea id="marriage-node-conclusion" value={conclusion} onChange={(event) => { setConclusion(event.target.value); setFieldError('conclusion', '') }} maxLength={5000} placeholder="记录双方实际讨论后的结论" disabled={submitting} />{errors.conclusion && <p role="alert" className="text-sm text-destructive">{errors.conclusion}</p>}</div>}
          {(node.nodeKey === 'parents_meeting' || node.nodeKey === 'agreement' || node.nodeKey === 'engagement') && <div className="grid gap-2"><Label htmlFor="marriage-node-disagreements">分歧</Label><Textarea id="marriage-node-disagreements" value={disagreements} onChange={(event) => { setDisagreements(event.target.value); setFieldError('disagreements', '') }} maxLength={5000} placeholder="记录仍需沟通的地方，不代表审批或否决" disabled={submitting} />{errors.disagreements && <p role="alert" className="text-sm text-destructive">{errors.disagreements}</p>}</div>}
          {(node.nodeKey === 'parents_meeting' || node.nodeKey === 'agreement' || node.nodeKey === 'engagement') && <div className="grid gap-2"><Label htmlFor="marriage-node-next-step">下一步</Label><Textarea id="marriage-node-next-step" value={nextStep} onChange={(event) => { setNextStep(event.target.value); setFieldError('nextStep', '') }} maxLength={5000} placeholder="记录下一次沟通或行动安排" disabled={submitting} />{errors.nextStep && <p role="alert" className="text-sm text-destructive">{errors.nextStep}</p>}</div>}
          {canSkip && <div className="grid gap-2"><Label htmlFor="marriage-node-skip-reason">跳过原因（可选）</Label><Textarea id="marriage-node-skip-reason" value={skipReason} onChange={(event) => { setSkipReason(event.target.value); setFieldError('skipReason', '') }} maxLength={500} placeholder="例如：双方决定不单独安排订婚" disabled={submitting} />{errors.skipReason && <p role="alert" className="text-sm text-destructive">{errors.skipReason}</p>}</div>}
          <div className="grid gap-2"><Label htmlFor="marriage-node-notes">备注</Label><Textarea id="marriage-node-notes" value={notes} onChange={(event) => { setNotes(event.target.value); setFieldError('notes', '') }} maxLength={5000} placeholder="补充你们希望保留的记录" disabled={submitting} />{errors.notes && <p role="alert" className="text-sm text-destructive">{errors.notes}</p>}</div>
          {node.nodeKey === 'parents_meeting' && requiresBackfill && <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950"><input type="checkbox" className="mt-1 h-4 w-4" checked={backfilled} onChange={(event) => { setBackfilled(event.target.checked); setFieldError('status', '') }} disabled={submitting} /><span><strong>这是对已发生见面的补录</strong><span className="mt-1 block text-amber-800">当两次上门尚未都完成时，必须明确标记补录；这不是父母审批。</span></span></label>}
          {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
          <DialogFooter><Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button><Button type="submit" className="min-h-11 gap-2" disabled={submitting}><Save aria-hidden="true" className="h-4 w-4" />{submitting ? '保存中…' : '保存节点记录'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
