import type { StudySubjectResponse } from '@xiaowoniu/shared'
import { Check, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface SubjectStatistics {
  totalStudyHours: number
  checkinsCount: number
}

interface SubjectProgressBoardProps {
  subjects: StudySubjectResponse[]
  statistics?: Record<string, SubjectStatistics>
  onEdit: (subject: StudySubjectResponse) => void
  onDelete: (subject: StudySubjectResponse) => void
}

function clamp(value: number) {
  return Math.min(Math.max(value, 0), 100)
}

export default function SubjectProgressBoard({ subjects, statistics = {}, onEdit, onDelete }: SubjectProgressBoardProps) {
  return (
    <section className="learning-panel" aria-labelledby="learning-subjects-title">
      <div className="flex items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="learning-kicker">学习科目</p>
          <h2 id="learning-subjects-title" className="mt-1 text-xl font-semibold text-slate-950">科目进度</h2>
        </div>
        <span className="text-sm text-slate-500">{subjects.length} 个科目</span>
      </div>
      {subjects.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">还没有科目，先创建一个学习科目。</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => {
            const progress = clamp(subject.progressPercentage)
            const stats = statistics[subject.id] ?? { totalStudyHours: 0, checkinsCount: 0 }
            const completed = progress >= 100
            return (
              <article key={subject.id} className="learning-subject-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold text-slate-950">{subject.subjectName}</h3>
                    <p className="mt-1 text-sm text-slate-600">{subject.currentChapter} / {subject.totalChapters} 章</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" variant="ghost" size="icon" className="learning-icon-button" aria-label={`编辑科目${subject.subjectName}`} onClick={() => onEdit(subject)}>
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="learning-icon-button text-slate-500 hover:bg-red-50 hover:text-red-700" aria-label={`删除科目${subject.subjectName}`} onClick={() => onDelete(subject)}>
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Progress value={progress} aria-label={`${subject.subjectName}进度 ${progress}%`} className="h-2" />
                  <span className="shrink-0 text-sm font-semibold text-slate-700">{progress}%</span>
                </div>
                <div className="mt-4 grid gap-1 text-sm text-slate-600">
                  <p>目标日期：{subject.targetCompletionDate ?? '未设置'}</p>
                  <p>学习 {stats.totalStudyHours} 小时 · 打卡 {stats.checkinsCount} 次</p>
                  {completed && <p className="flex items-center gap-1 font-medium text-primary"><Check aria-hidden="true" className="h-4 w-4" />已完成</p>}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export { clamp }
