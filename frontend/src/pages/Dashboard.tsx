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
  const progressCards = [
    {
      title: '瘦瘦瘦',
      value: fitnessProgress === null ? '待设置' : `${fitnessProgress}%`,
      note: weeklyTarget === null ? '设置本周目标后显示进度' : `本周 ${summary?.fitness.weeklyCheckinCount ?? 0} / ${weeklyTarget} 次打卡`,
      percentage: fitnessProgress,
      icon: Dumbbell,
      tone: 'blue',
    },
    {
      title: '学学学',
      value: learningProgress === null ? '待开始' : `${learningProgress}%`,
      note: learningProgress === null ? '设置考试和科目后显示进度' : `今天已学习 ${summary?.learning.todayStudyHours ?? 0} 小时`,
      percentage: learningProgress,
      icon: BookOpen,
      tone: 'blue',
    },
    {
      title: '省省省',
      value: financeProgress === null ? '待设置' : `${financeProgress}%`,
      note: monthlyBudget === null ? '设置月度预算后显示进度' : `预算余量 ${currency.format(summary?.finance.budgetRemaining ?? 0)}`,
      percentage: financeProgress,
      icon: PiggyBank,
      tone: 'pink',
    },
    {
      title: '嫁嫁嫁',
      value: weddingProgress === null ? '待开始' : `${weddingProgress}%`,
      note: totalWeddingTasks === 0 ? '新增任务后显示进度' : `已完成 ${completedWeddingTasks} 项，待处理 ${pendingWeddingTasks} 项`,
      percentage: weddingProgress,
      icon: ListTodo,
      tone: 'pink',
    },
  ] as const

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

        <div className="dashboard-snapshot">
          <section className="dashboard-overview" aria-labelledby="dashboard-overview-title">
            <div className="dashboard-overview__heading">
              <div>
                <h2 id="dashboard-overview-title" className="text-2xl font-semibold">今日概览</h2>
              </div>
              <p>先看全局状态，再决定从哪个模块继续。</p>
            </div>

            <div className="dashboard-overview-grid">
              <article className="dashboard-overview-card dashboard-overview-card--blue">
                <span className="dashboard-overview-card__icon"><Dumbbell aria-hidden="true" className="h-4 w-4" /></span>
                <p>今日运动</p><strong>{summary?.fitness.todayCheckinCount ?? 0} 次</strong><span>本周 {summary?.fitness.weeklyCheckinCount ?? 0}{summary?.fitness.weeklyTarget === null || summary?.fitness.weeklyTarget === undefined ? ' 次打卡' : ` / ${summary.fitness.weeklyTarget} 次`}</span>
              </article>
              <article className="dashboard-overview-card dashboard-overview-card--blue">
                <span className="dashboard-overview-card__icon"><BookOpen aria-hidden="true" className="h-4 w-4" /></span>
                <p>今日学习</p><strong>{summary?.learning.todayStudyHours ?? 0} h</strong><span>{summary?.learning.activeExam ? `${summary.learning.activeExam.examName} · ${countdown(summary.learning.activeExam.daysRemaining)}` : '还没有设置考试'}</span>
              </article>
              <article className="dashboard-overview-card dashboard-overview-card--pink">
                <span className="dashboard-overview-card__icon"><PiggyBank aria-hidden="true" className="h-4 w-4" /></span>
                <p>本月支出</p><strong>{currency.format(summary?.finance.currentMonthExpense ?? 0)}</strong><span>{summary?.finance.currentMonthBudget === null || summary?.finance.currentMonthBudget === undefined ? '暂未设置月度预算' : `预算 ${currency.format(summary.finance.currentMonthBudget)}`}</span>
              </article>
              <article className="dashboard-overview-card dashboard-overview-card--pink">
                <span className="dashboard-overview-card__icon"><ListTodo aria-hidden="true" className="h-4 w-4" /></span>
                <p>待处理备婚任务</p><strong>{summary?.wedding.pendingTasksCount ?? 0} 项</strong><span>{summary?.wedding.weddingDate ? `${countdown(summary.wedding.daysRemaining)} · 已完成 ${summary.wedding.completedTasksCount ?? 0} 项` : '还没有设置婚期'}</span>
              </article>
            </div>
          </section>

          <section className="dashboard-progress" aria-labelledby="dashboard-progress-title">
            <div className="dashboard-progress__heading">
              <h2 id="dashboard-progress-title" className="text-2xl font-semibold">目标进度</h2>
              <p>用已有目标和记录，看看这一周正往哪里走。</p>
            </div>

            <div className="dashboard-progress-grid">
              {progressCards.map(({ title, value, note, percentage, icon: Icon, tone }) => (
                <article key={title} className={`dashboard-progress-card dashboard-progress-card--${tone}`}>
                  <div className="dashboard-progress-card__top">
                    <span className="dashboard-progress-card__icon"><Icon aria-hidden="true" className="h-4 w-4" /></span>
                    <p>{title}</p>
                  </div>
                  <strong>{value}</strong>
                  <p>{note}</p>
                  <div
                    className="dashboard-progress-card__track"
                    role="progressbar"
                    aria-label={`${title}进度`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percentage ?? 0}
                    aria-valuetext={percentage === null ? value : `${value}，${note}`}
                  >
                    <span style={{ width: `${percentage ?? 0}%` }} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="dashboard-entry-section" aria-labelledby="dashboard-modules-title">
          <div className="dashboard-entry-section__heading">
            <div>
              <h2 id="dashboard-modules-title" className="text-2xl font-semibold">进入模块</h2>
            </div>
            <p>选择一个模块，继续推进今天的计划。</p>
          </div>

          <div className="dashboard-entry-grid">
            <article className="dashboard-module dashboard-module--fitness" aria-labelledby="dashboard-fitness-title">
              <div className="dashboard-entry__top"><span className="dashboard-symbol dashboard-symbol--green"><Dumbbell aria-hidden="true" className="h-5 w-5" /></span></div>
              <h3 id="dashboard-fitness-title" className="dashboard-entry__title">瘦瘦瘦</h3>
              <p className="dashboard-entry__description">记录运动、体重和本周目标。</p>
              <Button type="button" variant="ghost" className="dashboard-entry__action" aria-label="进入瘦瘦瘦模块" onClick={() => goTo('/fitness')}>进入瘦瘦瘦<ArrowRight aria-hidden="true" className="h-4 w-4" /></Button>
            </article>

            <article className="dashboard-module dashboard-module--learning" aria-labelledby="dashboard-learning-title">
              <div className="dashboard-entry__top"><span className="dashboard-symbol dashboard-symbol--blue"><BookOpen aria-hidden="true" className="h-5 w-5" /></span></div>
              <h3 id="dashboard-learning-title" className="dashboard-entry__title">学学学</h3>
              <p className="dashboard-entry__description">把考试、科目和每日学习放在一起。</p>
              <Button type="button" variant="ghost" className="dashboard-entry__action" aria-label="进入学学学模块" onClick={() => goTo('/learning')}>进入学学学<ArrowRight aria-hidden="true" className="h-4 w-4" /></Button>
            </article>

            <article className="dashboard-module dashboard-module--finance" aria-labelledby="dashboard-finance-title">
              <div className="dashboard-entry__top"><span className="dashboard-symbol dashboard-symbol--amber"><PiggyBank aria-hidden="true" className="h-5 w-5" /></span></div>
              <h3 id="dashboard-finance-title" className="dashboard-entry__title">省省省</h3>
              <p className="dashboard-entry__description">看见每一笔消费，也看见想存下的目标。</p>
              <Button type="button" variant="ghost" className="dashboard-entry__action" aria-label="进入省省省模块" onClick={() => goTo('/finance')}>进入省省省<ArrowRight aria-hidden="true" className="h-4 w-4" /></Button>
            </article>

            <article className="dashboard-module dashboard-module--wedding" aria-labelledby="dashboard-wedding-title">
              <div className="dashboard-entry__top"><span className="dashboard-symbol dashboard-symbol--rose"><ListTodo aria-hidden="true" className="h-5 w-5" /></span></div>
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
