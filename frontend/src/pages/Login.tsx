import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import BrandLogo from '@/components/navigation/BrandLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function Login() {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()

    try {
      await login({ email, password })
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
            <h1>让每一个目标，<br />都有自己的节奏。</h1>
            <p>健身、学习、财务和备婚，不必分散在许多地方。这里为你留下持续推进的空间。</p>
          </div>
          <div className="auth-notes" aria-label="平台能力">
            <p className="auth-note"><span className="auth-note-dot" />从今天开始，记录一件小事</p>
            <p className="auth-note"><span className="auth-note-dot" />让目标、进度和回顾自然连起来</p>
          </div>
        </aside>

        <section className="auth-form-wrap" aria-label="登录表单">
          <BrandLogo className="auth-mobile-header" aria-hidden="true" />
          <Card className="auth-card">
            <CardHeader className="auth-card-header space-y-0 px-0 pb-8 pt-0">
              <div className="auth-mobile-mascot" aria-hidden="true">
                <span className="auth-mobile-mascot__glow" />
                <img
                  src="/brand/xiaowoniu-mascot.webp"
                  width="256"
                  height="256"
                  alt=""
                />
              </div>
              <div className="auth-heading-copy">
                <CardTitle className="auth-title">欢迎回来</CardTitle>
                <CardDescription className="auth-description">登录后继续查看你的生活进展。</CardDescription>
              </div>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-5 px-0 pb-0">
                {error && <div role="alert" className="auth-error p-3 text-sm">{error}</div>}
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
                    autoFocus
                    autoComplete="email"
                  />
                </div>
                <div className="auth-field flex flex-col">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4 px-0 pb-0 pt-7">
                <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? '登录中...' : '登录'}
                </Button>
                <p className="auth-switch text-center text-sm">
                  还没有账号？{' '}
                  <Link to="/register" className="hover:underline">立即注册</Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </section>
      </div>
    </main>
  )
}
