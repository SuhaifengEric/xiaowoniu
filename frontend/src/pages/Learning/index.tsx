import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, CalendarPlus, LogOut, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type {
  CreateExamRequest,
  CreateStudyCheckinRequest,
  CreateStudySubjectRequest,
  ExamCountdownResponse,
  StudySubjectResponse,
  UpdateExamRequest,
  UpdateStudySubjectRequest,
} from '@xiaowoniu/shared'
import ExamDialog from '@/components/learning/ExamDialog'
import StudyCheckinDialog from '@/components/learning/StudyCheckinDialog'
import SubjectDialog from '@/components/learning/SubjectDialog'
import DeleteConfirmationDialog from '@/components/learning/DeleteConfirmationDialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { formatLocalDate, getCalendarRange } from '@/pages/Fitness/CheckinCalendar'
import { useLearningStore } from '@/store/learning.store'
import ExamCountdown from './ExamCountdown'
import SubjectProgressBoard from './SubjectProgressBoard'
import StudyCalendar from './StudyCalendar'

export type LearningDialogName = 'exam-create' | 'exam-edit' | 'subject-create' | 'subject-edit' | 'checkin'
type DeleteTarget = { kind: 'exam' | 'subject' | 'checkin'; id: string; label: string } | null

function chineseDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return `${year}年${month}月${day}日`
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export default function Learning() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const exams = useLearningStore((state) => state.exams)
  const subjects = useLearningStore((state) => state.subjects)
  const checkins = useLearningStore((state) => state.checkins)
  const progress = useLearningStore((state) => state.progress)
  const selectedExamId = useLearningStore((state) => state.selectedExamId)
  const loading = useLearningStore((state) => state.loading)
  const error = useLearningStore((state) => state.error)
  const fetchDashboard = useLearningStore((state) => state.fetchDashboard)
  const selectExam = useLearningStore((state) => state.selectExam)
  const createExam = useLearningStore((state) => state.createExam)
  const updateExam = useLearningStore((state) => state.updateExam)
  const deleteExam = useLearningStore((state) => state.deleteExam)
  const createSubject = useLearningStore((state) => state.createSubject)
  const updateSubject = useLearningStore((state) => state.updateSubject)
  const deleteSubject = useLearningStore((state) => state.deleteSubject)
  const createCheckin = useLearningStore((state) => state.createCheckin)
  const deleteCheckin = useLearningStore((state) => state.deleteCheckin)
  const fetchCheckins = useLearningStore((state) => state.fetchCheckins)
  const clearError = useLearningStore((state) => state.clearError)

  const [month, setMonth] = useState(() => monthStart(new Date()))
  const [dialog, setDialog] = useState<LearningDialogName | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => formatLocalDate(new Date()))
  const [editingExam, setEditingExam] = useState<ExamCountdownResponse | null>(null)
  const [editingSubject, setEditingSubject] = useState<StudySubjectResponse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [status, setStatus] = useState('')

  const calendarRange = useMemo(() => getCalendarRange(month), [month])
  const selectedExam = exams.find((exam) => exam.id === selectedExamId) ?? null
  const subjectStatistics = useMemo(() => Object.fromEntries(
    (progress?.subjects ?? []).map((subject) => [subject.id, {
      totalStudyHours: subject.totalStudyHours,
      checkinsCount: subject.checkinsCount,
    }])
  ), [progress])
  const subjectsById = useMemo(() => Object.fromEntries(subjects.map((subject) => [subject.id, subject])), [subjects])

  useEffect(() => {
    void fetchDashboard(null, calendarRange).catch(() => undefined)
  }, [fetchDashboard])

  useEffect(() => {
    if (!selectedExamId && exams.length > 0) {
      void selectExam(exams[0].id, calendarRange).catch(() => undefined)
    }
  }, [calendarRange, exams, selectExam, selectedExamId])

  const handleMonthChange = (nextMonth: Date) => {
    setMonth(monthStart(nextMonth))
    void fetchDashboard(selectedExamId, getCalendarRange(nextMonth)).catch(() => undefined)
  }

  const openCheckin = (date = formatLocalDate(new Date())) => {
    setSelectedDate(date)
    setStatus('')
    setDialog('checkin')
  }

  const openSubjectCreate = () => {
    if (!selectedExam) return
    setEditingSubject(null)
    setStatus('')
    setDialog('subject-create')
  }

  const handleSelectExam = (examId: string) => {
    setStatus('')
    void selectExam(examId, calendarRange).catch(() => undefined)
  }

  const submitExam = async (data: CreateExamRequest | UpdateExamRequest) => {
    if (editingExam) await updateExam(editingExam.id, data as UpdateExamRequest)
    else await createExam(data as CreateExamRequest)
    setStatus(editingExam ? '考试已更新' : '考试已创建')
  }

  const submitSubject = async (data: CreateStudySubjectRequest | UpdateStudySubjectRequest) => {
    if (editingSubject) await updateSubject(editingSubject.id, data as UpdateStudySubjectRequest)
    else await createSubject(data as CreateStudySubjectRequest)
    setStatus(editingSubject ? '科目已更新' : '科目已创建')
  }

  const submitCheckin = async (data: CreateStudyCheckinRequest) => {
    await createCheckin(data)
    setStatus('学习打卡已保存')
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteSubmitting(true)
    try {
      if (deleteTarget.kind === 'exam') await deleteExam(deleteTarget.id)
      if (deleteTarget.kind === 'subject') await deleteSubject(deleteTarget.id)
      if (deleteTarget.kind === 'checkin') await deleteCheckin(deleteTarget.id)
      setStatus(deleteTarget.kind === 'exam' ? '考试已删除' : deleteTarget.kind === 'subject' ? '科目已删除' : '学习打卡已删除')
      setDeleteTarget(null)
      if (deleteTarget.kind === 'exam') {
        const nextExamId = useLearningStore.getState().selectedExamId
        if (nextExamId) await selectExam(nextExamId, calendarRange)
      }
    } catch {
      // Store error remains visible on the page.
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleLoadMore = () => {
    if (!selectedExamId || loading) return
    void fetchCheckins({ examId: selectedExamId, ...calendarRange, limit: 10, offset: checkins.length }).catch(() => undefined)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <main className="learning-page min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex min-h-11 items-center justify-between gap-3 border-b border-slate-200 pb-4" aria-label="页面导航">
          <Button variant="ghost" className="min-h-11 gap-2 px-2" onClick={() => navigate('/dashboard')}><ArrowLeft aria-hidden="true" className="h-4 w-4" />返回 Dashboard</Button>
          <Button variant="ghost" className="min-h-11 gap-2 px-3" onClick={handleLogout}><LogOut aria-hidden="true" className="h-4 w-4" />登出</Button>
        </nav>

        <header className="flex flex-col gap-5 py-8 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="learning-kicker">Learning workspace</p><h1 className="mt-1 text-3xl font-semibold text-slate-950 sm:text-4xl">学习记录</h1><p className="mt-2 max-w-xl text-slate-600">把考试目标、科目进度和每天的学习记录放在同一个工作台。</p></div>
          <section aria-label="学习操作" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button className="min-h-11 gap-2" onClick={() => { setEditingExam(null); setDialog('exam-create') }}><Plus aria-hidden="true" className="h-4 w-4" />新建考试</Button>
            <Button variant="outline" className="min-h-11 gap-2" onClick={openSubjectCreate} disabled={!selectedExam}><BookOpen aria-hidden="true" className="h-4 w-4" />新建科目</Button>
            <Button variant="outline" className="min-h-11 gap-2" onClick={() => openCheckin()} disabled={subjects.length === 0}><CalendarPlus aria-hidden="true" className="h-4 w-4" />学习打卡</Button>
          </section>
        </header>

        {error && <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"><span>{error}</span><Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11 text-red-800" aria-label="关闭错误提示" onClick={clearError}><X aria-hidden="true" className="h-4 w-4" /></Button></div>}
        {status && <div role="status" className="mb-5 rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">{status}</div>}
        {loading && <div aria-label="学习数据加载中" aria-busy="true" className="mb-5 grid grid-cols-3 gap-3"><span className="learning-skeleton h-2" /><span className="learning-skeleton h-2" /><span className="learning-skeleton h-2" /></div>}

        <section className="learning-toolbar mb-5" aria-label="考试选择">
          <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">当前考试</p><Select value={selectedExamId ?? ''} onValueChange={handleSelectExam} disabled={exams.length === 0 || loading}><SelectTrigger aria-label="选择考试" className="mt-2 max-w-xl"><SelectValue placeholder={exams.length ? '选择考试' : '还没有考试'} /></SelectTrigger><SelectContent>{exams.map((exam) => <SelectItem key={exam.id} value={exam.id}>{exam.examName} · {exam.examDate}{exam.isArchived ? ' · 已归档' : ''}</SelectItem>)}</SelectContent></Select></div>
          {selectedExam && <div className="flex gap-1"><Button type="button" variant="ghost" size="icon" className="learning-icon-button" aria-label={`编辑考试${selectedExam.examName}`} onClick={() => { setEditingExam(selectedExam); setDialog('exam-edit') }}><Pencil aria-hidden="true" className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" className="learning-icon-button text-slate-500 hover:bg-red-50 hover:text-red-700" aria-label={`删除考试${selectedExam.examName}`} onClick={() => setDeleteTarget({ kind: 'exam', id: selectedExam.id, label: selectedExam.examName })}><Trash2 aria-hidden="true" className="h-4 w-4" /></Button></div>}
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <ExamCountdown exam={selectedExam} daysRemaining={progress?.exam.daysRemaining} />
          <section className="learning-panel" aria-label="学习总览"><p className="learning-kicker">学习总览</p><div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2"><div><p className="text-sm text-slate-500">总进度</p><p className="mt-1 text-2xl font-semibold">{progress?.summary.overallProgressPercentage ?? 0}%</p></div><div><p className="text-sm text-slate-500">学习时长</p><p className="mt-1 text-2xl font-semibold">{progress?.summary.totalStudyHours ?? 0}h</p></div><div><p className="text-sm text-slate-500">打卡次数</p><p className="mt-1 text-2xl font-semibold">{progress?.summary.totalCheckins ?? 0}</p></div><div><p className="text-sm text-slate-500">完成科目</p><p className="mt-1 text-2xl font-semibold">{progress?.summary.completedSubjectsCount ?? 0} / {progress?.summary.subjectsCount ?? subjects.length}</p></div></div></section>
        </div>

        <div className="mt-5"><SubjectProgressBoard subjects={subjects} statistics={subjectStatistics} onEdit={(subject) => { setEditingSubject(subject); setDialog('subject-edit') }} onDelete={(subject) => setDeleteTarget({ kind: 'subject', id: subject.id, label: subject.subjectName })} /></div>
        <div className="mt-5"><StudyCalendar month={month} activities={progress?.dailyActivity ?? []} loading={loading} onMonthChange={handleMonthChange} onSelectDate={openCheckin} /></div>

        <section className="learning-panel mt-5" aria-labelledby="recent-learning-title">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4"><div><p className="learning-kicker">记录管理</p><h2 id="recent-learning-title" className="mt-1 text-xl font-semibold">近期学习记录</h2></div><span className="text-sm text-slate-500">显示 {checkins.length} 条</span></div>
          {checkins.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">暂无学习记录，点击日历日期开始打卡。</p> : <ul className="divide-y divide-slate-100">{checkins.map((checkin) => <li key={checkin.id} className="flex min-h-16 items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="break-words font-medium">{subjectsById[checkin.subjectId]?.subjectName ?? '未知科目'} · {chineseDate(checkin.date)}</p><p className="mt-1 text-sm text-slate-600">章节 {checkin.completedChapters.join(', ')} · {checkin.studyHours} 小时 · 进度 {checkin.progressPercentage}%</p></div><Button type="button" variant="ghost" size="icon" className="learning-icon-button shrink-0 text-slate-500 hover:bg-red-50 hover:text-red-700" aria-label={`删除${chineseDate(checkin.date)}的学习打卡`} onClick={() => setDeleteTarget({ kind: 'checkin', id: checkin.id, label: chineseDate(checkin.date) })} disabled={loading}><Trash2 aria-hidden="true" className="h-4 w-4" /></Button></li>)}</ul>}
          {checkins.length >= 10 && <Button type="button" variant="outline" className="mt-4 min-h-11 w-full" onClick={handleLoadMore} disabled={loading}>加载更多</Button>}
        </section>
      </div>

      <ExamDialog open={dialog === 'exam-create' || dialog === 'exam-edit'} onOpenChange={(open) => !open && setDialog(null)} onSubmit={submitExam} exam={dialog === 'exam-edit' ? editingExam : null} />
      <SubjectDialog open={dialog === 'subject-create' || dialog === 'subject-edit'} onOpenChange={(open) => !open && setDialog(null)} onSubmit={submitSubject} exam={selectedExam} subject={dialog === 'subject-edit' ? editingSubject : null} />
      <StudyCheckinDialog open={dialog === 'checkin'} onOpenChange={(open) => !open && setDialog(null)} onSubmit={submitCheckin} subjects={subjects} initialDate={selectedDate} />
      <DeleteConfirmationDialog open={deleteTarget?.kind === 'exam'} onOpenChange={(open) => !open && !deleteSubmitting && setDeleteTarget(null)} onConfirm={handleConfirmDelete} submitting={deleteSubmitting} title="确认删除考试" description={`删除“${deleteTarget?.label ?? ''}”会同时删除所有科目和学习记录。`} />
      <DeleteConfirmationDialog open={deleteTarget?.kind === 'subject'} onOpenChange={(open) => !open && !deleteSubmitting && setDeleteTarget(null)} onConfirm={handleConfirmDelete} submitting={deleteSubmitting} title="确认删除科目" description={`删除“${deleteTarget?.label ?? ''}”会同时删除该科目的学习记录。`} />
      <DeleteConfirmationDialog open={deleteTarget?.kind === 'checkin'} onOpenChange={(open) => !open && !deleteSubmitting && setDeleteTarget(null)} onConfirm={handleConfirmDelete} submitting={deleteSubmitting} title="确认删除学习打卡" description="删除这条学习打卡后，会重新计算该科目的进度。" />
    </main>
  )
}
