import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import ProtectedRoute from './ProtectedRoute'

const Fitness = lazy(() => import('@/pages/Fitness'))
const Learning = lazy(() => import('@/pages/Learning'))
const Finance = lazy(() => import('@/pages/Finance'))

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fitness"
          element={
            <ProtectedRoute>
              <Suspense fallback={<main className="flex min-h-screen items-center justify-center" role="status">健身页面加载中…</main>}>
                <Fitness />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/learning"
          element={
            <ProtectedRoute>
              <Suspense fallback={<main className="flex min-h-screen items-center justify-center" role="status">学习页面加载中…</main>}>
                <Learning />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance"
          element={
            <ProtectedRoute>
              <Suspense fallback={<main className="flex min-h-screen items-center justify-center" role="status">财务页面加载中…</main>}>
                <Finance />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
