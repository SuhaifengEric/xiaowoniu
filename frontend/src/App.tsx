import { useEffect } from 'react'
import AppRoutes from './routes'
import { useAuth } from './hooks/useAuth'

export default function App() {
  const { checkAuth } = useAuth()

  useEffect(() => {
    // 应用启动时检查认证状态
    checkAuth()
  }, [checkAuth])

  return <AppRoutes />
}
