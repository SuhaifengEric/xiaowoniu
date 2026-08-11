import { BookOpen, Dumbbell, LayoutDashboard, ListTodo, PiggyBank } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const tabs = [
  { path: '/dashboard', label: '世界', ariaLabel: '前往世界仪表盘', icon: LayoutDashboard },
  { path: '/fitness', label: '瘦瘦瘦', ariaLabel: '前往瘦瘦瘦', icon: Dumbbell },
  { path: '/learning', label: '学学学', ariaLabel: '前往学学学', icon: BookOpen },
  { path: '/finance', label: '省省省', ariaLabel: '前往省省省', icon: PiggyBank },
  { path: '/wedding', label: '嫁嫁嫁', ariaLabel: '前往嫁嫁嫁', icon: ListTodo },
] as const

export default function MobileTabBar() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="mobile-tabbar" aria-label="主导航">
      <div className="mobile-tabbar__inner">
        {tabs.map(({ path, label, ariaLabel, icon: Icon }) => {
          const active = location.pathname === path
          return (
            <Button
              key={path}
              type="button"
              variant="ghost"
              className={`mobile-tabbar__item ${active ? 'mobile-tabbar__item--active' : ''}`}
              aria-current={active ? 'page' : undefined}
              aria-label={ariaLabel}
              onClick={() => !active && navigate(path)}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              <span aria-hidden="true">{label}</span>
            </Button>
          )
        })}
      </div>
    </nav>
  )
}
