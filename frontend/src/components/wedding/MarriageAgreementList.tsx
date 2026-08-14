import { Archive, Check, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import type { AgreementStatus, AgreementTopicResponse } from '@xiaowoniu/shared'
import { agreementStatusOptions } from './wedding.constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface MarriageAgreementListProps {
  agreements: AgreementTopicResponse[]
  loading: boolean
  onCreate: (title: string) => Promise<void>
  onUpdate: (id: string, data: { title?: string; status?: AgreementStatus; notes?: string | null }) => Promise<void>
  onArchive: (id: string) => Promise<void>
}

const statuses = agreementStatusOptions.map(({ value }) => value)

export function MarriageAgreementList({ agreements, loading, onCreate, onUpdate, onArchive }: MarriageAgreementListProps) {
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, { title: string; notes: string }>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const submitNew = async () => {
    if (!newTitle.trim()) return
    setBusy('new')
    try { await onCreate(newTitle.trim()); setNewTitle('') } finally { setBusy(null) }
  }
  const beginEdit = (item: AgreementTopicResponse) => { setEditingId(item.id); setDrafts((current) => ({ ...current, [item.id]: { title: item.title, notes: item.notes ?? '' } })) }
  const saveEdit = async (item: AgreementTopicResponse) => {
    const draft = drafts[item.id]
    if (!draft?.title.trim()) return
    setBusy(item.id)
    try { await onUpdate(item.id, { title: draft.title.trim(), notes: draft.notes.trim() || null }); setEditingId(null) } finally { setBusy(null) }
  }

  if (loading && agreements.length === 0) return <section className="wedding-panel" role="status" aria-label="共识议题加载中"><div className="grid gap-3"><div className="wedding-skeleton h-24" /><div className="wedding-skeleton h-24" /></div></section>
  const unresolved = agreements.filter((item) => item.status !== 'agreed').length
  return <section className="wedding-panel" aria-labelledby="marriage-agreements-title">
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-4"><div><p className="wedding-eyebrow">双方共识</p><h2 id="marriage-agreements-title" className="mt-1 text-xl font-semibold text-stone-950">重要议题，留给你们自己确认</h2></div><span className="text-sm text-stone-600">{unresolved} 项尚未形成共识</span></div>
    <div className="mt-4 flex flex-col gap-2 sm:flex-row"><Input aria-label="新共识议题" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} maxLength={100} placeholder="添加一个你们想讨论的议题" onKeyDown={(event) => event.key === 'Enter' && void submitNew()} /><Button type="button" className="min-h-11 shrink-0 gap-2" onClick={() => void submitNew()} disabled={busy === 'new'}><Plus aria-hidden="true" className="h-4 w-4" />添加议题</Button></div>
    <div className="mt-4 grid gap-3">{agreements.map((item) => { const draft = drafts[item.id] ?? { title: item.title, notes: item.notes ?? '' }; const editing = editingId === item.id; return <article key={item.id} className={`agreement-row ${item.status === 'needs_discussion' ? 'agreement-row--risk' : ''}`}>
      <div className="min-w-0 flex-1">{editing ? <div className="grid gap-3"><Input aria-label={`编辑议题${item.title}`} value={draft.title} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, title: event.target.value } }))} maxLength={100} /><Textarea aria-label={`编辑议题备注${item.title}`} value={draft.notes} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, notes: event.target.value } }))} maxLength={5000} placeholder="记录双方结论、分歧或下次沟通安排" /></div> : <><h3 className="break-words text-base font-semibold text-stone-900">{item.title}</h3>{item.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-stone-600">{item.notes}</p>}</>}</div>
      <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">{editing ? <Button type="button" className="min-h-11 gap-2" onClick={() => void saveEdit(item)} disabled={busy === item.id}><Check aria-hidden="true" className="h-4 w-4" />保存</Button> : <><select aria-label={`议题状态${item.title}`} className="min-h-11 rounded-xl border border-input bg-card px-3 text-sm" value={item.status} onChange={(event) => void onUpdate(item.id, { status: event.target.value as AgreementStatus })}>{statuses.map((status) => <option key={status} value={status}>{agreementStatusOptions.find((option) => option.value === status)?.label}</option>)}</select><Button type="button" variant="ghost" size="icon" className="wedding-icon-button" aria-label={`编辑议题${item.title}`} onClick={() => beginEdit(item)}><Pencil aria-hidden="true" className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" className="wedding-icon-button" aria-label={`归档议题${item.title}`} onClick={() => window.confirm('归档后该议题将不再出现在当前列表，确定继续吗？') && void onArchive(item.id)}><Archive aria-hidden="true" className="h-4 w-4" /></Button></>}</div>
    </article> })}</div>
  </section>
}
