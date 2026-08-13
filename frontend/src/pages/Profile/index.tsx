import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, KeyRound, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { UserResponse } from '@xiaowoniu/shared'
import AccountMenu, { getDisplayName, getInitial } from '@/components/navigation/AccountMenu'
import BrandLogo from '@/components/navigation/BrandLogo'
import MobileTabBar from '@/components/navigation/MobileTabBar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Toast from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'

interface FieldErrors {
  nickname?: string
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}

interface ApiErrorLike {
  response?: {
    data?: {
      error?: {
        code?: string
        message?: string
      }
    }
  }
}

function getApiError(error: unknown) {
  const apiError = error as ApiErrorLike
  return {
    code: apiError.response?.data?.error?.code,
    message: apiError.response?.data?.error?.message || '操作失败，请稍后重试',
  }
}

function avatarName(user: UserResponse | null) {
  return getDisplayName(user?.nickname, user?.username)
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, updateProfile, changePassword } = useAuth()
  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [nicknameDirty, setNicknameDirty] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileFieldErrors, setProfileFieldErrors] = useState<FieldErrors>({})

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!nicknameDirty) setNickname(user?.nickname ?? '')
  }, [nicknameDirty, user?.nickname])

  const clearProfileFeedback = () => {
    setProfileError('')
    setStatus('')
    setProfileFieldErrors({})
  }

  const clearPasswordFeedback = () => {
    setPasswordError('')
    setStatus('')
    setPasswordFieldErrors({})
  }

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearProfileFeedback()
    const normalizedNickname = nickname.trim()
    if (Array.from(normalizedNickname).length > 50) {
      setProfileFieldErrors({ nickname: '昵称最多 50 个字符' })
      return
    }

    setProfileLoading(true)
    try {
      const updatedUser = await updateProfile({ nickname: normalizedNickname || null })
      setNickname(updatedUser.nickname ?? '')
      setNicknameDirty(false)
      setStatus('个人资料已更新')
    } catch (error) {
      const apiError = getApiError(error)
      if (apiError.code === 'VALIDATION_ERROR') {
        setProfileFieldErrors({ nickname: apiError.message })
      } else {
        setProfileError(apiError.message)
      }
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearPasswordFeedback()
    const errors: FieldErrors = {}
    if (!currentPassword) errors.currentPassword = '请输入当前密码'
    if (!newPassword) errors.newPassword = '请输入新密码'
    else if (newPassword.length < 6) errors.newPassword = '新密码至少 6 位'
    if (!confirmPassword) errors.confirmPassword = '请再次输入新密码'
    else if (confirmPassword !== newPassword) errors.confirmPassword = '两次输入的新密码不一致'
    if (currentPassword && newPassword && currentPassword === newPassword) {
      errors.newPassword = '新密码不能与当前密码相同'
    }

    if (Object.keys(errors).length > 0) {
      setPasswordFieldErrors(errors)
      return
    }

    setPasswordLoading(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setStatus('密码修改成功，当前登录仍然有效')
    } catch (error) {
      const apiError = getApiError(error)
      if (apiError.code === 'INVALID_CURRENT_PASSWORD') {
        setPasswordFieldErrors({ currentPassword: apiError.message })
      } else if (apiError.code === 'PASSWORD_UNCHANGED') {
        setPasswordFieldErrors({ newPassword: apiError.message })
      } else if (apiError.code === 'VALIDATION_ERROR') {
        setPasswordError(apiError.message)
      } else {
        setPasswordError(apiError.message)
      }
    } finally {
      setPasswordLoading(false)
    }
  }

  const displayName = avatarName(user)
  const fieldError = (id: string, message?: string) => (
    message ? <p id={`${id}-error`} className="profile-field-error" role="alert">{message}</p> : null
  )

  return (
    <main className="app-page profile-page has-mobile-tabbar">
      <Toast message={status} onDismiss={() => setStatus('')} />
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <nav className="app-nav flex min-h-11 items-center justify-between gap-3 border-b pb-4" aria-label="页面导航">
          <BrandLogo className="app-brand" />
          <AccountMenu />
        </nav>

        <header className="app-page-header profile-page__header flex flex-col gap-5 py-9">
          <Button
            type="button"
            variant="ghost"
            className="app-nav-action w-fit gap-2 px-2"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />返回世界仪表盘
          </Button>
          <div>
            <h1 className="app-page-title">个人中心</h1>
            <p className="app-page-description mt-3 max-w-xl">管理你的资料和账号安全。</p>
          </div>
        </header>

        <div className="profile-grid">
          <Card className="profile-card">
            <CardHeader className="profile-card__header">
              <div className="profile-card__heading">
                <span className="profile-card__icon profile-card__icon--pink" aria-hidden="true"><UserRound className="h-4 w-4" /></span>
                <div>
                  <CardTitle className="profile-card__title">基本资料</CardTitle>
                  <CardDescription className="mt-1">更新你希望在页面顶部显示的昵称。</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="profile-identity">
                <span className="profile-identity__avatar" aria-hidden="true">{getInitial(displayName)}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{displayName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">默认头像占位</p>
                </div>
              </div>

              <form className="profile-form" onSubmit={handleProfileSubmit} noValidate>
                {profileError && <div className="app-alert" role="alert">{profileError}</div>}
                <div className="profile-field">
                  <Label htmlFor="profile-nickname">昵称</Label>
                  <Input
                    id="profile-nickname"
                    type="text"
                    value={nickname}
                    maxLength={50}
                    placeholder="请输入昵称"
                    aria-invalid={Boolean(profileFieldErrors.nickname)}
                    aria-describedby={profileFieldErrors.nickname ? 'profile-nickname-error' : undefined}
                    disabled={profileLoading}
                    onChange={(event) => {
                      setNickname(event.target.value)
                      setNicknameDirty(true)
                      if (profileFieldErrors.nickname) setProfileFieldErrors({})
                    }}
                  />
                  {fieldError('profile-nickname', profileFieldErrors.nickname)}
                  <p className="profile-field-hint">留空后保存即可清空昵称，最多 50 个字符。</p>
                </div>
                <div className="profile-readonly-grid">
                  <div className="profile-readonly-field">
                    <span>用户名</span>
                    <strong>{user?.username || '—'}</strong>
                  </div>
                  <div className="profile-readonly-field">
                    <span>邮箱</span>
                    <strong className="break-all">{user?.email || '—'}</strong>
                  </div>
                </div>
                <Button type="submit" className="w-full sm:w-auto" disabled={profileLoading}>
                  {profileLoading ? '保存中…' : '保存昵称'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="profile-card">
            <CardHeader className="profile-card__header">
              <div className="profile-card__heading">
                <span className="profile-card__icon profile-card__icon--blue" aria-hidden="true"><KeyRound className="h-4 w-4" /></span>
                <div>
                  <CardTitle className="profile-card__title">账号安全</CardTitle>
                  <CardDescription className="mt-1">使用当前密码确认这次修改。</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form className="profile-form" onSubmit={handlePasswordSubmit} noValidate>
                {passwordError && <div className="app-alert" role="alert">{passwordError}</div>}
                <div className="profile-field">
                  <Label htmlFor="current-password">当前密码</Label>
                  <Input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    aria-invalid={Boolean(passwordFieldErrors.currentPassword)}
                    aria-describedby={passwordFieldErrors.currentPassword ? 'current-password-error' : undefined}
                    disabled={passwordLoading}
                    onChange={(event) => {
                      setCurrentPassword(event.target.value)
                      if (passwordFieldErrors.currentPassword) setPasswordFieldErrors({})
                    }}
                  />
                  {fieldError('current-password', passwordFieldErrors.currentPassword)}
                </div>
                <div className="profile-field">
                  <Label htmlFor="new-password">新密码</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    aria-invalid={Boolean(passwordFieldErrors.newPassword)}
                    aria-describedby={passwordFieldErrors.newPassword ? 'new-password-error' : undefined}
                    disabled={passwordLoading}
                    onChange={(event) => {
                      setNewPassword(event.target.value)
                      if (passwordFieldErrors.newPassword) setPasswordFieldErrors({})
                    }}
                  />
                  {fieldError('new-password', passwordFieldErrors.newPassword)}
                  <p className="profile-field-hint">至少 6 位字符。</p>
                </div>
                <div className="profile-field">
                  <Label htmlFor="confirm-password">确认新密码</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    aria-invalid={Boolean(passwordFieldErrors.confirmPassword)}
                    aria-describedby={passwordFieldErrors.confirmPassword ? 'confirm-password-error' : undefined}
                    disabled={passwordLoading}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value)
                      if (passwordFieldErrors.confirmPassword) setPasswordFieldErrors({})
                    }}
                  />
                  {fieldError('confirm-password', passwordFieldErrors.confirmPassword)}
                </div>
                <Button type="submit" className="w-full sm:w-auto" disabled={passwordLoading}>
                  {passwordLoading ? '修改中…' : '修改密码'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <MobileTabBar />
    </main>
  )
}
