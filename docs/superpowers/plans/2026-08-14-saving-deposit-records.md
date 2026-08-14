# 省省省：存钱计划与存入记录开发计划

> **执行说明：** 本文档是当前仓库 Finance 模块的开发计划。实现时按任务顺序推进，每个任务完成后先运行该任务的最小验证，再进入下一项；不得把自动化测试、HTTP smoke test、Ego 浏览器验收和生产验收混为同一种证据。

## 1. 目标与结论

### 1.1 目标

把当前“存钱计划中的已存金额手动覆盖”改造成一个可追踪的存钱闭环：

```text
建立存钱计划（目标）
        ↓
添加一笔存入（事实）
        ↓
查看存入历史与累计进度
        ↓
编辑/删除某一笔存入（纠错）
        ↓
目标完成
```

计划名称、目标金额和目标日期描述“想达到什么”；存入记录描述“实际哪天存了多少钱”。两者必须是不同的操作和不同的数据对象。

### 1.2 现状证据

当前实现存在以下客观限制：

- `SavingPlan` 只有 `targetAmount` 和 `currentAmount`，没有一对多的存入记录模型。
- 前端存钱计划卡片只有“编辑”和“删除”两个操作，没有“存一笔”入口。
- `SavingPlanDialog` 将“已存金额”与计划名称、目标金额、目标日期放在同一个编辑表单中，并提示“已存金额由你手动更新”。
- 后端只有 `GET/POST/PATCH/DELETE /finance/saving-plans`，没有存入记录的增删改查接口。
- 当前 `currentAmount` 是数据库字段，进度、剩余金额和完成状态都从这个字段派生。

相关代码位置：

- `frontend/src/components/finance/FinanceSummary.tsx`
- `frontend/src/components/finance/SavingPlanDialog.tsx`
- `frontend/src/store/finance.store.ts`
- `backend/src/services/finance.service.ts`
- `backend/prisma/schema.prisma` 的 `SavingPlan`
- `backend/API.md` 的“存钱计划”章节

### 1.3 产品结论

当前做法不是用户漏看入口，而是领域模型和交互模型不完整。作为“目标进度备忘”可以工作；作为个人财务中的“存钱”功能，不应继续让用户通过编辑累计数来模拟一笔存入。

本计划采用以下核心决策：

1. 新增 `SavingDeposit` 存入记录，一条计划可以有多条记录。
2. 存钱计划的 `currentAmount` 改为存入记录金额之和，不能在计划编辑表单中直接修改。
3. 计划编辑只修改名称、目标金额和目标日期。
4. “存一笔”是计划卡片上的主操作；每笔记录支持编辑和删除。
5. 存入记录是正向的实际存入，不与消费记录、月度预算混用。
6. 旧数据中的 `currentAmount` 必须迁移为一条标记为“历史金额”的记录，不能静默丢失或伪造为用户刚刚存入。

## 2. 范围、角色与验收对象

### 2.1 使用者和场景

目标用户是长期使用小窝牛管理个人生活的人，主要场景如下：

| 场景 | 用户意图 | 系统结果 |
| --- | --- | --- |
| 第一次建立目标 | “我想为旅行存 ¥12,000” | 创建一条计划，累计已存 ¥0 |
| 发生一次存入 | “今天实际存了 ¥500” | 新增一条存入记录，累计金额增加 ¥500 |
| 同一计划再次存入 | “本周又存了 ¥300” | 新增第二条记录，历史可区分两次存入 |
| 录错金额或日期 | “刚才那笔填错了” | 编辑该笔记录，计划进度重新计算 |
| 删除误记 | “这不是一笔真实存入” | 删除该笔记录，计划进度重新计算 |
| 调整目标 | “旅行预算变成 ¥15,000” | 编辑计划目标，不改变既有存入历史 |
| 查看进度 | “我还差多少钱” | 卡片显示累计、剩余、进度和完成状态 |
| 旧数据迁移 | 原计划已有 `currentAmount` | 自动生成历史金额记录，累计值保持不变 |

### 2.2 术语定义

| 术语 | 含义 | 是否可直接编辑 |
| --- | --- | --- |
| 存钱计划 | 一个目标，包含名称、目标金额、目标日期 | 可以编辑计划属性 |
| 存入记录 | 一次实际存入行为，包含金额、日期、备注 | 可以编辑、删除 |
| 已存金额 | 所有存入记录金额之和 | 只读派生值 |
| 剩余金额 | 目标金额减已存金额 | 只读派生值 |
| 进度 | 已存金额 / 目标金额的百分比 | 只读派生值 |
| 历史金额 | 从旧 `currentAmount` 迁移而来、原始存入日期未知的记录 | 可纠正或删除，但保留来源标识 |

### 2.3 本期必须完成

- `SavingDeposit` Prisma 模型和增量 migration。
- 旧 `currentAmount` 数据迁移与可核对的迁移结果。
- shared 请求/响应类型、枚举和 API 文档。
- 存入记录的后端查询、创建、编辑、删除及用户隔离。
- 计划累计金额、进度、剩余金额和完成状态由存入记录重新计算。
- 前端“存一笔”表单、存入历史、记录编辑、记录删除。
- 计划编辑表单移除“已存金额”字段。
- Zustand store、API service、加载/错误/成功状态和并发请求失效策略。
- 单元测试、路由/服务测试、前端组件测试、Ego 浏览器验收和 QA 文档更新。

### 2.4 明确不在本期范围

- 银行、微信、支付宝或其他外部账户自动同步。
- 定时存钱、周期性计划、自动扣款和提醒通知。
- 多账户、多币种、利息、收益率和资金来源分析。
- 将存入金额记为消费、收入或月度预算的一部分。
- 负向存入、取出记录、退款和账户间转账。
- CSV/Excel 导入导出、批量录入和批量编辑。
- 超过目标金额后的“超额完成”模型；本期继续保持累计金额不得超过目标金额。

> 如果未来需要记录“从该目标取出一笔钱”，应新增明确的 `withdrawal`/交易模型，不应把负数存入或删除历史记录当作取出行为。本期只支持删除误记的存入记录。

## 3. 产品规则与不变量

### 3.1 计划与记录的关系

- 一个用户可以有多条存钱计划。
- 每条存入记录必须属于一条存钱计划。
- 存入记录不能跨用户关联计划。
- 删除计划时级联删除其存入记录；删除确认文案必须明确提示历史记录也会被删除。
- 删除一笔存入不会删除计划，只重新计算累计进度。
- 计划属性编辑不会创建或修改存入记录。
- 存入记录编辑不会修改计划名称和目标日期。

### 3.2 金额规则

- 存入金额必须大于 `0`，最多两位小数，上限沿用 Finance 的 `9999999999.99`。
- 新增或编辑后的记录金额之和不得超过计划目标金额；超出时返回 `409 CONFLICT`，不能静默截断或自动抬高目标。
- 目标金额不得低于当前存入记录总额；降低目标导致冲突时返回 `409 CONFLICT`。
- 服务端使用 Prisma `Decimal` 聚合和比较，不能使用 JavaScript 浮点数作为事实来源。
- `currentAmount`、`progressPercentage`、`remainingAmount`、`isCompleted` 都是服务端派生值。
- 继续沿用现有进度规则：
  - `progressPercentage = floor(currentAmount / targetAmount * 100)`，限制在 `0..100`。
  - `remainingAmount = targetAmount - currentAmount`。
  - `isCompleted = currentAmount >= targetAmount`。

### 3.3 日期规则

- 新建或编辑手动存入记录时，日期必填且严格使用 `YYYY-MM-DD`。
- 允许补录过去日期和记录当天日期。
- 本期不支持未来日期，未来日期不是已经发生的存入；如需预定未来存入，另建“计划存入”能力。
- 服务端以 UTC 当天作为未来日期判断基准，并在 API 测试中固定时间，避免测试受运行机器时区影响。
- 历史迁移记录的原始日期未知，`date` 允许为 `null`，UI 显示“日期未知·历史金额”，不伪造具体日期。

### 3.4 文本规则

- 计划名称 trim 后长度为 `1..100`。
- 存入备注最多 `2000` 个字符；空备注保存为 `null`。
- `source` 由服务端维护，客户端不能提交或伪造 `legacy_import`。

### 3.5 记录来源规则

存入记录来源使用 shared 枚举或字面量联合类型：

- `manual`：用户通过“存一笔”创建。
- `legacy_import`：由旧 `SavingPlan.currentAmount` 迁移而来。

迁移记录保留来源是为了让用户知道“这笔历史金额不是系统知道了真实存入日期”，也便于后续数据核对。用户可以编辑其金额、日期和备注，来源仍保留为 `legacy_import`，避免丢失审计语义。

## 4. 交互设计

### 4.1 存钱计划卡片

每张计划卡片调整为以下信息层级：

1. 计划名称和目标日期。
2. 主操作 `存一笔`。
3. 次要操作：编辑计划、删除计划。
4. 进度条和百分比。
5. `已存 ¥x / ¥y`、`剩余 ¥z`。
6. `N 条存入记录` 和 `查看存入记录` 展开入口。

推荐操作结构：

```text
旅行基金                         [存一笔]
目标日期：2026年12月31日   [编辑] [删除]
━━━━━━━━━━━━━━━━━━━━━━ 20%
已存 ¥2,500.00 / ¥12,000.00    剩余 ¥9,500.00
3 条存入记录 · 查看存入记录
```

要求：

- `存一笔`必须是有文字的主按钮，不使用仅图标按钮替代。
- 编辑图标的 aria-label 为“编辑存钱计划{计划名}”，不能承担存入功能。
- 删除图标的 aria-label 为“删除存钱计划{计划名}”。
- 计划没有记录时显示“还没有存入记录，存下第一笔吧”，并提供同一个 `存一笔`入口。
- 计划完成时显示“已完成”，但仍允许查看和纠正历史记录。
- 存入记录区域默认折叠，避免多条历史撑长 Finance 首页；展开后在当前卡片内显示，不跳到另一个页面。

### 4.2 新建/编辑计划弹窗

保留同一个 `SavingPlanDialog`，但字段改为：

- 计划名称。
- 目标金额。
- 目标日期。

移除“已存金额”字段和“已存金额由你手动更新”的文案。新的说明应为：

> 先设置目标；建立后可通过“存一笔”记录每次实际存入。

保存按钮分别使用“创建存钱计划”和“保存计划”，避免把“保存一笔存入”误认为保存计划。

创建计划成功后：

- 计划立即显示 `已存 ¥0.00`。
- 显示成功状态“存钱计划已创建”。
- 不自动伪造存入记录。
- 可在成功状态中提供“现在存一笔”的后续入口，但不强制用户连续完成第二步。

编辑计划时，如果目标金额低于当前累计金额，前端先阻止并显示具体剩余总额；后端仍是最终权威校验。

### 4.3 新增存入弹窗

新增 `SavingDepositDialog`，打开时展示计划上下文：

- 标题：`给「旅行基金」存一笔`。
- 辅助信息：`当前已存 ¥2,500.00，距离目标还差 ¥9,500.00`。
- 存入金额：必填，默认空，不默认填“剩余金额”。
- 存入日期：必填，默认当天。
- 备注：可选。
- 主按钮：`保存存入记录`。
- 次按钮：`取消`。

交互规则：

- 金额输入框只接受数字和两位小数；表单内保持字符串，提交时转换为 number。
- 输入金额超过当前剩余金额时，在输入框附近显示“本次存入不能超过剩余 ¥x”，不等提交后才告知。
- 如果服务端因为并发或目标金额变化返回 409，保留用户输入，提示“计划余额已变化，请刷新后重试”。
- 提交期间禁用取消、Escape、外部点击和重复提交。
- 成功后关闭弹窗，显示“已存入 ¥x”，刷新计划累计值和记录列表。

### 4.4 存入记录历史

记录行至少展示：

- 存入日期；历史迁移记录展示“日期未知”。
- 存入金额。
- 备注；无备注时不显示占位性长文案。
- `legacy_import` 显示“历史金额”标识。
- 编辑和删除操作。

记录超过首屏数量时使用已有 Finance/Wedding 的“加载更多”模式，每次默认加载 50 条；不能一次性无限加载。

删除一笔记录前使用确认弹窗，文案包含金额和日期，例如：

> 确定删除 2026年8月14日存入的 ¥500.00 吗？删除后计划累计金额会减少 ¥500.00。

### 4.5 加载、错误和空状态

- 首次加载计划列表：保留现有 skeleton，不因记录历史未加载而阻塞整页。
- 展开记录历史：显示局部加载状态和 `aria-busy`，不清空已有记录。
- 没有历史记录：显示可操作空态和 `存一笔`按钮。
- 写入失败：保留表单输入，不关闭弹窗；错误使用 `role="alert"`。
- 计划列表刷新失败：保留已有数据显示，并显示“操作已成功，但数据刷新失败”或具体错误。
- 删除成功：记录行消失，累计金额、进度、剩余金额同时更新。
- 已完成计划仍可编辑历史，不能因为 100% 状态而禁用纠错。

### 4.6 响应式与可访问性

- 390px 下计划卡片单列，`存一笔`为完整宽度或稳定的 44px 以上按钮。
- 768px 以上可使用双列卡片，但记录展开内容不能被第二列遮挡。
- 所有可点击目标最小 `44px`。
- 计划、记录、编辑、删除按钮均有可读文本或 aria-label；颜色不能是唯一状态表达。
- 弹窗打开后焦点进入第一个可编辑字段，关闭后焦点返回触发按钮。
- 记录展开/收起必须支持键盘，状态使用 `aria-expanded`。
- `prefers-reduced-motion: reduce` 下不使用持续动画。

## 5. 数据模型与迁移方案

### 5.1 推荐数据模型

在 `backend/prisma/schema.prisma` 中新增：

```prisma
model SavingDeposit {
  id           String      @id @default(uuid())
  savingPlanId String      @map("saving_plan_id")
  savingPlan   SavingPlan  @relation("SavingPlanDeposits", fields: [savingPlanId], references: [id], onDelete: Cascade)
  amount       Decimal     @db.Decimal(12, 2)
  date         DateTime?   @db.Date
  notes        String?     @db.Text
  source       String      @default("manual") @db.VarChar(32)
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")

  @@index([savingPlanId, date, createdAt])
  @@map("saving_deposits")
}
```

在 `SavingPlan` 中新增：

```prisma
  deposits SavingDeposit[] @relation("SavingPlanDeposits")
```

`amount` 必须有数据库 check constraint：

```sql
CONSTRAINT "saving_deposits_amount_check" CHECK ("amount" > 0)
```

`date` 允许为空只服务于 `legacy_import`，应用层必须保证：

- `source = 'manual'` 时 `date IS NOT NULL`。
- `source = 'legacy_import'` 时可以为空。

如果 PostgreSQL 版本和 migration 约定允许，可增加对应的 source/date 组合 check constraint；否则由 Zod 和 service 双重保证。

### 5.2 单一事实来源

最终目标是：

```text
SavingPlan.currentAmount       不再作为业务事实
SavingDeposit.amount 的 SUM    作为唯一事实
currentAmount/progress/...     查询时由服务端派生
```

这样可以避免“累计数已经改了，但历史记录没有增加”的数据漂移。

为降低上线风险，迁移分两个数据库阶段：

#### 阶段 A：新增记录表并回填

- 创建 `saving_deposits` 表、索引、外键和金额约束。
- 对每条 `saving_plans.current_amount > 0` 的计划插入一条：
  - `amount = current_amount`。
  - `date = NULL`。
  - `source = 'legacy_import'`。
  - `notes = '原计划已存金额，原始存入日期未知'`。
  - `id` 使用可重复识别的迁移前缀，例如 `legacy-{saving_plan_id}`。
- `current_amount = 0` 的计划不创建零金额记录。
- 暂不删除 `saving_plans.current_amount`，为回滚和核对保留一个迁移快照。
- 迁移完成后执行核对：每条计划的存入记录总和必须等于旧 `current_amount`；不一致时停止后续提升。

#### 阶段 B：应用切换为记录聚合

- 新后端查询计划时以 `SavingDeposit` 聚合为准。
- 新建/编辑/删除存入记录时在事务内完成目标校验和记录变更。
- 新计划不再接受或生成 `currentAmount`。
- 计划编辑接口不再允许直接写 `currentAmount`。
- `SavingPlanResponse.currentAmount` 可以保留，因为它仍是用户需要看的派生字段；请求字段必须移除。

#### 阶段 C：删除旧字段

只有在确认所有运行中的前端和后端都已使用阶段 B 契约、并完成备份与回滚评估后，才执行独立 migration 删除 `saving_plans.current_amount` 及其旧 check constraint，并从 Prisma schema 移除。

> 当前仓库开发可以在一个功能周期内完成三个阶段的代码，但不得把“新增表”“数据回填”“删除旧字段”写成不可审阅的 reset 或破坏性重建。共享环境或生产环境的 migration 仍需明确数据库、备份、变更窗口和负责人授权。

### 5.3 删除与恢复边界

- 删除计划会级联删除 `SavingDeposit`，是不可恢复操作，必须确认。
- 本期不做软删除和撤销；如未来需要审计恢复，另建归档/事件模型。
- 不使用 `prisma migrate reset`。
- 不在生产环境从工作树重新生成数据库结构。

## 6. Shared 类型与 API 契约

### 6.1 Shared 模型类型

在 `shared/src/types/models/finance.ts` 增加：

```ts
export type SavingDepositSource = 'manual' | 'legacy_import'

export interface SavingDepositResponse {
  id: string
  savingPlanId: string
  amount: number
  date: string | null
  notes: string | null
  source: SavingDepositSource
  createdAt: string
  updatedAt: string
}
```

扩展 `SavingPlanResponse`：

```ts
depositCount: number
```

保留以下字段，但明确它们是服务端派生值：

```ts
currentAmount: number
progressPercentage: number
remainingAmount: number
isCompleted: boolean
```

### 6.2 Shared 请求类型

在 `shared/src/types/api/finance.ts` 增加：

```ts
export interface CreateSavingDepositRequest {
  amount: number
  date: string
  notes?: string
}

export interface UpdateSavingDepositRequest {
  amount?: number
  date?: string
  notes?: string | null
}

export interface SavingDepositQueryParams {
  limit?: number
  offset?: number
}
```

调整现有类型：

- `CreateSavingPlanRequest` 移除 `currentAmount`。
- `UpdateSavingPlanRequest` 移除 `currentAmount`。
- `currentAmount` 不能通过计划编辑接口设置。

如果实际部署环境存在仍在使用旧请求字段的客户端，不能在没有发布策略的情况下直接删除字段；应先执行兼容阶段或强制旧客户端刷新。当前计划默认前后端同版本发布，旧字段不属于新产品契约。

### 6.3 API 路由

所有接口均以 `/api/finance` 为前缀，需要 JWT，并按当前用户隔离：

| 方法 | 路径 | 说明 | 成功消息 |
| --- | --- | --- | --- |
| `GET` | `/saving-plans/:id/deposits?limit=&offset=` | 查询当前用户某计划的存入记录 | - |
| `POST` | `/saving-plans/:id/deposits` | 新增一笔存入 | `存入记录已创建` |
| `PATCH` | `/saving-plans/:id/deposits/:depositId` | 编辑一笔存入 | `存入记录已更新` |
| `DELETE` | `/saving-plans/:id/deposits/:depositId` | 删除一笔存入 | `存入记录已删除` |

计划接口调整为：

| 方法 | 路径 | 调整 |
| --- | --- | --- |
| `GET` | `/saving-plans` | 返回基于存入记录聚合的当前金额和 `depositCount` |
| `POST` | `/saving-plans` | 只创建计划目标，不接受 `currentAmount` |
| `PATCH` | `/saving-plans/:id` | 只更新 `name`、`targetAmount`、`targetDate` |
| `DELETE` | `/saving-plans/:id` | 删除计划及其存入记录 |

### 6.4 请求示例

新增存入：

```http
POST /api/finance/saving-plans/plan-id/deposits
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 500.00,
  "date": "2026-08-14",
  "notes": "本周固定存入"
}
```

编辑存入：

```http
PATCH /api/finance/saving-plans/plan-id/deposits/deposit-id
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 550.00,
  "notes": "修正实际金额"
}
```

计划响应中的派生值示例：

```json
{
  "id": "plan-id",
  "name": "旅行基金",
  "targetAmount": 12000,
  "currentAmount": 3000,
  "targetDate": "2026-12-31",
  "depositCount": 2,
  "progressPercentage": 25,
  "remainingAmount": 9000,
  "isCompleted": false
}
```

### 6.5 错误契约

- `400 VALIDATION_ERROR`：金额、日期、备注、分页参数或空 PATCH 不合法；未来日期也属于此类。
- `401 UNAUTHORIZED` / `INVALID_TOKEN` / `TOKEN_EXPIRED`：认证失败。
- `404 NOT_FOUND`：计划、存入记录不存在或属于其他用户；不能泄露资源是否存在。
- `409 CONFLICT`：新增/编辑后累计金额超过目标、目标金额低于已存总额或事务并发冲突。
- `500 INTERNAL_ERROR`：未预期服务错误。

建议的业务错误文案：

- `存入后将超过目标金额，请先调整目标或修改存入金额`。
- `目标金额不能低于已存总额`。
- `计划金额在并发更新中发生变化，请刷新后重试`。

## 7. 后端实施任务

### 任务 1：更新 shared 契约

文件：

- 修改：`shared/src/types/models/finance.ts`
- 修改：`shared/src/types/api/finance.ts`
- 修改：`shared/src/constants/enums.ts`（如采用枚举导出）
- 修改：`shared/src/index.ts`

- [ ] 增加 `SavingDepositSource`、`SavingDepositResponse`、创建/更新/查询请求类型。
- [ ] 增加 `SavingPlanResponse.depositCount`。
- [ ] 移除计划请求类型的 `currentAmount` 写入字段。
- [ ] 注释清楚 `currentAmount` 是聚合值，不是可更新字段。
- [ ] 运行 `pnpm --filter @xiaowoniu/shared build`。

### 任务 2：新增 Prisma 模型和阶段 A migration

文件：

- 修改：`backend/prisma/schema.prisma`
- 新增：`backend/prisma/migrations/<timestamp>_add_saving_deposits/migration.sql`

- [ ] 新增 `SavingDeposit` 表、外键、级联删除、金额 check constraint 和查询索引。
- [ ] 将 `SavingPlan.deposits` 加入 schema。
- [ ] 在 migration 中回填旧 `current_amount > 0` 的计划。
- [ ] 不使用 `migrate reset`，不覆盖现有 migration。
- [ ] 在真实目标数据库上先检查连接、迁移顺序和可恢复性。
- [ ] 写出迁移前后金额核对 SQL 或可重复的校验脚本。
- [ ] 记录 `current_amount` 删除必须等待阶段 C 的发布门槛。

### 任务 3：扩展 Zod 校验和路由

文件：

- 修改：`backend/src/validation/finance.schemas.ts`
- 修改：`backend/src/routes/finance.routes.ts`

- [ ] 增加 nested `planId/depositId` 参数 schema。
- [ ] 增加存入列表 query schema，沿用 `limit 1..100`、`offset 0..1000000`。
- [ ] 增加创建存入 schema：正金额、合法日期、备注长度。
- [ ] 增加更新存入 schema：至少一个字段、严格字段集合、不能把日期清空。
- [ ] 计划 create/update schema 不再允许 `currentAmount`。
- [ ] 路由顺序保持 `auth -> validate -> controller`。
- [ ] 验证 unknown field、空 PATCH、无效 id、未来日期和三位小数。

### 任务 4：实现存入记录 service

文件：

- 修改：`backend/src/services/finance.service.ts`
- 必要时新增：`backend/src/services/finance-saving-deposit.ts`（只有 service 已明显过大时才拆分）

实现要求：

- [ ] 查询计划列表时用一次聚合或可控的批量查询取得每个计划的总额和记录数，避免 N+1。
- [ ] 查询计划记录前先用 `{ id: planId, userId }` 确认计划归属。
- [ ] 存入记录查询排序为日期倒序、创建时间倒序、id 倒序；历史 `null` 日期稳定置底。
- [ ] 创建、编辑、删除存入都在 Serializable transaction 中执行。
- [ ] 事务内重新读取计划目标和记录总额，不能使用客户端传入的剩余金额作为权威值。
- [ ] 捕获 `P2034` 等并发冲突，统一映射为 409。
- [ ] 修改目标金额时以存入记录聚合值校验下限。
- [ ] 删除计划时依赖数据库级联删除，不额外循环删除记录。
- [ ] 输出 DTO 时将 Decimal 转为 number，将日期按现有 Finance 规则转换为 `YYYY-MM-DD` 或 `null`。
- [ ] 旧 `currentAmount` 只作为迁移核对字段，不再作为新业务的写入来源。

### 任务 5：实现 controller、API 文档和后端测试

文件：

- 修改：`backend/src/controllers/finance.controller.ts`
- 修改：`backend/API.md`
- 修改：`backend/README.md`（如路由总数或 Finance 说明变化）
- 修改：`backend/src/__tests__/finance.schemas.test.ts`
- 修改：`backend/src/__tests__/finance.service.test.ts`
- 修改：`backend/src/__tests__/finance.routes.test.ts`

- [ ] 增加四个存入记录 controller action 和成功消息。
- [ ] 测试单用户创建、查询、分页、编辑、删除。
- [ ] 测试计划总额、进度、剩余金额和完成状态随记录变更。
- [ ] 测试目标金额小于累计金额、存入超目标、并发冲突。
- [ ] 测试跨用户计划 id、跨用户存入 id 和未知 id 均为 404。
- [ ] 测试迁移记录 `date=null`、`source=legacy_import` 的映射。
- [ ] 更新 API 文档中的旧 `currentAmount` 写入示例，明确其不再是编辑方式。

## 8. 前端实施任务

### 任务 6：API service 和 Zustand store

文件：

- 修改：`frontend/src/services/finance.service.ts`
- 修改：`frontend/src/store/finance.store.ts`
- 修改：对应 service/store 测试文件

新增 service 方法：

- `getSavingDeposits(planId, params?)`
- `createSavingDeposit(planId, data)`
- `updateSavingDeposit(planId, depositId, data)`
- `deleteSavingDeposit(planId, depositId)`

新增 store 数据和 action：

- `savingDepositsByPlan: Record<string, SavingDepositResponse[]>`
- `savingDepositsHasMoreByPlan: Record<string, boolean>`
- `fetchSavingDeposits(planId, params?)`
- `createSavingDeposit(planId, data)`
- `updateSavingDeposit(planId, depositId, data)`
- `deleteSavingDeposit(planId, depositId)`

实现要求：

- [ ] 计划列表初次加载不自动拉取所有存入历史，只在展开某计划时加载。
- [ ] 同一计划的加载更多按 id 去重，不能重复追加。
- [ ] 新增、编辑、删除后同时刷新该计划记录和 `savingPlans`，确保卡片累计值与历史一致。
- [ ] 继续使用现有 generation/version token，月份切换或 reset 后旧请求不能回写。
- [ ] 记录刷新部分失败时保留旧数据显示错误，不清空用户可读内容。
- [ ] 删除计划后清理对应的 `savingDepositsByPlan[planId]` 状态。

### 任务 7：拆分计划编辑和存入表单

文件：

- 修改：`frontend/src/components/finance/SavingPlanDialog.tsx`
- 新增：`frontend/src/components/finance/SavingDepositDialog.tsx`
- 修改：`frontend/src/components/finance/FinanceDeleteDialog.tsx`
- 新增或修改：对应组件测试

`SavingPlanDialog`：

- [ ] 删除 `currentAmount` state、输入框和相关提交字段。
- [ ] 编辑计划时仍使用当前 `plan.currentAmount` 做目标金额下限的前端校验。
- [ ] 文案清晰区分“保存计划”和“保存存入记录”。

`SavingDepositDialog`：

- [ ] 接收 `plan`、打开状态和 onSubmit。
- [ ] 支持默认当天日期和测试可注入的初始日期，避免测试依赖真实时间。
- [ ] 在表单内校验金额、日期、备注和剩余金额。
- [ ] 服务端失败时保留输入、显示 alert、保持弹窗打开。
- [ ] 提交期间锁定关闭和重复提交行为。

`FinanceDeleteDialog`：

- [ ] 扩展 resource 类型为 `expense | savingPlan | savingDeposit`。
- [ ] 存入记录删除确认显示金额和日期上下文。
- [ ] 保持现有取消、Escape、外部点击和重复确认语义。

### 任务 8：计划卡片、历史记录和 Finance 页面

文件：

- 修改：`frontend/src/components/finance/FinanceSummary.tsx`
- 修改：`frontend/src/components/finance/SavingPlanList.tsx`
- 新增：`frontend/src/components/finance/SavingDepositList.tsx`
- 修改：`frontend/src/pages/Finance/index.tsx`
- 修改：`frontend/src/index.css`

- [ ] 计划卡片增加文字主按钮 `存一笔`。
- [ ] 编辑图标只打开计划编辑弹窗，不再承担改变累计金额的语义。
- [ ] 增加记录数量、展开/收起入口和历史空态。
- [ ] 记录历史按计划分组展示，支持分页加载。
- [ ] 记录编辑、删除确认和成功状态与计划卡片关联。
- [ ] 保留当前页面的计划创建、删除、进度和响应式布局。
- [ ] 不把记录历史强制加载到 Finance 首屏，避免卡片过长和不必要的请求。
- [ ] 视觉上让 `存一笔`成为计划卡片的主动作；编辑/删除退为次要图标动作。
- [ ] 增加移动端堆叠、焦点、`aria-expanded`、局部加载和 reduced-motion 样式。

### 任务 9：前端测试

至少覆盖：

- [ ] 计划创建表单不再渲染“已存金额”。
- [ ] 计划卡片渲染“存一笔”按钮，点击传入正确计划。
- [ ] 存入弹窗提交金额、日期和备注的正确 payload。
- [ ] 存入金额超过剩余金额时不调用 onSubmit。
- [ ] 存入失败时保留输入并显示错误。
- [ ] 历史记录空态、加载态、分页、迁移记录标识和编辑/删除按钮。
- [ ] 删除存入记录时取消不调用 action，确认只调用一次。
- [ ] 新增/编辑/删除存入后 store 刷新计划和记录。
- [ ] 计划编辑目标低于已存总额时阻止提交。
- [ ] 390px 结构没有固定宽度横向溢出风险，所有图标按钮有 aria-label。

## 9. 测试与验收计划

### 9.1 测试分层

| 层级 | 重点 | 通过标准 |
| --- | --- | --- |
| shared build | DTO、枚举、导出关系 | shared 构建成功 |
| Prisma validate/generate | schema、关系、迁移语义 | 校验和客户端生成成功 |
| backend schema tests | 金额、日期、备注、分页和严格字段 | 所有边界断言通过 |
| backend service tests | 聚合、事务、隔离、409、并发 | 不依赖真实浏览器，全部通过 |
| backend route tests | auth、validator、controller、错误包络 | 路由契约与 API 文档一致 |
| frontend service tests | URL、HTTP method、response unwrap | mock API 调用准确 |
| frontend store tests | 分页合并、刷新关联资源、旧请求失效 | 不出现 stale write |
| frontend component/page tests | 表单、按钮、空态、错误、键盘和无障碍 | 用户操作路径可测 |
| HTTP smoke test | 真实后端和数据库读写 | 只证明本地 API 契约 |
| Ego 浏览器 | 真实页面、鼠标/键盘、响应式 | 真实 GUI 流程可复现 |
| Staging/production | 目标地址、受管 Secret、迁移、发布记录 | 需单独授权和记录，不由本计划自动完成 |

### 9.2 后端关键案例

1. 创建计划后无记录，`currentAmount=0`、`depositCount=0`、`remainingAmount=target`。
2. 创建两条存入记录，聚合金额等于两笔之和，进度按服务端派生。
3. 编辑一笔记录金额，累计金额只变化差额。
4. 删除一笔记录，累计金额回退，其他记录不受影响。
5. 存入金额刚好等于剩余金额，计划进入 `isCompleted=true`。
6. 存入金额超过剩余金额，返回 409 且数据库不新增记录。
7. 目标金额低于已存总额，返回 409 且数据库不修改目标。
8. 日期非法、未来日期、金额为 0、负数、三位小数、备注超长均返回 400。
9. 跨用户访问 plan/deposit id 统一返回 404。
10. Serializable 冲突返回明确 409，不产生半笔记录或错误累计。
11. 迁移记录日期为 null、来源为 `legacy_import`，累计金额与旧字段一致。
12. 删除计划后查询记录返回空/404，不能残留孤儿记录。

### 9.3 前端真实场景

1. 新用户进入 Finance，创建“旅行基金”，计划显示 ¥0.00，并提供 `存一笔`。
2. 点击具体计划的 `存一笔`，录入 ¥500 和当天日期，保存后卡片显示 ¥500 和 1 条记录。
3. 再存 ¥300，卡片显示 ¥800 和 2 条记录；展开历史能区分两笔。
4. 编辑第一笔为 ¥550，卡片改为 ¥850，历史金额同步。
5. 删除第二笔，卡片回到 ¥550，确认弹窗取消时数据不变。
6. 编辑计划名称和目标日期，历史记录不变。
7. 将目标金额改到小于 ¥550，前端阻止提交；绕过前端时后端仍返回 409。
8. 输入超过剩余金额，表单给出即时提示且不发送请求。
9. 模拟 API 失败，弹窗保持打开且用户输入不丢失。
10. 刷新页面后计划累计值和历史记录仍来自数据库，不依赖 localStorage。

### 9.4 QA 文档新增用例

在 `docs/qa/page-level-test-cases.md` 的 Finance 存钱计划章节新增或调整以下用例：

| 用例 | 优先级 | 场景 | 预期 |
| --- | --- | --- | --- |
| FIN-028 | P0 | 创建计划后查看卡片 | 已存 ¥0、剩余目标金额、`存一笔`入口可见 |
| FIN-029 | P0 | 通过 `存一笔` 新增记录 | 记录出现，累计金额/进度/剩余金额同步 |
| FIN-030 | P1 | 连续新增两笔 | 历史能区分日期和金额，数量正确 |
| FIN-031 | P1 | 编辑存入记录 | 只改变该笔和累计派生值，不改变计划属性 |
| FIN-032 | P1 | 删除存入记录并取消确认 | 确认后减少累计值，取消后数据不变 |
| FIN-033 | P1 | 超过剩余金额 | 前端即时阻止，后端绕过时返回 409 |
| FIN-034 | P1 | 计划编辑目标低于累计金额 | 前端和后端均阻止，计划数据不变 |
| FIN-035 | P1 | 旧计划金额迁移 | 金额不丢失，历史记录标记“历史金额/日期未知” |
| FIN-036 | P1 | 记录加载更多 | 每页不重复，结束后不再显示加载更多 |
| FIN-037 | P1 | 存入/删除失败 | 表单或历史保留可修正内容，显示可读错误 |
| FIN-038 | P1 | 跨用户访问记录 | HTTP 返回 404，不泄露资源存在性 |
| FIN-039 | P1 | 390px/768px/1280px | 无横向溢出，主操作可见，弹窗内容可操作 |
| FIN-040 | P1 | 键盘和 VoiceOver 基本流程 | 存一笔、展开记录、编辑、删除均有焦点和名称 |

测试报告只能在实际执行后填写，不能提前把计划状态写成通过。

## 10. 发布、迁移与回滚

### 10.1 发布顺序

1. 检查目标数据库、备份、迁移状态和当前线上构建版本。
2. 执行阶段 A migration，创建表并回填旧金额。
3. 执行迁移金额核对，确认每条计划的旧金额和新记录总额一致。
4. 发布阶段 B 后端与前端同一不可变构建，切换为存入记录聚合。
5. 观察本地/目标环境的 API、错误和数据核对结果。
6. 旧客户端确认不再写 `currentAmount` 后，再安排阶段 C 删除旧字段。

阶段 A、阶段 B、阶段 C 的数据库和应用变更应分别可审阅；不把阶段 C 作为阶段 A 的隐式副作用。

### 10.2 回滚原则

- 阶段 A 失败：停止提升，保留新增表和迁移日志，按授权的数据库回滚方案处理；不能直接 reset。
- 阶段 B 应用失败：旧 `current_amount` 仍保留，先回滚应用，再核对新增记录是否完整。
- 阶段 C 执行后不假设存在安全 down migration；必须依赖备份和已验证的恢复方案。
- 任何生产/共享环境迁移、备份恢复、回滚和外部发布都需要明确授权，本开发计划不自动授权这些动作。

### 10.3 证据边界

- 自动化测试：证明代码和测试夹具在测试环境通过。
- 本地真实 PostgreSQL：证明本地 schema、事务和 HTTP 读写。
- Ego 浏览器：证明真实前端页面的可见操作和交互。
- Staging/生产：只有使用目标环境真实地址、受管 Secret、目标数据库迁移和发布记录后，才能作为目标环境验收证据。
- Mock 数据、直接 API 注入、store 注入和 DOM mutation 不能替代“用户通过页面创建和存入”的 Ego 证据。

## 11. 完成定义（Definition of Done）

### 11.1 功能

- [ ] 用户能建立只有目标属性的存钱计划。
- [ ] 用户能从计划卡片直接点击 `存一笔`。
- [ ] 用户能新增、查看、编辑和删除存入记录。
- [ ] 计划编辑和存入记录编辑是两个独立流程。
- [ ] 累计金额、进度、剩余金额和完成状态始终由记录聚合得到。
- [ ] 存入超过目标、目标低于累计金额时有明确 409 业务保护。
- [ ] 旧 `currentAmount` 数据迁移后金额不丢失且来源透明。

### 11.2 技术质量

- [ ] shared、backend、frontend 构建通过。
- [ ] Finance schema、service、route、store、dialog、page 测试通过。
- [ ] `git diff --check` 通过。
- [ ] 事务、用户隔离、分页和并发冲突有测试覆盖。
- [ ] API 文档、README、QA 用例与实际代码一致。
- [ ] 不新增重复的全局状态库、图表库或 UI 框架。

### 11.3 体验

- [ ] 用户无需猜测“编辑”是否等于“存一笔”。
- [ ] 首次用户在 5 秒内能看到计划的主要下一步：`存一笔`。
- [ ] 记录历史可以回看，错误可以修正，失败不会丢输入。
- [ ] 390px、768px、1280px 均无横向溢出。
- [ ] 关键按钮有可见文字，图标按钮有 aria-label，键盘焦点可见。
- [ ] 空、加载、成功、失败、完成和历史迁移状态均有可读反馈。

## 12. 推荐实施顺序与检查点

按以下顺序执行，不建议先改 UI 再补数据模型：

1. **契约检查点**：shared 类型、业务规则和 API 文档评审通过。
2. **数据库检查点**：阶段 A migration 在隔离数据库验证，旧金额核对通过。
3. **后端检查点**：schema/service/route 测试通过，跨用户和并发场景通过。
4. **前端数据检查点**：service/store 能完成新增、编辑、删除和刷新关联数据。
5. **交互检查点**：计划编辑不再修改累计值，`存一笔`和历史记录可见可用。
6. **综合验证检查点**：运行 `pnpm verify`、`git diff --check`、本地 HTTP smoke test 和 Ego 浏览器验收。
7. **发布检查点**：若涉及共享环境或生产，单独确认数据库、备份、负责人、变更窗口和回滚方案。

## 13. 预期交付物

- `shared` 中的存入记录请求/响应类型。
- `backend` 中的 `SavingDeposit` schema、migration、service、controller、route 和测试。
- `frontend` 中的存入 service、store、弹窗、历史列表、计划卡片和页面接入。
- 更新后的 `backend/API.md`、`backend/README.md`、`frontend/README.md`（如涉及）和 `docs/qa/page-level-test-cases.md`。
- 阶段 A migration 的执行记录与金额核对结果。
- 自动化测试结果、HTTP smoke test 结果和 Ego 浏览器截图/操作记录。
