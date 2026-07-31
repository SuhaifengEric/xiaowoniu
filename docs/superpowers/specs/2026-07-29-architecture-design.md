# 小窝牛平台 - 架构设计文档

> **文档版本**: v1.0  
> **创建时间**: 2026-07-29  
> **架构类型**: Monorepo + 三层架构 + 共享类型

---

## 目录

1. [整体架构概览](#1-整体架构概览)
2. [项目目录结构](#2-项目目录结构)
3. [模块划分](#3-模块划分)
4. [数据流设计](#4-数据流设计)
5. [API 架构](#5-api-架构)
6. [状态管理方案](#6-状态管理方案)
7. [错误处理策略](#7-错误处理策略)
8. [类型共享方案](#8-类型共享方案)

---

## 1. 整体架构概览

### 1.1 架构模式

**Monorepo 架构 + 三层分离**

```
┌─────────────────────────────────────────────────┐
│                  Client Layer                    │
│         React 18 + TypeScript + Vite            │
│   (Shadcn UI + Tailwind + Framer Motion)       │
└───────────────────┬─────────────────────────────┘
                    │ REST API (HTTPS)
                    │ JSON Request/Response
┌───────────────────┴─────────────────────────────┐
│               Server Layer                       │
│    Express + TypeScript + JWT Middleware        │
│  ┌──────────────────────────────────────────┐  │
│  │  Controller → Service → Prisma Client    │  │
│  └──────────────────────────────────────────┘  │
└───────────────────┬─────────────────────────────┘
                    │ Prisma ORM
┌───────────────────┴─────────────────────────────┐
│              Data Layer                          │
│            PostgreSQL 15+                        │
│   (用户、健身、学习、财务、备婚数据)              │
└─────────────────────────────────────────────────┘

         ┌──────────────────────┐
         │   Shared Types       │  ← 前后端共用
         │  (TypeScript Types)  │
         └──────────────────────┘
```

### 1.2 技术栈汇总

| 层级 | 技术选型 | 说明 |
|-----|---------|------|
| **前端框架** | React 18 + TypeScript | 类型安全的现代化前端 |
| **UI 组件** | Shadcn/ui + Radix UI | 高度可定制的组件系统 |
| **样式方案** | Tailwind CSS | 粉蓝主题定制 |
| **动画库** | Framer Motion | 流畅的页面过渡 |
| **图标库** | Hugeicons (Stroke Rounded) | 免费圆润线性图标 |
| **状态管理** | Zustand + React Query | 轻量级状态 + 服务端状态 |
| **路由** | React Router v6 | 声明式路由 |
| **图表** | ECharts | 丰富的数据可视化 |
| **构建工具** | Vite | 快速开发体验 |
| **后端框架** | Express + TypeScript | 成熟稳定的 Node.js 框架 |
| **ORM** | Prisma | 类型安全的数据库操作 |
| **认证** | JWT + bcrypt | Token 认证 + 密码加密 |
| **校验** | Zod | Schema 验证 |
| **日志** | Winston | 结构化日志 |
| **数据库** | PostgreSQL 15+ | 关系型数据库 |
| **容器化** | Docker + Docker Compose | 一键部署 |

---

## 2. 项目目录结构

### 2.1 根目录结构

```
xiaowoniu/
├── shared/              # 共享类型包
├── backend/             # 后端服务
├── frontend/            # 前端应用
├── docs/                # 项目文档
├── docker-compose.yml
├── .gitignore
├── README.md
└── package.json         # Workspace 根配置
```

### 2.2 Shared 共享包结构

```
shared/
├── src/
│   ├── types/                    # TypeScript 类型定义
│   │   ├── api/                  # API 请求/响应 DTO
│   │   │   ├── auth.ts           # 认证模块类型
│   │   │   │   # - LoginRequest, RegisterRequest
│   │   │   │   # - LoginResponse, UserResponse
│   │   │   ├── fitness.ts        # 瘦瘦瘦模块类型
│   │   │   │   # - FitnessCheckinDTO, WeightRecordDTO
│   │   │   │   # - FitnessStatsResponse
│   │   │   ├── learning.ts       # 学学学模块类型
│   │   │   │   # - ExamDTO, SubjectDTO, StudyCheckinDTO
│   │   │   ├── finance.ts        # 省省省模块类型
│   │   │   │   # - ExpenseDTO, SavingPlanDTO, BudgetDTO
│   │   │   └── wedding.ts        # 嫁嫁嫁模块类型
│   │   │       # - WeddingTaskDTO, WeddingExpenseDTO
│   │   ├── models/               # 业务实体类型（从 Prisma 转换）
│   │   │   ├── user.ts
│   │   │   ├── fitness.ts
│   │   │   ├── learning.ts
│   │   │   ├── finance.ts
│   │   │   └── wedding.ts
│   │   └── common.ts             # 通用类型
│   │       # - ApiResponse<T>
│   │       # - PaginatedResponse<T>
│   │       # - ApiError
│   │       # - DateRange
│   ├── constants/                # 常量与枚举
│   │   ├── enums.ts              # 枚举定义
│   │   │   # - ActivityType（运动类型）
│   │   │   # - TimeOfDay（时段）
│   │   │   # - ExpenseCategory（消费类别）
│   │   │   # - WeddingTaskStatus（任务状态）
│   │   └── config.ts             # 配置常量
│   │       # - API_BASE_URL
│   │       # - TOKEN_KEY
│   └── index.ts                  # 统一导出
├── package.json
└── tsconfig.json
```

**职责**：
- 定义前后端共享的 TypeScript 类型
- 导出枚举常量，保证前后端一致
- 避免类型重复定义和不同步问题

### 2.3 Backend 后端结构

```
backend/
├── src/
│   ├── controllers/              # 控制器层（HTTP 请求处理）
│   │   ├── auth.controller.ts    # 用户认证
│   │   │   # - register, login, logout, refreshToken, getMe
│   │   ├── fitness.controller.ts # 健身模块
│   │   │   # - getCheckins, createCheckin, getWeights
│   │   │   # - createWeight, getStats, getGoals, setGoal
│   │   ├── learning.controller.ts # 学习模块
│   │   │   # - getExams, createExam, getSubjects
│   │   │   # - createSubject, getCheckins, createCheckin
│   │   ├── finance.controller.ts  # 财务模块
│   │   │   # - getExpenses, createExpense, deleteExpense
│   │   │   # - getMonthlySummary, getSavingPlans
│   │   └── wedding.controller.ts  # 备婚模块
│   │       # - getTasks, createTask, updateTask
│   │       # - getExpenses, createExpense, getBudget
│   │
│   ├── services/                 # 业务逻辑层
│   │   ├── auth.service.ts       # 认证逻辑
│   │   │   # - 密码验证、Token 生成、用户注册
│   │   ├── fitness.service.ts    # 健身业务逻辑
│   │   │   # - 打卡统计、体重趋势计算、目标进度
│   │   ├── learning.service.ts   # 学习业务逻辑
│   │   │   # - 倒计时计算、进度统计、完成度分析
│   │   ├── finance.service.ts    # 财务业务逻辑
│   │   │   # - 月度汇总、分类统计、预算计算
│   │   └── wedding.service.ts    # 备婚业务逻辑
│   │       # - 任务排序、预算统计、时间线生成
│   │
│   ├── middlewares/              # 中间件
│   │   ├── auth.middleware.ts    # JWT 验证
│   │   │   # - verifyToken, attachUser
│   │   ├── error.middleware.ts   # 全局错误处理
│   │   │   # - errorHandler
│   │   ├── validator.middleware.ts # 请求验证（Zod）
│   │   │   # - validate(schema)
│   │   └── logger.middleware.ts  # 请求日志
│   │       # - requestLogger
│   │
│   ├── routes/                   # 路由定义
│   │   ├── index.ts              # 路由聚合器
│   │   ├── auth.routes.ts        # POST /api/auth/*
│   │   ├── fitness.routes.ts     # /api/fitness/*
│   │   ├── learning.routes.ts    # /api/learning/*
│   │   ├── finance.routes.ts     # /api/finance/*
│   │   └── wedding.routes.ts     # /api/wedding/*
│   │
│   ├── utils/                    # 工具函数
│   │   ├── jwt.ts                # JWT 工具
│   │   │   # - generateToken, verifyToken
│   │   ├── password.ts           # 密码加密
│   │   │   # - hashPassword, comparePassword
│   │   ├── logger.ts             # Winston 日志配置
│   │   └── response.ts           # 统一响应格式
│   │       # - success(data), error(message)
│   │
│   ├── config/                   # 配置文件
│   │   ├── database.ts           # Prisma 客户端实例
│   │   ├── jwt.ts                # JWT 密钥、过期时间
│   │   └── app.ts                # 服务器端口、CORS 配置
│   │
│   ├── types/                    # 后端专用类型
│   │   └── express.d.ts          # Express Request 扩展
│   │       # - 添加 user 属性到 Request
│   │
│   └── server.ts                 # 应用入口
│       # - Express app 初始化
│       # - 中间件挂载
│       # - 路由注册
│       # - 错误处理
│       # - 服务器启动
│
├── prisma/
│   ├── schema.prisma             # Prisma 数据模型定义
│   ├── migrations/               # 数据库迁移历史
│   └── seed.ts                   # 种子数据脚本
│
├── tests/                        # 测试文件
│   ├── unit/                     # 单元测试（Service 层）
│   └── integration/              # 集成测试（API 端到端）
│
├── package.json
├── tsconfig.json
└── .env.example                  # 环境变量模板
    # DATABASE_URL
    # JWT_SECRET
    # JWT_EXPIRES_IN
    # PORT
```

**架构特点**：
- **三层分离**：Controller → Service → Prisma，职责清晰
- **中间件链**：Logger → Auth → Validator → Controller
- **类型安全**：导入 `shared` 包类型，保证一致性

### 2.4 Frontend 前端结构

```
frontend/
├── public/
│   ├── icons/                    # Hugeicons 图标资源
│   └── favicon.ico
│
├── src/
│   ├── components/               # 组件库
│   │   ├── ui/                   # Shadcn UI 基础组件
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ... (按需添加)
│   │   │
│   │   ├── layout/               # 布局组件
│   │   │   ├── AppLayout.tsx     # 主布局容器
│   │   │   ├── Sidebar.tsx       # 桌面端侧边栏
│   │   │   ├── Header.tsx        # 顶部导航栏
│   │   │   └── MobileNav.tsx     # 移动端底部导航
│   │   │
│   │   ├── charts/               # 图表组件（ECharts 封装）
│   │   │   ├── LineChart.tsx     # 折线图（体重趋势）
│   │   │   ├── PieChart.tsx      # 饼图（消费分类）
│   │   │   ├── BarChart.tsx      # 柱状图（学习进度）
│   │   │   ├── RingChart.tsx     # 环形图（目标进度）
│   │   │   └── HeatmapChart.tsx  # 热力图（学习打卡）
│   │   │
│   │   └── common/               # 通用业务组件
│   │       ├── DatePicker.tsx    # 日期选择器
│   │       ├── Modal.tsx         # 模态框
│   │       ├── LoadingSpinner.tsx # 加载动画（粉蓝渐变）
│   │       ├── EmptyState.tsx    # 空状态提示
│   │       └── ConfirmDialog.tsx # 确认对话框
│   │
│   ├── pages/                    # 页面组件
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx     # 登录页
│   │   │   └── RegisterPage.tsx  # 注册页
│   │   │
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx # 首页 Dashboard
│   │   │       # - 四大模块卡片入口
│   │   │       # - 快捷操作面板
│   │   │
│   │   ├── fitness/              # 瘦瘦瘦模块
│   │   │   ├── FitnessPage.tsx   # 主页面
│   │   │   ├── CheckinForm.tsx   # 健身打卡表单
│   │   │   ├── WeightTracker.tsx # 体重记录组件
│   │   │   └── GoalSetting.tsx   # 目标设置
│   │   │
│   │   ├── learning/             # 学学学模块
│   │   │   ├── LearningPage.tsx  # 主页面
│   │   │   ├── ExamCountdown.tsx # 考试倒计时卡片
│   │   │   ├── ProgressBoard.tsx # 三科目进度看板
│   │   │   └── StudyCheckin.tsx  # 学习打卡表单
│   │   │
│   │   ├── finance/              # 省省省模块
│   │   │   ├── FinancePage.tsx   # 主页面
│   │   │   ├── ExpenseForm.tsx   # 快速记账表单
│   │   │   ├── BudgetOverview.tsx # 预算概览
│   │   │   └── SavingPlan.tsx    # 存钱计划
│   │   │
│   │   ├── wedding/              # 嫁嫁嫁模块
│   │   │   ├── WeddingPage.tsx   # 主页面
│   │   │   ├── TaskBoard.tsx     # 任务看板（Kanban）
│   │   │   ├── Timeline.tsx      # 时间线视图
│   │   │   └── BudgetDashboard.tsx # 预算仪表盘
│   │   │
│   │   └── profile/
│   │       └── ProfilePage.tsx   # 个人设置页
│   │
│   ├── hooks/                    # 自定义 Hooks
│   │   ├── useAuth.ts            # 认证相关
│   │   │   # - login, logout, user, isAuthenticated
│   │   ├── useFitness.ts         # 健身数据获取
│   │   ├── useLearning.ts        # 学习数据获取
│   │   ├── useFinance.ts         # 财务数据获取
│   │   ├── useWedding.ts         # 备婚数据获取
│   │   ├── useResponsive.ts      # 响应式断点检测
│   │   └── useDebounce.ts        # 防抖 Hook
│   │
│   ├── services/                 # API 服务层
│   │   ├── api.ts                # Axios 实例配置
│   │   │   # - baseURL, interceptors (token 注入)
│   │   ├── auth.service.ts       # 认证 API
│   │   │   # - login(), register(), getMe()
│   │   ├── fitness.service.ts    # 健身 API
│   │   │   # - getCheckins(), createCheckin()
│   │   ├── learning.service.ts   # 学习 API
│   │   ├── finance.service.ts    # 财务 API
│   │   └── wedding.service.ts    # 备婚 API
│   │
│   ├── store/                    # Zustand 状态管理
│   │   ├── authStore.ts          # 认证状态
│   │   │   # - user, token, setUser, clearAuth
│   │   ├── fitnessStore.ts       # 健身临时状态
│   │   ├── learningStore.ts      # 学习临时状态
│   │   ├── financeStore.ts       # 财务临时状态
│   │   └── weddingStore.ts       # 备婚临时状态
│   │
│   ├── utils/                    # 工具函数
│   │   ├── format.ts             # 格式化工具
│   │   │   # - formatCurrency, formatDate, formatNumber
│   │   ├── date.ts               # 日期处理
│   │   │   # - getDaysUntil, formatRelativeTime
│   │   ├── storage.ts            # LocalStorage 封装
│   │   │   # - getItem, setItem, removeItem
│   │   └── validation.ts         # 表单验证规则
│   │
│   ├── styles/                   # 样式文件
│   │   ├── globals.css           # 全局样式（含 Tailwind）
│   │   │   # - @tailwind base/components/utilities
│   │   │   # - 粉蓝主题自定义类
│   │   └── variables.css         # CSS 变量（设计系统）
│   │       # - 粉蓝配色、圆角、间距、阴影
│   │
│   ├── types/                    # 前端专用类型
│   │   └── index.ts              # 组件 Props 类型等
│   │
│   ├── App.tsx                   # 根组件
│   │   # - 路由配置
│   │   # - 全局状态初始化
│   │   # - 主题提供者
│   │
│   ├── main.tsx                  # 应用入口
│   │   # - React 渲染
│   │   # - 样式导入
│   │
│   └── router.tsx                # 路由配置
│       # - React Router 路由表
│       # - 路由守卫（认证）
│
├── package.json
├── tsconfig.json
├── vite.config.ts                # Vite 配置
│   # - 路径别名 @/
│   # - 代理配置（开发环境）
├── tailwind.config.js            # Tailwind 配置
│   # - 粉蓝主题色
│   # - 自定义圆角、间距
└── .env.example                  # 环境变量模板
    # VITE_API_BASE_URL
```

**架构特点**：
- **组件化**：UI 组件、业务组件、页面组件分层
- **Hooks 封装**：数据获取逻辑抽离到自定义 Hooks
- **服务层**：统一的 API 调用封装
- **响应式**：Mobile-first 设计，支持多端适配

---

## 3. 模块划分

### 3.1 功能模块架构

项目采用**垂直切片架构**，按业务功能划分模块，每个模块包含完整的前后端实现。

```
┌─────────────────────────────────────────────────┐
│              认证模块 (Auth)                     │
│  用户注册、登录、Token 管理、权限控制             │
└─────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│  瘦瘦瘦模块   │  学学学模块   │  省省省模块   │  嫁嫁嫁模块   │
│  (Fitness)   │  (Learning)  │  (Finance)   │  (Wedding)   │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ 健身打卡     │ 考试倒计时    │ 消费记录     │ 备婚任务     │
│ 体重记录     │ 学习科目      │ 月度预算     │ 花费管理     │
│ 目标设置     │ 进度打卡      │ 存钱计划     │ 预算概览     │
│ 统计图表     │ 进度统计      │ 分类统计     │ 时间线       │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### 3.2 模块详细职责

#### 3.2.1 认证模块 (Auth)

**职责**：
- 用户注册、登录、登出
- JWT Token 生成与验证
- 密码加密与校验
- 用户信息管理

**前端组件**：
- `LoginPage` - 登录页
- `RegisterPage` - 注册页
- `useAuth` Hook - 认证状态管理

**后端 API**：
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 获取当前用户

**数据表**：
- `users` - 用户表

---

#### 3.2.2 瘦瘦瘦模块 (Fitness)

**职责**：
- 健身打卡记录（普拉提、爬坡机、其他）
- 体重记录（早晚两次）
- 健身目标设置与跟踪
- 统计图表（体重趋势、打卡完成率）

**前端组件**：
- `FitnessPage` - 模块主页
- `CheckinForm` - 打卡表单
- `WeightTracker` - 体重记录
- `GoalSetting` - 目标设置

**后端 API**：
- `GET /api/fitness/checkins` - 获取打卡列表
- `POST /api/fitness/checkins` - 创建打卡
- `GET /api/fitness/weights` - 获取体重记录
- `POST /api/fitness/weights` - 记录体重
- `GET /api/fitness/stats` - 获取统计数据
- `GET /api/fitness/goals` - 获取目标
- `POST /api/fitness/goals` - 设置目标

**数据表**：
- `fitness_checkins` - 健身打卡表
- `weight_records` - 体重记录表
- `fitness_goals` - 健身目标表

---

#### 3.2.3 学学学模块 (Learning)

**职责**：
- 考试倒计时管理
- 三科目学习进度跟踪
- 学习打卡（章节完成、学习时长）
- 进度统计与可视化

**前端组件**：
- `LearningPage` - 模块主页
- `ExamCountdown` - 考试倒计时卡片
- `ProgressBoard` - 三科目进度看板
- `StudyCheckin` - 学习打卡表单

**后端 API**：
- `GET /api/learning/exams` - 获取考试列表
- `POST /api/learning/exams` - 创建考试倒计时
- `GET /api/learning/subjects` - 获取科目列表
- `POST /api/learning/subjects` - 创建学习科目
- `GET /api/learning/checkins` - 获取学习打卡
- `POST /api/learning/checkins` - 学习进度打卡
- `GET /api/learning/progress` - 获取学习进度统计

**数据表**：
- `exam_countdowns` - 考试倒计时表
- `study_subjects` - 学习科目表
- `study_checkins` - 学习打卡表

---

#### 3.2.4 省省省模块 (Finance)

**职责**：
- 消费记录管理
- 月度预算设置与跟踪
- 存钱计划管理
- 分类统计与趋势分析

**前端组件**：
- `FinancePage` - 模块主页
- `ExpenseForm` - 快速记账表单
- `BudgetOverview` - 预算概览
- `SavingPlan` - 存钱计划

**后端 API**：
- `GET /api/finance/expenses` - 获取消费记录
- `POST /api/finance/expenses` - 添加消费记录
- `DELETE /api/finance/expenses/:id` - 删除消费记录
- `GET /api/finance/monthly-summary` - 月度汇总
- `GET /api/finance/saving-plans` - 获取存钱计划
- `POST /api/finance/saving-plans` - 创建存钱计划
- `PUT /api/finance/saving-plans/:id` - 更新存钱进度
- `GET /api/finance/budgets` - 获取预算

**数据表**：
- `expenses` - 消费记录表
- `saving_plans` - 存钱计划表
- `monthly_budgets` - 月度预算表

---

#### 3.2.5 嫁嫁嫁模块 (Wedding)

**职责**：
- 备婚任务管理（Kanban 看板）
- 备婚花费记录
- 预算管理与统计
- 时间线可视化

**前端组件**：
- `WeddingPage` - 模块主页
- `TaskBoard` - 任务看板（待办/进行中/已完成）
- `Timeline` - 时间线视图
- `BudgetDashboard` - 预算仪表盘

**后端 API**：
- `GET /api/wedding/tasks` - 获取备婚任务列表
- `POST /api/wedding/tasks` - 创建备婚任务
- `PUT /api/wedding/tasks/:id` - 更新任务状态
- `GET /api/wedding/expenses` - 获取备婚花费
- `POST /api/wedding/expenses` - 添加花费记录
- `GET /api/wedding/budget` - 获取预算概览
- `GET /api/wedding/timeline` - 获取时间线

**数据表**：
- `wedding_tasks` - 备婚任务表
- `wedding_expenses` - 备婚花费表
- `wedding_budget` - 备婚预算表

---

### 3.3 模块间依赖关系

```
认证模块 (Auth)
    ↓ (提供用户身份)
    ├─→ 瘦瘦瘦模块
    ├─→ 学学学模块
    ├─→ 省省省模块
    └─→ 嫁嫁嫁模块

注：四大业务模块相互独立，仅依赖认证模块
```

**设计原则**：
- 低耦合：业务模块之间无直接依赖
- 高内聚：每个模块包含完整的 CRUD 功能
- 易扩展：新增模块不影响现有模块

---

## 4. 数据流设计

### 4.1 整体数据流向

```
┌──────────────────────────────────────────────────────────┐
│                     Frontend                              │
│                                                           │
│  User Action → Component → Hook → Service → API Call    │
│                                      ↓                    │
│                                  Zustand Store            │
│                                      ↓                    │
│                              UI Update (React)            │
└───────────────────┬──────────────────────────────────────┘
                    │ HTTPS Request (JSON)
                    │ Authorization: Bearer <token>
┌───────────────────┴──────────────────────────────────────┐
│                     Backend                               │
│                                                           │
│  Middleware Chain:                                        │
│  1. Logger → 2. Auth → 3. Validator → 4. Controller     │
│                                          ↓                │
│                                      Service              │
│                                          ↓                │
│                                    Prisma Client          │
└───────────────────┬──────────────────────────────────────┘
                    │ SQL Query
┌───────────────────┴──────────────────────────────────────┐
│                   PostgreSQL                              │
│                                                           │
│  Users | Fitness | Learning | Finance | Wedding          │
└──────────────────────────────────────────────────────────┘
```

### 4.2 典型请求流程示例

#### 4.2.1 用户登录流程

```
Frontend:
1. 用户输入 → LoginPage
2. 表单提交 → authService.login(credentials)
3. API 调用 → POST /api/auth/login
   
Backend:
4. Logger 中间件 → 记录请求
5. Validator 中间件 → 验证 email/password 格式
6. AuthController.login() → 调用 AuthService
7. AuthService.login() → 
   - 查询用户（Prisma）
   - 验证密码（bcrypt）
   - 生成 Token（JWT）
8. 返回响应 → { token, user }

Frontend:
9. authStore.setAuth(token, user) → 保存到 Zustand + LocalStorage
10. 路由跳转 → /dashboard
```

#### 4.2.2 创建健身打卡流程

```
Frontend:
1. 用户填写表单 → CheckinForm
2. 提交 → fitnessService.createCheckin(data)
3. API 调用 → POST /api/fitness/checkins
   Headers: { Authorization: Bearer <token> }
   Body: { date, activity_type, duration_minutes, notes }

Backend:
4. Logger 中间件 → 记录请求
5. Auth 中间件 → 验证 JWT，提取 user_id
6. Validator 中间件 → 验证请求体（Zod schema）
7. FitnessController.createCheckin() → 调用 FitnessService
8. FitnessService.createCheckin() →
   - 插入数据（Prisma）
   - 计算本周打卡次数
9. 返回响应 → { checkin, weeklyStats }

Frontend:
10. useFitness Hook → 更新本地状态
11. UI 重新渲染 → 显示新打卡记录 + 更新统计
```

### 4.3 状态管理策略

#### 4.3.1 服务端状态（React Query）

用于管理从 API 获取的数据，具备缓存、自动重新获取等特性。

**使用场景**：
- 列表数据（打卡记录、消费记录等）
- 统计数据（图表数据）
- 用户资料

**示例**：
```typescript
// 使用 React Query 获取健身打卡列表
const { data: checkins, isLoading } = useQuery({
  queryKey: ['fitness', 'checkins', dateRange],
  queryFn: () => fitnessService.getCheckins(dateRange),
  staleTime: 5 * 60 * 1000, // 5分钟内数据新鲜
})
```

#### 4.3.2 客户端状态（Zustand）

用于管理本地 UI 状态和全局状态。

**使用场景**：
- 用户认证状态（token、user）
- UI 临时状态（模态框打开/关闭、侧边栏展开/折叠）
- 表单草稿状态

**示例**：
```typescript
// authStore.ts
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setAuth: (token, user) => set({ token, user }),
  clearAuth: () => set({ token: null, user: null }),
}))
```

### 4.4 数据缓存策略

| 数据类型 | 缓存位置 | 缓存时长 | 说明 |
|---------|---------|---------|------|
| **用户 Token** | LocalStorage | 7天 | 持久化登录状态 |
| **用户信息** | Zustand | 会话期间 | 内存存储 |
| **打卡列表** | React Query | 5分钟 | 避免频繁请求 |
| **统计数据** | React Query | 10分钟 | 计算密集型数据 |
| **表单草稿** | SessionStorage | 会话期间 | 防止意外丢失 |

### 4.5 实时性要求

| 模块 | 实时性 | 策略 |
|-----|-------|------|
| **瘦瘦瘦** | 中 | 打卡后立即刷新统计 |
| **学学学** | 中 | 倒计时每分钟更新 |
| **省省省** | 高 | 记账后立即更新月度汇总 |
| **嫁嫁嫁** | 中 | 任务状态变更后刷新看板 |

**刷新策略**：
- 用户操作后（Create/Update/Delete）立即 `invalidateQueries`
- 页面获得焦点时自动重新获取（`refetchOnWindowFocus`）
- 定时轮询不必要（避免服务器压力）

---

## 5. API 架构

### 5.1 RESTful API 设计规范

#### 5.1.1 URL 命名规范

```
基础路径: /api/v1/

资源命名: 
- 使用复数名词: /users, /checkins, /expenses
- 嵌套资源: /fitness/checkins, /learning/subjects
- 动作使用 HTTP 方法，而非 URL 路径
```

#### 5.1.2 HTTP 方法语义

| 方法 | 语义 | 幂等性 | 示例 |
|-----|------|-------|------|
| **GET** | 获取资源 | ✅ | `GET /api/fitness/checkins` |
| **POST** | 创建资源 | ❌ | `POST /api/fitness/checkins` |
| **PUT** | 完整更新资源 | ✅ | `PUT /api/fitness/goals/123` |
| **PATCH** | 部分更新资源 | ✅ | `PATCH /api/wedding/tasks/123` |
| **DELETE** | 删除资源 | ✅ | `DELETE /api/finance/expenses/123` |

#### 5.1.3 统一响应格式

**成功响应**：
```typescript
{
  "success": true,
  "data": T,           // 实际数据
  "message": string    // 可选的提示信息
}
```

**错误响应**：
```typescript
{
  "success": false,
  "error": {
    "code": string,       // 错误码 (e.g., "UNAUTHORIZED")
    "message": string,    // 用户友好的错误信息
    "details": any        // 可选的详细信息（验证错误等）
  }
}
```

**分页响应**：
```typescript
{
  "success": true,
  "data": T[],
  "pagination": {
    "page": number,
    "pageSize": number,
    "total": number,
    "totalPages": number
  }
}
```

### 5.2 API 端点总览

#### 5.2.1 认证模块 API

| 方法 | 路径 | 说明 | 认证 |
|-----|------|------|------|
| POST | `/api/auth/register` | 用户注册 | ❌ |
| POST | `/api/auth/login` | 用户登录 | ❌ |
| POST | `/api/auth/logout` | 用户登出 | ✅ |
| POST | `/api/auth/refresh` | 刷新 Token | ✅ |
| GET | `/api/auth/me` | 获取当前用户信息 | ✅ |

#### 5.2.2 瘦瘦瘦模块 API

| 方法 | 路径 | 说明 | 认证 |
|-----|------|------|------|
| GET | `/api/fitness/checkins` | 获取健身打卡列表 | ✅ |
| POST | `/api/fitness/checkins` | 创建健身打卡 | ✅ |
| GET | `/api/fitness/weights` | 获取体重记录 | ✅ |
| POST | `/api/fitness/weights` | 记录体重 | ✅ |
| GET | `/api/fitness/stats` | 获取统计数据 | ✅ |
| GET | `/api/fitness/goals` | 获取健身目标 | ✅ |
| POST | `/api/fitness/goals` | 设置健身目标 | ✅ |
| PUT | `/api/fitness/goals/:id` | 更新健身目标 | ✅ |

#### 5.2.3 学学学模块 API

| 方法 | 路径 | 说明 | 认证 |
|-----|------|------|------|
| GET | `/api/learning/exams` | 获取考试列表 | ✅ |
| POST | `/api/learning/exams` | 创建考试倒计时 | ✅ |
| PUT | `/api/learning/exams/:id` | 更新考试信息 | ✅ |
| DELETE | `/api/learning/exams/:id` | 删除考试 | ✅ |
| GET | `/api/learning/subjects` | 获取科目列表 | ✅ |
| POST | `/api/learning/subjects` | 创建学习科目 | ✅ |
| PUT | `/api/learning/subjects/:id` | 更新科目进度 | ✅ |
| GET | `/api/learning/checkins` | 获取学习打卡 | ✅ |
| POST | `/api/learning/checkins` | 学习进度打卡 | ✅ |
| GET | `/api/learning/progress` | 获取学习进度统计 | ✅ |

#### 5.2.4 省省省模块 API

| 方法 | 路径 | 说明 | 认证 |
|-----|------|------|------|
| GET | `/api/finance/expenses` | 获取消费记录 | ✅ |
| POST | `/api/finance/expenses` | 添加消费记录 | ✅ |
| PUT | `/api/finance/expenses/:id` | 更新消费记录 | ✅ |
| DELETE | `/api/finance/expenses/:id` | 删除消费记录 | ✅ |
| GET | `/api/finance/monthly-summary` | 月度汇总 | ✅ |
| GET | `/api/finance/saving-plans` | 获取存钱计划 | ✅ |
| POST | `/api/finance/saving-plans` | 创建存钱计划 | ✅ |
| PUT | `/api/finance/saving-plans/:id` | 更新存钱进度 | ✅ |
| GET | `/api/finance/budgets` | 获取预算 | ✅ |
| PUT | `/api/finance/budgets/:id` | 更新预算 | ✅ |

#### 5.2.5 嫁嫁嫁模块 API

| 方法 | 路径 | 说明 | 认证 |
|-----|------|------|------|
| GET | `/api/wedding/tasks` | 获取备婚任务列表 | ✅ |
| POST | `/api/wedding/tasks` | 创建备婚任务 | ✅ |
| PUT | `/api/wedding/tasks/:id` | 更新任务状态 | ✅ |
| DELETE | `/api/wedding/tasks/:id` | 删除任务 | ✅ |
| GET | `/api/wedding/expenses` | 获取备婚花费 | ✅ |
| POST | `/api/wedding/expenses` | 添加花费记录 | ✅ |
| PUT | `/api/wedding/expenses/:id` | 更新花费 | ✅ |
| GET | `/api/wedding/budget` | 获取预算概览 | ✅ |
| PUT | `/api/wedding/budget` | 更新预算 | ✅ |
| GET | `/api/wedding/timeline` | 获取时间线 | ✅ |

### 5.3 认证与授权

#### 5.3.1 JWT Token 机制

**Token 结构**：
```typescript
{
  "userId": string,    // 用户 ID
  "email": string,     // 用户邮箱
  "iat": number,       // 签发时间
  "exp": number        // 过期时间
}
```

**Token 传递**：
```http
GET /api/fitness/checkins
Authorization: Bearer <jwt_token>
```

**Token 过期处理**：
- Access Token 有效期：7天
- 过期后前端跳转到登录页
- 可选：Refresh Token 机制（后期优化）

#### 5.3.2 权限控制

当前阶段：**用户级隔离**
- 所有 API 需要认证（除登录/注册）
- 用户只能访问自己的数据
- 通过 `req.user.id` 过滤数据

**实现方式**：
```typescript
// Auth 中间件注入 user
app.use('/api', authMiddleware)

// Service 层自动过滤
fitnessService.getCheckins(userId, filters)
```

### 5.4 请求验证

使用 **Zod** 进行请求体验证。

**示例**：
```typescript
// 健身打卡验证 Schema
const createCheckinSchema = z.object({
  date: z.string().datetime(),
  activity_type: z.enum(['pilates', 'gym_slope', 'other']),
  duration_minutes: z.number().int().min(1).max(300),
  notes: z.string().max(500).optional(),
})

// 中间件应用
router.post(
  '/checkins',
  validate(createCheckinSchema),
  fitnessController.createCheckin
)
```

### 5.5 错误码规范

| 错误码 | HTTP 状态码 | 说明 |
|-------|-----------|------|
| `UNAUTHORIZED` | 401 | 未认证或 Token 无效 |
| `FORBIDDEN` | 403 | 无权限访问 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `CONFLICT` | 409 | 资源冲突（如重复记录） |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

### 5.6 API 版本控制

**当前版本**: v1（隐式，路径为 `/api/*`）

**未来扩展**: 
- 如需破坏性变更，引入 `/api/v2/*`
- 保持 v1 向后兼容至少 6 个月

### 5.7 CORS 配置

**开发环境**：
```typescript
cors({
  origin: 'http://localhost:5173', // Vite 默认端口
  credentials: true,
})
```

**生产环境**：
```typescript
cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
})
```

---

## 6. 状态管理方案

### 6.1 状态管理架构

采用 **Zustand + React Query** 双轨制状态管理：

```
┌─────────────────────────────────────────────────┐
│              Frontend State                      │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────┐    ┌──────────────────┐  │
│  │  Zustand Store   │    │  React Query     │  │
│  │  (客户端状态)     │    │  (服务端状态)     │  │
│  ├──────────────────┤    ├──────────────────┤  │
│  │ • 用户认证       │    │ • 打卡列表       │  │
│  │ • Token          │    │ • 统计数据       │  │
│  │ • UI 状态        │    │ • 图表数据       │  │
│  │ • 表单草稿       │    │ • 缓存管理       │  │
│  └──────────────────┘    └──────────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 6.2 Zustand Store 设计

#### 6.2.1 Auth Store（认证状态）

```typescript
// store/authStore.ts
interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  
  // Actions
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      setAuth: (token, user) => 
        set({ token, user, isAuthenticated: true }),
      
      clearAuth: () => 
        set({ token: null, user: null, isAuthenticated: false }),
      
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)
```

**存储位置**: LocalStorage（持久化）

---

#### 6.2.2 UI Store（界面状态）

```typescript
// store/uiStore.ts
interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  
  // Actions
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  
  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setTheme: (theme) => set({ theme }),
}))
```

**存储位置**: 内存（会话期间）

---

#### 6.2.3 表单草稿 Store（可选）

```typescript
// store/draftStore.ts
interface DraftState {
  drafts: Record<string, any>
  
  // Actions
  saveDraft: (key: string, data: any) => void
  getDraft: (key: string) => any
  clearDraft: (key: string) => void
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      drafts: {},
      
      saveDraft: (key, data) =>
        set((state) => ({
          drafts: { ...state.drafts, [key]: data },
        })),
      
      getDraft: (key) => get().drafts[key],
      
      clearDraft: (key) =>
        set((state) => {
          const { [key]: _, ...rest } = state.drafts
          return { drafts: rest }
        }),
    }),
    {
      name: 'draft-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
```

**存储位置**: SessionStorage（会话期间）

### 6.3 React Query 配置

#### 6.3.1 全局配置

```typescript
// main.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5分钟内数据新鲜
      cacheTime: 10 * 60 * 1000,       // 10分钟缓存
      refetchOnWindowFocus: true,       // 窗口获焦时重新获取
      refetchOnReconnect: true,         // 重新连接时获取
      retry: 1,                         // 失败重试1次
    },
    mutations: {
      retry: 0,                         // 写操作不重试
    },
  },
})

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

#### 6.3.2 自定义 Hooks 示例

**健身模块 Hook**：
```typescript
// hooks/useFitness.ts
export function useFitnessCheckins(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['fitness', 'checkins', dateRange],
    queryFn: () => fitnessService.getCheckins(dateRange),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateCheckin() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: fitnessService.createCheckin,
    onSuccess: () => {
      // 创建成功后刷新列表
      queryClient.invalidateQueries({ queryKey: ['fitness', 'checkins'] })
      queryClient.invalidateQueries({ queryKey: ['fitness', 'stats'] })
    },
  })
}

export function useFitnessStats() {
  return useQuery({
    queryKey: ['fitness', 'stats'],
    queryFn: fitnessService.getStats,
    staleTime: 10 * 60 * 1000, // 统计数据缓存时间更长
  })
}
```

**学习模块 Hook**：
```typescript
// hooks/useLearning.ts
export function useExamCountdown() {
  return useQuery({
    queryKey: ['learning', 'exams'],
    queryFn: learningService.getExams,
    refetchInterval: 60 * 1000, // 每分钟刷新倒计时
  })
}

export function useStudyProgress() {
  return useQuery({
    queryKey: ['learning', 'progress'],
    queryFn: learningService.getProgress,
  })
}
```

### 6.4 状态同步策略

#### 6.4.1 乐观更新

对于用户体验敏感的操作，采用乐观更新：

```typescript
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: weddingService.updateTaskStatus,
    
    // 乐观更新
    onMutate: async (updatedTask) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: ['wedding', 'tasks'] })
      
      // 保存快照
      const previousTasks = queryClient.getQueryData(['wedding', 'tasks'])
      
      // 乐观更新
      queryClient.setQueryData(['wedding', 'tasks'], (old: Task[]) =>
        old.map((task) =>
          task.id === updatedTask.id ? { ...task, ...updatedTask } : task
        )
      )
      
      return { previousTasks }
    },
    
    // 失败回滚
    onError: (err, updatedTask, context) => {
      queryClient.setQueryData(['wedding', 'tasks'], context?.previousTasks)
    },
    
    // 成功后重新获取
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wedding', 'tasks'] })
    },
  })
}
```

#### 6.4.2 数据预取

在用户可能访问的页面提前预取数据：

```typescript
// DashboardPage.tsx - 预取各模块数据
function DashboardPage() {
  const queryClient = useQueryClient()
  
  useEffect(() => {
    // 预取健身统计
    queryClient.prefetchQuery({
      queryKey: ['fitness', 'stats'],
      queryFn: fitnessService.getStats,
    })
    
    // 预取学习进度
    queryClient.prefetchQuery({
      queryKey: ['learning', 'progress'],
      queryFn: learningService.getProgress,
    })
  }, [])
  
  return <Dashboard />
}
```

### 6.5 状态持久化总结

| 状态类型 | 管理工具 | 存储位置 | 持久化 |
|---------|---------|---------|--------|
| **用户认证** | Zustand | LocalStorage | ✅ |
| **Token** | Zustand | LocalStorage | ✅ |
| **UI 状态** | Zustand | 内存 | ❌ |
| **表单草稿** | Zustand | SessionStorage | ✅ |
| **列表数据** | React Query | 内存 | ❌ |
| **统计数据** | React Query | 内存 | ❌ |

### 6.6 状态调试

**开发环境工具**：
- React Query Devtools - 查看查询状态、缓存
- Zustand Devtools - 调试 Store 状态变更

```typescript
// 开发环境启用 Devtools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { devtools } from 'zustand/middleware'

// React Query Devtools
<QueryClientProvider client={queryClient}>
  <App />
  {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
</QueryClientProvider>

// Zustand Devtools
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(/* ... */),
    { name: 'AuthStore' }
  )
)
```

---

## 7. 错误处理策略

### 7.1 错误处理架构

```
Frontend Error          Backend Error          Database Error
    ↓                       ↓                       ↓
┌─────────┐          ┌──────────┐           ┌──────────┐
│ UI 层   │          │ Controller│           │ Service  │
│ 捕获显示 │  ←───── │   层捕获  │  ←─────── │   层捕获  │
└─────────┘          └──────────┘           └──────────┘
    ↓                       ↓                       ↓
用户友好提示          统一错误响应            日志记录
```

### 7.2 后端错误处理

#### 7.2.1 全局错误中间件

```typescript
// middlewares/error.middleware.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // 日志记录
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
  })
  
  // Prisma 错误处理
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: '记录已存在',
        details: err.meta,
      },
    })
  }
  
  // Zod 验证错误
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '请求参数验证失败',
        details: err.errors,
      },
    })
  }
  
  // 自定义 AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    })
  }
  
  // 未知错误
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? '服务器内部错误' 
        : err.message,
    },
  })
}
```

#### 7.2.2 Service 层错误抛出

```typescript
// services/fitness.service.ts
export class FitnessService {
  async createCheckin(userId: string, data: CreateCheckinDTO) {
    // 验证日期不能是未来
    if (new Date(data.date) > new Date()) {
      throw new AppError(400, 'INVALID_DATE', '不能为未来日期打卡')
    }
    
    // 检查是否已打卡
    const existing = await prisma.fitnessCheckin.findFirst({
      where: {
        userId,
        date: data.date,
        activityType: data.activityType,
      },
    })
    
    if (existing) {
      throw new AppError(409, 'ALREADY_CHECKED_IN', '今日该项目已打卡')
    }
    
    try {
      return await prisma.fitnessCheckin.create({
        data: { ...data, userId },
      })
    } catch (error) {
      logger.error('创建健身打卡失败', error)
      throw new AppError(500, 'DATABASE_ERROR', '创建打卡记录失败')
    }
  }
}
```

#### 7.2.3 认证错误处理

```typescript
// middlewares/auth.middleware.ts
export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      throw new AppError(401, 'UNAUTHORIZED', '未提供认证 Token')
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    req.user = decoded
    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token 已过期，请重新登录',
        },
      })
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token 无效',
        },
      })
    }
    
    next(error)
  }
}
```

### 7.3 前端错误处理

#### 7.3.1 Axios 拦截器

```typescript
// services/api.ts
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/components/ui/use-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
})

// 请求拦截器 - 注入 Token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const { response } = error
    
    // 网络错误
    if (!response) {
      toast({
        variant: 'destructive',
        title: '网络错误',
        description: '请检查网络连接',
      })
      return Promise.reject(error)
    }
    
    const { status, data } = response
    
    // Token 过期 - 跳转登录
    if (status === 401 && data.error?.code === 'TOKEN_EXPIRED') {
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
      toast({
        variant: 'destructive',
        title: '登录已过期',
        description: '请重新登录',
      })
      return Promise.reject(error)
    }
    
    // 权限不足
    if (status === 403) {
      toast({
        variant: 'destructive',
        title: '权限不足',
        description: data.error?.message || '无权访问该资源',
      })
      return Promise.reject(error)
    }
    
    // 验证错误
    if (status === 400 && data.error?.code === 'VALIDATION_ERROR') {
      toast({
        variant: 'destructive',
        title: '输入验证失败',
        description: data.error.message,
      })
      return Promise.reject(error)
    }
    
    // 业务错误
    if (status >= 400 && status < 500) {
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: data.error?.message || '请求失败',
      })
      return Promise.reject(error)
    }
    
    // 服务器错误
    if (status >= 500) {
      toast({
        variant: 'destructive',
        title: '服务器错误',
        description: '服务暂时不可用，请稍后重试',
      })
      return Promise.reject(error)
    }
    
    return Promise.reject(error)
  }
)

export default api
```

#### 7.3.2 React Query 错误处理

```typescript
// hooks/useFitness.ts
export function useCreateCheckin() {
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: fitnessService.createCheckin,
    onError: (error: AxiosError<ApiErrorResponse>) => {
      // 这里可以针对特定错误码做特殊处理
      const errorCode = error.response?.data?.error?.code
      
      if (errorCode === 'ALREADY_CHECKED_IN') {
        toast({
          variant: 'destructive',
          title: '重复打卡',
          description: '今日该项目已打卡，请勿重复提交',
        })
      }
      // 其他错误已由 Axios 拦截器处理
    },
    onSuccess: () => {
      toast({
        title: '打卡成功',
        description: '健身打卡已记录',
      })
    },
  })
}
```

#### 7.3.3 全局错误边界

```typescript
// components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    // 可选：上报到错误监控服务（Sentry 等）
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              哎呀，出错了
            </h1>
            <p className="text-gray-600 mb-6">
              {this.state.error?.message || '页面渲染失败'}
            </p>
            <Button
              onClick={() => window.location.href = '/'}
            >
              返回首页
            </Button>
          </div>
        </div>
      )
    }
    
    return this.props.children
  }
}
```

### 7.4 错误日志记录

#### 7.4.1 后端日志（Winston）

```typescript
// utils/logger.ts
import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // 错误日志文件
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    // 所有日志文件
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
})
```

#### 7.4.2 前端错误上报（可选）

```typescript
// utils/errorReporting.ts
export function reportError(error: Error, context?: Record<string, any>) {
  if (process.env.NODE_ENV === 'production') {
    // 上报到错误监控服务（Sentry、Bugsnag 等）
    // Sentry.captureException(error, { extra: context })
  } else {
    console.error('Error:', error, 'Context:', context)
  }
}
```

### 7.5 错误类型与处理策略总结

| 错误类型 | HTTP 状态码 | 前端处理 | 后端日志级别 |
|---------|-----------|---------|------------|
| **网络错误** | - | Toast 提示 | - |
| **Token 过期** | 401 | 跳转登录 | info |
| **权限不足** | 403 | Toast 提示 | warn |
| **参数验证** | 400 | Toast 提示 | info |
| **资源不存在** | 404 | Toast 提示 | info |
| **业务冲突** | 409 | Toast 提示 | info |
| **服务器错误** | 500 | Toast 提示 | error |
| **React 渲染错误** | - | ErrorBoundary | error |

### 7.6 用户友好的错误提示

**原则**：
- ✅ 使用用户能理解的语言（避免技术术语）
- ✅ 提供解决建议（"请检查网络连接"）
- ✅ 使用粉蓝主题的 Toast 组件
- ❌ 避免暴露技术细节给用户

**示例**：
```typescript
// ❌ 不好的提示
toast({ title: 'Error: ECONNREFUSED' })

// ✅ 好的提示
toast({
  variant: 'destructive',
  title: '网络连接失败',
  description: '请检查网络连接后重试',
})
```

---

## 8. 类型共享方案

### 8.1 类型共享架构

```
┌─────────────────────────────────────────────────┐
│              Shared Types Package                │
│                                                  │
│  ┌──────────────┐    ┌──────────────┐          │
│  │  API Types   │    │   Enums      │          │
│  │  (DTO)       │    │  (Constants) │          │
│  └──────────────┘    └──────────────┘          │
│                                                  │
└───────────┬─────────────────────┬───────────────┘
            │                     │
            ↓                     ↓
┌───────────────────┐   ┌───────────────────┐
│     Backend       │   │     Frontend      │
│                   │   │                   │
│  Import shared    │   │  Import shared    │
│  types for API    │   │  types for API    │
│  validation       │   │  calls & UI       │
└───────────────────┘   └───────────────────┘
            │                     
            ↓                     
┌───────────────────┐             
│  Prisma Schema    │             
│  (Database types) │             
└───────────────────┘             
```

### 8.2 Shared 包实现

#### 8.2.1 通用类型定义

```typescript
// shared/src/types/common.ts

/**
 * 统一 API 响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  message?: string
}

/**
 * API 错误格式
 */
export interface ApiError {
  code: string
  message: string
  details?: any
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

/**
 * 日期范围
 */
export interface DateRange {
  startDate: string // ISO 8601
  endDate: string   // ISO 8601
}

/**
 * 分页请求参数
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
}
```

#### 8.2.2 认证模块类型

```typescript
// shared/src/types/api/auth.ts

/**
 * 用户注册请求
 */
export interface RegisterRequest {
  username: string
  email: string
  password: string
  nickname?: string
}

/**
 * 用户登录请求
 */
export interface LoginRequest {
  email: string
  password: string
}

/**
 * 登录响应
 */
export interface LoginResponse {
  token: string
  user: UserResponse
}

/**
 * 用户信息响应
 */
export interface UserResponse {
  id: string
  username: string
  email: string
  nickname: string | null
  avatarUrl: string | null
  createdAt: string
}
```

#### 8.2.3 健身模块类型

```typescript
// shared/src/types/api/fitness.ts
import { ActivityType, TimeOfDay } from '../../constants/enums'

/**
 * 创建健身打卡请求
 */
export interface CreateFitnessCheckinRequest {
  date: string // YYYY-MM-DD
  activityType: ActivityType
  durationMinutes: number
  notes?: string
}

/**
 * 健身打卡响应
 */
export interface FitnessCheckinResponse {
  id: string
  userId: string
  date: string
  activityType: ActivityType
  durationMinutes: number
  notes: string | null
  createdAt: string
}

/**
 * 创建体重记录请求
 */
export interface CreateWeightRecordRequest {
  date: string // YYYY-MM-DD
  timeOfDay: TimeOfDay
  weightKg: number
  notes?: string
}

/**
 * 体重记录响应
 */
export interface WeightRecordResponse {
  id: string
  userId: string
  date: string
  timeOfDay: TimeOfDay
  weightKg: number
  notes: string | null
  createdAt: string
}

/**
 * 健身统计响应
 */
export interface FitnessStatsResponse {
  weeklyCheckins: number
  weeklyTarget: number
  completionRate: number
  totalWorkoutMinutes: number
  currentWeight: number | null
  weightChange: number | null // 与起始体重的差值
  recentCheckins: FitnessCheckinResponse[]
  weightTrend: Array<{
    date: string
    weight: number
  }>
}

/**
 * 健身目标
 */
export interface FitnessGoalResponse {
  id: string
  userId: string
  targetWeightKg: number
  weeklyWorkoutTarget: number
  startDate: string
  targetDate: string
  isActive: boolean
}
```

#### 8.2.4 枚举常量

```typescript
// shared/src/constants/enums.ts

/**
 * 运动类型
 */
export enum ActivityType {
  PILATES = 'pilates',
  GYM_SLOPE = 'gym_slope',
  OTHER = 'other',
}

/**
 * 时段（早晚）
 */
export enum TimeOfDay {
  MORNING = 'morning',
  EVENING = 'evening',
}

/**
 * 消费类别
 */
export enum ExpenseCategory {
  FOOD = 'food',
  TRANSPORT = 'transport',
  SHOPPING = 'shopping',
  ENTERTAINMENT = 'entertainment',
  HEALTH = 'health',
  OTHER = 'other',
}

/**
 * 支付方式
 */
export enum PaymentMethod {
  CASH = 'cash',
  ALIPAY = 'alipay',
  WECHAT = 'wechat',
  CARD = 'card',
  OTHER = 'other',
}

/**
 * 备婚任务类别
 */
export enum WeddingTaskCategory {
  VENUE = 'venue',
  PHOTO = 'photo',
  INVITATION = 'invitation',
  DRESS = 'dress',
  MAKEUP = 'makeup',
  HONEYMOON = 'honeymoon',
  OTHER = 'other',
}

/**
 * 任务状态
 */
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * 支付状态
 */
export enum PaidStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
}
```

#### 8.2.5 中文映射（常量）

```typescript
// shared/src/constants/labels.ts

export const ActivityTypeLabels: Record<ActivityType, string> = {
  [ActivityType.PILATES]: '普拉提',
  [ActivityType.GYM_SLOPE]: '爬坡机',
  [ActivityType.OTHER]: '其他运动',
}

export const ExpenseCategoryLabels: Record<ExpenseCategory, string> = {
  [ExpenseCategory.FOOD]: '餐饮',
  [ExpenseCategory.TRANSPORT]: '交通',
  [ExpenseCategory.SHOPPING]: '购物',
  [ExpenseCategory.ENTERTAINMENT]: '娱乐',
  [ExpenseCategory.HEALTH]: '健康',
  [ExpenseCategory.OTHER]: '其他',
}

export const TaskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: '待办',
  [TaskStatus.IN_PROGRESS]: '进行中',
  [TaskStatus.COMPLETED]: '已完成',
  [TaskStatus.CANCELLED]: '已取消',
}
```

### 8.3 使用示例

#### 8.3.1 后端使用

```typescript
// backend/src/controllers/fitness.controller.ts
import { CreateFitnessCheckinRequest, ApiResponse, FitnessCheckinResponse } from '@xiaowoniu/shared'
import { Request, Response } from 'express'

export class FitnessController {
  async createCheckin(
    req: Request<{}, {}, CreateFitnessCheckinRequest>, 
    res: Response<ApiResponse<FitnessCheckinResponse>>
  ) {
    const userId = req.user!.id
    const data = req.body
    
    const checkin = await fitnessService.createCheckin(userId, data)
    
    res.json({
      success: true,
      data: checkin,
      message: '打卡成功',
    })
  }
}
```

#### 8.3.2 前端使用

```typescript
// frontend/src/services/fitness.service.ts
import api from './api'
import type { 
  CreateFitnessCheckinRequest, 
  FitnessCheckinResponse,
  FitnessStatsResponse,
  ApiResponse 
} from '@xiaowoniu/shared'

export const fitnessService = {
  /**
   * 创建健身打卡
   */
  async createCheckin(data: CreateFitnessCheckinRequest): Promise<FitnessCheckinResponse> {
    const response = await api.post<ApiResponse<FitnessCheckinResponse>>(
      '/fitness/checkins',
      data
    )
    return response.data!
  },
  
  /**
   * 获取健身统计
   */
  async getStats(): Promise<FitnessStatsResponse> {
    const response = await api.get<ApiResponse<FitnessStatsResponse>>(
      '/fitness/stats'
    )
    return response.data!
  },
}
```

#### 8.3.3 前端组件使用

```typescript
// frontend/src/components/fitness/CheckinForm.tsx
import { CreateFitnessCheckinRequest, ActivityType } from '@xiaowoniu/shared'
import { useCreateCheckin } from '@/hooks/useFitness'

export function CheckinForm() {
  const createCheckin = useCreateCheckin()
  
  const handleSubmit = (data: CreateFitnessCheckinRequest) => {
    createCheckin.mutate(data)
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <Select name="activityType">
        <option value={ActivityType.PILATES}>普拉提</option>
        <option value={ActivityType.GYM_SLOPE}>爬坡机</option>
        <option value={ActivityType.OTHER}>其他</option>
      </Select>
      {/* ... */}
    </form>
  )
}
```

### 8.4 类型生成与同步

#### 8.4.1 Prisma 类型转换

Prisma 生成的类型主要在后端使用，需要转换为 DTO 类型提供给前端。

```typescript
// backend/src/services/fitness.service.ts
import { FitnessCheckin } from '@prisma/client'
import { FitnessCheckinResponse } from '@xiaowoniu/shared'

/**
 * 将 Prisma 模型转换为 API 响应类型
 */
function toCheckinResponse(checkin: FitnessCheckin): FitnessCheckinResponse {
  return {
    id: checkin.id,
    userId: checkin.userId,
    date: checkin.date.toISOString().split('T')[0],
    activityType: checkin.activityType as ActivityType,
    durationMinutes: checkin.durationMinutes,
    notes: checkin.notes,
    createdAt: checkin.createdAt.toISOString(),
  }
}
```

#### 8.4.2 Package.json 配置

```json
// 根目录 package.json（Workspace 配置）
{
  "name": "xiaowoniu",
  "private": true,
  "workspaces": [
    "shared",
    "backend",
    "frontend"
  ]
}

// shared/package.json
{
  "name": "@xiaowoniu/shared",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  }
}

// backend/package.json
{
  "dependencies": {
    "@xiaowoniu/shared": "workspace:*"
  }
}

// frontend/package.json
{
  "dependencies": {
    "@xiaowoniu/shared": "workspace:*"
  }
}
```

### 8.5 类型安全的优势

✅ **编译时检查**：前后端接口不匹配时立即报错  
✅ **IDE 自动补全**：提升开发效率  
✅ **重构安全**：修改类型后全局更新  
✅ **减少文档**：类型即文档  
✅ **避免运行时错误**：提前发现类型问题

### 8.6 类型更新流程

```
1. 修改 Prisma Schema
   ↓
2. 运行 prisma generate
   ↓
3. 更新 shared/src/types/ 中对应的 DTO 类型
   ↓
4. 运行 shared 的 build
   ↓
5. 前后端自动获得更新后的类型
   ↓
6. TypeScript 编译器报错提示不兼容的地方
   ↓
7. 修复报错，确保前后端一致
```

**注意事项**：
- Prisma 类型变更时，需要同步更新 shared 中的 DTO 类型
- 使用 Monorepo 工具（如 pnpm workspace）简化依赖管理
- 建议：在 CI/CD 中添加类型检查步骤

---

## 附录：图标资源

### Hugeicons 使用说明

**图标库**: [Hugeicons - Stroke Rounded](https://hugeicons.com/icons/stroke-rounded)  
**风格**: 圆润线性图标  
**许可**: 免费使用

**推荐图标**：
- 💪 瘦瘦瘦：`dumbbell-01`, `activity`, `heart-pulse`
- 📚 学学学：`book-open-01`, `graduation-cap`, `calendar-check-02`
- 💰 省省省：`wallet-03`, `coins-01`, `piggy-bank`
- 💒 嫁嫁嫁：`wedding-rings`, `heart`, `calendar-love-02`
- 🏠 首页：`home-04`
- 👤 个人：`user-circle`
- 📊 统计：`analytics-01`, `chart-line-01`

---

**文档版本**: v1.0  
**文档状态**: 完成  
**最后更新**: 2026-07-29  
**下一步**: 用户审查 → 实现计划编写
