# Phase 3: 前端基础架构和认证界面 - 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 搭建 React + Vite 前端应用，配置 Shadcn/ui 组件库，实现登录注册界面和认证流程

**架构：** React 18 + TypeScript + Vite + Shadcn/ui + Tailwind CSS + Zustand + React Router

**技术栈：** React 18, Vite 5, TypeScript 5, Shadcn/ui, Tailwind CSS 3, Zustand, React Router v6, Axios

---

## 文件结构概览

此阶段将创建以下文件和目录：

```
xiaowoniu/
├── frontend/                             # 前端应用
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── components.json                   # Shadcn 配置
│   ├── index.html
│   ├── .env.example
│   ├── .gitignore
│   ├── src/
│   │   ├── main.tsx                      # 应用入口
│   │   ├── App.tsx                       # 根组件
│   │   ├── vite-env.d.ts                 # Vite 类型声明
│   │   ├── index.css                     # 全局样式
│   │   ├── lib/
│   │   │   └── utils.ts                  # 工具函数（cn）
│   │   ├── components/
│   │   │   └── ui/                       # Shadcn UI 组件
│   │   │       ├── button.tsx
│   │   │       ├── input.tsx
│   │   │       ├── card.tsx
│   │   │       ├── label.tsx
│   │   │       └── form.tsx
│   │   ├── services/
│   │   │   ├── api.ts                    # Axios 实例配置
│   │   │   └── auth.service.ts           # 认证 API
│   │   ├── store/
│   │   │   └── auth.store.ts             # 认证状态管理
│   │   ├── types/
│   │   │   └── index.ts                  # 前端类型
│   │   ├── hooks/
│   │   │   └── useAuth.ts                # 认证 Hook
│   │   ├── pages/
│   │   │   ├── Login.tsx                 # 登录页
│   │   │   ├── Register.tsx              # 注册页
│   │   │   └── Dashboard.tsx             # 首页（需认证）
│   │   └── routes/
│   │       ├── index.tsx                 # 路由配置
│   │       └── ProtectedRoute.tsx        # 受保护路由组件
```

---

## 任务 1：初始化前端项目

**文件：**
- 创建：`frontend/package.json`
- 创建：`frontend/tsconfig.json`
- 创建：`frontend/tsconfig.node.json`
- 创建：`frontend/vite.config.ts`
- 创建：`frontend/index.html`
- 创建：`frontend/.gitignore`
- 创建：`frontend/.env.example`

---

- [ ] **步骤 1：创建 frontend 目录**

```bash
mkdir -p frontend/src
cd frontend
```

- [ ] **步骤 2：初始化 package.json**

创建文件 `frontend/package.json`：

```json
{
  "name": "@xiaowoniu/frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "@xiaowoniu/shared": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "zustand": "^4.4.7",
    "axios": "^1.6.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.303.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.55.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.2.2",
    "vite": "^5.0.8"
  }
}
```

- [ ] **步骤 3：创建 TypeScript 配置**

创建文件 `frontend/tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

创建文件 `frontend/tsconfig.node.json`：

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **步骤 4：创建 Vite 配置**

创建文件 `frontend/vite.config.ts`：

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **步骤 5：创建 index.html**

创建文件 `frontend/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>小窝牛 - 个人管理平台</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **步骤 6：创建 .gitignore**

创建文件 `frontend/.gitignore`：

```gitignore
# Dependencies
node_modules/

# Build
dist/
dist-ssr/
*.local

# Environment
.env
.env.local
.env.production

# Editor
.vscode/
.idea/

# Logs
*.log
```

- [ ] **步骤 7：创建 .env.example**

创建文件 `frontend/.env.example`：

```env
VITE_API_URL=http://localhost:3000
```

- [ ] **步骤 8：验证配置**

```bash
cd frontend
cat package.json | grep "@xiaowoniu/frontend"
cat tsconfig.json | grep "strict"
```

- [ ] **步骤 9：Commit**

```bash
cd ..
git add frontend/
git commit -m "chore(frontend): initialize frontend project structure"
```

---

## 任务 2：配置 Tailwind CSS 和 Shadcn/ui

**文件：**
- 创建：`frontend/tailwind.config.js`
- 创建：`frontend/postcss.config.js`
- 创建：`frontend/components.json`
- 创建：`frontend/src/index.css`
- 创建：`frontend/src/lib/utils.ts`

---

- [ ] **步骤 1：创建 Tailwind 配置**

创建文件 `frontend/tailwind.config.js`：

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
```

- [ ] **步骤 2：创建 PostCSS 配置**

创建文件 `frontend/postcss.config.js`：

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **步骤 3：创建 Shadcn 配置**

创建文件 `frontend/components.json`：

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

- [ ] **步骤 4：创建全局样式**

创建文件 `frontend/src/index.css`：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **步骤 5：创建工具函数**

创建文件 `frontend/src/lib/utils.ts`：

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **步骤 6：安装依赖**

```bash
cd frontend
pnpm install
```

- [ ] **步骤 7：Commit**

```bash
cd ..
git add frontend/
git commit -m "feat(frontend): configure Tailwind CSS and Shadcn/ui"
```

---

## 任务 3：安装并配置 Shadcn UI 组件

**文件：**
- 创建：`frontend/src/components/ui/button.tsx`
- 创建：`frontend/src/components/ui/input.tsx`
- 创建：`frontend/src/components/ui/card.tsx`
- 创建：`frontend/src/components/ui/label.tsx`
- 修改：`frontend/package.json`（添加依赖）

---

- [ ] **步骤 1：安装 Shadcn 依赖**

```bash
cd frontend
pnpm add class-variance-authority tailwindcss-animate
pnpm add -D @radix-ui/react-slot @radix-ui/react-label
```

- [ ] **步骤 2：创建 Button 组件**

创建文件 `frontend/src/components/ui/button.tsx`：

```typescript
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

- [ ] **步骤 3：创建 Input 组件**

创建文件 `frontend/src/components/ui/input.tsx`：

```typescript
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
```

- [ ] **步骤 4：创建 Card 组件**

创建文件 `frontend/src/components/ui/card.tsx`：

```typescript
import * as React from 'react'
import { cn } from '@/lib/utils'

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}
      {...props}
    />
  )
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

- [ ] **步骤 5：创建 Label 组件**

创建文件 `frontend/src/components/ui/label.tsx`：

```typescript
import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
```

- [ ] **步骤 6：验证组件导入**

```bash
cd frontend
pnpm build
```

预期：编译成功

- [ ] **步骤 7：Commit**

```bash
cd ..
git add frontend/src/components/ui/ frontend/package.json frontend/pnpm-lock.yaml
git commit -m "feat(frontend): add Shadcn UI components"
```

---

## 任务 4：配置 API 服务和 Axios

**文件：**
- 创建：`frontend/src/services/api.ts`
- 创建：`frontend/src/services/auth.service.ts`
- 创建：`frontend/src/types/index.ts`

---

- [ ] **步骤 1：创建 Axios 实例**

创建文件 `frontend/src/services/api.ts`：

```typescript
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

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
    if (error.response?.status === 401) {
      // Token 过期，清除本地存储并跳转登录
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

- [ ] **步骤 2：创建认证服务**

创建文件 `frontend/src/services/auth.service.ts`：

```typescript
import api from './api'
import type {
  RegisterRequest,
  LoginRequest,
  LoginResponse,
  UserResponse,
} from '@xiaowoniu/shared'

export const authService = {
  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await api.post<{ success: boolean; data: LoginResponse }>(
      '/api/auth/register',
      data
    )
    return response.data.data
  },

  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<{ success: boolean; data: LoginResponse }>(
      '/api/auth/login',
      data
    )
    return response.data.data
  },

  /**
   * 获取当前用户信息
   */
  async getMe(): Promise<UserResponse> {
    const response = await api.get<{ success: boolean; data: UserResponse }>(
      '/api/auth/me'
    )
    return response.data.data
  },

  /**
   * 登出
   */
  async logout(): Promise<void> {
    await api.post('/api/auth/logout')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  /**
   * 保存 Token 和用户信息
   */
  saveAuth(token: string, user: UserResponse): void {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
  },

  /**
   * 获取保存的用户信息
   */
  getSavedUser(): UserResponse | null {
    const userStr = localStorage.getItem('user')
    if (!userStr) return null
    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  },

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token')
  },
}

export default authService
```

- [ ] **步骤 3：创建前端类型定义**

创建文件 `frontend/src/types/index.ts`：

```typescript
// 导出 shared 包中的类型
export type {
  UserResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ApiResponse,
  ApiError,
} from '@xiaowoniu/shared'

// 前端特有的类型
export interface AuthState {
  user: UserResponse | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}
```

- [ ] **步骤 4：验证编译**

```bash
cd frontend
pnpm build
```

预期：编译成功

- [ ] **步骤 5：Commit**

```bash
cd ..
git add frontend/src/services/ frontend/src/types/
git commit -m "feat(frontend): add API services and auth service"
```

---

## 任务 5：实现 Zustand 认证状态管理

**文件：**
- 创建：`frontend/src/store/auth.store.ts`
- 创建：`frontend/src/hooks/useAuth.ts`

---

- [ ] **步骤 1：创建认证状态 Store**

创建文件 `frontend/src/store/auth.store.ts`：

```typescript
import { create } from 'zustand'
import { authService } from '@/services/auth.service'
import type { UserResponse, LoginRequest, RegisterRequest } from '@xiaowoniu/shared'

interface AuthState {
  user: UserResponse | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: authService.getSavedUser(),
  token: localStorage.getItem('token'),
  isAuthenticated: authService.isAuthenticated(),
  isLoading: false,
  error: null,

  login: async (data: LoginRequest) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authService.login(data)
      authService.saveAuth(response.token, response.user)
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '登录失败'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  register: async (data: RegisterRequest) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authService.register(data)
      authService.saveAuth(response.token, response.user)
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error: any) {
      const message = error.response?.data?.error?.message || '注册失败'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      await authService.logout()
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      // 即使服务端登出失败，也清除本地状态
      authService.logout()
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },

  checkAuth: () => {
    const user = authService.getSavedUser()
    const token = localStorage.getItem('token')
    const isAuthenticated = authService.isAuthenticated()
    set({ user, token, isAuthenticated })
  },

  clearError: () => {
    set({ error: null })
  },
}))
```

- [ ] **步骤 2：创建认证 Hook**

创建文件 `frontend/src/hooks/useAuth.ts`：

```typescript
import { useAuthStore } from '@/store/auth.store'

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    checkAuth,
    clearError,
  } = useAuthStore()

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    checkAuth,
    clearError,
  }
}

export default useAuth
```

- [ ] **步骤 3：验证编译**

```bash
cd frontend
pnpm build
```

预期：编译成功

- [ ] **步骤 4：Commit**

```bash
cd ..
git add frontend/src/store/ frontend/src/hooks/
git commit -m "feat(frontend): add auth state management with Zustand"
```

---

## 任务 6：实现登录和注册页面

**文件：**
- 创建：`frontend/src/pages/Login.tsx`
- 创建：`frontend/src/pages/Register.tsx`

---

- [ ] **步骤 1：创建登录页面**

创建文件 `frontend/src/pages/Login.tsx`：

```typescript
import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-pink-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            欢迎回来
          </CardTitle>
          <CardDescription className="text-center">
            登录小窝牛个人管理平台
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? '登录中...' : '登录'}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              还没有账号？{' '}
              <Link to="/register" className="text-primary hover:underline">
                立即注册
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **步骤 2：创建注册页面**

创建文件 `frontend/src/pages/Register.tsx`：

```typescript
import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-pink-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            创建账号
          </CardTitle>
          <CardDescription className="text-center">
            加入小窝牛个人管理平台
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
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
              />
            </div>
            <div className="space-y-2">
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
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? '注册中...' : '注册'}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              已有账号？{' '}
              <Link to="/login" className="text-primary hover:underline">
                立即登录
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **步骤 3：验证编译**

```bash
cd frontend
pnpm build
```

预期：编译成功

- [ ] **步骤 4：Commit**

```bash
cd ..
git add frontend/src/pages/
git commit -m "feat(frontend): add login and register pages"
```

---

## 任务 7：配置路由和受保护路由

**文件：**
- 创建：`frontend/src/routes/ProtectedRoute.tsx`
- 创建：`frontend/src/routes/index.tsx`
- 创建：`frontend/src/pages/Dashboard.tsx`

---

- [ ] **步骤 1：创建受保护路由组件**

创建文件 `frontend/src/routes/ProtectedRoute.tsx`：

```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
```

- [ ] **步骤 2：创建路由配置**

创建文件 `frontend/src/routes/index.tsx`：

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import ProtectedRoute from './ProtectedRoute'

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
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **步骤 3：创建 Dashboard 页面**

创建文件 `frontend/src/pages/Dashboard.tsx`：

```typescript
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">瘦瘦瘦</CardTitle>
              <CardDescription>健身打卡与体重管理</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">即将上线...</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">学学学</CardTitle>
              <CardDescription>考试倒计时与学习进度</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">即将上线...</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">省省省</CardTitle>
              <CardDescription>财务记录与预算管理</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">即将上线...</p>
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
```

- [ ] **步骤 4：验证编译**

```bash
cd frontend
pnpm build
```

预期：编译成功

- [ ] **步骤 5：Commit**

```bash
cd ..
git add frontend/src/routes/ frontend/src/pages/Dashboard.tsx
git commit -m "feat(frontend): add routing and protected routes"
```

---

## 任务 8：创建应用入口和启动配置

**文件：**
- 创建：`frontend/src/main.tsx`
- 创建：`frontend/src/App.tsx`
- 创建：`frontend/src/vite-env.d.ts`
- 创建：`frontend/.env`

---

- [ ] **步骤 1：创建 Vite 类型声明**

创建文件 `frontend/src/vite-env.d.ts`：

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **步骤 2：创建 App 组件**

创建文件 `frontend/src/App.tsx`：

```typescript
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
```

- [ ] **步骤 3：创建应用入口**

创建文件 `frontend/src/main.tsx`：

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **步骤 4：创建环境变量文件**

创建文件 `frontend/.env`：

```env
VITE_API_URL=http://localhost:3000
```

- [ ] **步骤 5：验证编译**

```bash
cd frontend
pnpm build
```

预期：编译成功，生成 dist 目录

- [ ] **步骤 6：Commit**

```bash
cd ..
git add frontend/src/main.tsx frontend/src/App.tsx frontend/src/vite-env.d.ts
git commit -m "feat(frontend): add app entry and configuration"
```

---

## 任务 9：测试和文档

**文件：**
- 创建：`frontend/README.md`
- 创建：`frontend/.env` (如果还没创建)

---

- [ ] **步骤 1：启动后端服务器**

```bash
cd backend
pnpm dev
```

在另一个终端窗口继续

- [ ] **步骤 2：启动前端开发服务器**

```bash
cd frontend
pnpm dev
```

预期：服务器在 http://localhost:5173 启动

- [ ] **步骤 3：测试注册流程**

1. 打开浏览器访问 http://localhost:5173
2. 应该自动跳转到 /login
3. 点击"立即注册"链接
4. 填写注册表单：
   - 用户名：testuser2
   - 邮箱：test2@example.com
   - 密码：password123
   - 昵称：测试用户2
5. 点击"注册"按钮
6. 应该成功注册并跳转到 /dashboard

- [ ] **步骤 4：测试登出和登录流程**

1. 在 Dashboard 点击"登出"按钮
2. 应该跳转回 /login
3. 填写登录表单：
   - 邮箱：test2@example.com
   - 密码：password123
4. 点击"登录"按钮
5. 应该成功登录并跳转到 /dashboard
6. 验证用户信息显示正确

- [ ] **步骤 5：测试受保护路由**

1. 登出状态下，尝试直接访问 http://localhost:5173/dashboard
2. 应该自动重定向到 /login
3. 登录后，应该能正常访问 /dashboard

- [ ] **步骤 6：测试错误处理**

1. 尝试用错误的密码登录
2. 应该显示错误提示："邮箱或密码错误"
3. 尝试注册已存在的邮箱
4. 应该显示错误提示："用户名或邮箱已存在"

- [ ] **步骤 7：创建 README 文档**

创建文件 `frontend/README.md`：

```markdown
# @xiaowoniu/frontend

小窝牛平台的前端应用。

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **UI 组件**: Shadcn/ui + Radix UI
- **样式**: Tailwind CSS 3
- **状态管理**: Zustand
- **路由**: React Router v6
- **HTTP 客户端**: Axios
- **图标**: Lucide React

## 开发环境要求

- Node.js >= 20.0.0
- pnpm >= 8.0.0

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

### 3. 启动开发服务器

```bash
pnpm dev
```

应用将在 `http://localhost:5173` 启动。

## 可用脚本

- `pnpm dev` - 启动开发服务器
- `pnpm build` - 构建生产版本
- `pnpm preview` - 预览生产构建
- `pnpm lint` - 运行 ESLint

## 项目结构

```
src/
├── components/      # React 组件
│   └── ui/         # Shadcn UI 组件
├── pages/          # 页面组件
├── routes/         # 路由配置
├── services/       # API 服务
├── store/          # Zustand 状态管理
├── hooks/          # 自定义 Hooks
├── lib/            # 工具库
├── types/          # TypeScript 类型
├── App.tsx         # 根组件
├── main.tsx        # 应用入口
└── index.css       # 全局样式
```

## 功能特性

### 已完成
- ✅ 用户注册
- ✅ 用户登录
- ✅ JWT 认证
- ✅ 受保护路由
- ✅ 响应式设计
- ✅ 错误处理

### 待开发
- ⏳ 瘦瘦瘦模块
- ⏳ 学学学模块
- ⏳ 省省省模块
- ⏳ 嫁嫁嫁模块

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_URL` | 后端 API 地址 | `http://localhost:3000` |

## 测试账号

- 邮箱：test@example.com
- 密码：password123
```

- [ ] **步骤 8：停止开发服务器**

在两个终端窗口中按 Ctrl+C 停止服务器

- [ ] **步骤 9：Commit**

```bash
git add frontend/README.md
git commit -m "docs(frontend): add frontend documentation"
```

- [ ] **步骤 10：创建 Phase 3 标签**

```bash
git tag -a v0.3.0-phase3 -m "Phase 3: Frontend infrastructure and authentication completed"
```

---

## 验收标准

Phase 3 完成后，应满足以下条件：

### ✅ 结构完整
- frontend 目录配置正确
- Vite + React + TypeScript 配置完成
- Tailwind CSS 和 Shadcn/ui 配置完成
- 所有必要的 UI 组件已创建

### ✅ 功能实现
- 用户注册功能正常
- 用户登录功能正常
- JWT Token 自动添加到请求头
- 登出功能正常
- 受保护路由工作正常
- 未认证用户自动重定向到登录页

### ✅ 用户体验
- 表单验证正确
- 错误信息显示清晰
- 加载状态显示正常
- 页面响应式设计
- UI 美观且一致

### ✅ 开发体验
- `pnpm dev` 启动开发服务器
- `pnpm build` 编译成功
- 热重载工作正常
- 类型检查无错误

### ✅ 文档完整
- frontend README 说明清晰
- 环境变量配置说明
- 项目结构文档

### ✅ Git 管理
- 所有变更已提交
- commit 信息规范
- 创建了 v0.3.0-phase3 标签

---

## 注意事项

### 类型共享
- 前端使用 `@xiaowoniu/shared` 包中的类型
- 确保 shared 包已编译：`cd shared && pnpm build`

### API 代理
- 开发环境使用 Vite 代理转发 `/api` 请求到后端
- 生产环境需要配置 Nginx 反向代理

### Token 存储
- JWT Token 存储在 localStorage
- 用户信息同时存储在 localStorage 和 Zustand Store
- 页面刷新后自动恢复认证状态

### 错误处理
- Axios 拦截器自动处理 401 错误并跳转登录
- 表单验证错误显示在表单上方
- API 错误通过 Zustand Store 传递到组件

---

**Phase 3 计划完成。**
