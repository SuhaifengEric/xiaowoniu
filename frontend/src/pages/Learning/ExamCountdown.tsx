import type { ExamCountdownResponse } from '@xiaowoniu/shared'

interface ExamCountdownProps {
  exam: ExamCountdownResponse | null
  daysRemaining: number | null | undefined
}

export default function ExamCountdown({ exam, daysRemaining }: ExamCountdownProps) {
  if (!exam) {
    return (
      <section className="learning-panel learning-countdown learning-countdown--empty" aria-labelledby="learning-countdown-title">
        <p className="learning-kicker">考试倒计时</p>
        <h2 id="learning-countdown-title" className="mt-1 text-xl font-semibold">还没有考试</h2>
        <p className="mt-2 text-sm text-slate-600">创建一场考试，开始安排学习进度。</p>
      </section>
    )
  }

  const countdownText = daysRemaining === undefined || daysRemaining === null
    ? '等待进度数据'
    : daysRemaining > 0
      ? `还剩 ${daysRemaining} 天`
      : daysRemaining === 0
        ? '今天考试'
        : `已结束 ${Math.abs(daysRemaining)} 天`

  return (
    <section className="learning-panel learning-countdown" aria-labelledby="learning-countdown-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="learning-kicker">考试倒计时</p>
          <h2 id="learning-countdown-title" className="mt-1 text-xl font-semibold text-slate-950">{exam.examName}</h2>
          <p className="mt-2 text-sm text-slate-600">考试日期：{exam.examDate}</p>
        </div>
        <p className="learning-countdown__value" aria-label={`考试状态：${countdownText}`}>{countdownText}</p>
      </div>
    </section>
  )
}
