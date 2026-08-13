import axios, { type AxiosRequestConfig } from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const AUTH_ENDPOINTS = new Set(['/api/auth/login', '/api/auth/register'])

const requestPath = (config?: AxiosRequestConfig): string | null => {
  if (!config?.url) return null

  try {
    return new URL(config.url, API_URL).pathname.replace(/\/$/, '')
  } catch {
    return config.url.split('?')[0].replace(/\/$/, '')
  }
}

// 登录/注册的 401 是业务校验失败，不代表当前页面已有的会话失效。
// 只有非认证入口的 401 才能触发全局清理和回到登录页。
export const shouldRedirectToLogin = (config?: AxiosRequestConfig): boolean => {
  const path = requestPath(config)
  return path === null || !AUTH_ENDPOINTS.has(path)
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：添加 Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器：处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && shouldRedirectToLogin(error.config)) {
      // Token 过期，清除本地存储并跳转登录
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
