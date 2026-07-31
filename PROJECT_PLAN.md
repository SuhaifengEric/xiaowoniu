# 小窝牛个人管理平台 - 项目设计方案

## 项目概述

一个面向个人生活管理的全栈Web平台，包含健身、学习、财务、备婚四大模块，支持多用户、移动端响应式设计。

## 技术栈选型

### 前端
- **框架**: React 18 + TypeScript
- **UI组件库**: Shadcn/ui + Radix UI (现代化、可定制)
- **UI备选方案**: MUI Joy UI (Material Design 3，更柔和美观)
- **状态管理**: Zustand / React Query
- **路由**: React Router v6
- **图表**: ECharts / Recharts
- **构建工具**: Vite
- **样式**: Tailwind CSS (定制粉蓝主题)
- **动画**: Framer Motion (流畅的页面过渡)
- **图标**: Hugeicons (Stroke Rounded 风格，免费)

### 后端
- **运行时**: Node.js 20+
- **框架**: Express + TypeScript
- **ORM**: Prisma
- **认证**: JWT + bcrypt
- **校验**: Zod
- **日志**: Winston
- **API文档**: Swagger/OpenAPI

### 数据库
- **主库**: PostgreSQL 15+
- **缓存**: Redis (可选，后期优化)

### 部署
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **进程管理**: PM2

## 系统架构

```
┌─────────────────────────────────────┐
│         前端 (React SPA)             │
│  - 响应式设计 (Mobile/Desktop)        │
│  - PWA支持 (可选)                    │
└──────────────┬──────────────────────┘
               │ HTTPS/REST API
┌──────────────┴──────────────────────┐
│       后端 (Express API)             │
│  - JWT认证中间件                     │
│  - 路由控制器                        │
│  - 业务逻辑层                        │
└──────────────┬──────────────────────┘
               │ Prisma ORM
┌──────────────┴──────────────────────┐
│       PostgreSQL 数据库              │
│  - 用户表                            │
│  - 四大模块数据表                     │
└─────────────────────────────────────┘
```

## 数据库设计

### 核心表结构

#### 用户表 (users)
```sql
id: UUID (PK)
username: VARCHAR(50) UNIQUE
email: VARCHAR(100) UNIQUE
password_hash: VARCHAR(255)
nickname: VARCHAR(50)
avatar_url: VARCHAR(500)
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

#### 模块1: 瘦瘦瘦 (fitness)

**健身打卡表 (fitness_checkins)**
```sql
id: UUID (PK)
user_id: UUID (FK)
date: DATE
activity_type: ENUM('pilates', 'gym_slope', 'other')
duration_minutes: INTEGER
notes: TEXT
created_at: TIMESTAMP
```

**体重记录表 (weight_records)**
```sql
id: UUID (PK)
user_id: UUID (FK)
date: DATE
time_of_day: ENUM('morning', 'evening')
weight_kg: DECIMAL(5,2)
notes: TEXT
created_at: TIMESTAMP
UNIQUE(user_id, date, time_of_day)
```

**健身目标表 (fitness_goals)**
```sql
id: UUID (PK)
user_id: UUID (FK)
target_weight_kg: DECIMAL(5,2)
weekly_workout_target: INTEGER
start_date: DATE
target_date: DATE
is_active: BOOLEAN
```

#### 模块2: 学学学 (learning)

**考试倒计时表 (exam_countdowns)**
```sql
id: UUID (PK)
user_id: UUID (FK)
exam_name: VARCHAR(100)
exam_date: DATE
is_active: BOOLEAN
```

**学习科目表 (study_subjects)**
```sql
id: UUID (PK)
user_id: UUID (FK)
exam_id: UUID (FK)
subject_name: VARCHAR(100)
total_chapters: INTEGER
current_chapter: INTEGER
target_completion_date: DATE
```

**学习打卡表 (study_checkins)**
```sql
id: UUID (PK)
user_id: UUID (FK)
subject_id: UUID (FK)
date: DATE
chapters_completed: TEXT[] (章节列表)
study_hours: DECIMAL(4,2)
notes: TEXT
progress_percentage: INTEGER
created_at: TIMESTAMP
```

#### 模块3: 省省省 (finance)

**消费记录表 (expenses)**
```sql
id: UUID (PK)
user_id: UUID (FK)
date: DATE
amount: DECIMAL(10,2)
category: ENUM('food', 'transport', 'shopping', 'entertainment', 'health', 'other')
description: TEXT
payment_method: ENUM('cash', 'alipay', 'wechat', 'card', 'other')
created_at: TIMESTAMP
```

**存钱计划表 (saving_plans)**
```sql
id: UUID (PK)
user_id: UUID (FK)
plan_name: VARCHAR(100)
target_amount: DECIMAL(10,2)
current_amount: DECIMAL(10,2)
monthly_target: DECIMAL(10,2)
start_date: DATE
target_date: DATE
is_active: BOOLEAN
```

**月度预算表 (monthly_budgets)**
```sql
id: UUID (PK)
user_id: UUID (FK)
year_month: VARCHAR(7) (YYYY-MM)
budget_amount: DECIMAL(10,2)
actual_amount: DECIMAL(10,2)
```

#### 模块4: 嫁嫁嫁 (wedding)

**备婚任务表 (wedding_tasks)**
```sql
id: UUID (PK)
user_id: UUID (FK)
task_name: VARCHAR(200)
task_category: ENUM('venue', 'photo', 'invitation', 'dress', 'makeup', 'honeymoon', 'other')
planned_date: DATE
completed_date: DATE
status: ENUM('pending', 'in_progress', 'completed', 'cancelled')
priority: INTEGER (1-5)
notes: TEXT
```

**备婚花费表 (wedding_expenses)**
```sql
id: UUID (PK)
user_id: UUID (FK)
task_id: UUID (FK, nullable)
date: DATE
item_name: VARCHAR(200)
planned_amount: DECIMAL(10,2)
actual_amount: DECIMAL(10,2)
paid_status: ENUM('unpaid', 'partial', 'paid')
notes: TEXT
```

**备婚预算表 (wedding_budget)**
```sql
id: UUID (PK)
user_id: UUID (FK)
total_budget: DECIMAL(10,2)
current_spent: DECIMAL(10,2)
wedding_date: DATE
```

## 后端API设计

### 认证模块
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 登出
- `POST /api/auth/refresh` - 刷新Token
- `GET /api/auth/me` - 获取当前用户信息

### 瘦瘦瘦模块
- `GET /api/fitness/checkins` - 获取健身打卡列表
- `POST /api/fitness/checkins` - 创建健身打卡
- `GET /api/fitness/weights` - 获取体重记录
- `POST /api/fitness/weights` - 记录体重
- `GET /api/fitness/stats` - 获取统计数据（图表用）
- `GET /api/fitness/goals` - 获取健身目标
- `POST /api/fitness/goals` - 设置健身目标

### 学学学模块
- `GET /api/learning/exams` - 获取考试列表
- `POST /api/learning/exams` - 创建考试倒计时
- `GET /api/learning/subjects` - 获取科目列表
- `POST /api/learning/subjects` - 创建学习科目
- `GET /api/learning/checkins` - 获取学习打卡
- `POST /api/learning/checkins` - 学习进度打卡
- `GET /api/learning/progress` - 获取学习进度统计

### 省省省模块
- `GET /api/finance/expenses` - 获取消费记录
- `POST /api/finance/expenses` - 添加消费记录
- `DELETE /api/finance/expenses/:id` - 删除消费记录
- `GET /api/finance/monthly-summary` - 月度汇总
- `GET /api/finance/saving-plans` - 获取存钱计划
- `POST /api/finance/saving-plans` - 创建存钱计划
- `PUT /api/finance/saving-plans/:id` - 更新存钱进度
- `GET /api/finance/budgets` - 获取预算

### 嫁嫁嫁模块
- `GET /api/wedding/tasks` - 获取备婚任务列表
- `POST /api/wedding/tasks` - 创建备婚任务
- `PUT /api/wedding/tasks/:id` - 更新任务状态
- `GET /api/wedding/expenses` - 获取备婚花费
- `POST /api/wedding/expenses` - 添加花费记录
- `GET /api/wedding/budget` - 获取预算概览
- `GET /api/wedding/timeline` - 获取时间线

## 前端页面结构

```
/
├── / (首页 - Dashboard)
│   ├── 四大模块卡片入口
│   └── 快捷操作面板
│
├── /login (登录页)
├── /register (注册页)
│
├── /fitness (瘦瘦瘦模块)
│   ├── 健身打卡日历视图
│   ├── 体重趋势图表
│   ├── 目标设置与进度
│   └── 打卡记录列表
│
├── /learning (学学学模块)
│   ├── 考试倒计时卡片
│   ├── 三科目进度看板
│   ├── 学习打卡日历
│   └── 完成情况统计
│
├── /finance (省省省模块)
│   ├── 快速记账入口
│   ├── 月度消费图表
│   ├── 分类统计
│   ├── 存钱计划进度
│   └── 消费记录列表
│
├── /wedding (嫁嫁嫁模块)
│   ├── 时间线视图
│   ├── 任务看板（待办/进行中/已完成）
│   ├── 预算仪表盘
│   └── 花费明细
│
└── /profile (个人设置)
    ├── 个人信息编辑
    └── 密码修改
```

## 响应式设计策略

### 断点设置
- Mobile: < 768px (单列布局)
- Tablet: 768px - 1024px (两列布局)
- Desktop: > 1024px (多列布局)

### 移动端优化
- 侧边栏折叠为底部导航栏
- 图表简化为关键指标
- 表单优化为移动友好的输入方式
- 支持触摸手势操作

## 核心功能特性

### 通用功能
- 用户认证与授权
- 数据导出（Excel/CSV）
- 暗色模式支持
- 数据备份与恢复

### 瘦瘦瘦特色
- 体重趋势折线图
- 周打卡完成率环形图
- 目标达成进度条
- 每周运动时长统计

### 学学学特色
- 动态倒计时显示（天/时/分）
- 三科目并行进度对比
- 学习热力图（类似GitHub）
- 知识点完成度树状图

### 省省省特色
- 分类饼图
- 月度消费趋势折线图
- 预算超支提醒
- 存钱目标进度圆环

### 嫁嫁嫁特色
- 甘特图时间线
- 任务依赖关系可视化
- 预算vs实际花费对比柱状图
- 里程碑倒计时

## 开发计划

### Phase 1: 基础搭建 (2周)
1. 项目初始化（前后端脚手架）
2. 数据库设计与Prisma schema
3. 用户认证系统
4. 基础UI框架搭建

### Phase 2: 核心功能 (3周)
1. 瘦瘦瘦模块完整实现
2. 学学学模块完整实现
3. 省省省模块完整实现
4. 嫁嫁嫁模块完整实现

### Phase 3: 优化与测试 (1周)
1. 响应式适配测试
2. 性能优化
3. 用户体验优化
4. Bug修复

### Phase 4: 部署上线 (3天)
1. Docker镜像构建
2. 服务器配置
3. CI/CD流程
4. 上线监控

## 非功能性需求

### 安全性
- 密码bcrypt加密存储
- JWT Token过期机制
- HTTPS强制
- SQL注入防护（Prisma自动处理）
- XSS防护

### 性能
- API响应时间 < 200ms
- 首屏加载 < 2s
- 图表渲染优化（虚拟滚动）
- 图片懒加载

### 可用性
- 7x24小时可用
- 数据自动备份（每日）
- 错误日志监控
- 优雅降级

## 技术亮点

1. **TypeScript全栈**：类型安全，减少运行时错误
2. **Prisma ORM**：类型安全的数据库操作，自动迁移
3. **响应式设计**：一套代码适配所有设备
4. **模块化架构**：四大模块独立开发，易于扩展
5. **现代化UI**：Ant Design + Tailwind CSS
6. **数据可视化**：ECharts丰富的图表支持

## 项目结构

```
xiaowoniu/
├── frontend/                 # 前端项目
│   ├── src/
│   │   ├── components/      # 通用组件
│   │   ├── pages/           # 页面组件
│   │   ├── hooks/           # 自定义Hooks
│   │   ├── services/        # API服务
│   │   ├── store/           # 状态管理
│   │   ├── utils/           # 工具函数
│   │   ├── types/           # TypeScript类型
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                  # 后端项目
│   ├── src/
│   │   ├── controllers/     # 路由控制器
│   │   ├── services/        # 业务逻辑
│   │   ├── middlewares/     # 中间件
│   │   ├── routes/          # 路由定义
│   │   ├── utils/           # 工具函数
│   │   ├── types/           # TypeScript类型
│   │   └── server.ts
│   ├── prisma/
│   │   └── schema.prisma    # 数据库模型
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml        # Docker编排
└── README.md
```

---

**设计完成时间**: 2026-07-29
**设计版本**: v1.0
**设计师**: Claude (designer role)
