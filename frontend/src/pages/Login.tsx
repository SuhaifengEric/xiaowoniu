import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import BrandLogo from '@/components/navigation/BrandLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter } from '@/components/ui/card'

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
      <div className="auth-layout auth-login-layout">
        <aside className="auth-intro auth-login-intro" aria-label="小蜗牛的花花世界介绍">
          <BrandLogo className="auth-brand" />
          <div className="auth-login-art" aria-hidden="true" />
          <div className="auth-login-message">
            <p>把日子放在一个地方</p>
            <p>持续记录，也记得享受每一步。</p>
          </div>
        </aside>

        <section className="auth-form-wrap auth-login-form-wrap" aria-label="登录表单">
          <div className="auth-mobile-welcome">
            <div className="auth-mobile-mascot" aria-hidden="true">
              <span className="auth-mobile-mascot__glow" />
              <img
                src="/brand/xiaowoniu-mascot.webp"
                width="256"
                height="256"
                alt=""
              />
            </div>
            <h1>小蜗牛的花花世界</h1>
          </div>
          <div className="auth-login-heading">
            <p>继续经营你的花花世界</p>
            <h1>欢迎回来</h1>
            <p>登录后，接着记录今天的进展。</p>
          </div>
          <Card className="auth-card">
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
