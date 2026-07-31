# Phase 1: 项目初始化与共享类型包 - 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 搭建 Monorepo 项目结构，创建共享类型包，配置开发环境

**架构：** pnpm workspace + TypeScript + 三个子包（shared/backend/frontend），共享类型包提供前后端通用的 TypeScript 类型定义和枚举常量

**技术栈：** pnpm, TypeScript, Node.js 20+, Vite

---

## 文件结构概览

此阶段将创建以下文件和目录：

```
xiaowoniu/
├── package.json                          # 根 workspace 配置
├── pnpm-workspace.yaml                   # pnpm workspace 定义
├── .gitignore                            # Git 忽略规则
├── README.md                             # 项目说明
├── docs/
│   └── superpowers/
│       ├── specs/                        # 已存在
│       └── plans/                        # 已存在
├── shared/                               # 共享类型包
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                      # 统一导出
│       ├── types/
│       │   ├── common.ts                 # 通用类型
│       │   ├── models/                   # 业务实体类型
│       │   │   └── user.ts
│       │   └── api/                      # API DTO 类型
│       │       └── auth.ts
│       └── constants/
│           ├── enums.ts                  # 枚举定义
│           └── labels.ts                 # 中文映射
├── backend/                              # 后端（Phase 2）
└── frontend/                             # 前端（Phase 2）
```

---

## 任务 1：初始化 Monorepo 根配置

**文件：**
- 创建：`package.json`
- 创建：`pnpm-workspace.yaml`
- 创建：`.gitignore`
- 创建：`README.md`

---

- [ ] **步骤 1：初始化根 package.json**

创建文件 `package.json`：

```json
{
  "name": "xiaowoniu",
  "version": "1.0.0",
  "private": true,
  "description": "小窝牛个人管理平台 - Monorepo",
  "scripts": {
    "dev": "pnpm --parallel run dev",
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "lint": "pnpm -r run lint",
    "clean": "pnpm -r run clean && rm -rf node_modules"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  },
  "keywords": [
    "fitness",
    "learning",
    "finance",
    "wedding",
    "personal-management"
  ],
  "author": "",
  "license": "MIT"
}
```

- [ ] **步骤 2：创建 pnpm workspace 配置**

创建文件 `pnpm-workspace.yaml`：

```yaml
packages:
  - 'shared'
  - 'backend'
  - 'frontend'
```

- [ ] **步骤 3：创建 .gitignore**

创建文件 `.gitignore`：

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
dist/
build/

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*
pnpm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Temporary
.tmp/
temp/

# Database
*.db
*.sqlite

# Prisma
backend/prisma/migrations/
```

- [ ] **步骤 4：创建项目 README**

创建文件 `README.md`：

```markdown
# 小窝牛个人管理平台

一个面向个人生活管理的全栈 Web 平台，包含健身、学习、财务、备婚四大模块。

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Shadcn/ui
- **后端**: Express + TypeScript + Prisma
- **数据库**: PostgreSQL 15+
- **架构**: Monorepo (pnpm workspace)

## 项目结构

```
xiaowoniu/
├── shared/      # 共享类型包
├── backend/     # 后端服务
└── frontend/    # 前端应用
```

## 开发环境要求

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- PostgreSQL >= 15

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# 启动所有服务
pnpm dev

# 启动指定包
pnpm --filter shared dev
pnpm --filter backend dev
pnpm --filter frontend dev
```

### 构建

```bash
pnpm build
```

## 四大模块

- 💪 **瘦瘦瘦** - 健身打卡、体重记录
- 📚 **学学学** - 考试倒计时、学习进度
- 💰 **省省省** - 消费记录、存钱计划
- 💒 **嫁嫁嫁** - 备婚任务、预算管理

## 文档

- [架构设计](docs/superpowers/specs/2026-07-29-architecture-design.md)
- [设计系统](DESIGN_SYSTEM.md)
- [项目规划](PROJECT_PLAN.md)

## License

MIT
```

- [ ] **步骤 5：验证根配置**

运行命令验证配置：

```bash
cat package.json | grep "xiaowoniu"
cat pnpm-workspace.yaml
```

预期：文件内容正确显示

- [ ] **步骤 6：初始化 Git 仓库（如果未初始化）**

```bash
git init
git add package.json pnpm-workspace.yaml .gitignore README.md
git commit -m "chore: initialize monorepo structure"
```

---

## 任务 2：创建 Shared 类型包基础结构

**文件：**
- 创建：`shared/package.json`
- 创建：`shared/tsconfig.json`
- 创建：`shared/src/index.ts`

---

- [ ] **步骤 1：创建 shared 目录结构**

```bash
mkdir -p shared/src/{types/{common,models,api},constants}
```

- [ ] **步骤 2：创建 shared/package.json**

创建文件 `shared/package.json`：

```json
{
  "name": "@xiaowoniu/shared",
  "version": "1.0.0",
  "description": "Shared types and constants for xiaowoniu platform",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist"
  },
  "keywords": [
    "types",
    "shared"
  ],
  "author": "",
  "license": "MIT",
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

- [ ] **步骤 3：创建 shared/tsconfig.json**

创建文件 `shared/tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **步骤 4：创建空的 index.ts**

创建文件 `shared/src/index.ts`：

```typescript
// 统一导出所有类型和常量
// 将在后续步骤中填充
export * from './types/common'
export * from './types/models/user'
export * from './types/api/auth'
export * from './constants/enums'
export * from './constants/labels'
```

- [ ] **步骤 5：验证 shared 包配置**

```bash
cd shared
cat package.json | grep "@xiaowoniu/shared"
cat tsconfig.json | grep "strict"
cd ..
```

预期：文件内容正确显示

- [ ] **步骤 6：Commit**

```bash
git add shared/
git commit -m "chore: add shared package structure"
```

---

## 任务 3：实现通用类型定义

**文件：**
- 创建：`shared/src/types/common.ts`

---

- [ ] **步骤 1：创建通用类型文件**

创建文件 `shared/src/types/common.ts`：

```typescript
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
  pagination: Pagination
}

/**
 * 分页信息
 */
export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/**
 * 分页请求参数
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
}

/**
 * 日期范围
 */
export interface DateRange {
  startDate: string // ISO 8601 格式
  endDate: string   // ISO 8601 格式
}

/**
 * ID 参数
 */
export interface IdParam {
  id: string
}
```

- [ ] **步骤 2：构建 shared 包**

```bash
cd shared
pnpm install
pnpm build
```

预期：成功编译，生成 `dist/` 目录

- [ ] **步骤 3：验证类型文件生成**

```bash
ls -la dist/types/
cat dist/types/common.d.ts | head -20
```

预期：生成 `.d.ts` 类型声明文件

- [ ] **步骤 4：Commit**

```bash
cd ..
git add shared/src/types/common.ts
git commit -m "feat(shared): add common types"
```

---

## 任务 4：实现枚举常量

**文件：**
- 创建：`shared/src/constants/enums.ts`
- 创建：`shared/src/constants/labels.ts`

---

- [ ] **步骤 1：创建枚举定义文件**

创建文件 `shared/src/constants/enums.ts`：

```typescript
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

- [ ] **步骤 2：创建中文标签映射**

创建文件 `shared/src/constants/labels.ts`：

```typescript
import {
  ActivityType,
  TimeOfDay,
  ExpenseCategory,
  PaymentMethod,
  WeddingTaskCategory,
  TaskStatus,
  PaidStatus,
} from './enums'

/**
 * 运动类型中文标签
 */
export const ActivityTypeLabels: Record<ActivityType, string> = {
  [ActivityType.PILATES]: '普拉提',
  [ActivityType.GYM_SLOPE]: '爬坡机',
  [ActivityType.OTHER]: '其他运动',
}

/**
 * 时段中文标签
 */
export const TimeOfDayLabels: Record<TimeOfDay, string> = {
  [TimeOfDay.MORNING]: '早上',
  [TimeOfDay.EVENING]: '晚上',
}

/**
 * 消费类别中文标签
 */
export const ExpenseCategoryLabels: Record<ExpenseCategory, string> = {
  [ExpenseCategory.FOOD]: '餐饮',
  [ExpenseCategory.TRANSPORT]: '交通',
  [ExpenseCategory.SHOPPING]: '购物',
  [ExpenseCategory.ENTERTAINMENT]: '娱乐',
  [ExpenseCategory.HEALTH]: '健康',
  [ExpenseCategory.OTHER]: '其他',
}

/**
 * 支付方式中文标签
 */
export const PaymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: '现金',
  [PaymentMethod.ALIPAY]: '支付宝',
  [PaymentMethod.WECHAT]: '微信支付',
  [PaymentMethod.CARD]: '银行卡',
  [PaymentMethod.OTHER]: '其他',
}

/**
 * 备婚任务类别中文标签
 */
export const WeddingTaskCategoryLabels: Record<WeddingTaskCategory, string> = {
  [WeddingTaskCategory.VENUE]: '场地',
  [WeddingTaskCategory.PHOTO]: '婚纱照',
  [WeddingTaskCategory.INVITATION]: '请柬',
  [WeddingTaskCategory.DRESS]: '礼服',
  [WeddingTaskCategory.MAKEUP]: '化妆',
  [WeddingTaskCategory.HONEYMOON]: '蜜月',
  [WeddingTaskCategory.OTHER]: '其他',
}

/**
 * 任务状态中文标签
 */
export const TaskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: '待办',
  [TaskStatus.IN_PROGRESS]: '进行中',
  [TaskStatus.COMPLETED]: '已完成',
  [TaskStatus.CANCELLED]: '已取消',
}

/**
 * 支付状态中文标签
 */
export const PaidStatusLabels: Record<PaidStatus, string> = {
  [PaidStatus.UNPAID]: '未支付',
  [PaidStatus.PARTIAL]: '部分支付',
  [PaidStatus.PAID]: '已支付',
}
```

- [ ] **步骤 3：构建并验证**

```bash
cd shared
pnpm build
```

预期：编译成功，无错误

- [ ] **步骤 4：检查生成的类型**

```bash
cat dist/constants/enums.d.ts | grep "ActivityType"
cat dist/constants/labels.d.ts | grep "ActivityTypeLabels"
```

预期：类型声明正确生成

- [ ] **步骤 5：Commit**

```bash
cd ..
git add shared/src/constants/
git commit -m "feat(shared): add enums and labels"
```

---

## 任务 5：实现用户相关类型

**文件：**
- 创建：`shared/src/types/models/user.ts`
- 创建：`shared/src/types/api/auth.ts`

---

- [ ] **步骤 1：创建用户模型类型**

创建文件 `shared/src/types/models/user.ts`：

```typescript
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
  updatedAt: string
}

/**
 * 用户基本信息（不含敏感信息）
 */
export interface UserProfile {
  id: string
  username: string
  nickname: string | null
  avatarUrl: string | null
}
```

- [ ] **步骤 2：创建认证 API 类型**

创建文件 `shared/src/types/api/auth.ts`：

```typescript
import { UserResponse } from '../models/user'

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
 * Token 刷新响应
 */
export interface RefreshTokenResponse {
  token: string
}

/**
 * JWT Payload
 */
export interface JWTPayload {
  userId: string
  email: string
  iat: number
  exp: number
}
```

- [ ] **步骤 3：构建并验证**

```bash
cd shared
pnpm build
```

预期：编译成功

- [ ] **步骤 4：验证类型导出**

```bash
cat dist/index.d.ts | grep "UserResponse"
cat dist/index.d.ts | grep "LoginRequest"
```

预期：类型正确导出

- [ ] **步骤 5：Commit**

```bash
cd ..
git add shared/src/types/
git commit -m "feat(shared): add user and auth types"
```

---

## 任务 6：安装根依赖并验证 workspace

**文件：**
- 修改：`package.json`（根目录）

---

- [ ] **步骤 1：安装根依赖**

```bash
pnpm install
```

预期：创建 `node_modules/` 和 `pnpm-lock.yaml`

- [ ] **步骤 2：验证 workspace 链接**

```bash
pnpm list --depth 0
```

预期：显示 shared 包已链接

- [ ] **步骤 3：测试 shared 包构建**

```bash
pnpm --filter @xiaowoniu/shared build
```

预期：构建成功

- [ ] **步骤 4：清理并重新构建**

```bash
pnpm --filter @xiaowoniu/shared clean
pnpm --filter @xiaowoniu/shared build
```

预期：成功重新构建

- [ ] **步骤 5：验证 TypeScript 配置**

```bash
cd shared
npx tsc --noEmit
cd ..
```

预期：无类型错误

- [ ] **步骤 6：Commit**

```bash
git add pnpm-lock.yaml
git commit -m "chore: install dependencies and verify workspace"
```

---

## 任务 7：添加开发脚本和文档

**文件：**
- 创建：`shared/README.md`
- 修改：`shared/package.json`

---

- [ ] **步骤 1：创建 shared 包 README**

创建文件 `shared/README.md`：

```markdown
# @xiaowoniu/shared

小窝牛平台的共享类型包，提供前后端通用的 TypeScript 类型定义和常量。

## 功能

- ✅ API 请求/响应类型（DTO）
- ✅ 业务实体类型
- ✅ 枚举常量
- ✅ 中文标签映射
- ✅ 通用工具类型

## 安装

在 workspace 中的其他包中使用：

```json
{
  "dependencies": {
    "@xiaowoniu/shared": "workspace:*"
  }
}
```

## 使用示例

### 在后端使用

```typescript
import { LoginRequest, UserResponse, ApiResponse } from '@xiaowoniu/shared'

function login(req: LoginRequest): ApiResponse<UserResponse> {
  // ...
}
```

### 在前端使用

```typescript
import { ActivityType, ActivityTypeLabels } from '@xiaowoniu/shared'

const label = ActivityTypeLabels[ActivityType.PILATES] // "普拉提"
```

## 开发

```bash
# 构建
pnpm build

# 监听模式
pnpm dev

# 清理
pnpm clean
```

## 类型组织

```
src/
├── types/
│   ├── common.ts        # 通用类型（ApiResponse, Pagination 等）
│   ├── models/          # 业务实体类型
│   │   └── user.ts
│   └── api/             # API DTO 类型
│       └── auth.ts
└── constants/
    ├── enums.ts         # 枚举定义
    └── labels.ts        # 中文标签映射
```

## 添加新类型

1. 在对应目录创建文件
2. 在 `src/index.ts` 中导出
3. 运行 `pnpm build` 编译
4. 前后端自动获得更新

## 注意事项

- 所有日期使用 ISO 8601 字符串格式
- 所有 ID 使用 string 类型（UUID）
- 枚举值使用小写下划线格式
- 中文标签单独维护，便于国际化
```

- [ ] **步骤 2：添加 package.json 脚本说明**

在 `shared/package.json` 中添加字段（已存在，验证即可）：

```bash
cd shared
cat package.json | grep '"build"'
cat package.json | grep '"dev"'
```

预期：脚本已存在

- [ ] **步骤 3：测试所有脚本**

```bash
pnpm clean
pnpm build
ls -la dist/
```

预期：清理后重新生成 dist 目录

- [ ] **步骤 4：Commit**

```bash
cd ..
git add shared/README.md
git commit -m "docs(shared): add package documentation"
```

---

## 任务 8：最终验证与文档更新

**文件：**
- 创建：`docs/superpowers/plans/phase1-completion-checklist.md`

---

- [ ] **步骤 1：验证项目结构**

```bash
tree -L 3 -I 'node_modules|dist' .
```

预期：目录结构与规划一致

- [ ] **步骤 2：验证 shared 包导出**

```bash
cd shared
pnpm build
node -e "const shared = require('./dist/index.js'); console.log(Object.keys(shared))"
```

预期：显示所有导出的类型和常量

- [ ] **步骤 3：验证 TypeScript 类型**

```bash
cat dist/index.d.ts | grep "export"
```

预期：所有类型正确导出

- [ ] **步骤 4：创建完成检查清单**

创建文件 `docs/superpowers/plans/phase1-completion-checklist.md`：

```markdown
# Phase 1 完成检查清单

## ✅ 已完成项

- [x] Monorepo 根配置（package.json, pnpm-workspace.yaml）
- [x] Git 配置（.gitignore）
- [x] 项目文档（README.md）
- [x] Shared 包基础结构
- [x] 通用类型定义（ApiResponse, Pagination 等）
- [x] 枚举常量（ActivityType, ExpenseCategory 等）
- [x] 中文标签映射
- [x] 用户相关类型（UserResponse, LoginRequest 等）
- [x] TypeScript 构建配置
- [x] Workspace 依赖管理

## 📦 产出物

- `shared/` - 共享类型包，可被 backend 和 frontend 引用
- `dist/` - 编译后的 JavaScript 和类型声明文件
- 完整的项目根配置

## 🔍 验证命令

```bash
# 验证 workspace
pnpm list --depth 0

# 构建 shared 包
pnpm --filter @xiaowoniu/shared build

# 检查类型导出
cat shared/dist/index.d.ts

# 清理测试
pnpm --filter @xiaowoniu/shared clean
pnpm --filter @xiaowoniu/shared build
```

## 📝 下一步

**Phase 2: 后端基础架构**
- Express 应用搭建
- Prisma 数据库配置
- 认证系统实现
- JWT 中间件
- 基础 API 端点

参考计划：`docs/superpowers/plans/2026-07-29-phase2-backend-setup.md`
```

- [ ] **步骤 5：最终 commit**

```bash
cd ..
git add docs/superpowers/plans/phase1-completion-checklist.md
git commit -m "docs: add phase 1 completion checklist"
```

- [ ] **步骤 6：创建 Phase 1 标签**

```bash
git tag -a v0.1.0-phase1 -m "Phase 1: Project setup and shared types package completed"
```

---

## 验收标准

Phase 1 完成后，应满足以下条件：

✅ **结构完整**
- Monorepo 根目录配置正确
- pnpm workspace 工作正常
- shared 包独立可构建

✅ **类型系统**
- 所有通用类型定义完成
- 枚举和标签映射完整
- TypeScript 编译无错误
- 类型声明文件正确生成

✅ **开发体验**
- `pnpm build` 构建成功
- `pnpm dev` 监听模式工作
- `pnpm clean` 清理正常

✅ **文档完整**
- 根 README 说明清晰
- shared 包文档完善
- 完成检查清单创建

✅ **Git 管理**
- 所有变更已提交
- commit 信息规范
- 已打标签

---

## 故障排查

### 问题：pnpm install 失败

**原因**：pnpm 版本过低或未安装

**解决**：
```bash
npm install -g pnpm@latest
pnpm --version  # 应该 >= 8.0.0
```

### 问题：TypeScript 编译错误

**原因**：tsconfig.json 配置问题

**解决**：
```bash
cd shared
npx tsc --noEmit --listFiles  # 查看编译的文件
cat tsconfig.json  # 检查配置
```

### 问题：workspace 链接失败

**原因**：pnpm-workspace.yaml 配置错误

**解决**：
```bash
cat pnpm-workspace.yaml  # 检查包路径
pnpm install  # 重新安装
```

---

**Phase 1 计划完成。准备进入 Phase 2：后端基础架构。**
