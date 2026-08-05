# Phase 6：省省省财务模块实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 逐任务实现此计划。所有步骤使用复选框（`- [ ]`）跟踪；每个任务完成后先运行该任务的验证，再进入下一个任务。

**目标：** 实现“省省省”财务工作台，形成“消费记录 -> 月度预算 -> 分类与每日统计 -> 存钱计划”的可操作闭环。

**架构：** 复用 Phase 4/5 已验证的垂直切片结构：Prisma 数据模型与迁移、shared DTO、Express/Zod/JWT API、Axios/Zustand 前端状态、Radix 对话框表单和受保护的 React 页面。消费汇总和预算剩余由后端按选定月份实时计算，前端不维护金额派生值。

**技术栈：** PostgreSQL 15+、Prisma 5、Express 4、Zod、Vitest、React 18、React Router v6、Zustand、Axios、Radix UI、Lucide、Tailwind CSS、Recharts；不新增 React Query、图表库、UI 框架或 API 版本前缀。

---

## 0. 阶段边界与已确认规则

### 0.1 前置条件

本计划假设以下能力已存在并保持不变：

- pnpm workspace 中的 `shared`、`backend`、`frontend` 都能独立构建。
- JWT 中间件将当前用户注入 `req.user.userId`。
- API 根路径是 `/api`，统一响应包络由现有 `success`/`error` helper 生成。
- 认证、Fitness、Learning 的 Prisma singleton、Zod validator、Axios `api` 实例、受保护路由和 Zustand 请求失效策略可直接复用。
- `ExpenseCategory` 和 `PaymentMethod` 已存在于 `shared/src/constants/enums.ts`，本阶段不重复创建伪枚举。
- 所有前端日期显示继续使用浏览器本地日期；后端 `DATE` 字段使用 UTC 零点转换。不增加用户时区字段或时区服务。

不要引入 `/api/v1`、React Query、Hugeicons、ECharts、Docker、Framer Motion 或新的全局状态库。架构文档中的这些候选技术与当前代码不一致，Phase 6 必须遵循仓库现状。

### 0.2 本阶段范围

必须实现：

1. 消费记录的查询、创建、编辑、删除。
2. 按月份查询和设置单一月度预算。
3. 选定月份的消费总额、预算使用率、预算剩余、分类统计和每日支出统计。
4. 存钱计划的查询、创建、编辑当前进度、编辑计划信息和删除。
5. 受保护的 `/finance` 工作台、Dashboard 入口、月份切换、消费表单、预算表单、存钱计划表单和删除确认。
6. API、服务层、前端状态层的当前用户隔离和错误反馈。
7. 390px、768px、1280px 视口的无横向溢出验收。
8. 后端测试、前端测试、Prisma 校验/迁移、三包构建和 Ego 浏览器真实 GUI 验收。

### 0.3 明确不在范围内

以下内容不能在实施中顺带加入：

- Wedding 模块、个人资料、跨模块 Dashboard 聚合或模块间转账。
- 银行/支付宝/微信自动同步、账单导入、OCR、重复消费检测。
- CSV/Excel 导出、备份恢复、预算通知、定时任务和 PWA。
- 多币种、汇率、税费、分期账单、债务、收入流水和账户余额。
- 分类自定义、支付方式自定义、分类拖拽排序。
- 按分类分别设置预算；Phase 6 只有“每个用户每个月一条总预算”。
- 存钱计划自动从消费记录或外部账户扣除；`currentAmount` 只能由用户显式更新。
- 跨月份趋势报表；“趋势”仅指当前选定月份的每日支出序列。
- 不使用 API、localStorage 注入、DOM mutation 或测试夹具冒充浏览器 GUI 流程。

### 0.4 领域对象与关系

```text
User
 ├─ Expense              （任意日期的消费记录）
 ├─ MonthlyBudget        （每月最多一条总预算）
 └─ SavingPlan           （独立的存钱目标）
```

- `Expense`：日期、金额、消费类别、支付方式和备注。
- `MonthlyBudget`：以该月第一天作为数据库键的总预算金额。
- `SavingPlan`：计划名称、目标金额、当前已存金额和目标日期。进度百分比、剩余金额、是否完成都是响应中的派生值。
- 三类资源相互独立，只依赖 `User`；删除用户时由外键级联删除。

### 0.5 金额、日期和派生值规则

- API 消费日期和存钱目标日期严格接受 `YYYY-MM-DD`；日期字符串必须 round-trip 通过 UTC `DATE` 校验。
- 月份参数严格接受 `YYYY-MM`，转换为该月第一天的 UTC `DATE`。月份边界由后端计算，包含该月第一天和最后一天。
- 所有金额使用非负或正数的十进制，最多两位小数；后端 Prisma 使用 `Decimal`，shared DTO 使用 `number`。
- 消费金额 `amount` 必须为 `0.01..9999999999.99`。
- 月度预算 `amount` 必须为 `0..9999999999.99`，允许设置为 `0` 表示本月不安排预算。
- 存钱计划 `targetAmount` 必须为 `0.01..9999999999.99`；`currentAmount` 必须为 `0..targetAmount`。
- 服务端在写入前 trim 文本；空备注保存为 `null`。
- `notes` 最多 2000 个字符；消费备注和存钱计划名称分别限制为 `2000` 和 `100` 个字符。
- 消费汇总使用精确 Decimal 聚合后转换为 number，不能使用浮点累加作为数据库事实来源。
- `budget.usedPercentage` 为 `budget.amount > 0` 时的 `floor(totalExpense / budget.amount * 100)`，限制在 `0..100`；预算为 `0` 时返回 `0`。
- `budget.remaining` 为 `budget.amount - totalExpense`，可以为负数；UI 将负数标记为超支。
- 分类 `percentage` 为该分类金额占总消费金额的百分比，金额为 `0` 时所有分类百分比为 `0`。
- 存钱计划 `progressPercentage` 为 `floor(currentAmount / targetAmount * 100)`，限制在 `0..100`；`isCompleted` 为 `currentAmount >= targetAmount`。
- 过去的消费日期和过去的存钱目标日期都允许保存；UI 只显示日期状态，不自动删除或自动完成。
- 所有查询、修改和删除必须带当前 `userId`。不存在的资源和属于其他用户的资源都返回 `404 NOT_FOUND`。
- 参数校验失败返回 `400 VALIDATION_ERROR`；存钱计划进度超过目标等业务冲突返回 `409 CONFLICT`；未认证返回 `401 UNAUTHORIZED`。

---

## 1. API 契约

所有路径均以 `/api/finance` 为前缀并需要 Bearer JWT。

### 1.1 消费记录

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/expenses?startDate=&endDate=&category=&paymentMethod=&limit=&offset=` | 查询当前用户消费，按日期和创建时间倒序 |
| `POST` | `/expenses` | 创建消费记录 |
| `PATCH` | `/expenses/:id` | 部分更新消费记录 |
| `DELETE` | `/expenses/:id` | 删除消费记录 |

请求示例：

```json
{
  "date": "2026-07-31",
  "amount": 28.50,
  "category": "food",
  "paymentMethod": "alipay",
  "notes": "午餐"
}
```

`PATCH` 至少包含一个字段，字段集合为 `date`、`amount`、`category`、`paymentMethod`、`notes`；`notes: null` 清除备注。

### 1.2 月度汇总

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/summary?month=2026-07` | 获取选定月份汇总、分类统计和每日支出 |

响应必须符合：

```typescript
interface FinanceSummaryResponse {
  month: string // YYYY-MM
  totalExpense: number
  expenseCount: number
  budget: {
    id: string
    month: string
    amount: number
    spent: number
    remaining: number
    usedPercentage: number
  } | null
  categoryBreakdown: Array<{
    category: ExpenseCategory
    amount: number
    percentage: number
    count: number
  }>
  dailyBreakdown: Array<{
    date: string
    amount: number
    count: number
  }>
}
```

`categoryBreakdown` 固定按 `ExpenseCategory` 枚举顺序返回，未发生消费的分类也返回 `amount: 0`、`percentage: 0`、`count: 0`，让前端布局和颜色稳定。`dailyBreakdown` 返回该月每一天，未消费日期返回零值。

### 1.3 月度预算

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/budgets?month=2026-07` | 查询选定月份预算，没有预算时返回 `null` |
| `PUT` | `/budgets` | 按用户和月份创建或替换总预算 |

请求体：

```json
{
  "month": "2026-07",
  "amount": 3000
}
```

`PUT /budgets` 是按 `(userId, month)` 幂等 upsert；不暴露数据库 id 作为写入键。响应为 `MonthlyBudgetResponse`：

```typescript
interface MonthlyBudgetResponse {
  id: string
  month: string
  amount: number
  createdAt: string
  updatedAt: string
}
```

### 1.4 存钱计划

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/saving-plans` | 查询当前用户存钱计划，按目标日期和创建时间倒序 |
| `POST` | `/saving-plans` | 创建存钱计划，当前金额默认 `0` |
| `PATCH` | `/saving-plans/:id` | 更新计划名称、目标金额、当前金额或目标日期 |
| `DELETE` | `/saving-plans/:id` | 删除存钱计划 |

创建示例：

```json
{
  "name": "旅行基金",
  "targetAmount": 12000,
  "currentAmount": 2500,
  "targetDate": "2027-01-31"
}
```

更新目标金额时，后端必须拒绝小于现有 `currentAmount` 的值；更新 `currentAmount` 时，后端必须拒绝大于最终 `targetAmount` 的值，均返回 `409 CONFLICT`。响应为：

```typescript
interface SavingPlanResponse {
  id: string
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  progressPercentage: number
  remainingAmount: number
  isCompleted: boolean
  createdAt: string
  updatedAt: string
}
```

---

## 2. 文件结构与职责

先按以下结构实现；只有在测试证明需要时才增加文件，不把多个领域对象塞进同一个超大组件。

```text
xiaowoniu/
├── shared/
│   └── src/
│       ├── types/models/finance.ts              # Expense、MonthlyBudget、SavingPlan 响应模型
│       ├── types/api/finance.ts                 # 请求、查询、汇总 DTO
│       └── index.ts                             # 导出 finance 类型
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma                        # User 关系和三个 Finance 模型
│   │   └── migrations/20260731160000_add_finance_tables/migration.sql
│   ├── src/
│   │   ├── validation/finance.schemas.ts        # 请求 envelope 和业务边界校验
│   │   ├── services/finance.service.ts          # 用户隔离、金额映射、汇总计算
│   │   ├── controllers/finance.controller.ts   # HTTP 输入输出和错误映射
│   │   └── routes/finance.routes.ts             # auth -> validate -> controller
│   └── src/__tests__/
│       ├── finance.schemas.test.ts
│       ├── finance.service.test.ts
│       └── finance.routes.test.ts
├── frontend/
│   └── src/
│       ├── services/finance.service.ts          # Axios API 解包
│       ├── services/finance.service.test.ts
│       ├── store/finance.store.ts               # 页面数据和并发失效策略
│       ├── store/finance.store.test.ts
│       ├── components/finance/
│       │   ├── ExpenseDialog.tsx                # 新建/编辑消费
│       │   ├── BudgetDialog.tsx                  # 设置当前月份预算
│       │   ├── SavingPlanDialog.tsx              # 新建/编辑存钱计划
│       │   ├── FinanceDeleteDialog.tsx           # 消费或存钱计划删除确认
│       │   ├── FinanceSummary.tsx                # 汇总卡片和分类统计
│       │   ├── ExpenseList.tsx                   # 当前月份消费记录
│       │   └── SavingPlanList.tsx                # 存钱计划及进度
│       ├── components/finance/finance-dialogs.test.tsx
│       ├── pages/Finance/index.tsx               # 受保护财务工作台
│       ├── pages/Finance/finance-components.test.tsx
│       ├── pages/Finance/finance-page.test.tsx
│       └── pages/finance-routing.test.tsx
├── README.md                                    # 模块状态、入口和数据库说明
├── backend/README.md                             # 后端 Finance API 和迁移说明
├── backend/API.md                                # Finance 请求、响应和错误契约
├── frontend/README.md                             # Finance 页面和测试说明
└── frontend/src/index.css                        # finance-page 作用域样式
```

---

## 3. 任务分解

### 任务 1：定义 Finance shared DTO

**文件：**
- 创建：`shared/src/types/models/finance.ts`
- 创建：`shared/src/types/api/finance.ts`
- 修改：`shared/src/index.ts`
- 测试：`shared` 包 TypeScript 构建

- [ ] **步骤 1：定义响应模型**

在 `shared/src/types/models/finance.ts` 中复用 `ExpenseCategory` 和 `PaymentMethod`，写入以下接口：

```typescript
import type { ExpenseCategory, PaymentMethod } from '../../constants/enums'

export interface ExpenseResponse {
  id: string
  userId: string
  date: string
  amount: number
  category: ExpenseCategory
  paymentMethod: PaymentMethod
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface MonthlyBudgetResponse {
  id: string
  month: string
  amount: number
  createdAt: string
  updatedAt: string
}

export interface SavingPlanResponse {
  id: string
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  progressPercentage: number
  remainingAmount: number
  isCompleted: boolean
  createdAt: string
  updatedAt: string
}
```

- [ ] **步骤 2：定义请求、查询和汇总 DTO**

在 `shared/src/types/api/finance.ts` 中写入与 API 契约同名的请求和响应类型：

```typescript
import type { ExpenseCategory, PaymentMethod } from '../../constants/enums'
import type { ExpenseResponse, MonthlyBudgetResponse, SavingPlanResponse } from '../models/finance'

export interface CreateExpenseRequest {
  date: string
  amount: number
  category: ExpenseCategory
  paymentMethod: PaymentMethod
  notes?: string
}

export interface UpdateExpenseRequest {
  date?: string
  amount?: number
  category?: ExpenseCategory
  paymentMethod?: PaymentMethod
  notes?: string | null
}

export interface FinanceExpenseQueryParams {
  startDate?: string
  endDate?: string
  category?: ExpenseCategory
  paymentMethod?: PaymentMethod
  limit?: number
  offset?: number
}

export interface CreateBudgetRequest {
  month: string
  amount: number
}

export interface FinanceMonthQuery {
  month: string
}

export interface CreateSavingPlanRequest {
  name: string
  targetAmount: number
  currentAmount?: number
  targetDate: string
}

export interface UpdateSavingPlanRequest {
  name?: string
  targetAmount?: number
  currentAmount?: number
  targetDate?: string
}

export interface FinanceCategorySummary {
  category: ExpenseCategory
  amount: number
  percentage: number
  count: number
}

export interface FinanceDailySummary {
  date: string
  amount: number
  count: number
}

export interface FinanceSummaryResponse {
  month: string
  totalExpense: number
  expenseCount: number
  budget: (MonthlyBudgetResponse & {
    spent: number
    remaining: number
    usedPercentage: number
  }) | null
  categoryBreakdown: FinanceCategorySummary[]
  dailyBreakdown: FinanceDailySummary[]
}
```

- [ ] **步骤 3：导出类型并运行构建确认红灯消失**

在 `shared/src/index.ts` 追加：

```typescript
export * from './types/models/finance'
export * from './types/api/finance'
```

运行：

```bash
pnpm --filter @xiaowoniu/shared build
```

预期：`tsc` 成功退出，且没有 finance 类型未导出错误。

- [ ] **步骤 4：Commit**

```bash
git add shared/src/index.ts shared/src/types/models/finance.ts shared/src/types/api/finance.ts
git commit -m "feat(shared): define finance contracts"
```

### 任务 2：创建 Finance Prisma 模型和迁移

**文件：**
- 修改：`backend/prisma/schema.prisma: User relations and finance models`
- 创建：`backend/prisma/migrations/20260731160000_add_finance_tables/migration.sql`
- 测试：Prisma validate/generate/status/deploy

- [ ] **步骤 1：先修改 schema 并运行 Prisma validate**

在 `User` 中加入：

```prisma
  expenses       Expense[]       @relation("UserExpenses")
  monthlyBudgets MonthlyBudget[] @relation("UserMonthlyBudgets")
  savingPlans    SavingPlan[]    @relation("UserSavingPlans")
```

在 `schema.prisma` 末尾加入：

```prisma
model Expense {
  id            String        @id @default(uuid())
  userId        String        @map("user_id")
  user          User          @relation("UserExpenses", fields: [userId], references: [id], onDelete: Cascade)
  date          DateTime      @db.Date
  amount        Decimal       @db.Decimal(12, 2)
  category      String        @db.VarChar(32)
  paymentMethod String        @map("payment_method") @db.VarChar(32)
  notes         String?       @db.Text
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  @@index([userId, date])
  @@index([userId, category, date])
  @@map("expenses")
}

model MonthlyBudget {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  user      User     @relation("UserMonthlyBudgets", fields: [userId], references: [id], onDelete: Cascade)
  month     DateTime @db.Date
  amount    Decimal  @db.Decimal(12, 2)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([userId, month])
  @@map("monthly_budgets")
}

model SavingPlan {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  user          User     @relation("UserSavingPlans", fields: [userId], references: [id], onDelete: Cascade)
  name          String   @db.VarChar(100)
  targetAmount  Decimal  @map("target_amount") @db.Decimal(12, 2)
  currentAmount Decimal  @default(0) @map("current_amount") @db.Decimal(12, 2)
  targetDate    DateTime @map("target_date") @db.Date
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@index([userId, targetDate])
  @@map("saving_plans")
}
```

运行：

```bash
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' pnpm --dir backend exec prisma validate
```

预期：schema 校验成功。若本地 PostgreSQL 不可用，记录命令失败原因，不能把它当作迁移成功。

- [ ] **步骤 2：写入可审阅的增量 SQL migration**

创建 `backend/prisma/migrations/20260731160000_add_finance_tables/migration.sql`，内容必须等价于：

```sql
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" VARCHAR(32) NOT NULL,
    "payment_method" VARCHAR(32) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "monthly_budgets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "monthly_budgets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "saving_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "target_amount" DECIMAL(12,2) NOT NULL,
    "current_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "target_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "saving_plans_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "monthly_budgets" ADD CONSTRAINT "monthly_budgets_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saving_plans" ADD CONSTRAINT "saving_plans_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "monthly_budgets_user_id_month_key" ON "monthly_budgets"("user_id", "month");
CREATE INDEX "expenses_user_id_date_idx" ON "expenses"("user_id", "date");
CREATE INDEX "expenses_user_id_category_date_idx" ON "expenses"("user_id", "category", "date");
CREATE INDEX "saving_plans_user_id_target_date_idx" ON "saving_plans"("user_id", "target_date");

ALTER TABLE "expenses" ADD CONSTRAINT "expenses_amount_check" CHECK ("amount" > 0);
ALTER TABLE "monthly_budgets" ADD CONSTRAINT "monthly_budgets_amount_check" CHECK ("amount" >= 0);
ALTER TABLE "saving_plans" ADD CONSTRAINT "saving_plans_amount_check" CHECK ("target_amount" > 0 AND "current_amount" >= 0 AND "current_amount" <= "target_amount");
```

不要修改既有 migration，也不要把 enum 值写成 PostgreSQL enum；当前项目使用字符串字段加 Zod native enum 校验。

- [ ] **步骤 3：生成 Client 并验证迁移状态**

运行：

```bash
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' pnpm --dir backend exec prisma generate
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' pnpm --dir backend exec prisma migrate status
```

若数据库可连接，再运行：

```bash
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' pnpm --dir backend exec prisma migrate deploy
```

预期：`prisma validate`、`generate` 成功；可连接数据库时 `migrate deploy` 成功并报告 schema up to date。不可连接时必须在最终验证中明确说明没有完成 live deploy。

- [ ] **步骤 4：Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/20260731160000_add_finance_tables/migration.sql
git commit -m "feat(backend): add finance persistence"
```

### 任务 3：实现 Finance Zod 校验和边界测试

**文件：**
- 创建：`backend/src/validation/finance.schemas.ts`
- 创建：`backend/src/__tests__/finance.schemas.test.ts`
- 参考：`backend/src/validation/fitness.schemas.ts`、`backend/src/validation/learning.schemas.ts`

- [ ] **步骤 1：编写失败测试覆盖金额、月份和 envelope**

测试必须至少覆盖：

```typescript
it('accepts money with at most two decimal places', () => {
  expect(createExpenseSchema.safeParse({ body: validExpense }).success).toBe(true)
  expect(createExpenseSchema.safeParse({ body: { ...validExpense, amount: 1.234 } }).success).toBe(false)
  expect(createExpenseSchema.safeParse({ body: { ...validExpense, amount: 0 } }).success).toBe(false)
})

it('accepts numeric values and rejects malformed month values', () => {
  expect(createExpenseSchema.safeParse({ body: { ...validExpense, amount: 100 } }).success).toBe(true)
  expect(monthQuerySchema.safeParse({ query: { month: '2026-13' } }).success).toBe(false)
  expect(monthQuerySchema.safeParse({ query: { month: '2026-7' } }).success).toBe(false)
})

it('accepts the full validator request envelope without rejecting body/query/params', () => {
  expect(expenseQuerySchema.safeParse({ body: {}, query: {}, params: {} }).success).toBe(true)
  expect(monthQuerySchema.safeParse({ body: {}, query: { month: '2026-07' }, params: {} }).success).toBe(true)
})

it('rejects invalid enums, blank names, negative progress, and invalid dates', () => {
  expect(createExpenseSchema.safeParse({ body: { ...validExpense, category: 'unknown' } }).success).toBe(false)
  expect(createSavingPlanSchema.safeParse({ body: { ...validPlan, name: '   ' } }).success).toBe(false)
  expect(createBudgetSchema.safeParse({ body: { month: '2026-07', amount: -1 } }).success).toBe(false)
  expect(createExpenseSchema.safeParse({ body: { ...validExpense, date: '2026-02-30' } }).success).toBe(false)
})
```

- [ ] **步骤 2：运行测试确认尚未实现**

运行：

```bash
pnpm --filter @xiaowoniu/backend test -- src/__tests__/finance.schemas.test.ts
```

预期：因 `finance.schemas.ts` 不存在而失败。

- [ ] **步骤 3：实现 schema 和固定边界 helper**

`finance.schemas.ts` 必须导出以下符号：

```typescript
export const expenseQuerySchema
export const createExpenseSchema
export const updateExpenseSchema
export const updateExpenseRouteSchema
export const monthQuerySchema
export const createBudgetSchema
export const createSavingPlanSchema
export const updateSavingPlanSchema
export const updateSavingPlanRouteSchema
export const idParamSchema
export const emptySchema
```

实现要求：

- 顶层 schema 不使用 `.strict()`，以接受 validator 传入的 `{ body, query, params }` envelope。
- 内层 `body`、`query`、`params` 使用 `.strict()`。
- 日期 helper 使用 `YYYY-MM-DD` 正则和 UTC round-trip；月份 helper 使用 `YYYY-MM` 正则并校验 `01..12`。
- 金额 helper 接受 `z.number().finite()`，先执行 `.min/.max`，再 refine `Number.isInteger(value * 100)`。
- 文本 schema 不能在后端悄悄替换类型；字符串去空格由 service 统一处理。
- `PATCH` body schema 至少要求一个字段，用 `refine(Object.keys(value).length > 0)`；再用同一个内层 body schema 组合出 `updateExpenseRouteSchema` 和 `updateSavingPlanRouteSchema`，避免在 routes 文件中访问经过 `refine` 后的 `.shape`。
- `updateSavingPlanSchema` 不把 `currentAmount <= targetAmount` 作为 schema 规则，因为最终值需要和数据库现有值合并后由 service 返回 409。

- [ ] **步骤 4：运行边界测试确认通过**

运行：

```bash
pnpm --filter @xiaowoniu/backend test -- src/__tests__/finance.schemas.test.ts
```

预期：所有 Finance schema 测试通过。

- [ ] **步骤 5：Commit**

```bash
git add backend/src/validation/finance.schemas.ts backend/src/__tests__/finance.schemas.test.ts
git commit -m "feat(backend): validate finance requests"
```

### 任务 4：实现 Finance service 和服务层测试

**文件：**
- 创建：`backend/src/services/finance.service.ts`
- 创建：`backend/src/__tests__/finance.service.test.ts`
- 参考：`backend/src/services/fitness.service.ts`、`backend/src/services/learning.service.ts`

- [ ] **步骤 1：编写失败测试锁定服务契约**

测试必须使用现有 Prisma mock 风格，至少覆盖：

```typescript
it('filters expenses by user and inclusive UTC month boundaries', async () => {
  await service.getExpenses('user-1', {
    startDate: '2026-07-01',
    endDate: '2026-07-31',
  })
  expect(prisma.expense.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { userId: 'user-1', date: { gte: utcDate('2026-07-01'), lte: utcDate('2026-07-31') } },
  }))
})

it('calculates exact summary values and returns zero rows for missing categories/days', async () => {
  prisma.expense.findMany.mockResolvedValue([
    expense({ amount: new Prisma.Decimal('12.50'), date: utcDate('2026-07-01'), category: 'food' }),
    expense({ amount: new Prisma.Decimal('7.50'), date: utcDate('2026-07-01'), category: 'transport' }),
  ])
  prisma.monthlyBudget.findUnique.mockResolvedValue(budget({ amount: new Prisma.Decimal('30') }))
  const result = await service.getSummary('user-1', '2026-07')
  expect(result.totalExpense).toBe(20)
  expect(result.budget?.remaining).toBe(10)
  expect(result.categoryBreakdown.find((item) => item.category === ExpenseCategory.FOOD)).toMatchObject({ amount: 12.5, percentage: 62.5, count: 1 })
  expect(result.dailyBreakdown).toHaveLength(31)
})

it('maps Decimal fields to numbers and derives saving plan progress', async () => {
  prisma.savingPlan.create.mockResolvedValue(plan({ targetAmount: new Prisma.Decimal('100'), currentAmount: new Prisma.Decimal('25') }))
  const result = await service.createSavingPlan('user-1', validPlan)
  expect(result.targetAmount).toBe(100)
  expect(result.remainingAmount).toBe(75)
  expect(result.progressPercentage).toBe(25)
  expect(result.isCompleted).toBe(false)
})

it('returns 404 behavior for cross-user deletes and 409 for target reduction below current', async () => {
  prisma.expense.deleteMany.mockResolvedValue({ count: 0 })
  await expect(service.deleteExpense('user-1', 'other-expense')).rejects.toBeInstanceOf(FinanceNotFoundError)
  prisma.savingPlan.findFirst.mockResolvedValue(plan({ currentAmount: new Prisma.Decimal('80'), targetAmount: new Prisma.Decimal('100') }))
  await expect(service.updateSavingPlan('user-1', 'plan-1', { targetAmount: 50 })).rejects.toBeInstanceOf(FinanceConflictError)
})
```

另加测试：预算使用率在预算为零时为 0、更新预算使用 compound upsert、分页参数转换、空备注转 `null`、消费更新只修改传入字段、所有查询都包含 `userId`。

- [ ] **步骤 2：运行测试确认服务缺失**

运行：

```bash
pnpm --filter @xiaowoniu/backend test -- src/__tests__/finance.service.test.ts
```

预期：因 `finance.service.ts` 不存在而失败。

- [ ] **步骤 3：实现 service 公共接口和转换 helper**

`FinanceService` 必须导出以下方法和错误类：

```typescript
export class FinanceNotFoundError extends Error {}
export class FinanceConflictError extends Error {}

export class FinanceService {
  getExpenses(userId: string, query: FinanceExpenseQueryParams): Promise<ExpenseResponse[]>
  createExpense(userId: string, data: CreateExpenseRequest): Promise<ExpenseResponse>
  updateExpense(userId: string, id: string, data: UpdateExpenseRequest): Promise<ExpenseResponse>
  deleteExpense(userId: string, id: string): Promise<void>
  getSummary(userId: string, month: string): Promise<FinanceSummaryResponse>
  getBudget(userId: string, month: string): Promise<MonthlyBudgetResponse | null>
  upsertBudget(userId: string, data: CreateBudgetRequest): Promise<MonthlyBudgetResponse>
  getSavingPlans(userId: string): Promise<SavingPlanResponse[]>
  createSavingPlan(userId: string, data: CreateSavingPlanRequest): Promise<SavingPlanResponse>
  updateSavingPlan(userId: string, id: string, data: UpdateSavingPlanRequest): Promise<SavingPlanResponse>
  deleteSavingPlan(userId: string, id: string): Promise<void>
}
```

实现细节必须固定如下：

- `utcDate(value)` 使用 `new Date(`${value}T00:00:00.000Z`)`；`formatDate(value)` 使用 `toISOString().slice(0, 10)`。
- `monthBounds(month)` 返回该月第一天和下月第一天；查询使用 `gte: start`、`lt: nextMonthStart`，避免按小时拼接月底。
- `getExpenses` 的 where 始终包含 `userId`，日期范围使用 `gte/lte`，排序为 `date desc, createdAt desc`，并安全转换 `limit/offset`。
- `createExpense` 写入 trim 后的 notes 或 `null`；`updateExpense` 先用 `{ id, userId }` 查找，合并字段，再更新，不能仅凭 id 更新。
- `deleteExpense` 使用 `deleteMany({ where: { id, userId } })`，count 为 0 时抛 `FinanceNotFoundError`。
- `getSummary` 查询选定月份的消费和该月预算，使用 Decimal 累加；按 `ExpenseCategory` 枚举顺序初始化分类 map；生成该月完整 dailyBreakdown；预算字段使用规则 0.5 中的精确公式。
- `getBudget` 使用 `{ userId_month: { userId, month: utcDate(`${month}-01`) } }`；不存在返回 `null`。
- `upsertBudget` 使用 Prisma `upsert` 的 compound unique key；预算金额 0 合法。
- `toSavingPlanResponse` 计算 `remainingAmount`、`progressPercentage` 和 `isCompleted`，不要将派生字段写回数据库。
- `updateSavingPlan` 先按 `{ id, userId }` 查询；将传入字段和现有字段合并；最终金额关系不满足时抛 `FinanceConflictError`；再按 `{ id, userId }` 更新。
- Prisma Decimal 通过 `toNumber()` 转换；所有 response 日期和时间字段转换为 string。

- [ ] **步骤 4：运行服务测试确认通过**

运行：

```bash
pnpm --filter @xiaowoniu/backend test -- src/__tests__/finance.service.test.ts
```

预期：Finance service 测试全部通过，且没有跨用户资源被更新或删除的调用。

- [ ] **步骤 5：Commit**

```bash
git add backend/src/services/finance.service.ts backend/src/__tests__/finance.service.test.ts
git commit -m "feat(backend): add finance service"
```

### 任务 5：接入 Finance controller、routes 和 API 文档

**文件：**
- 创建：`backend/src/controllers/finance.controller.ts`
- 创建：`backend/src/routes/finance.routes.ts`
- 修改：`backend/src/routes/index.ts`
- 修改：`backend/API.md`
- 创建：`backend/src/__tests__/finance.routes.test.ts`

- [ ] **步骤 1：编写路由失败测试**

测试必须验证：

- 每个 Finance 路由依次使用 `authMiddleware`、`validate`、controller。
- 未认证请求返回 401。
- 无效金额、日期、月份返回 400。
- service 的 `FinanceNotFoundError` 映射为 404，`FinanceConflictError` 映射为 409。
- 成功响应使用现有包络和中文消息：`消费记录已创建`、`消费记录已更新`、`消费记录已删除`、`预算已更新`、`存钱计划已创建`、`存钱计划已更新`、`存钱计划已删除`。
- cross-user id 不泄露资源存在性。

- [ ] **步骤 2：运行路由测试确认失败**

运行：

```bash
pnpm --filter @xiaowoniu/backend test -- src/__tests__/finance.routes.test.ts
```

预期：因 controller/routes 不存在而失败。

- [ ] **步骤 3：实现 controller 和 routes**

`finance.routes.ts` 必须注册以下 11 条路由：

```typescript
router.get('/expenses', authMiddleware, validate(expenseQuerySchema), financeController.listExpenses.bind(financeController))
router.post('/expenses', authMiddleware, validate(createExpenseSchema), financeController.createExpense.bind(financeController))
router.patch('/expenses/:id', authMiddleware, validate(updateExpenseRouteSchema), financeController.updateExpense.bind(financeController))
router.delete('/expenses/:id', authMiddleware, validate(idParamSchema), financeController.deleteExpense.bind(financeController))
router.get('/summary', authMiddleware, validate(monthQuerySchema), financeController.getSummary.bind(financeController))
router.get('/budgets', authMiddleware, validate(monthQuerySchema), financeController.getBudget.bind(financeController))
router.put('/budgets', authMiddleware, validate(createBudgetSchema), financeController.upsertBudget.bind(financeController))
router.get('/saving-plans', authMiddleware, validate(emptySchema), financeController.listSavingPlans.bind(financeController))
router.post('/saving-plans', authMiddleware, validate(createSavingPlanSchema), financeController.createSavingPlan.bind(financeController))
router.patch('/saving-plans/:id', authMiddleware, validate(updateSavingPlanRouteSchema), financeController.updateSavingPlan.bind(financeController))
router.delete('/saving-plans/:id', authMiddleware, validate(idParamSchema), financeController.deleteSavingPlan.bind(financeController))
```

实际注册数量为 11 条；不要为了凑旧文档中的数字新增没有契约依据的端点。`GET /summary` 是第 5 条，完整列表以代码为准。

在 `backend/src/routes/index.ts` 加入：

```typescript
import financeRoutes from './finance.routes'
router.use('/finance', financeRoutes)
```

controller 只负责读取 `req.user!.userId`、转换已验证的 body/query、调用 service 和返回统一 response；业务计算必须留在 service。

- [ ] **步骤 4：补写 API.md 的 Finance 章节**

在 `backend/API.md` 增加：

- 所有路径和认证要求。
- 11 条实际路由的请求示例、查询参数和成功消息。
- 金额两位小数规则、月份格式、预算为零的语义。
- 404/409/400 错误映射。
- 汇总响应中的 `categoryBreakdown` 和 `dailyBreakdown` 字段。
- 存钱计划派生进度字段及目标金额冲突规则。

- [ ] **步骤 5：运行测试和后端构建**

运行：

```bash
pnpm --filter @xiaowoniu/backend test -- src/__tests__/finance.routes.test.ts
pnpm --filter @xiaowoniu/backend build
```

预期：路由测试全部通过，TypeScript 编译成功。

- [ ] **步骤 6：Commit**

```bash
git add backend/src/controllers/finance.controller.ts backend/src/routes/finance.routes.ts backend/src/routes/index.ts backend/src/__tests__/finance.routes.test.ts backend/API.md
git commit -m "feat(backend): expose finance api"
```

### 任务 6：实现前端 Finance service

**文件：**
- 创建：`frontend/src/services/finance.service.ts`
- 创建：`frontend/src/services/finance.service.test.ts`

- [ ] **步骤 1：编写 Axios contract 测试**

测试必须 mock `@/services/api`，并断言：

```typescript
it('sends month through Axios params and unwraps summary data', async () => {
  mocks.get.mockResolvedValue({ data: { success: true, data: summary } })
  await expect(financeService.getSummary('2026-07')).resolves.toEqual(summary)
  expect(mocks.get).toHaveBeenCalledWith('/api/finance/summary', { params: { month: '2026-07' } })
})

it('uses PATCH for edits and PUT for the month budget', async () => {
  await financeService.updateExpense('expense-1', updateExpense)
  await financeService.upsertBudget(budgetRequest)
  expect(mocks.patch).toHaveBeenCalledWith('/api/finance/expenses/expense-1', updateExpense)
  expect(mocks.put).toHaveBeenCalledWith('/api/finance/budgets', budgetRequest)
})
```

覆盖所有 service 方法、`response.data.data` 解包和可选查询参数原样传递。

- [ ] **步骤 2：运行测试确认 service 尚不存在**

```bash
pnpm --filter @xiaowoniu/frontend test -- src/services/finance.service.test.ts
```

预期：import 失败。

- [ ] **步骤 3：实现 service**

`finance.service.ts` 必须导出：

```typescript
export const financeService = {
  getExpenses(params?: FinanceExpenseQueryParams)
  createExpense(data: CreateExpenseRequest)
  updateExpense(id: string, data: UpdateExpenseRequest)
  deleteExpense(id: string)
  getSummary(month: string)
  getBudget(month: string)
  upsertBudget(data: CreateBudgetRequest)
  getSavingPlans()
  createSavingPlan(data: CreateSavingPlanRequest)
  updateSavingPlan(id: string, data: UpdateSavingPlanRequest)
  deleteSavingPlan(id: string)
}
```

所有 URL 使用 `/api/finance/...`；GET 查询使用 Axios `{ params }`；所有方法返回 `response.data.data`；不在 service 中格式化金额或日期。

- [ ] **步骤 4：运行测试确认通过并 Commit**

```bash
pnpm --filter @xiaowoniu/frontend test -- src/services/finance.service.test.ts

git add frontend/src/services/finance.service.ts frontend/src/services/finance.service.test.ts
git commit -m "feat(frontend): add finance api client"
```

预期：service 测试通过。

### 任务 7：实现 Finance Zustand store

**文件：**
- 创建：`frontend/src/store/finance.store.ts`
- 创建：`frontend/src/store/finance.store.test.ts`

- [ ] **步骤 1：编写失败测试覆盖状态、月份和并发失效**

`finance.store.ts` 顶部导出月份 helper，页面直接复用它：

```typescript
export function formatMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
```

初始状态必须是：

```typescript
export const initialFinanceState = {
  expenses: [],
  summary: null,
  budget: null,
  savingPlans: [],
  selectedMonth: formatMonth(new Date()),
  loading: false,
  error: null,
}
```

测试必须覆盖：

- `fetchDashboard('2026-07')` 并行请求 expenses、summary、budget、savingPlans。
- `fetchExpenses` 传入新月份时用新结果替换，传入 offset 大于 0 时去重追加。
- 新建/编辑/删除消费后先更新本地记录，再刷新当前月份消费和 summary。
- `upsertBudget` 成功后先更新 budget，再刷新 summary。
- 存钱计划写操作成功后保留成功结果并刷新计划列表。
- 任一刷新失败时 action resolve，保留成功本地结果并设置 `操作已成功，但数据刷新失败`。
- 旧月份或旧请求响应不能覆盖当前月份；`reset()` 后旧请求不能回写。
- API 失败时写入 error 并 reject，loading 在并发 action 全部结束后才归零。

- [ ] **步骤 2：运行测试确认 store 尚不存在**

```bash
pnpm --filter @xiaowoniu/frontend test -- src/store/finance.store.test.ts
```

预期：import 失败。

- [ ] **步骤 3：实现 store 和请求失效策略**

store action 必须包含：

```typescript
fetchDashboard(month: string): Promise<void>
fetchExpenses(params?: FinanceExpenseQueryParams): Promise<void>
fetchSummary(month: string): Promise<void>
fetchBudget(month: string): Promise<void>
fetchSavingPlans(): Promise<void>
setMonth(month: string): void
createExpense(data: CreateExpenseRequest): Promise<void>
updateExpense(id: string, data: UpdateExpenseRequest): Promise<void>
deleteExpense(id: string): Promise<void>
upsertBudget(data: CreateBudgetRequest): Promise<void>
createSavingPlan(data: CreateSavingPlanRequest): Promise<void>
updateSavingPlan(id: string, data: UpdateSavingPlanRequest): Promise<void>
deleteSavingPlan(id: string): Promise<void>
clearError(): void
reset(): void
```

复用 Learning store 的 generation token、每资源 version token、active action counter、`Promise.allSettled` 和刷新失败提示。资源至少区分 `expenses`、`summary`、`budget`、`savingPlans`；月份切换必须使所有旧资源 token 失效。

写入后的刷新依赖固定为：

```text
expense create/update/delete -> expenses + summary
budget upsert                -> budget + summary
saving plan create/update/delete -> savingPlans
```

- [ ] **步骤 4：运行 store 测试、前端类型检查并 Commit**

```bash
pnpm --filter @xiaowoniu/frontend test -- src/store/finance.store.test.ts
pnpm --filter @xiaowoniu/frontend exec tsc --noEmit

git add frontend/src/store/finance.store.ts frontend/src/store/finance.store.test.ts
git commit -m "feat(frontend): add finance state management"
```

预期：测试和类型检查通过。

### 任务 8：实现 Finance 表单和删除确认

**文件：**
- 创建：`frontend/src/components/finance/ExpenseDialog.tsx`
- 创建：`frontend/src/components/finance/BudgetDialog.tsx`
- 创建：`frontend/src/components/finance/SavingPlanDialog.tsx`
- 创建：`frontend/src/components/finance/FinanceDeleteDialog.tsx`
- 创建：`frontend/src/components/finance/finance-dialogs.test.tsx`
- 参考：`frontend/src/components/learning/ExamDialog.tsx`、`SubjectDialog.tsx`、`DeleteConfirmationDialog.tsx`

- [ ] **步骤 1：编写表单失败测试**

测试至少覆盖：

```typescript
it('rejects blank expense amount and more than two decimal places', async () => {
  render(<ExpenseDialog open onOpenChange={vi.fn()} initialDate="2026-07-31" onSubmit={onSubmit} />)
  await user.clear(screen.getByLabelText('金额'))
  await user.click(screen.getByRole('button', { name: '保存消费' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('请输入有效金额')
  await user.type(screen.getByLabelText('金额'), '1.234')
  expect(screen.getByRole('alert')).toHaveTextContent('金额最多保留两位小数')
  expect(onSubmit).not.toHaveBeenCalled()
})

it('trims notes and maps an empty note to null when editing', async () => {
  render(<ExpenseDialog open expense={expenseWithNotes} onOpenChange={vi.fn()} onSubmit={onSubmit} />)
  await user.clear(screen.getByLabelText('备注'))
  await user.click(screen.getByRole('button', { name: '保存消费' }))
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ notes: null })))
})

it('requires a target amount at least as large as current amount', async () => {
  render(<SavingPlanDialog open plan={planWithCurrentAmount} onOpenChange={vi.fn()} onSubmit={onSubmit} />)
  await user.clear(screen.getByLabelText('目标金额'))
  await user.type(screen.getByLabelText('目标金额'), '100')
  await user.click(screen.getByRole('button', { name: '保存存钱计划' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('目标金额不能小于已存金额')
})

it('does not call delete action when the confirmation is cancelled', async () => {
  render(<FinanceDeleteDialog open resource="expense" onConfirm={onConfirm} onOpenChange={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: '取消' }))
  expect(onConfirm).not.toHaveBeenCalled()
})
```

- [ ] **步骤 2：运行测试确认组件尚不存在**

```bash
pnpm --filter @xiaowoniu/frontend test -- src/components/finance/finance-dialogs.test.tsx
```

预期：import 失败。

- [ ] **步骤 3：实现 ExpenseDialog**

要求：

- 新建和编辑共用组件；编辑时完整预填日期、金额、分类、支付方式和备注。
- 日期输入必须使用 `type="date"` 且提交前进行严格 round-trip 校验。
- 金额在表单内部保持字符串；只接受非负数字和最多两位小数，提交时转换为 number。
- 分类使用已存在的 `ExpenseCategoryLabels`，支付方式使用 `PaymentMethodLabels`。
- 备注 trim 后空值传 `null`（新建时可省略，编辑时显式传 `null`）。
- 提交失败保留输入并显示 `role="alert"`；提交成功关闭对话框。
- 提交期间禁用取消、Escape、外部点击和重复提交；主按钮包含 Lucide `Save` 图标。

- [ ] **步骤 4：实现 BudgetDialog、SavingPlanDialog 和删除确认**

要求：

- `BudgetDialog` 显示当前月份中文标签，金额允许 `0` 和两位小数；保存 payload 为 `{ month, amount }`。
- `SavingPlanDialog` 支持新建和编辑；名称 trim 后 `1..100`；目标金额和当前金额最多两位小数；当前金额不能为负且不能超过目标金额；目标日期必须是有效日期；编辑时完整预填。
- 存钱计划编辑时目标金额变小导致当前金额超限必须在前端阻止，并仍由后端返回 409 作为最终权威校验。
- `FinanceDeleteDialog` 接收 `resource: 'expense' | 'savingPlan'`，分别说明删除消费记录或存钱计划不可恢复；提交期间锁定。
- 所有按钮最小点击区域为 44px；图标按钮必须有 aria-label。

- [ ] **步骤 5：运行组件测试、类型检查并 Commit**

```bash
pnpm --filter @xiaowoniu/frontend test -- src/components/finance/finance-dialogs.test.tsx
pnpm --filter @xiaowoniu/frontend exec tsc --noEmit

git add frontend/src/components/finance
git commit -m "feat(frontend): add finance forms"
```

预期：表单边界、预填、取消、错误保留输入和提交锁定测试通过。

### 任务 9：实现 Finance 汇总、消费列表和存钱计划视图

**文件：**
- 创建：`frontend/src/components/finance/FinanceSummary.tsx`
- 创建：`frontend/src/components/finance/ExpenseList.tsx`
- 创建：`frontend/src/components/finance/SavingPlanList.tsx`
- 创建：`frontend/src/pages/Finance/finance-components.test.tsx`

- [ ] **步骤 1：编写展示组件测试**

测试至少覆盖：

```typescript
it('shows overspending and category totals from backend summary', () => {
  render(<FinanceSummary summary={summaryWithOverspending} loading={false} onEditBudget={vi.fn()} />)
  expect(screen.getByText('已超支')).toBeInTheDocument()
  expect(screen.getByText('餐饮')).toBeInTheDocument()
  expect(screen.getByText('¥120.50')).toBeInTheDocument()
})

it('renders expense list empty, loading, and delete/edit controls', () => {
  render(<ExpenseList expenses={[]} loading={false} onCreate={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
  expect(screen.getByText('本月还没有消费记录')).toBeInTheDocument()
})

it('renders saving progress and completed state', () => {
  render(<SavingPlanList plans={[completedPlan]} loading={false} onCreate={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
  expect(screen.getByText('已完成')).toBeInTheDocument()
  expect(screen.getByText('100%')).toBeInTheDocument()
})
```

另测：每日趋势无数据、消费记录金额和日期格式、删除按钮 aria-label、分类统计不因缺失分类而改变顺序。

- [ ] **步骤 2：实现 FinanceSummary**

实现以下区域，不重新计算后端金额：

- 本月总支出、消费笔数、预算金额、预算剩余/超支。
- 预算使用率进度条，`aria-valuenow` 使用后端值。
- 固定顺序的分类统计列表，显示金额和百分比。
- 每日支出趋势使用项目已有 `recharts`；图表容器必须有固定最小高度和 `aria-label="每日支出趋势"`，无数据时显示空状态。
- `loading` 时使用稳定尺寸 skeleton，不让布局跳动。

- [ ] **步骤 3：实现 ExpenseList 和 SavingPlanList**

要求：

- `ExpenseList` 按后端顺序显示日期、分类、支付方式、备注和金额，提供新建、编辑和删除操作。
- `SavingPlanList` 显示名称、目标日期、当前/目标金额、派生进度条、剩余金额和完成状态，提供新建、编辑和删除操作。
- 编辑和删除按钮使用 Lucide 图标并提供完整 aria-label；文本按钮只用于“新增消费”“设置预算”“新建存钱计划”等明确命令。
- 列表空状态、加载状态、错误状态由页面控制，组件不调用 API。

- [ ] **步骤 4：运行组件测试和构建**

```bash
pnpm --filter @xiaowoniu/frontend test -- src/pages/Finance/finance-components.test.tsx
pnpm --filter @xiaowoniu/frontend exec tsc --noEmit
```

预期：所有展示测试通过，Recharts 类型和组件 props 无错误。

- [ ] **步骤 5：Commit**

```bash
git add frontend/src/components/finance/FinanceSummary.tsx frontend/src/components/finance/ExpenseList.tsx frontend/src/components/finance/SavingPlanList.tsx frontend/src/pages/Finance/finance-components.test.tsx
git commit -m "feat(frontend): add finance summaries and lists"
```

### 任务 10：实现 Finance 页面、路由和 Dashboard 入口

**文件：**
- 创建：`frontend/src/pages/Finance/index.tsx`
- 创建：`frontend/src/pages/Finance/finance-page.test.tsx`
- 创建：`frontend/src/pages/finance-routing.test.tsx`
- 修改：`frontend/src/routes/index.tsx`
- 修改：`frontend/src/pages/Dashboard.tsx`

- [ ] **步骤 1：编写页面和路由失败测试**

测试必须覆盖：

- 未登录访问 `/finance` 重定向 `/login`，登录页显示 `欢迎回来`。
- Dashboard 的“省省省”卡片可用，点击和 Enter/Space 都导航至 `/finance`。
- 页面首次渲染读取当前月份，并调用一次 `fetchDashboard(month)`。
- 页面包含月份前后切换按钮，切换后调用 `setMonth` 和新的 dashboard 请求。
- 页面空状态、加载状态、API error alert 和操作成功 status 都可见。
- 没有预算时“设置预算”可用；没有存钱计划时显示创建入口。
- 点击消费列表日期无额外副作用；删除消费或存钱计划先打开确认框，取消不调用 store action。

- [ ] **步骤 2：运行测试确认页面/路由尚不存在**

```bash
pnpm --filter @xiaowoniu/frontend test -- src/pages/Finance/finance-page.test.tsx src/pages/finance-routing.test.tsx
```

预期：Finance 页面 import 失败或路由无法匹配。

- [ ] **步骤 3：实现 Finance 页面**

`frontend/src/pages/Finance/index.tsx` 必须：

- 使用 `useFinanceStore` 读取 expenses、summary、budget、savingPlans、loading、error 和全部 actions。
- 页面首次加载调用 `fetchDashboard(selectedMonth)`；月份变更只保留最新月份请求。
- 顶部提供返回 Dashboard 和登出；标题为 `财务记录`，说明文字保持简短。
- 操作区提供 `记一笔`、`设置预算`、`新建存钱计划`；所有操作都有 loading/disabled 状态。
- 选定月份标题使用 `2026年7月` 形式，左右按钮有 `查看上个月`、`查看下个月` aria-label。
- 使用 `FinanceSummary`、`ExpenseList`、`SavingPlanList` 组合页面；对话框状态由页面拥有。
- 成功操作显示 `role="status"`，store error 显示 `role="alert"`，允许用户关闭错误。
- 删除确认成功后关闭对话框并刷新依赖数据；失败时保留对话框并显示 store 错误。

月份 helper 由 `@/store/finance.store` 导出并在页面中复用，不使用 `toISOString()` 推断当前月份：

```typescript
import { formatMonth, useFinanceStore } from '@/store/finance.store'
```

- [ ] **步骤 4：接入受保护路由和 Dashboard**

在 `frontend/src/routes/index.tsx` 加入：

```typescript
const Finance = lazy(() => import('@/pages/Finance'))

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
```

Dashboard 的 Finance 卡片改为与 Fitness/Learning 一致的键盘可操作卡片：点击、Enter、Space 均调用 `navigate('/finance')`，不改变 Wedding 的待上线状态。

- [ ] **步骤 5：运行页面、路由测试并 Commit**

```bash
pnpm --filter @xiaowoniu/frontend test -- src/pages/Finance/finance-page.test.tsx src/pages/finance-routing.test.tsx

git add frontend/src/pages/Finance frontend/src/pages/finance-routing.test.tsx frontend/src/routes/index.tsx frontend/src/pages/Dashboard.tsx
git commit -m "feat(frontend): add finance workspace"
```

预期：页面测试和受保护路由测试通过。

### 任务 11：完善 Finance 视觉样式和响应式布局

**文件：**
- 修改：`frontend/src/index.css`
- 修改：`frontend/src/pages/Finance/index.tsx`（仅在需要挂载样式类时）
- 修改：`frontend/src/pages/Finance/finance-page.test.tsx`（尺寸/可访问性断言）

- [ ] **步骤 1：增加作用域样式**

在现有全局样式中增加 `finance-page` 作用域，至少包含：

```css
.finance-page .finance-panel { /* 统一边框、背景、内边距 */ }
.finance-page .finance-toolbar { /* 月份切换和操作区 */ }
.finance-page .finance-summary-grid { /* 统计卡片稳定网格 */ }
.finance-page .finance-category-row { /* 分类金额和比例 */ }
.finance-page .finance-trend { min-height: 220px; }
.finance-page .finance-icon-button { min-width: 44px; min-height: 44px; }
.finance-page .finance-skeleton { animation: ...; }
```

样式要求：

- 390px 下页面自然单列堆叠；不使用固定宽度导致横向滚动。
- 768px 下操作区和汇总区能分列；消费列表仍保持金额列可见。
- 1280px 下主内容为汇总/列表双栏，图表和存钱计划不被压缩到不可读。
- 页面 section 不再套 card；卡片只用于重复的统计项、列表项和对话框。
- 使用现有中性配色体系，避免引入大面积单色渐变、装饰性圆点或 bokeh。
- `prefers-reduced-motion: reduce` 下禁用 Finance 的持续动画，与 Fitness/Learning 覆盖规则一致。

- [ ] **步骤 2：补充页面可访问性断言**

断言：

- 主标题和页面导航存在。
- 汇总区、消费列表、存钱计划列表具有 `aria-labelledby`。
- 趋势区域有 `aria-label`。
- 所有图标按钮有可读 aria-label。
- 交互控件高度至少 44px。
- 390px、768px、1280px 的 `scrollWidth` 不超过 `clientWidth`（使用 jsdom 可测试的 class/结构断言补充，真实尺寸留给 Ego）。

- [ ] **步骤 3：运行前端全量测试和构建**

```bash
pnpm --filter @xiaowoniu/frontend test -- --run
pnpm --filter @xiaowoniu/frontend build
```

预期：全量测试通过，`tsc` 和 Vite build 成功。

- [ ] **步骤 4：Commit**

```bash
git add frontend/src/index.css frontend/src/pages/Finance/index.tsx frontend/src/pages/Finance/finance-page.test.tsx
git commit -m "style(frontend): polish finance responsive layout"
```

### 任务 12：补齐文档、运行集成验证和 Ego 浏览器验收

**文件：**
- 修改：`README.md`
- 修改：`backend/README.md`
- 修改：`frontend/README.md`
- 修改：`backend/API.md`（若任务 5 后仍有遗漏）
- 测试：全仓库 build/test、Prisma live migration、Ego GUI

- [ ] **步骤 1：更新项目文档**

`README.md`：

- 将“省省省”从待开发改为已实现。
- 写明入口 `/finance`、API 前缀 `/api/finance`。
- 写明消费汇总由后端按月份计算，预算和存钱计划均按当前用户隔离。
- 写明金额最多两位小数、月份格式和迁移必须连接 PostgreSQL。

`backend/README.md`：

- 记录 11 条 Finance 路由、三个 Prisma 表和用户隔离。
- 记录预算 compound upsert、Decimal 转 number、存钱计划 409 规则。
- 明确 `prisma validate/generate` 不等同于 `migrate deploy`。

`frontend/README.md`：

- 将 Finance 加入已完成模块。
- 记录 `/finance` 的月份汇总、消费记录、预算、存钱计划和错误/加载状态。
- 记录测试和构建命令。

- [ ] **步骤 2：运行后端、前端和 shared 验证**

在存在可连接 PostgreSQL 的环境运行：

```bash
pnpm --filter @xiaowoniu/shared build
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' pnpm --dir backend exec prisma validate
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' pnpm --dir backend exec prisma generate
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' pnpm --dir backend exec prisma migrate deploy
pnpm --filter @xiaowoniu/backend test -- --run
pnpm --filter @xiaowoniu/backend build
pnpm --filter @xiaowoniu/frontend test -- --run
pnpm --filter @xiaowoniu/frontend build
git diff --check
```

预期：

- shared、backend、frontend 构建成功。
- 后端和前端所有测试通过。
- PostgreSQL 可用时 migration deploy 成功；不可用时最终报告明确写出失败输出，不能用 validate/generate 代替。
- `git diff --check` 无输出。

- [ ] **步骤 3：启动隔离服务进行真实 API smoke test**

不停止现有开发服务，使用独立端口：

```bash
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' \
JWT_SECRET='test-secret' JWT_EXPIRES_IN='7d' FRONTEND_URL='http://localhost:5177' PORT=3002 \
pnpm --dir backend dev

VITE_API_URL='http://localhost:3002' pnpm --dir frontend dev --host 127.0.0.1 --port 5177
```

使用真实 JWT 登录后，只用 HTTP smoke test 验证以下契约，不把 smoke test 当成 GUI 验收：

1. 创建 `food` 消费和 `alipay` 支付方式记录。
2. 设置 `2026-07` 预算，读取 summary 并核对总额、预算剩余、分类和每日统计。
3. 创建存钱计划，更新当前金额，读取 `progressPercentage` 和 `remainingAmount`。
4. 删除消费、删除存钱计划，确认 summary 和列表刷新。
5. 使用另一个用户 token 访问上述 id，所有修改/删除返回 404。
6. 发送三位小数、无效日期、无效分类和目标金额小于当前金额的请求，分别确认 400/409。

- [ ] **步骤 4：使用 Ego 浏览器执行真实 GUI 流程**

使用用户指定的 Ego 浏览器打开隔离前端，例如 `http://localhost:5177`。不得通过 API、store、localStorage 或 DOM mutation 创建测试数据。

真实操作顺序：

1. 未登录直接打开 `/finance`，确认重定向到登录页。
2. 用测试账号 `test@example.com` / `password123` 登录，点击 Dashboard 的“省省省”入口进入 `/finance`。
3. 确认页面显示当前月份、空状态、汇总区、消费列表和存钱计划区。
4. 打开“记一笔”，输入日期、`28.50`、餐饮、支付宝和备注，保存；确认对话框关闭、成功状态出现、总支出和消费列表更新。
5. 编辑该消费，将金额改为 `30.00`，确认 summary 和列表金额更新；再打开删除确认并取消，确认记录仍在。
6. 再次删除消费并确认，确认消费列表为空且总支出恢复为 `0`。
7. 设置当月预算 `3000.00`，确认预算卡片、预算剩余和使用率出现。
8. 新建存钱计划“旅行基金”，目标 `12000.00`、当前 `2500.00`、目标日期为未来日期，确认显示约 `20%` 进度。
9. 编辑当前金额为 `12000.00`，确认显示 `已完成`；再删除计划并确认列表回到空状态。
10. 点击上月和下月按钮，确认月份标题、汇总和列表请求范围随月份变化。
11. 通过键盘 Tab、Enter、Space 操作 Dashboard 入口和月份按钮，确认焦点可见且没有重复提交。
12. 在 390px、768px、1280px 视口分别截图并检查：无横向滚动、按钮文字不溢出、图表/列表不互相覆盖、对话框内容可读。
13. 在 `prefers-reduced-motion: reduce` 下检查页面没有持续动画，过渡时间被压缩。

原生 `input[type=date]` 或系统 picker 若因 Ego runtime 无法填写，必须记录具体 DOM 值、截图和限制，不得使用脚本或 API 冒充该步骤；其余真实 GUI 流程仍需完成。

- [ ] **步骤 5：记录验收结果并完成最终提交**

在最终提交前检查：

```bash
git status --short
git diff --check
```

预期：工作树只包含本阶段计划要求的文件；差异没有空白错误或未完成的计划占位内容。

提交：

```bash
git add README.md backend/README.md frontend/README.md backend/API.md
git commit -m "docs: document finance module"
```

---

## 4. 阶段验收标准

### 4.1 后端和数据库

- [ ] `Expense`、`MonthlyBudget`、`SavingPlan` 关系和级联删除已落入 Prisma schema 与增量 migration。
- [ ] 所有 Finance 资源按 `userId` 隔离；跨用户资源统一 404。
- [ ] 金额在数据库中使用 `Decimal(12,2)`，DTO 边界转换为 number，不使用浮点数据库累加。
- [ ] 消费查询包含日期范围、分类、支付方式、分页和稳定排序。
- [ ] summary 对整月分类和每日数据返回稳定零值，并正确处理预算为零和超支。
- [ ] saving plan 更新不会允许 `currentAmount > targetAmount`，409 规则有服务测试和真实 API 验证。
- [ ] 400、401、404、409 响应与 API 文档一致。

### 4.2 前端

- [ ] `/finance` 是受保护的 lazy route，Dashboard 入口支持鼠标和键盘。
- [ ] 消费、预算、存钱计划表单支持创建/编辑/删除所需流程，失败时保留输入。
- [ ] 消费写操作刷新 expenses 和 summary；预算写操作刷新 budget 和 summary；存钱计划写操作刷新列表。
- [ ] 旧月份和 reset 后请求不能回写，刷新部分失败时保留成功结果并显示 `操作已成功，但数据刷新失败`。
- [ ] 空、加载、成功、错误、超支、完成和无预算状态均有可读 UI。
- [ ] 390px、768px、1280px 无横向溢出；点击目标至少 44px；图标按钮有 aria-label；reduced motion 生效。

### 4.3 验证与文档

- [ ] shared build、backend build、frontend build 通过。
- [ ] Finance backend schema/service/routes 测试通过。
- [ ] Finance frontend service/store/dialog/page/routing 测试通过。
- [ ] 可用 PostgreSQL 时执行并记录真实 `prisma migrate deploy`；不可用时明确报告未完成部署。
- [ ] Ego 浏览器完成未登录重定向、登录、入口、记账、编辑、删除、预算、存钱计划、月份切换和三种视口验收；原生控件限制如实记录。
- [ ] README、backend README、frontend README 和 API 文档与实际实现一致。

---

## 5. 执行交接

计划已完成并保存到 `docs/superpowers/plans/2026-07-31-phase6-finance-module.md`。两种执行方式：

1. **子代理驱动（推荐）**：使用 `superpowers-zh:subagent-driven-development`，每个任务调度一个新子代理，并在任务间进行规格审查、测试审查和集成验证。
2. **内联执行**：使用 `superpowers-zh:executing-plans`，按任务批量执行并在每个 commit 后设置检查点。
