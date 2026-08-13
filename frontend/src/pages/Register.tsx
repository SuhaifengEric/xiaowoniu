import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import BrandLogo from '@/components/navigation/BrandLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function Register() {
  const navigate = useNavigate()
  const { register, isLoading, error, clearError } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()

    try {
      await register({ username, email, password, nickname: nickname || undefined })
      navigate('/dashboard')
    } catch (error) {
      // 错误已在 store 中处理
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-layout">
        <aside className="auth-intro" aria-label="小蜗牛的花花世界介绍">
          <BrandLogo className="auth-brand" />
          <div className="auth-copy">
            <h1>给每一个计划，<br />一个温柔的起点。</h1>
            <p>不追求填满日程，只把真正重要的目标、记录与回顾放到同一处。</p>
          </div>
          <div className="auth-notes" aria-label="平台能力">
            <p className="auth-note"><span className="auth-note-dot" />轻松开始，不需要复杂配置</p>
            <p className="auth-note"><span className="auth-note-dot" />为长期使用设计的个人工作台</p>
          </div>
        </aside>

        <section className="auth-form-wrap" aria-label="注册表单">
          <BrandLogo className="auth-mobile-header" aria-hidden="true" />
          <Card className="auth-card">
            <CardHeader className="space-y-0 px-0 pb-7 pt-0">
              <CardTitle className="auth-title">创建账号</CardTitle>
              <CardDescription className="auth-description">用一个账号，收拢你想认真经营的生活。</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 px-0 pb-0">
                {error && <div role="alert" className="auth-error p-3 text-sm">{error}</div>}
                <div className="auth-field flex flex-col">
                  <Label htmlFor="username">用户名</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                    maxLength={20}
                    disabled={isLoading}
                    autoFocus
                    autoComplete="username"
                  />
                </div>
                <div className="auth-field flex flex-col">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
                <div className="auth-field flex flex-col">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="至少6位密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>
                <div className="auth-field flex flex-col">
                  <Label htmlFor="nickname">昵称（可选）</Label>
                  <Input
                    id="nickname"
                    type="text"
                    placeholder="请输入昵称"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={50}
                    disabled={isLoading}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4 px-0 pb-0 pt-7">
                <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? '注册中...' : '注册'}
                </Button>
                <p className="auth-switch text-center text-sm">
                  已有账号？{' '}
                  <Link to="/login" className="hover:underline">立即登录</Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </section>
      </div>
    </main>
  )
}
