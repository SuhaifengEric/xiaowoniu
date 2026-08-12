import { LogOut, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

function getDisplayName(nickname: string | null | undefined, username: string | undefined) {
  return nickname?.trim() || username || '我的账号'
}

function getInitial(displayName: string) {
  return Array.from(displayName)[0]?.toUpperCase() || '我'
}

export default function AccountMenu() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const displayName = getDisplayName(user?.nickname, user?.username)

  const handleLogout = async () => {
    setOpen(false)
    try {
      await logout()
      navigate('/login')
    } catch {
      // Auth state owns logout failures; local navigation remains unchanged.
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="account-menu__trigger"
          aria-label={`打开用户菜单：${displayName}`}
          aria-expanded={open}
        >
          {user?.avatarUrl ? (
            <img className="account-menu__avatar" src={user.avatarUrl} alt="" />
          ) : (
            <span className="account-menu__avatar account-menu__avatar--fallback" aria-hidden="true">
              {getInitial(displayName)}
            </span>
          )}
          <span className="account-menu__name">{displayName}</span>
          <span className="sr-only">账户操作</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="account-menu__content w-64 p-2">
        <div className="account-menu__summary px-3 py-2">
          <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
          {user?.email && <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>}
        </div>
        <div className="my-1 border-t border-border" />
        <Button
          type="button"
          variant="ghost"
          className="account-menu__item w-full justify-start gap-2 px-3"
          onClick={() => {
            setOpen(false)
            navigate('/profile')
          }}
        >
          <UserRound aria-hidden="true" className="h-4 w-4" />
          个人中心
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="account-menu__item account-menu__item--danger w-full justify-start gap-2 px-3"
          onClick={() => void handleLogout()}
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />
          登出
        </Button>
      </PopoverContent>
    </Popover>
  )
}

export { getDisplayName, getInitial }
