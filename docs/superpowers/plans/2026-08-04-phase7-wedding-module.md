# Phase 7：嫁嫁嫁备婚模块实现计划

> **面向 AI 代理的工作者：** 使用子代理驱动开发（推荐）或逐任务执行方式实现此计划。所有步骤使用复选框（`- [ ]`）跟踪；每个任务完成后先运行该任务的验证，再进入下一个任务。不要把多个未验证任务合并后一次提交。

**目标：** 实现“嫁嫁嫁”备婚工作台，形成“婚期与预算 -> 任务规划和状态推进 -> 备婚花费 -> 预算/进度统计 -> 日期里程碑”的可操作闭环。

**架构：** 复用 Fitness、Learning、Finance 已验证的垂直切片结构：Prisma 数据模型与增量迁移、shared DTO、Express/Zod/JWT API、Axios/Zustand 前端状态、Radix 对话框和受保护 React 页面。预算使用情况、任务完成率、分类统计、倒计时和时间线均由后端按当前用户实时派生，前端不持久化或自行猜测领域统计值。

**技术栈：** PostgreSQL 15+、Prisma 5、Express 4、Zod、Vitest、React 18、React Router v6、Zustand、Axios、Radix UI、Lucide、Tailwind CSS、Recharts；不新增 React Query、图表库、拖拽库、UI 框架、动画库或 API 版本前缀。

---

## 0. 阶段边界与已确认规则

### 0.1 前置条件

开始 Phase 7 实现前必须满足：

- 当前 `feature-phase5-learning` 工作树仍包含未提交的 Phase 6 Finance 改动和未跟踪的 Phase 6 计划。先完成 Phase 6 验证与提交，再从包含 Phase 6 的提交创建独立 Phase 7 分支或工作树。
- 不修改或提交 `docs/superpowers/plans/2026-07-31-phase6-finance-module.md` 作为 Phase 7 实现的一部分。
- pnpm workspace 中的 `shared`、`backend`、`frontend` 都能独立构建，Phase 6 Finance 测试保持通过。
- JWT 中间件继续把当前用户写入 `req.user.userId`；所有 Wedding service 方法的第一个参数必须是该 `userId`。
- API 根路径继续是 `/api`，统一响应包络继续使用现有 `success`/`error` helper。
- 前端继续使用现有 Axios `api` 实例、Zustand store、`ProtectedRoute`、Radix Dialog、Lucide 和 Recharts。
- `WeddingTaskCategory`、`TaskStatus`、`PaidStatus` 及中文标签已存在于 `shared/src/constants`；本阶段复用它们，不创建同义枚举。
- Prisma schema 当前以 `String` 保存枚举值，以 Zod `nativeEnum` 执行运行时校验；Phase 7 保持这个约定，不新增 PostgreSQL enum。
- API 日期继续使用严格 `YYYY-MM-DD`，数据库 `DATE` 值按 UTC 零点 round-trip。前端只负责本地化显示，不新增用户时区字段。

不要引入 `/api/v1`、React Query、Hugeicons、ECharts、Docker、Framer Motion、拖拽看板依赖或新的全局状态库。旧架构文档中与当前代码冲突的候选技术不适用于 Phase 7。

### 0.2 本阶段范围

必须实现：

1. 备婚任务的列表、创建、部分更新和删除，支持类别、状态、优先级、计划日期、备注及服务端维护的完成日期。
2. 待办、进行中、已完成三列任务看板，以及与主看板分离的已取消归档。
3. 备婚花费的列表、创建、部分更新和删除；花费可选关联当前用户任务，任务删除后花费历史保留。
4. 每个用户最多一条 WeddingBudget，通过 `GET` 查询和 `PUT` 幂等设置总预算与婚礼日期。
5. 预算总额、计划花费、实际花费、预算剩余、预算使用率、任务完成率和固定类别统计。
6. 按计划日期生成里程碑时间线，并显示有符号婚礼倒计时和逾期状态。
7. 受保护的 `/wedding` 工作台、Dashboard 入口、操作对话框、空/加载/错误/成功状态。
8. Wedding store 的并发请求失效，以及登录、注册、登出、认证用户变化时 Finance 和 Wedding store 的同步 reset。
9. 当前用户隔离：所有读、写、聚合和关联校验都必须带 `userId`；跨用户资源和不存在资源统一返回 404。
10. 390px、768px、1280px 视口、键盘操作、可见焦点、44px 点击目标和 reduced motion 验收。
11. shared/backend/frontend 自动测试、Prisma live migration、真实 HTTP smoke test 和真实浏览器 GUI 验收。

### 0.3 明确不在范围内

实施中不能顺带加入：

- 真正的甘特图、任务持续时间、任务依赖关系、关键路径、自动排期或拖拽排序。
- 宾客/桌位/请柬发送管理、供应商 CRM、合同/附件、婚礼相册、协作邀请或多用户共享婚礼。
- 付款流水、`paidAmount`、分期明细、到期提醒、通知、日历同步或外部账单导入。
- 根据 `PaidStatus` 推导实际付款金额；本阶段只有离散支付状态，不提供现金流统计。
- 多币种、汇率、税费、预算分类上限、自动预算调整或 Finance/Wedding 跨模块同步。
- 数据导出、打印、备份恢复、PWA、离线编辑、乐观离线队列或实时 WebSocket。
- 自定义任务/花费类别、自定义状态、自定义优先级、看板拖拽。
- 单条详情页面和 `GET /tasks/:id`、`GET /expenses/:id`；本阶段是列表型 CRUD，编辑使用列表响应中的对象。
- 使用 API、localStorage 注入、DOM mutation、store 注入或测试夹具冒充浏览器 GUI 流程。

### 0.4 领域对象与关系

```text
User
 ├─ WeddingTask[]
 ├─ WeddingExpense[] ── taskId? ──> WeddingTask
 └─ WeddingBudget?                    （每用户最多一条）
```

- `WeddingTask`：任务名称、类别、状态、优先级、可空计划日期、服务端维护的可空完成日期和备注。
- `WeddingExpense`：日期、条目名称、独立保存的类别、计划金额、实际金额、支付状态、备注，以及可选任务关联。
- `WeddingBudget`：每用户唯一的总预算和婚礼日期；不保存 `currentSpent`。
- 花费类别复用 `WeddingTaskCategory`，但它是花费创建时的独立快照，不随关联任务类别变化。这样任务删除或改类后，历史分类统计仍稳定。
- 删除任务时，数据库通过 `ON DELETE SET NULL` 清空花费的 `taskId`；花费金额、类别、条目名称和日期全部保留。
- 删除用户时，三个 Wedding 资源都通过外键级联删除。

### 0.5 字段、日期和状态规则

- `taskName` 和 `itemName` 在服务端 trim 后长度为 `1..200`；空白字符串无效。
- `notes` 在服务端 trim，最多 2000 字符；空字符串和 `null` 都保存为 `null`。
- `priority` 是整数 `1..5`，`5` 最高；创建任务未传时默认 `3`。
- 创建任务未传 `status` 时默认 `pending`。
- `plannedDate` 可空；创建时缺省为 `null`。PATCH 中字段缺省表示不修改，`plannedDate: null` 表示清空。
- 客户端永远不能提交 `completedDate`；create/PATCH strict schema 遇到该字段必须返回 400。
- 创建任务且最终状态为 `completed` 时，后端把 `completedDate` 设置为服务端 UTC 当天。
- 从非 `completed` 转为 `completed` 时写入服务端 UTC 当天；`completed -> completed` 保留原完成日期。
- 从 `completed` 转为其他任意状态时清空 `completedDate`；以后重新完成时写入新的服务端 UTC 当天。
- `cancelled` 不出现在三列主看板，不进入任务完成率的分母；它只在独立归档区显示。
- 日期允许早于今天或晚于婚礼日期；后端不隐式改期、完成或取消任务。
- `daysUntilWedding` 是婚礼 `DATE` 与服务端 UTC 当天之间的有符号日历日差：未来为正、当天为 `0`、过去为负。UI 必须区分“今天”和“已过去 N 天”，不能一律截断成 0。

### 0.6 金额、支付状态和派生统计规则

- `plannedAmount`、`actualAmount`、`totalBudget` 均为 `0..9999999999.99`，最多两位小数；API DTO 使用 `number`，Prisma 使用 `Decimal(12,2)`。
- `actualAmount` 表示已经确认发生的成本，不表示已经支付的现金；`unpaid` 且 `actualAmount > 0` 是合法组合。
- `PaidStatus` 只用于展示未支付、部分支付、已支付，不能用于计算支付百分比或已支付金额。
- 所有金额聚合使用 Prisma `Decimal`，聚合完成后才转换为 DTO `number`；不能用 JavaScript 浮点累加作为事实来源。
- `plannedExpenseTotal = sum(all current-user wedding expenses.plannedAmount)`。
- `actualExpenseTotal = sum(all current-user wedding expenses.actualAmount)`。
- 上述总额包含未关联任务、已取消任务关联和任务删除后解除关联的全部花费。
- 有预算时 `remainingBudget = totalBudget - actualExpenseTotal`，允许为负数；无预算时为 `null`。
- 有预算且 `totalBudget > 0` 时，`budgetUsedPercentage = actualExpenseTotal / totalBudget * 100`，`plannedBudgetPercentage = plannedExpenseTotal / totalBudget * 100`；四舍五入到两位且不 clamp，允许大于 100。
- 无预算或 `totalBudget = 0` 时，两个预算百分比都返回 `null`，避免把未定义比例伪装成 0%。
- `actualVsPlannedPercentage = actualExpenseTotal / plannedExpenseTotal * 100`；计划总额为 0 时返回 `null`，否则四舍五入到两位且不 clamp。
- `taskCompletionPercentage = completed / (pending + in_progress + completed) * 100`，四舍五入到两位；没有非取消任务时返回 `0`。
- 类别统计固定按 `WeddingTaskCategory` 枚举顺序返回全部类别；零值类别也返回。每项包含 `plannedAmount`、`actualAmount`、`expenseCount` 和 `actualPercentage`。
- `actualPercentage` 是该类别实际金额占全部实际金额的百分比；实际总额为 0 时所有类别返回 0，否则四舍五入到两位。
- 不强行修正四舍五入后类别百分比之和为 100。

### 0.7 查询、排序、关联和错误规则

- 任务列表可按单一 `status`、单一 `category` 过滤；支持 `limit`、`offset`。默认 `limit=50`、`offset=0`，`limit` 范围 `1..100`，`offset` 范围 `0..1000000`。
- 任务稳定排序：`priority DESC`、`plannedDate ASC NULLS LAST`、`createdAt ASC`、`id ASC`。
- 花费列表可按包含边界的 `startDate/endDate`、`category`、`paidStatus` 过滤；支持同样的 offset 分页。
- 花费稳定排序：`date DESC`、`createdAt DESC`、`id DESC`。
- 列表响应沿用 Finance 的数组响应，不新增分页包络。前端“加载更多”以返回数量小于请求 `limit` 判断结束，并按 id 去重追加。
- 创建花费或 PATCH `taskId` 为非 null 时，必须先确认该任务属于当前用户；其他用户任务 id 与不存在 id 都返回相同 404。
- PATCH 字段缺省表示不修改；`taskId: null` 解除关联；`notes: null`、`plannedDate: null` 清空对应字段。
- 所有 POST/PATCH/PUT schema 都是 strict，空 PATCH、未知字段、无效 UUID、反向日期范围、非法枚举、三位小数、NaN/Infinity 均返回 `400 VALIDATION_ERROR`。
- 所有资源查找、更新、删除和关联校验必须以当前 `userId` 为门禁。不存在资源和跨用户资源统一返回 `404 NOT_FOUND`，消息不得泄露是否属于其他用户。
- 任务/花费写入期间发生外键目标消失或 Prisma `P2025/P2003` 时，service 映射为对应 Wedding 404，不能暴露成 500。
- 未认证继续由现有 auth middleware 返回 `401 UNAUTHORIZED`。本阶段没有需要 409 的业务规则。

### 0.8 时间线规则

- 时间线 item 只来源于当前用户、`status != cancelled` 且 `plannedDate != null` 的任务。
- 费用、任务依赖和预算不作为时间线 item；婚礼日期单独作为响应 header 信息和 UI 终点标记。
- item 以 `plannedDate ASC`、`createdAt ASC`、`id ASC` 稳定排序。
- `completedDate` 只显示完成信息，不代替 `plannedDate` 定位；已完成但没有计划日期的任务不进入时间线。
- `isOverdue = status != completed && plannedDate < UTC today`。婚礼已过去不自动改变任务状态。
- 时间线是日期里程碑视图，不得命名或宣传为支持依赖关系的甘特图。

---

## 1. API 契约

所有路径以 `/api/wedding` 为前缀并需要 Bearer JWT。成功响应继续包裹为 `{ success: true, data, message? }`。

### 1.1 备婚任务

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/tasks?status=&category=&limit=&offset=` | 查询当前用户任务 |
| `POST` | `/tasks` | 创建任务 |
| `PATCH` | `/tasks/:id` | 部分更新任务，完成日期由服务端维护 |
| `DELETE` | `/tasks/:id` | 删除任务，关联花费保留并解除关联 |

创建示例：

```json
{
  "taskName": "确认婚礼场地",
  "category": "venue",
  "plannedDate": "2026-10-01",
  "status": "pending",
  "priority": 5,
  "notes": "确认档期、菜单和定金"
}
```

`status`、`priority`、`plannedDate`、`notes` 创建时可缺省；`PATCH` 至少包含一个允许字段：`taskName`、`category`、`plannedDate`、`status`、`priority`、`notes`。`completedDate` 不在请求 DTO 中。

```typescript
interface WeddingTaskResponse {
  id: string
  userId: string
  taskName: string
  category: WeddingTaskCategory
  plannedDate: string | null
  completedDate: string | null
  status: TaskStatus
  priority: number
  notes: string | null
  createdAt: string
  updatedAt: string
}
```

### 1.2 备婚花费

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/expenses?startDate=&endDate=&category=&paidStatus=&limit=&offset=` | 查询当前用户花费 |
| `POST` | `/expenses` | 创建花费，可选关联任务 |
| `PATCH` | `/expenses/:id` | 部分更新花费或解除任务关联 |
| `DELETE` | `/expenses/:id` | 删除花费 |

创建示例：

```json
{
  "taskId": "task-uuid",
  "date": "2026-08-04",
  "itemName": "场地定金",
  "category": "venue",
  "plannedAmount": 20000,
  "actualAmount": 18000,
  "paidStatus": "partial",
  "notes": "已支付首期"
}
```

`taskId` 和 `notes` 可缺省；`PATCH` 至少包含一个允许字段：`taskId`、`date`、`itemName`、`category`、`plannedAmount`、`actualAmount`、`paidStatus`、`notes`。

```typescript
interface WeddingExpenseTaskReference {
  id: string
  taskName: string
}

interface WeddingExpenseResponse {
  id: string
  userId: string
  taskId: string | null
  task: WeddingExpenseTaskReference | null
  date: string
  itemName: string
  category: WeddingTaskCategory
  plannedAmount: number
  actualAmount: number
  paidStatus: PaidStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}
```

### 1.3 WeddingBudget

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/budget` | 查询当前用户预算；没有记录时 `data: null` |
| `PUT` | `/budget` | 以当前用户为键幂等创建或替换预算与婚礼日期 |

请求体两个字段均必填：

```json
{
  "totalBudget": 150000,
  "weddingDate": "2026-11-08"
}
```

```typescript
interface WeddingBudgetResponse {
  id: string
  totalBudget: number
  weddingDate: string
  createdAt: string
  updatedAt: string
}
```

数据库必须以 `userId` 唯一约束支持并发安全 upsert；不暴露 budget id 作为写入键。

### 1.4 预算和进度概览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/overview` | 获取当前用户完整预算、花费和任务派生统计 |

```typescript
interface WeddingCategorySummary {
  category: WeddingTaskCategory
  plannedAmount: number
  actualAmount: number
  expenseCount: number
  actualPercentage: number
}

interface WeddingTaskCounts {
  pending: number
  inProgress: number
  completed: number
  cancelled: number
  activeTotal: number
  completionPercentage: number
}

interface WeddingOverviewResponse {
  budget: WeddingBudgetResponse | null
  plannedExpenseTotal: number
  actualExpenseTotal: number
  expenseCount: number
  remainingBudget: number | null
  budgetUsedPercentage: number | null
  plannedBudgetPercentage: number | null
  actualVsPlannedPercentage: number | null
  daysUntilWedding: number | null
  taskCounts: WeddingTaskCounts
  categoryBreakdown: WeddingCategorySummary[]
}
```

没有预算时仍返回花费、任务和类别统计；仅 `budget`、`remainingBudget`、两个预算百分比和 `daysUntilWedding` 为 `null`。

### 1.5 里程碑时间线

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/timeline` | 获取婚期 header 与按计划日期排序的当前用户任务里程碑 |

```typescript
interface WeddingTimelineItem {
  taskId: string
  taskName: string
  category: WeddingTaskCategory
  status: TaskStatus
  priority: number
  plannedDate: string
  completedDate: string | null
  isOverdue: boolean
}

interface WeddingTimelineResponse {
  weddingDate: string | null
  daysUntilWedding: number | null
  items: WeddingTimelineItem[]
}
```

---

## 2. 文件结构与职责

先按以下结构实现；只有测试证明需要时才增加文件。组件保持单一职责，不把看板、图表、表单和页面编排塞进一个超大文件。

```text
xiaowoniu/
├── shared/
│   └── src/
│       ├── types/models/wedding.ts              # Task、Expense、Budget 响应模型
│       ├── types/api/wedding.ts                 # 请求、查询、overview、timeline DTO
│       └── index.ts                             # 导出 Wedding 类型
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma                        # User 关系和三个 Wedding 模型
│   │   └── migrations/20260804120000_add_wedding_tables/migration.sql
│   ├── src/
│   │   ├── validation/wedding.schemas.ts        # strict envelope、日期、金额和 PATCH 校验
│   │   ├── services/wedding.service.ts          # 用户隔离、关联门禁、聚合和时间线
│   │   ├── controllers/wedding.controller.ts   # HTTP 输入输出和 404 映射
│   │   ├── routes/wedding.routes.ts             # auth -> validate -> controller
│   │   └── routes/index.ts                      # 挂载 /wedding
│   └── src/__tests__/
│       ├── wedding.schemas.test.ts
│       ├── wedding.service.test.ts
│       └── wedding.routes.test.ts
├── frontend/
│   └── src/
│       ├── services/wedding.service.ts          # Axios API 解包
│       ├── services/wedding.service.test.ts
│       ├── store/wedding.store.ts               # 数据、分页和请求失效策略
│       ├── store/wedding.store.test.ts
│       ├── store/auth.store.ts                  # 同时 reset Finance/Wedding
│       ├── store/auth.store.test.ts
│       ├── components/wedding/
│       │   ├── wedding.constants.ts             # 前端本地选项和标签
│       │   ├── WeddingTaskDialog.tsx            # 创建/编辑任务
│       │   ├── WeddingExpenseDialog.tsx         # 创建/编辑花费
│       │   ├── WeddingBudgetDialog.tsx          # 设置预算与婚期
│       │   ├── WeddingDeleteDialog.tsx          # 任务/花费删除确认
│       │   ├── WeddingOverview.tsx              # 预算、倒计时、任务统计和分类图
│       │   ├── WeddingTaskBoard.tsx             # 三列看板与取消归档
│       │   ├── WeddingTimeline.tsx              # 日期里程碑
│       │   └── WeddingExpenseList.tsx            # 花费列表和加载更多
│       ├── components/wedding/wedding-dialogs.test.tsx
│       ├── pages/Wedding/index.tsx               # 受保护备婚工作台
│       ├── pages/Wedding/wedding-components.test.tsx
│       ├── pages/Wedding/wedding-page.test.tsx
│       ├── pages/wedding-routing.test.tsx
│       ├── pages/Dashboard.tsx                   # 激活“嫁嫁嫁”入口
│       ├── routes/index.tsx                      # lazy /wedding
│       └── index.css                             # wedding-page 作用域样式
├── README.md
├── backend/README.md
├── backend/API.md
└── frontend/README.md
```

前端运行时不要从当前 CommonJS `shared/dist/index.js` 直接命名导入枚举/标签对象；Phase 6 已证明 Rollup 无法稳定静态分析这些 runtime export。业务类型继续从 shared `import type`，表单选项和中文标签在 `wedding.constants.ts` 用字符串值加类型断言定义。

---

## 3. 任务分解

### 任务 1：定义 Wedding shared DTO

**文件：**
- 创建：`shared/src/types/models/wedding.ts`
- 创建：`shared/src/types/api/wedding.ts`
- 修改：`shared/src/index.ts`
- 测试：shared TypeScript build

- [ ] **步骤 1：先确认缺失类型红灯**

在随后将创建的调用侧测试类型中引用 `WeddingTaskResponse`、`WeddingOverviewResponse`，确认 shared 尚未导出时 `tsc` 失败。不要提交临时测试文件。

- [ ] **步骤 2：定义领域响应模型**

`types/models/wedding.ts` 定义并导出：

- `WeddingTaskResponse`
- `WeddingExpenseTaskReference`
- `WeddingExpenseResponse`
- `WeddingBudgetResponse`

字段必须与第 1 节契约完全一致。枚举字段使用：

```typescript
import type { PaidStatus, TaskStatus, WeddingTaskCategory } from '../../constants/enums'
```

不要把 Prisma `Decimal`、`Date` 或数据库 relation object 泄露到 shared；金额是 `number`，日期是字符串。

- [ ] **步骤 3：定义请求、查询和派生响应 DTO**

`types/api/wedding.ts` 定义：

```typescript
export interface CreateWeddingTaskRequest {
  taskName: string
  category: WeddingTaskCategory
  plannedDate?: string | null
  status?: TaskStatus
  priority?: number
  notes?: string | null
}

export interface UpdateWeddingTaskRequest {
  taskName?: string
  category?: WeddingTaskCategory
  plannedDate?: string | null
  status?: TaskStatus
  priority?: number
  notes?: string | null
}

export interface WeddingTaskQueryParams {
  status?: TaskStatus
  category?: WeddingTaskCategory
  limit?: number
  offset?: number
}

export interface CreateWeddingExpenseRequest {
  taskId?: string | null
  date: string
  itemName: string
  category: WeddingTaskCategory
  plannedAmount: number
  actualAmount: number
  paidStatus: PaidStatus
  notes?: string | null
}

export interface UpdateWeddingExpenseRequest {
  taskId?: string | null
  date?: string
  itemName?: string
  category?: WeddingTaskCategory
  plannedAmount?: number
  actualAmount?: number
  paidStatus?: PaidStatus
  notes?: string | null
}

export interface WeddingExpenseQueryParams {
  startDate?: string
  endDate?: string
  category?: WeddingTaskCategory
  paidStatus?: PaidStatus
  limit?: number
  offset?: number
}

export interface UpsertWeddingBudgetRequest {
  totalBudget: number
  weddingDate: string
}
```

同时定义第 1.4、1.5 节的 category summary、task counts、overview、timeline item 和 timeline response。

- [ ] **步骤 4：导出类型并运行构建**

在 `shared/src/index.ts` 追加：

```typescript
export * from './types/models/wedding'
export * from './types/api/wedding'
```

运行：

```bash
pnpm --filter @xiaowoniu/shared build
```

预期：`tsc` 成功，所有 Wedding DTO 可从 `@xiaowoniu/shared` 以 type import 使用。

- [ ] **步骤 5：Commit**

```bash
git add shared/src/index.ts shared/src/types/models/wedding.ts shared/src/types/api/wedding.ts
git commit -m "feat(shared): define wedding contracts"
```

### 任务 2：创建 Wedding Prisma 模型和增量迁移

**文件：**
- 修改：`backend/prisma/schema.prisma`
- 创建：`backend/prisma/migrations/20260804120000_add_wedding_tables/migration.sql`
- 测试：Prisma validate/generate/status/deploy

- [ ] **步骤 1：修改 schema 并先运行 validate**

在 `User` 增加：

```prisma
  weddingTasks    WeddingTask[]    @relation("UserWeddingTasks")
  weddingExpenses WeddingExpense[] @relation("UserWeddingExpenses")
  weddingBudget   WeddingBudget?   @relation("UserWeddingBudget")
```

新增模型：

```prisma
model WeddingTask {
  id            String           @id @default(uuid())
  userId        String           @map("user_id")
  user          User             @relation("UserWeddingTasks", fields: [userId], references: [id], onDelete: Cascade)
  taskName      String           @map("task_name") @db.VarChar(200)
  category      String           @db.VarChar(32)
  plannedDate   DateTime?        @map("planned_date") @db.Date
  completedDate DateTime?        @map("completed_date") @db.Date
  status        String           @default("pending") @db.VarChar(32)
  priority      Int              @default(3)
  notes         String?          @db.Text
  createdAt     DateTime         @default(now()) @map("created_at")
  updatedAt     DateTime         @updatedAt @map("updated_at")
  expenses      WeddingExpense[] @relation("WeddingTaskExpenses")

  @@index([userId, status, plannedDate])
  @@index([userId, category, plannedDate])
  @@map("wedding_tasks")
}

model WeddingExpense {
  id            String       @id @default(uuid())
  userId        String       @map("user_id")
  user          User         @relation("UserWeddingExpenses", fields: [userId], references: [id], onDelete: Cascade)
  taskId        String?      @map("task_id")
  task          WeddingTask? @relation("WeddingTaskExpenses", fields: [taskId], references: [id], onDelete: SetNull)
  date          DateTime     @db.Date
  itemName      String       @map("item_name") @db.VarChar(200)
  category      String       @db.VarChar(32)
  plannedAmount Decimal      @map("planned_amount") @db.Decimal(12, 2)
  actualAmount  Decimal      @map("actual_amount") @db.Decimal(12, 2)
  paidStatus    String       @map("paid_status") @db.VarChar(32)
  notes         String?      @db.Text
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")

  @@index([userId, date])
  @@index([userId, category, date])
  @@index([userId, paidStatus, date])
  @@index([taskId])
  @@map("wedding_expenses")
}

model WeddingBudget {
  id          String   @id @default(uuid())
  userId      String   @unique @map("user_id")
  user        User     @relation("UserWeddingBudget", fields: [userId], references: [id], onDelete: Cascade)
  totalBudget Decimal  @map("total_budget") @db.Decimal(12, 2)
  weddingDate DateTime @map("wedding_date") @db.Date
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("wedding_budgets")
}
```

运行：

```bash
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' pnpm --dir backend exec prisma validate
```

预期：schema 校验成功。不可连接数据库不影响 `validate`，但不代表迁移已部署。

- [ ] **步骤 2：写入可审阅 migration SQL**

创建 `20260804120000_add_wedding_tables/migration.sql`，必须包含：

- 三张表、主键和 snake_case 列。
- `wedding_tasks.user_id -> users.id ON DELETE CASCADE`。
- `wedding_expenses.user_id -> users.id ON DELETE CASCADE`。
- `wedding_expenses.task_id -> wedding_tasks.id ON DELETE SET NULL`。
- `wedding_budgets.user_id -> users.id ON DELETE CASCADE` 和唯一索引。
- 与 Prisma schema 相同的任务/花费索引。
- `wedding_tasks_priority_check`：`priority BETWEEN 1 AND 5`。
- `wedding_expenses_amount_check`：两个金额都 `>= 0`。
- `wedding_budgets_total_budget_check`：总预算 `>= 0`。

不要修改任何既有 migration，不持久化 `current_spent`、百分比、倒计时或 `is_overdue`。

- [ ] **步骤 3：生成 Client 并执行 live migration**

逐条运行，确保每一条命令都带 `DATABASE_URL`：

```bash
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' pnpm --dir backend exec prisma generate
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' pnpm --dir backend exec prisma migrate status
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' pnpm --dir backend exec prisma migrate deploy
```

预期：Client 生成成功，migration deploy 实际连接 PostgreSQL 并应用迁移。数据库不可连接时，记录原始失败输出；绝不能用 validate/generate 代替 live deploy。

- [ ] **步骤 4：Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/20260804120000_add_wedding_tables/migration.sql
git commit -m "feat(backend): add wedding persistence"
```

### 任务 3：实现 Wedding Zod 校验和边界测试

**文件：**
- 创建：`backend/src/validation/wedding.schemas.ts`
- 创建：`backend/src/__tests__/wedding.schemas.test.ts`

- [ ] **步骤 1：先写 schema 失败测试**

覆盖：

- 严格 UTC round-trip 日期：闰日有效，`2026-02-30`、月/日越界和带时间字符串无效。
- 金额接受 `0`、`0.01`、上界和两位小数；拒绝负数、超过上界、三位小数、NaN、Infinity。
- 任务名称 trim 后非空且不超过 200；priority 只接受 `1..5` 整数。
- 创建任务默认字段可缺省，枚举只接受 shared 值。
- create/PATCH 出现 `completedDate`、未知字段或空 PATCH 时返回失败。
- PATCH 接受 `plannedDate: null`、`notes: null`。
- 花费 taskId 接受 UUID 或 null；日期、名称、类别、两个金额和 paidStatus 必填。
- 花费 PATCH 接受 `taskId: null`、`notes: null`，拒绝空对象和未知字段。
- query 的 limit/offset 边界、非法枚举、反向日期范围。
- budget 两字段必填，日期和金额边界正确；未知字段失败。
- id route params 必须是 UUID；GET budget/overview/timeline 只接受空 query/body/params。

运行并确认红灯：

```bash
pnpm --filter @xiaowoniu/backend test -- --run src/__tests__/wedding.schemas.test.ts
```

- [ ] **步骤 2：实现 strict envelope schemas**

复用 Finance 已验证的 helper 形式：

- `strictDateString`
- `moneySchema`
- `trimmedString`
- `optionalNullableNotes`
- `paginationQuery`
- `atLeastOneField`

所有路由 schema 校验 `{ body, query, params }` 完整 envelope，三个层级均 `.strict()`。导出：

- `weddingTaskQuerySchema`
- `createWeddingTaskSchema`
- `updateWeddingTaskRouteSchema`
- `weddingExpenseQuerySchema`
- `createWeddingExpenseSchema`
- `updateWeddingExpenseRouteSchema`
- `upsertWeddingBudgetSchema`
- `weddingIdParamSchema`
- `weddingEmptySchema`

`weddingExpenseQuerySchema.superRefine` 在 startDate/endDate 同时存在且 start > end 时给出明确 validation issue。

- [ ] **步骤 3：运行测试和后端 build**

```bash
pnpm --filter @xiaowoniu/backend test -- --run src/__tests__/wedding.schemas.test.ts
pnpm --filter @xiaowoniu/backend build
```

预期：边界测试和 TypeScript 构建通过。

- [ ] **步骤 4：Commit**

```bash
git add backend/src/validation/wedding.schemas.ts backend/src/__tests__/wedding.schemas.test.ts
git commit -m "feat(backend): validate wedding requests"
```

### 任务 4：实现 Wedding service、用户隔离和派生统计

**文件：**
- 创建：`backend/src/services/wedding.service.ts`
- 创建：`backend/src/__tests__/wedding.service.test.ts`

- [ ] **步骤 1：先写 service 失败测试**

以独立 Prisma mock/transaction client 覆盖：

1. 所有 task/expense/budget/overview/timeline 查询带 `userId`。
2. 任务过滤、分页和稳定排序；plannedDate null 最后。
3. 任务创建默认 pending/priority 3；创建 completed 写 fake clock 的 UTC 当天。
4. 状态转换矩阵：首次完成写日期、重复 completed 保留、离开 completed 清空、重新完成写新日期。
5. task 更新先 `findFirst({ id, userId })` 门禁，再用唯一 `{ id }` 更新；不存在和跨用户都抛 `WeddingNotFoundError`。
6. 删除任务使用 user-scoped delete；关联花费由数据库 SetNull，service 不删除花费。
7. 花费创建/改绑时 task 必须属于当前用户；不存在和跨用户 id 都抛相同 404；`taskId:null` 正确解绑。
8. `P2003/P2025` 竞态错误映射为 Wedding 404。
9. 花费筛选包含日期两端，金额映射使用 Decimal，关联 task reference 正确返回。
10. budget `findUnique({ userId })` 和 `upsert({ where: { userId } })`，无记录返回 null，并发依赖唯一约束保持单例。
11. overview 覆盖无数据、无预算、零预算、恰好用完、超预算、实际超计划、计划为零和 Decimal 精确加法。
12. overview 的 cancelled 不进入 activeTotal，类别按固定枚举顺序零填充，PaidStatus 不改变 actual 总额。
13. timeline 排除 cancelled/null plannedDate，包含 completed，按日期/创建/id 稳定排序，并基于 fake UTC today 计算 overdue。
14. daysUntilWedding 覆盖未来、当天、过去、闰日和无预算。

运行并确认红灯：

```bash
pnpm --filter @xiaowoniu/backend test -- --run src/__tests__/wedding.service.test.ts
```

- [ ] **步骤 2：实现映射和领域 helper**

`wedding.service.ts` 内实现少量明确 helper：

- `utcDate(value)` / `formatDate(date)` / `utcToday()`。
- `numberValue` / `decimalValue`。
- `roundPercentage`，固定四舍五入两位，不 clamp。
- `toTaskResponse`、`toExpenseResponse`、`toBudgetResponse`。
- `pagination` 和 date filter。
- `WeddingNotFoundError`。

不要增加通用 repository/base service。该逻辑只属于 Wedding 垂直切片。

- [ ] **步骤 3：实现任务和花费 CRUD**

关键约束：

- 每个 mutation 都先通过当前 `userId` 判断目标是否存在。
- 任务状态转换依据数据库现值与请求最终值计算 completedDate。
- task relation 校验必须查询 `{ id: taskId, userId }`，不能只查 id。
- 更新只能在通过门禁后使用 Prisma 唯一 `{ id }` selector；禁止 `as any` 绕过 Prisma 类型。
- delete 可用 `deleteMany({ id, userId })` 并根据 count 转 404。
- notes 在写入前 trim，空值存 null。
- 花费查询 `include/select` 任务的 id 和 taskName；任务被删除后返回 `taskId:null, task:null`。

- [ ] **步骤 4：实现 budget、overview 和 timeline**

- budget 用 `userId` unique upsert。
- overview 可并行读取 budget、expenses、task count；所有 where 都包含 userId。
- 为保证 Decimal 精度，可读取两个金额字段后以 `Prisma.Decimal` 累加；不能先转换 number 再求和。
- categoryBreakdown 从 `Object.values(WeddingTaskCategory)` 初始化零项，再累加实际记录。
- timeline 只读取必要字段，过滤用户、取消状态和 null 日期，稳定排序后映射 overdue。
- `utcToday()` 必须可在 Vitest fake timers 下确定，不能使用浏览器本地日期算法。

- [ ] **步骤 5：运行聚焦测试、完整后端测试和 build**

```bash
pnpm --filter @xiaowoniu/backend test -- --run src/__tests__/wedding.service.test.ts
pnpm --filter @xiaowoniu/backend test -- --run
pnpm --filter @xiaowoniu/backend build
```

预期：Wedding service 测试、已有 Fitness/Learning/Finance 测试和后端 build 全部通过。

- [ ] **步骤 6：Commit**

```bash
git add backend/src/services/wedding.service.ts backend/src/__tests__/wedding.service.test.ts
git commit -m "feat(backend): add wedding service"
```

### 任务 5：接入 Wedding controller、routes 和 API 文档

**文件：**
- 创建：`backend/src/controllers/wedding.controller.ts`
- 创建：`backend/src/routes/wedding.routes.ts`
- 修改：`backend/src/routes/index.ts`
- 创建：`backend/src/__tests__/wedding.routes.test.ts`
- 修改：`backend/API.md`

- [ ] **步骤 1：先写真实 Express/HTTP 路由失败测试**

测试必须启动真实 Express app/Node HTTP listener 并发请求，不能只检查 Router stack metadata。mock service 以隔离数据库，但要验证完整 middleware 链：

- 12 条 `/api/wedding` 路径和 HTTP 方法均可达。
- `authMiddleware` 在 validator/controller 前执行；无 token 返回 401。
- body/query/params 不合法返回 400 且 service 未调用。
- controller 使用 `req.user.userId`，不接受 body/query 伪造 userId。
- task/expense 不存在或跨用户 service error 都映射 404。
- DELETE 成功返回 `data:null`；GET budget 可返回 `data:null`。
- service 未知异常交给统一 error middleware，不吞掉为成功。
- `/api/v1/wedding` 不存在；PUT 只用于 singleton budget，资源局部更新只用 PATCH。

运行并确认红灯：

```bash
pnpm --filter @xiaowoniu/backend test -- --run src/__tests__/wedding.routes.test.ts
```

- [ ] **步骤 2：实现 controller 和 route 顺序**

每条路由固定为：

```text
authMiddleware -> validate(schema) -> bound controller method
```

controller 只负责 DTO cast、service 调用、成功文案和 error 映射。将 `WeddingNotFoundError` 映射为 404 `NOT_FOUND`。不要在 controller 重复业务计算。

- [ ] **步骤 3：挂载 `/api/wedding` 并完善 API 文档**

在 `backend/src/routes/index.ts`：

```typescript
import weddingRoutes from './wedding.routes'
router.use('/wedding', weddingRoutes)
```

`backend/API.md` 记录：

- 12 条 endpoint、请求/响应示例和 query 边界。
- null 清空语义、服务端 completedDate 状态机。
- budget 无记录的 `data:null`。
- overview 公式、零预算 null 百分比和固定类别零填充。
- timeline 排除规则与 signed countdown。
- 所有资源用户隔离、关联任务门禁、跨用户 404。
- 400/401/404 格式；Wedding 无 409 规则。

- [ ] **步骤 4：运行聚焦和完整后端验证**

```bash
pnpm --filter @xiaowoniu/backend test -- --run src/__tests__/wedding.routes.test.ts
pnpm --filter @xiaowoniu/backend test -- --run
pnpm --filter @xiaowoniu/backend build
```

- [ ] **步骤 5：Commit**

```bash
git add backend/src/controllers/wedding.controller.ts backend/src/routes/wedding.routes.ts backend/src/routes/index.ts backend/src/__tests__/wedding.routes.test.ts backend/API.md
git commit -m "feat(backend): expose wedding api"
```

### 任务 6：实现前端 Wedding API service

**文件：**
- 创建：`frontend/src/services/wedding.service.ts`
- 创建：`frontend/src/services/wedding.service.test.ts`

- [ ] **步骤 1：先写 Axios service 失败测试**

mock 现有 `api` 实例，逐个验证：

- `getTasks(params)` -> `GET /wedding/tasks`。
- `createTask`、`updateTask`、`deleteTask` 使用 POST/PATCH/DELETE。
- `getExpenses(params)` 和三种 mutation 路径/方法正确。
- `getBudget`、`upsertBudget` 使用 GET/PUT 单数 `/wedding/budget`。
- `getOverview`、`getTimeline` 使用准确路径。
- query 参数原样交给 Axios params，不手拼 query string。
- 统一解包 `ApiSuccessResponse.data`；budget null 保留 null，DELETE 返回 void。
- Axios 错误不转换为成功或吞掉。

运行并确认红灯：

```bash
pnpm --filter @xiaowoniu/frontend test -- --run src/services/wedding.service.test.ts
```

- [ ] **步骤 2：实现 typed service**

只以 `import type` 从 shared 引入请求/响应类型。导出单例 `weddingService`，方法名与 store action 一致。不要创建第二个 Axios 实例或手动拼 Authorization header。

- [ ] **步骤 3：运行测试和 TypeScript 检查**

```bash
pnpm --filter @xiaowoniu/frontend test -- --run src/services/wedding.service.test.ts
pnpm --dir frontend exec tsc --noEmit
```

- [ ] **步骤 4：Commit**

```bash
git add frontend/src/services/wedding.service.ts frontend/src/services/wedding.service.test.ts
git commit -m "feat(frontend): add wedding api client"
```

### 任务 7：实现 Wedding Zustand store 和跨会话 reset

**文件：**
- 创建：`frontend/src/store/wedding.store.ts`
- 创建：`frontend/src/store/wedding.store.test.ts`
- 修改：`frontend/src/store/auth.store.ts`
- 修改：`frontend/src/store/auth.store.test.ts`

- [ ] **步骤 1：先写 store 失败测试**

覆盖：

- 初始 state：空 tasks/expenses、null budget/overview/timeline、loading false、error null、两个 `hasMore` 为 true。
- `fetchDashboard` 并行获取首批 tasks、expenses、budget、overview、timeline。
- `fetchTasks/fetchExpenses` offset 0 替换，offset > 0 按 id 去重追加，并根据 page size 更新 hasMore。
- task 创建/更新成功先更新对应列表，再刷新 tasks、expenses、overview、timeline；任务名称/关联变化后 expense reference 不陈旧。
- task 删除从列表移除，并刷新 tasks、expenses、overview、timeline，确保 SetNull 后关联展示更新。
- expense 创建/更新/删除刷新 expenses 和 overview，不无意义刷新 timeline。
- budget upsert 刷新 budget、overview、timeline，确保倒计时同步。
- mutation 成功但部分 refresh 失败时保留成功结果并显示 `操作已成功，但数据刷新失败`。
- 旧请求、reset 前请求和旧分页请求不能回写新 state；并发 loading 计数不会提前变 false。
- API 错误从统一 response 中提取中文消息；失败 mutation 抛回组件并保留表单。
- `reset()` 递增 generation、废弃所有 token、清空数据和错误。

运行并确认红灯：

```bash
pnpm --filter @xiaowoniu/frontend test -- --run src/store/wedding.store.test.ts
```

- [ ] **步骤 2：实现资源级请求 token 和刷新依赖**

state 至少包含：

```typescript
tasks: WeddingTaskResponse[]
expenses: WeddingExpenseResponse[]
budget: WeddingBudgetResponse | null
overview: WeddingOverviewResponse | null
timeline: WeddingTimelineResponse | null
tasksHasMore: boolean
expensesHasMore: boolean
loading: boolean
error: string | null
```

资源 token 为 `tasks | expenses | budget | overview | timeline`。沿用 Finance 的 generation/version/activeActions 思路，但不要复制月份版本；分页请求用当前 resource version 防止旧 offset append。

默认首批请求使用 `limit: 50, offset: 0`。看板和花费列表提供显式“加载更多”，不能静默假装只有前 50 条数据。

- [ ] **步骤 3：补齐 auth store reset**

当前 `auth.store.ts` 只 reset Fitness/Learning，存在 Finance 数据跨账号残留风险。引入 `useFinanceStore` 和 `useWeddingStore`，在以下路径统一 reset 四个业务 store：

- login 成功、保存新用户之前。
- register 成功、保存新用户之前。
- logout finally。
- `checkAuth` 检测 previous user id 与新 user id 不同时。

扩展 `auth.store.test.ts`，断言四个 reset 在上述路径被调用；同一用户 `checkAuth` 不重复 reset。不要改动认证 token 持久化规则。

- [ ] **步骤 4：运行 store、auth 和完整前端测试**

```bash
pnpm --filter @xiaowoniu/frontend test -- --run src/store/wedding.store.test.ts src/store/auth.store.test.ts
pnpm --filter @xiaowoniu/frontend test -- --run
pnpm --dir frontend exec tsc --noEmit
```

- [ ] **步骤 5：Commit**

```bash
git add frontend/src/store/wedding.store.ts frontend/src/store/wedding.store.test.ts frontend/src/store/auth.store.ts frontend/src/store/auth.store.test.ts
git commit -m "feat(frontend): add wedding state management"
```

### 任务 8：实现 Wedding 表单和删除确认

**文件：**
- 创建：`frontend/src/components/wedding/wedding.constants.ts`
- 创建：`frontend/src/components/wedding/WeddingTaskDialog.tsx`
- 创建：`frontend/src/components/wedding/WeddingExpenseDialog.tsx`
- 创建：`frontend/src/components/wedding/WeddingBudgetDialog.tsx`
- 创建：`frontend/src/components/wedding/WeddingDeleteDialog.tsx`
- 创建：`frontend/src/components/wedding/wedding-dialogs.test.tsx`

- [ ] **步骤 1：先写交互失败测试**

使用 Testing Library + user-event，覆盖：

- task 新建/编辑预填、默认 status/priority、日期清空提交 null、notes 清空、枚举选择和校验错误。
- task 表单不出现 completedDate 输入；completed 状态只提交 status。
- expense 新建/编辑预填、可选任务、明确的独立类别、两个金额允许 0、task 解绑提交 null。
- budget 同时填写总预算和婚礼日期，允许 0 预算，失败时保留输入。
- 所有金额拒绝三位小数、负数和超界；必填名称 trim 后为空不提交。
- 点击保存期间按钮 disabled，快速双击只调用一次 onSubmit。
- onSubmit reject 时对话框保持打开、字段不丢失，并显示 store/表单错误。
- Escape、取消、右上角关闭、焦点返回 trigger；每个控件有 label 或 aria-label。
- 删除任务文案明确“关联花费会保留并解除关联”；取消不调用 onConfirm，确认只调用一次。

运行并确认红灯：

```bash
pnpm --filter @xiaowoniu/frontend test -- --run src/components/wedding/wedding-dialogs.test.tsx
```

- [ ] **步骤 2：实现前端本地选项常量**

`wedding.constants.ts` 定义 category、task status、paid status、priority 选项和 label map。值使用与 shared enum 完全一致的字符串并以类型断言约束；不要 runtime import shared enum/labels。

- [ ] **步骤 3：实现四个 accessible Dialog**

- 使用现有 Radix Dialog 和 UI primitives，不新增 form library。
- 原生 `input[type=date]` 提交 `YYYY-MM-DD`；可空日期提供清除操作。
- 数字 input 使用 `step="0.01"`、`min="0"`，提交前仍执行代码校验，不能只依赖 HTML attributes。
- category/status/paidStatus 使用现有 Radix Select。
- 任务关联 Select 有“无关联任务”；编辑已关联但任务不在当前分页时，仍显示响应中的 task reference，不误清空。
- 对话框内容在 390px 高度不足时内部可滚动，footer 操作保持可达。
- 使用 `role="alert"` 显示失败，成功关闭由页面在 await 成功后控制。

- [ ] **步骤 4：运行测试和 build**

```bash
pnpm --filter @xiaowoniu/frontend test -- --run src/components/wedding/wedding-dialogs.test.tsx
pnpm --dir frontend exec tsc --noEmit
pnpm --filter @xiaowoniu/frontend build
```

- [ ] **步骤 5：Commit**

```bash
git add frontend/src/components/wedding/wedding.constants.ts frontend/src/components/wedding/WeddingTaskDialog.tsx frontend/src/components/wedding/WeddingExpenseDialog.tsx frontend/src/components/wedding/WeddingBudgetDialog.tsx frontend/src/components/wedding/WeddingDeleteDialog.tsx frontend/src/components/wedding/wedding-dialogs.test.tsx
git commit -m "feat(frontend): add wedding forms and confirmations"
```

### 任务 9：实现预算概览、任务看板、时间线和花费视图

**文件：**
- 创建：`frontend/src/components/wedding/WeddingOverview.tsx`
- 创建：`frontend/src/components/wedding/WeddingTaskBoard.tsx`
- 创建：`frontend/src/components/wedding/WeddingTimeline.tsx`
- 创建：`frontend/src/components/wedding/WeddingExpenseList.tsx`
- 创建：`frontend/src/pages/Wedding/wedding-components.test.tsx`

- [ ] **步骤 1：先写展示和操作失败测试**

覆盖：

- overview 无预算时仍显示花费/任务统计和设置预算入口，不渲染虚假的 0% 使用率。
- 未来婚期、婚礼当天和过去婚期文案不同；null 倒计时有明确空状态。
- 预算恰好用完、超预算负 remaining、百分比超过 100 和 actual-vs-planned null 状态。
- Recharts 类别图按七个固定类别稳定渲染零值；测试不依赖 SVG 视觉细节，只断言数据/标签/accessible summary。
- task board 只有 pending/in_progress/completed 三列，cancelled 只出现在折叠或独立归档区。
- 同一 task 不重复出现在主列和归档；空列不塌陷。
- task status 操作使用明确菜单/按钮调用 onStatusChange，不实现拖拽。
- task edit/delete 和“加载更多”可通过键盘触发。
- timeline 按响应顺序显示日期、任务、状态、逾期与完成信息；空时间线不伪造任务。
- expense list 显示 planned/actual、category、paid status、关联任务或“未关联”；编辑、删除、加载更多正确触发。
- loading skeleton/文本有 `role=status`，错误由页面统一显示，列表不在 refresh 时无故清空。

运行并确认红灯：

```bash
pnpm --filter @xiaowoniu/frontend test -- --run src/pages/Wedding/wedding-components.test.tsx
```

- [ ] **步骤 2：实现 WeddingOverview**

- 使用紧凑工作台布局，不创建营销 hero。
- 显示婚期/倒计时、总预算、实际花费、计划花费、剩余预算和任务完成率。
- 超预算使用红色语义和绝对超支金额；正常预算使用中性底色加粉/蓝小面积强调。
- 使用现有 Recharts 做 category planned vs actual 对比，提供文字版汇总以便小屏和辅助技术读取。
- 不从原始 expenses 在前端重算统计；只消费 overview DTO。

- [ ] **步骤 3：实现三列 TaskBoard 与取消归档**

- desktop 三列，tablet 可两列换行，mobile 单列；列宽使用稳定 grid track，状态 badge 不改变布局。
- priority、category、plannedDate、overdue/complete 信息可扫描。
- 状态切换使用按钮或菜单，至少支持开始、完成、恢复待办、取消；实际更新调用 PATCH store action。
- 不使用 drag handle、拖拽事件或第三方 DnD。
- cancelled archive 默认收起或位于主看板下方，控制按钮有 `aria-expanded`/`aria-controls`。

- [ ] **步骤 4：实现 Timeline 和 ExpenseList**

- Timeline 用语义 list 和 CSS 连接线表达里程碑；婚礼日期是终点信息，不伪造成任务。
- ExpenseList 在桌面可用 table-like grid，在移动端变为单条列表；不能强制固定宽表格导致横向滚动。
- 图标按钮使用 Lucide 并提供 aria-label/tooltip；可见命令可使用图标加文字。
- 两个列表的“加载更多”按钮仅在对应 hasMore 为 true 时显示。

- [ ] **步骤 5：运行组件、完整前端测试和 build**

```bash
pnpm --filter @xiaowoniu/frontend test -- --run src/pages/Wedding/wedding-components.test.tsx
pnpm --filter @xiaowoniu/frontend test -- --run
pnpm --filter @xiaowoniu/frontend build
```

- [ ] **步骤 6：Commit**

```bash
git add frontend/src/components/wedding/WeddingOverview.tsx frontend/src/components/wedding/WeddingTaskBoard.tsx frontend/src/components/wedding/WeddingTimeline.tsx frontend/src/components/wedding/WeddingExpenseList.tsx frontend/src/pages/Wedding/wedding-components.test.tsx
git commit -m "feat(frontend): add wedding dashboard views"
```

### 任务 10：实现 Wedding 页面、受保护路由和 Dashboard 入口

**文件：**
- 创建：`frontend/src/pages/Wedding/index.tsx`
- 创建：`frontend/src/pages/Wedding/wedding-page.test.tsx`
- 创建：`frontend/src/pages/wedding-routing.test.tsx`
- 修改：`frontend/src/routes/index.tsx`
- 修改：`frontend/src/pages/Dashboard.tsx`

- [ ] **步骤 1：先写页面和路由失败测试**

覆盖：

- mount 页面只触发一次首屏 `fetchDashboard`，unmount/reset 后旧请求不回写。
- header 有返回 Dashboard、登出、新建任务、新增花费、设置预算。
- overview 始终在上方；任务看板、时间线、花费明细使用可访问 tab/segmented control 切换。
- tab 使用 `role=tablist/tab/tabpanel`、`aria-selected` 和键盘左右方向键；不安装新 tabs 库。
- task/expense/budget dialog 打开、成功状态、失败保留和删除确认编排正确。
- task 状态快速更新成功后显示状态；失败时错误可见且不重复提交。
- loading 时现有数据仍可读，首屏空加载和真实空状态可区分。
- `/wedding` 未登录重定向 `/login`；登录用户可直接访问，route lazy fallback 文案正确。
- Dashboard “嫁嫁嫁”点击、Enter 和 Space 进入 `/wedding`，不再显示“即将上线”。

运行并确认红灯：

```bash
pnpm --filter @xiaowoniu/frontend test -- --run src/pages/Wedding/wedding-page.test.tsx src/pages/wedding-routing.test.tsx
```

- [ ] **步骤 2：实现页面编排**

页面本地 state 只保存：当前 tab、打开的 dialog、editing object、delete target 和成功 status。领域数据全部来自 Wedding store。

刷新依赖沿用任务 7；页面不能直接调用 Axios。每个 submit handler 只 await 对应 store action，成功后关闭对话框并设置 `role=status` 文案；catch 时由 store error 和 dialog 保留输入。

- [ ] **步骤 3：挂载 lazy protected route 并激活 Dashboard**

`routes/index.tsx` 增加：

```typescript
const Wedding = lazy(() => import('@/pages/Wedding'))
```

并以 `ProtectedRoute + Suspense` 挂载 `/wedding`，fallback 使用 `role="status"` 和“备婚页面加载中…”文案。

Dashboard Wedding 卡片复用其他三个模块的 mouse/Enter/Space 语义，描述改为实际可用内容。不要顺带重构整个 Dashboard。

- [ ] **步骤 4：运行路由、页面、完整前端验证**

```bash
pnpm --filter @xiaowoniu/frontend test -- --run src/pages/Wedding/wedding-page.test.tsx src/pages/wedding-routing.test.tsx
pnpm --filter @xiaowoniu/frontend test -- --run
pnpm --dir frontend exec tsc --noEmit
pnpm --filter @xiaowoniu/frontend build
```

- [ ] **步骤 5：Commit**

```bash
git add frontend/src/pages/Wedding/index.tsx frontend/src/pages/Wedding/wedding-page.test.tsx frontend/src/pages/wedding-routing.test.tsx frontend/src/routes/index.tsx frontend/src/pages/Dashboard.tsx
git commit -m "feat(frontend): add wedding workspace"
```

### 任务 11：完善 Wedding 视觉、响应式和无障碍细节

**文件：**
- 修改：`frontend/src/index.css`
- 修改：`frontend/src/pages/Wedding/index.tsx`
- 修改：`frontend/src/components/wedding/*.tsx`（只做必要样式/语义修正）
- 修改：相关 Wedding frontend tests

- [ ] **步骤 1：先补布局和无障碍回归测试**

断言关键 class/语义或通过 jsdom 可验证行为：

- icon-only button 有 aria-label，未知图标有 tooltip/title。
- tab、archive disclosure、dialog 和 status/error live region 语义完整。
- 点击目标最小 44px；焦点使用 `focus-visible`，不能只靠颜色表达选中/错误/超支。
- 长 taskName/itemName/notes 能换行，金额列不会覆盖操作按钮。
- reduced motion media query 覆盖 Wedding transitions/skeleton，不留持续动画。

- [ ] **步骤 2：实现克制的 Wedding 视觉系统**

- 页面以白色、浅灰和深色文字为主体，粉色和蓝色仅用于模块识别、状态、图表和关键操作。
- 可使用小面积粉蓝双色强调，但不要用满页渐变、装饰色块、圆形光斑或营销 hero。
- 不嵌套 cards；overview 指标使用同一信息 band/grid，重复任务/花费才使用独立卡片或列表行。
- cards 圆角不超过 8px，除非复用现有基础组件无法局部调整。
- compact panel 标题保持紧凑，不使用 hero 尺寸字体；字距为 0，不随 viewport 缩放字号。
- 图表颜色至少包含粉、蓝和中性/状态色，不做单一色相界面。

- [ ] **步骤 3：定义三档稳定布局**

```text
390px：单列；header 操作换行；三 tab 可横向容纳但页面本身无横向滚动；board 各列纵向排列；expense 行变摘要列表。
768px：overview 2 列指标；board 2 列换行；dialog 宽度受 viewport 限制。
1280px：overview 紧凑多列；board 3 列；timeline/expense 使用可扫描宽度，不让内容无限拉伸。
```

对 board、图表、tab、icon button 和金额单元设置稳定 `minmax`、`min-width: 0`、aspect/height 或 grid track，动态内容不能引发布局跳动。

- [ ] **步骤 4：加入 reduced motion 和 overflow 防护**

在 `@media (prefers-reduced-motion: reduce)` 下禁用持续动画并把非必要 transition 压缩至近零。页面根、grid child、Recharts wrapper、dialog content 和长文本必须有正确 overflow/wrap 规则。

- [ ] **步骤 5：运行测试、build 和 CSS 差异检查**

```bash
pnpm --filter @xiaowoniu/frontend test -- --run
pnpm --filter @xiaowoniu/frontend build
git diff --check
```

- [ ] **步骤 6：Commit**

```bash
git add frontend/src/index.css frontend/src/pages/Wedding frontend/src/components/wedding
git commit -m "style(frontend): polish wedding responsive layout"
```

### 任务 12：补齐文档、全量集成验证和真实浏览器验收

**文件：**
- 修改：`README.md`
- 修改：`backend/README.md`
- 修改：`frontend/README.md`
- 修改：`backend/API.md`（若任务 5 后仍有偏差）
- 测试：三包 build/test、Prisma live deploy、真实 HTTP、真实浏览器 GUI

- [ ] **步骤 1：更新项目文档**

`README.md`：

- 将“嫁嫁嫁”从待开发改为已实现，并说明四个核心模块现已可用。
- 写明入口 `/wedding`、API 前缀 `/api/wedding`。
- 说明任务看板/取消归档、花费、预算、概览、时间线和 signed countdown。

`backend/README.md`：

- 记录 12 条 Wedding route、三张表和任务删除 SetNull 语义。
- 记录 budget userId unique upsert、Decimal 聚合、完成日期状态机和跨用户 404。
- 明确 validate/generate 不等于 `migrate deploy`。

`frontend/README.md`：

- 记录 `/wedding` 页面区块、表单、三视图切换、分页加载和 reset 规则。
- 记录测试、typecheck 和 build 命令。

- [ ] **步骤 2：运行全量自动验证**

在可连接 PostgreSQL 的环境逐条执行：

```bash
pnpm --filter @xiaowoniu/shared build
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' pnpm --dir backend exec prisma validate
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' pnpm --dir backend exec prisma generate
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' pnpm --dir backend exec prisma migrate status
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' pnpm --dir backend exec prisma migrate deploy
pnpm --filter @xiaowoniu/backend test -- --run
pnpm --filter @xiaowoniu/backend build
pnpm --filter @xiaowoniu/frontend test -- --run
pnpm --dir frontend exec tsc --noEmit
pnpm --filter @xiaowoniu/frontend build
git diff --check
```

预期：

- shared/backend/frontend 构建和所有已有测试通过。
- Prisma status/deploy 实际连接数据库，报告迁移已应用或 schema up to date。
- 不允许以 mocked service tests 替代 route、HTTP 或浏览器验收。
- `git diff --check` 无输出。

- [ ] **步骤 3：启动隔离服务并执行真实 HTTP smoke test**

不停止已有开发服务；若端口占用，选择新的端口并同步 CORS/API URL：

```bash
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' \
JWT_SECRET='test-secret' JWT_EXPIRES_IN='7d' FRONTEND_URL='http://localhost:5178' PORT=3003 \
pnpm --dir backend dev

VITE_API_URL='http://localhost:3003' pnpm --dir frontend dev --host 127.0.0.1 --port 5178
```

使用真实注册/登录 JWT 和数据库，只把 HTTP smoke 当 API 验收，不当 GUI 验收：

1. 创建用户 A、用户 B，并保存各自 token。
2. A 的空 budget 返回 null；空 overview 返回全类别零值、任务完成率 0；空 timeline 返回空 items。
3. A 设置预算 `150000.00` 和未来婚期；重复 PUT 后数据库仍只有该用户一条 budget。
4. A 创建 pending venue 任务和 completed photo 任务；核对 priority 默认值和 completedDate 为服务器当天。
5. 将 pending -> completed -> in_progress -> completed，核对完成日期写入/保留/清空/重写规则。
6. A 创建关联 venue 花费，计划 `20000.00`、实际 `18000.00`、状态 partial；读取 overview 核对 Decimal 总额、remaining、percentage、category 和任务统计。
7. 创建 `unpaid + actualAmount > 0` 花费，确认 API 接受且 actual 总额照常增加，不从 paidStatus 猜支付金额。
8. 查询 task/expense 的 category/status/date/pagination，确认稳定排序和包含日期边界。
9. 读取 timeline，确认 cancelled/null-date 排除、completed 保留、overdue 与 signed countdown 正确。
10. 使用 B token 获取、修改、删除 A 的 task/expense id，全部返回 404；B 将自己的花费关联 A task 也返回 404。
11. A 删除有关联花费的 task，再查花费：记录仍在且 `taskId/task` 为 null；overview 金额不变。
12. A 编辑并删除花费，确认 overview 刷新；删除不存在 id 返回 404。
13. 发送三位小数、负金额、非法/不存在日期、非法枚举、反向日期范围、空 PATCH、completedDate、未知字段，全部确认 400。
14. 无 token 请求每个资源组至少一个 endpoint，确认 401；确认 `/api/v1/wedding` 为 404。

- [ ] **步骤 4：使用真实浏览器完成 GUI 验收**

使用用户指定的浏览器工具打开隔离前端，例如 `http://localhost:5178`。不得通过 API、store、localStorage、DOM mutation 或测试 fixture 创建/修改 GUI 验收数据。

真实操作顺序：

1. 未登录直接打开 `/wedding`，确认重定向登录页。
2. 使用 GUI 注册或登录测试账号，从 Dashboard 点击“嫁嫁嫁”进入 `/wedding`。
3. 确认无数据页面显示预算入口、任务/花费空状态和空时间线，不显示伪造统计。
4. 设置总预算 `150000.00` 和未来婚礼日期；确认倒计时、预算总额和剩余预算出现。
5. 新建“确认婚礼场地”：venue、priority 5、未来 plannedDate、pending；确认出现在待办列。
6. 用状态操作把任务推进到进行中、已完成；确认列移动和完成信息。再恢复待办并确认完成信息消失。
7. 创建第二个任务并取消；确认它只在已取消归档中，不出现在三列看板或时间线。
8. 打开花费表单，关联场地任务，填写场地定金、计划 `20000.00`、实际 `18000.00`、partial；保存后确认列表、overview、remaining 和类别图同步。
9. 编辑花费，将实际金额改为 `18500.00` 并解除任务关联；确认金额与“未关联任务”立即更新。
10. 新建一条 unpaid 但 actualAmount 非零的花费，确认 UI 不错误显示为已支付金额。
11. 先在删除花费确认框点击取消，确认记录保留；再确认删除，overview 和列表更新。
12. 创建一条关联花费后删除其任务，确认花费仍在且显示未关联，金额统计不变。
13. 切换任务看板、时间线、花费明细 tabs，使用鼠标和 ArrowLeft/ArrowRight/Enter/Space；焦点可见且没有重复提交。
14. 测试表单 validation：空名称、负数、三位小数、非法日期均不能提交；服务错误时 dialog 不关闭且输入保留。
15. 登出并登录另一个账号，确认前一账号的 Finance/Wedding 前端数据不会短暂残留，新账号只看到自己的空状态。
16. 在 390px、768px、1280px 分别截图并检查：无页面横向滚动、tab/按钮文字不溢出、board/图表/列表不覆盖、dialog footer 可达、长文本可换行。
17. 在 `prefers-reduced-motion: reduce` 下检查没有持续动画，非必要过渡被压缩。
18. 用键盘完成 Dashboard 入口、页面 tabs、任务状态菜单、dialog 打开/关闭和删除取消；检查 focus trap 和关闭后焦点返回。

原生 `input[type=date]` 或系统 picker 若因浏览器 runtime 无法填写，必须记录具体 DOM 值、浏览器错误和截图，不得使用脚本/API 冒充该步骤；其余 GUI 流程继续完成。

- [ ] **步骤 5：检查工作树并提交文档**

```bash
git status --short
git diff --check
```

预期：工作树只包含 Phase 7 计划列出的实现和文档文件，没有 Phase 6 未提交差异、临时截图、测试数据、日志或构建产物。

```bash
git add README.md backend/README.md frontend/README.md backend/API.md
git commit -m "docs: document wedding module"
```

---

## 4. 阶段验收标准

### 4.1 数据库和后端

- [ ] `WeddingTask`、`WeddingExpense`、`WeddingBudget` 及 User relation 已落入 schema 和新 migration；既有 migration 未修改。
- [ ] WeddingBudget 以 userId 唯一，currentSpent/percentage/countdown/overdue 均未持久化。
- [ ] 任务删除通过外键 SetNull 保留花费；用户删除级联清理所有 Wedding 数据。
- [ ] 所有资源、聚合、时间线和 task relation 校验都按 `req.user.userId` 隔离；跨用户统一 404。
- [ ] task completedDate 状态机有 fake-clock service 测试和真实 HTTP 验证。
- [ ] 金额以 Decimal(12,2) 存储和聚合，数据库 check 与 Zod 上下界一致。
- [ ] overview 对无预算、零预算、超预算、零分类、取消任务和 paid status 语义处理正确。
- [ ] timeline 只返回非取消且有 plannedDate 的任务，稳定排序并正确计算 overdue/signed countdown。
- [ ] 12 条 `/api/wedding` route、400/401/404 和成功包络与 API 文档一致。

### 4.2 前端

- [ ] `/wedding` 是 protected lazy route，Dashboard 入口支持鼠标、Enter 和 Space。
- [ ] task、expense、budget 表单完整支持本阶段 create/update/delete/upsert 和 null 清空语义。
- [ ] 看板只有待办/进行中/已完成三列，取消任务独立归档，不伪装成第四工作列。
- [ ] overview 使用后端统计，不在前端重算金额；零预算百分比显示为不可计算而非 0%。
- [ ] 时间线是里程碑视图，不声称支持甘特依赖；过去婚期与婚礼当天文案不同。
- [ ] task mutation 刷新 task/overview/timeline 及必要的 expense reference；expense mutation 刷新 expense/overview；budget mutation 刷新 budget/overview/timeline。
- [ ] 旧请求、旧分页和 reset 前请求不能回写；partial refresh failure 保留成功数据并显示明确错误。
- [ ] auth login/register/logout/user change 同时 reset Fitness、Learning、Finance、Wedding。
- [ ] 空、首屏加载、后台刷新、成功、错误、无预算、零预算、超预算、完成、取消、逾期和无更多数据状态均可读。
- [ ] 390px、768px、1280px 无横向溢出或重叠；44px 目标、可见焦点、aria-label、dialog focus 和 reduced motion 生效。

### 4.3 验证、文档和范围

- [ ] shared build、backend test/build、frontend test/typecheck/build 全部通过，Phase 6 回归测试保持通过。
- [ ] Prisma validate、generate、status 和真实 `migrate deploy` 已分别执行；部署失败时如实报告，不用其他命令代替。
- [ ] schema/service/routes 和 frontend service/store/dialog/component/page/routing 测试覆盖本计划列出的关键边界。
- [ ] 真实 HTTP smoke 覆盖两个用户、关联门禁、SetNull、Decimal overview、状态机和错误语义。
- [ ] 真实浏览器完成从登录/Dashboard 到预算、任务、状态、花费、删除、tabs、跨账号 reset 和三视口流程；未使用旁路造数据。
- [ ] README、backend README、frontend README、API.md 与实现一致。
- [ ] 未引入 React Query、`/api/v1`、Hugeicons、ECharts、Framer Motion、拖拽库、新全局 store、甘特依赖或范围外功能。

---

## 5. 执行交接

计划保存于 `docs/superpowers/plans/2026-08-04-phase7-wedding-module.md`。执行顺序：

1. 先把 Phase 6 当前工作树完成验证并提交，确认 `git status --short` 干净。
2. 从包含 Phase 6 的提交创建 Phase 7 分支/工作树，避免把两个阶段混在同一批提交中。
3. 推荐按任务 1–12 为每个任务调度一个新子代理；每个任务结束后做规格审查和测试审查，再提交并进入下一任务。
4. 子代理必须读取本计划中对应任务、相关现有文件和前一个任务结果；不能只根据旧 `PROJECT_PLAN.md` 猜实现。
5. 最后由独立审查代理检查用户隔离、Decimal 计算、完成日期状态机、SetNull、request invalidation、auth reset 和真实验收证据。
