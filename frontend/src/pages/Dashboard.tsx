import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">小窝牛个人管理平台</h1>
          <Button variant="outline" onClick={handleLogout}>
            登出
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>欢迎回来，{user?.nickname || user?.username}！</CardTitle>
            <CardDescription>
              这是你的个人管理中心
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>用户名：</strong>{user?.username}</p>
              <p><strong>邮箱：</strong>{user?.email}</p>
              <p><strong>注册时间：</strong>{new Date(user?.createdAt || '').toLocaleDateString('zh-CN')}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          <Card
            role="button"
            tabIndex={0}
            onClick={() => navigate('/fitness')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar' || event.key === 'Space') {
                event.preventDefault()
                navigate('/fitness')
              }
            }}
            className="cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <CardHeader>
              <CardTitle className="text-lg">瘦瘦瘦</CardTitle>
              <CardDescription>健身打卡与体重管理</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">记录今天的运动和体重</p>
            </CardContent>
          </Card>

          <Card
            role="button"
            tabIndex={0}
            onClick={() => navigate('/learning')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar' || event.key === 'Space') {
                event.preventDefault()
                navigate('/learning')
              }
            }}
            className="cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <CardHeader>
              <CardTitle className="text-lg">学学学</CardTitle>
              <CardDescription>考试倒计时与学习进度</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">记录每次学习，掌握备考进度</p>
            </CardContent>
          </Card>

          <Card
            role="button"
            tabIndex={0}
            onClick={() => navigate('/finance')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar' || event.key === 'Space') {
                event.preventDefault()
                navigate('/finance')
              }
            }}
            className="cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <CardHeader>
              <CardTitle className="text-lg">省省省</CardTitle>
              <CardDescription>财务记录与预算管理</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">记录消费、预算和存钱目标</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">嫁嫁嫁</CardTitle>
              <CardDescription>备婚任务与花费跟踪</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">即将上线...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
