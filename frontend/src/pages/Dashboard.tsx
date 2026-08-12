import { useEffect } from 'react'
import {
  ArrowRight,
  BookOpen,
  Dumbbell,
  ListTodo,
  LogOut,
  PiggyBank,
  RefreshCw,
  X,
} from 'lucide-react'

interface ProgressRingProps {
  pct: number | null
  tone: 'pink' | 'blue'
  label: string
}

function ProgressRing({ pct, tone, label }: ProgressRingProps) {
  const r = 26
  const circ = 2 * Math.PI * r
  const fill = pct === null ? 0 : (pct / 100) * circ
  const color = tone === 'pink' ? 'hsl(336 67% 42%)' : 'hsl(202 72% 43%)'
  const trackColor = tone === 'pink' ? 'hsl(336 72% 94%)' : 'hsl(204 78% 94%)'
  return (
    <div className="dov-ring" role="img" aria-label={`进度 ${label}`}>
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
        <circle cx="36" cy="36" r={r} stroke={trackColor} strokeWidth="6" />
        <circle
          cx="36" cy="36" r={r}
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - fill}
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dashoffset 500ms cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <span className="dov-ring__label" style={{ color }}>{label}</span>
    </div>
  )
}
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import MobileTabBar from '@/components/navigation/MobileTabBar'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardStore } from '@/store/dashboard.store'

const currency = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 2,
})

function getGreeting() {
  const h = new Date().getHours()
  if (h < 5) return '夜深了'
  if (h < 10) return '早上好'
  if (h < 13) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

function getTodayLabel() {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date())
}

function countdown(days: number | null) {
  if (days === null) return '未设置日期'
  if (days === 0) return '就是今天'
  return days > 0 ? `还有 ${days} 天` : `已过 ${Math.abs(days)} 天`
}

function generatedAt(value: string | undefined) {
  if (!value) return '正在获取最新数据'
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value))
}

function progressPercentage(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)))
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const summary = useDashboardStore((state) => state.summary)
  const loading = useDashboardStore((state) => state.loading)
  const error = useDashboardStore((state) => state.error)
  const fetchSummary = useDashboardStore((state) => state.fetchSummary)
  const clearError = useDashboardStore((state) => state.clearError)

  const weeklyTarget = summary?.fitness.weeklyTarget ?? null
  const fitnessProgress = weeklyTarget && weeklyTarget > 0
    ? progressPercentage(((summary?.fitness.weeklyCheckinCount ?? 0) / weeklyTarget) * 100)
    : null
  const learningProgress = summary?.learning.overallProgressPercentage === null || summary?.learning.overallProgressPercentage === undefined
    ? null
    : progressPercentage(summary.learning.overallProgressPercentage)
  const monthlyBudget = summary?.finance.currentMonthBudget ?? null
  const financeProgress = monthlyBudget && monthlyBudget > 0
    ? progressPercentage(((summary?.finance.currentMonthExpense ?? 0) / monthlyBudget) * 100)
    : null
  const completedWeddingTasks = summary?.wedding.completedTasksCount ?? 0
  const pendingWeddingTasks = summary?.wedding.pendingTasksCount ?? 0
  const totalWeddingTasks = completedWeddingTasks + pendingWeddingTasks
  const weddingProgress = totalWeddingTasks > 0
    ? progressPercentage((completedWeddingTasks / totalWeddingTasks) * 100)
    : null
  useEffect(() => {
    void fetchSummary().catch(() => undefined)
  }, [fetchSummary])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch {
      // Auth state owns logout failures on its destination.
    }
  }

  const goTo = (path: string, action?: string) => {
    navigate(action ? `${path}?action=${action}` : path)
  }

  return (
    <main className="app-page dashboard-page has-mobile-tabbar">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <nav className="app-nav flex min-h-11 items-center justify-between gap-3 border-b pb-4" aria-label="页面导航">
          <p className="app-brand">小蜗牛的花花世界</p>
          <div className="dashboard-nav-actions">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="dashboard-mobile-refresh"
              aria-label="刷新数据"
              onClick={() => void fetchSummary().catch(() => undefined)}
              disabled={loading}
            >
              <RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" className="app-nav-action min-h-11 gap-2 px-3" onClick={handleLogout}>
              <LogOut aria-hidden="true" className="h-4 w-4" />登出
            </Button>
          </div>
        </nav>

        <header className="dashboard-hero flex flex-col gap-5 py-9 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="dashboard-greeting">{getGreeting()}，今天是 {getTodayLabel()}</p>
            <h1 className="app-page-title">世界仪表盘</h1>
            <p className="app-page-description mt-3">从此刻最重要的一件事开始，把生活慢慢推向你想去的方向。</p>
          </div>
          <div className="dashboard-refresh">
            <p className="text-sm text-muted-foreground">数据更新于 {generatedAt(summary?.generatedAt)}</p>
            <Button variant="outline" className="min-h-11 gap-2" onClick={() => void fetchSummary().catch(() => undefined)} disabled={loading}>
              <RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />刷新数据
            </Button>
          </div>
        </header>

        {error && (
          <div role="alert" className="app-alert mb-5 flex flex-wrap items-center justify-between gap-3 border px-4 py-3 text-sm">
            <span>{error}</span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" className="min-h-11 px-3" onClick={() => void fetchSummary().catch(() => undefined)}>重试</Button>
              <Button type="button" variant="ghost" size="icon" aria-label="关闭错误提示" onClick={clearError}><X aria-hidden="true" className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {loading && !summary && <div role="status" aria-busy="true" className="mb-5 border-y border-border py-3 text-sm text-muted-foreground">正在汇总四个模块的数据…</div>}

        <section className="dov-grid" aria-labelledby="dov-title">
          <h2 id="dov-title" className="sr-only">今日概览</h2>

          {/* 瘦瘦瘦 */}
          <article
            className="dov-card dov-card--pink"
            role="button"
            tabIndex={0}
            aria-label="进入瘦瘦瘦"
            onClick={() => goTo('/fitness')}
            onKeyDown={(e) => e.key === 'Enter' && goTo('/fitness')}
          >
            <div className="dov-card__stripe" aria-hidden="true" />
            <div className="dov-card__body">
              <div className="dov-card__left">
                <span className="dov-card__label">
                  <Dumbbell aria-hidden="true" className="h-3.5 w-3.5" />瘦瘦瘦
                </span>
                <p className="dov-card__num">{summary?.fitness.todayCheckinCount ?? 0}<span className="dov-card__unit">次</span></p>
                <p className="dov-card__sub">今日运动</p>
                <p className="dov-card__note">
                  {weeklyTarget === null
                    ? '本周目标未设置'
                    : `本周 ${summary?.fitness.weeklyCheckinCount ?? 0} / ${weeklyTarget} 次`}
                </p>
              </div>
              <ProgressRing
                pct={fitnessProgress}
                tone="pink"
                label={fitnessProgress === null ? '—' : `${fitnessProgress}%`}
              />
            </div>
          </article>

          {/* 学学学 */}
          <article
            className="dov-card dov-card--blue"
            role="button"
            tabIndex={0}
            aria-label="进入学学学"
            onClick={() => goTo('/learning')}
            onKeyDown={(e) => e.key === 'Enter' && goTo('/learning')}
          >
            <div className="dov-card__stripe" aria-hidden="true" />
            <div className="dov-card__body">
              <div className="dov-card__left">
                <span className="dov-card__label">
                  <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />学学学
                </span>
                <p className="dov-card__num">
                  {summary?.learning.todayStudyHours ?? 0}<span className="dov-card__unit">h</span>
                </p>
                <p className="dov-card__sub">今日学习</p>
                <p className="dov-card__note">
                  {summary?.learning.activeExam
                    ? `${summary.learning.activeExam.examName} · ${countdown(summary.learning.activeExam.daysRemaining)}`
                    : '还没有设置考试'}
                </p>
              </div>
              <ProgressRing
                pct={learningProgress}
                tone="blue"
                label={learningProgress === null ? '—' : `${learningProgress}%`}
              />
            </div>
          </article>

          {/* 省省省 */}
          <article
            className="dov-card dov-card--blue"
            role="button"
            tabIndex={0}
            aria-label="进入省省省"
            onClick={() => goTo('/finance')}
            onKeyDown={(e) => e.key === 'Enter' && goTo('/finance')}
          >
            <div className="dov-card__stripe" aria-hidden="true" />
            <div className="dov-card__body">
              <div className="dov-card__left">
                <span className="dov-card__label">
                  <PiggyBank aria-hidden="true" className="h-3.5 w-3.5" />省省省
                </span>
                <p className="dov-card__num dov-card__num--money">
                  {currency.format(summary?.finance.currentMonthExpense ?? 0)}
                </p>
                <p className="dov-card__sub">本月支出</p>
                <p className="dov-card__note">
                  {monthlyBudget === null
                    ? '未设置月度预算'
                    : `余量 ${currency.format(summary?.finance.budgetRemaining ?? 0)}`}
                </p>
              </div>
              <ProgressRing
                pct={financeProgress}
                tone="blue"
                label={financeProgress === null ? '—' : `${financeProgress}%`}
              />
            </div>
          </article>

          {/* 嫁嫁嫁 */}
          <article
            className="dov-card dov-card--pink"
            role="button"
            tabIndex={0}
            aria-label="进入嫁嫁嫁"
            onClick={() => goTo('/wedding')}
            onKeyDown={(e) => e.key === 'Enter' && goTo('/wedding')}
          >
            <div className="dov-card__stripe" aria-hidden="true" />
            <div className="dov-card__body">
              <div className="dov-card__left">
                <span className="dov-card__label">
                  <ListTodo aria-hidden="true" className="h-3.5 w-3.5" />嫁嫁嫁
                </span>
                <p className="dov-card__num">
                  {pendingWeddingTasks}<span className="dov-card__unit">项</span>
                </p>
                <p className="dov-card__sub">待处理任务</p>
                <p className="dov-card__note">
                  {summary?.wedding.weddingDate
                    ? `${countdown(summary.wedding.daysRemaining)} · 完成 ${completedWeddingTasks} 项`
                    : '还没有设置婚期'}
                </p>
              </div>
              <ProgressRing
                pct={weddingProgress}
                tone="pink"
                label={weddingProgress === null ? '—' : `${weddingProgress}%`}
              />
            </div>
          </article>
        </section>

        <section className="dashboard-entry-section" aria-labelledby="dashboard-modules-title">
          <div className="dashboard-entry-section__heading">
            <div>
              <h2 id="dashboard-modules-title" className="text-2xl font-semibold">四个小世界</h2>
            </div>
            <p>挑一个世界走进去，继续推进今天的计划。</p>
          </div>

          <div className="dashboard-entry-grid">
            <article className="dashboard-module dashboard-module--fitness" aria-labelledby="dashboard-fitness-title">
              <div className="dashboard-entry__top"><span className="dashboard-symbol dashboard-symbol--pink"><Dumbbell aria-hidden="true" className="h-5 w-5" /></span></div>
              <h3 id="dashboard-fitness-title" className="dashboard-entry__title">瘦瘦瘦</h3>
              <p className="dashboard-entry__description">记录运动、体重和本周目标。</p>
              <Button type="button" variant="ghost" className="dashboard-entry__action" aria-label="进入瘦瘦瘦模块" onClick={() => goTo('/fitness')}>进入瘦瘦瘦<ArrowRight aria-hidden="true" className="h-4 w-4" /></Button>
            </article>

            <article className="dashboard-module dashboard-module--learning" aria-labelledby="dashboard-learning-title">
              <div className="dashboard-entry__top"><span className="dashboard-symbol"><BookOpen aria-hidden="true" className="h-5 w-5" /></span></div>
              <h3 id="dashboard-learning-title" className="dashboard-entry__title">学学学</h3>
              <p className="dashboard-entry__description">把考试、科目和每日学习放在一起。</p>
              <Button type="button" variant="ghost" className="dashboard-entry__action" aria-label="进入学学学模块" onClick={() => goTo('/learning')}>进入学学学<ArrowRight aria-hidden="true" className="h-4 w-4" /></Button>
            </article>

            <article className="dashboard-module dashboard-module--finance" aria-labelledby="dashboard-finance-title">
              <div className="dashboard-entry__top"><span className="dashboard-symbol"><PiggyBank aria-hidden="true" className="h-5 w-5" /></span></div>
              <h3 id="dashboard-finance-title" className="dashboard-entry__title">省省省</h3>
              <p className="dashboard-entry__description">看见每一笔消费，也看见想存下的目标。</p>
              <Button type="button" variant="ghost" className="dashboard-entry__action" aria-label="进入省省省模块" onClick={() => goTo('/finance')}>进入省省省<ArrowRight aria-hidden="true" className="h-4 w-4" /></Button>
            </article>

            <article className="dashboard-module dashboard-module--wedding" aria-labelledby="dashboard-wedding-title">
              <div className="dashboard-entry__top"><span className="dashboard-symbol dashboard-symbol--pink"><ListTodo aria-hidden="true" className="h-5 w-5" /></span></div>
              <h3 id="dashboard-wedding-title" className="dashboard-entry__title">嫁嫁嫁</h3>
              <p className="dashboard-entry__description">把婚期、任务和花费有序地推进下去。</p>
              <Button type="button" variant="ghost" className="dashboard-entry__action" aria-label="进入嫁嫁嫁模块" onClick={() => goTo('/wedding')}>进入嫁嫁嫁<ArrowRight aria-hidden="true" className="h-4 w-4" /></Button>
            </article>
          </div>
        </section>
      </div>
      <MobileTabBar />
    </main>
  )
}
