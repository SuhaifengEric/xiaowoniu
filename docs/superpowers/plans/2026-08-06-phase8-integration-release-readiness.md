# Phase 8: 跨模块整合、质量保障与发布就绪 - 实现计划

> **面向实施者：** 按任务顺序实施。每个任务先补充或更新对应测试，再实现最小代码使测试通过。完成一个任务后执行该任务的验证命令；不要在验证失败的基础上继续后续任务。

**目标：** 在 Fitness、Learning、Finance、Wedding 四个业务模块均完成后，把应用从四个独立页面整合为可日常使用的个人管理平台：Dashboard 展示真实跨模块摘要和快捷入口，所有核心路径在桌面与移动端可用，并建立可重复执行的质量门禁与发布前检查清单。

**架构：** 保持当前 Monorepo 与垂直切片模式。后端新增一个只读的、按 JWT 用户隔离的 Dashboard 聚合端点；各模块继续拥有自己的写入 API、服务和状态。前端 Dashboard 只通过独立的 dashboard service/store 获取汇总数据，不直接拼接各模块内部状态，也不复制模块计算逻辑。

**技术栈：** 继续使用 PostgreSQL 15+、Prisma、Express、Zod、Vitest、React 18、React Router v6、Zustand、Radix UI、Lucide、Tailwind CSS、Recharts。不得为了本阶段引入 React Query、全局事件总线、第二套组件库或新的状态管理方案。

---

## 0. 阶段结论与边界

### 0.1 现状分析

截至计划编写时，基础能力、认证、Fitness 和 Learning 已完成并有测试；Finance 与 Wedding 仍是待开发模块：

- 根 README 将 Finance 与 Wedding 标记为“待开发”，而 Fitness 与 Learning 已标记为“已实现”。
- 当前 Dashboard 仅能跳转 Fitness 和 Learning；Finance、Wedding 仍显示“即将上线”。
- 当前受保护路由仅注册 `/dashboard`、`/fitness` 和 `/learning`。
- 已有模块采用 `Prisma -> shared DTO -> Zod/Express service -> Axios service -> Zustand -> React` 的稳定模式；Phase 8 必须沿用该模式。
- 根工作区已有 build/test/lint 聚合脚本，但本阶段需要将其验证为每个 workspace 均可独立执行，并补足发布前的统一入口。

因此，Phase 8 **不是** Finance 或 Wedding 的替代实现阶段。它应在下列前置条件完成后开始；若任一条件不满足，应先完成对应模块的缺失阶段，而不是用 mock 数据推进 Dashboard。

### 0.2 开始前置条件

- [ ] Phase 6 已完成 Finance 的数据库迁移、shared DTO、鉴权 API、前端页面和覆盖核心业务规则的测试。
- [ ] Phase 7 已完成 Wedding 的数据库迁移、shared DTO、鉴权 API、前端页面和覆盖核心业务规则的测试。
- [ ] `/finance`、`/wedding` 均已注册为懒加载的受保护路由，且 Dashboard 可访问它们。
- [ ] 四个模块的日期、金额和进度聚合口径已经在各自 API 文档中确定；Phase 8 不在 Dashboard 中重新定义业务规则。
- [ ] `pnpm --filter @xiaowoniu/shared build`、各 workspace 的 `test` 与 `build` 均在干净工作树中通过。

### 0.3 本阶段范围

1. 真实数据驱动的 Dashboard 汇总、模块状态和快捷入口。
2. 一个受认证保护、按用户隔离的只读 Dashboard 汇总 API 与 shared DTO。
3. Finance、Wedding 完成后四大模块的路由、导航、空状态和错误状态整合。
4. 针对关键用户路径的后端路由/服务回归测试与前端集成测试。
5. 390px、768px、1024px+ 视口的响应式、键盘可用性和基础无障碍验收。
6. 构建、测试、lint、Prisma schema 校验与生产环境配置检查的统一质量门禁。
7. README、API 文档与发布前检查清单更新，使本地启动、验证和环境变量说明与实际一致。

### 0.4 明确不在范围内

- Finance 或 Wedding 的基础数据模型、CRUD 和单模块页面功能。这些属于 Phase 6/7。
- 个人资料编辑、密码修改、头像上传。
- CSV/Excel 导出、备份恢复、通知提醒、PWA、暗色模式、多语言。
- Docker 镜像、Nginx、真实服务器发布、CI/CD、监控告警和生产数据库迁移执行。它们属于后续部署阶段。
- 重构已稳定的 Fitness/Learning 业务计算，或把模块 store 合并成一个全局 store。
- 为 Dashboard 建立历史分析仓、缓存层或实时推送；Phase 8 仅处理当前请求可由现有 PostgreSQL 查询快速得到的摘要。

### 0.5 关键设计决定

1. **Dashboard 仅是摘要层。** 数据明细、编辑和删除留在模块页面；Dashboard 仅显示可操作的摘要、提醒和导航，不成为第五套业务系统。
2. **后端是跨模块计算权威。** 余额、预算剩余、备婚完成率、临近日期等汇总在服务端计算，前端只负责显示与导航。
3. **失败可局部降级。** 单个模块摘要异常时，其他模块仍可显示；失败卡片给出重试入口，不让整个 Dashboard 空白。
4. **同一用户隔离到底。** 聚合查询的每条 Prisma where 条件必须含当前 `userId`，不得先按资源 ID 查询再在内存中过滤。
5. **不制造 N+1。** Dashboard 每个模块最多使用固定数量的聚合/有界查询；禁止“先查所有资源、再逐条查询关联数据”的实现。

---

## 1. Dashboard 数据契约

### 1.1 API 路径

新增 `GET /api/dashboard/summary`，需要 Bearer JWT，成功响应保持项目统一包络：

```json
{
  "success": true,
  "data": {
    "generatedAt": "2026-08-06T08:00:00.000Z",
    "fitness": {},
    "learning": {},
    "finance": {},
    "wedding": {}
  }
}
```

不接受查询参数。时间口径使用后端 UTC 当前日期；前端不自行计算“今天”“本周”“本月”再传入不同日期范围。

### 1.2 Shared DTO

创建 `shared/src/types/api/dashboard.ts`，定义以下最小稳定接口，并从 `shared/src/index.ts` 导出：

```typescript
interface DashboardSummaryResponse {
  generatedAt: string
  fitness: {
    todayCheckinCount: number
    weeklyCheckinCount: number
    weeklyTarget: number | null
    latestWeightKg: number | null
  }
  learning: {
    activeExam: {
      id: string
      examName: string
      daysRemaining: number
    } | null
    overallProgressPercentage: number | null
    todayStudyHours: number
  }
  finance: {
    currentMonthExpense: number
    currentMonthBudget: number | null
    budgetRemaining: number | null
    activeSavingPlansCount: number
  }
  wedding: {
    weddingDate: string | null
    daysRemaining: number | null
    pendingTasksCount: number
    completedTasksCount: number
    budgetRemaining: number | null
  }
}
```

约束：

- 金额在 DTO 中使用 `number`；Prisma Decimal 必须在 service 中显式转换。
- 没有目标、考试或婚期时使用 `null`，不能使用 `0` 伪装缺失数据。
- 所有计数返回非负整数；百分比限制在 `0..100`；可用预算剩余可为负数，用于显示超支。
- Learning 仅选择最近的未归档考试；若不存在，则 `activeExam` 和 `overallProgressPercentage` 均为 `null`。
- Wedding `daysRemaining` 仅在有婚期时存在，使用和 Learning 相同的 UTC 日期差计算方式。

### 1.3 Dashboard 展示规则

- Fitness：展示“今日是否已记录”、本周完成数与目标，以及最近体重；没有目标或体重不阻塞打卡入口。
- Learning：展示最近未归档考试的倒计时、总进度与今日学习时长；没有考试时显示创建考试的明确入口。
- Finance：展示当月支出、预算剩余或“尚未设置预算”、活跃存钱计划数量；没有预算不能被解释为 0 元预算。
- Wedding：展示任务完成概况、婚期倒计时和预算剩余；没有婚期或预算时给出对应设置入口。
- 每个模块卡片都可通过鼠标、Enter 与 Space 进入对应页面；快捷操作必须是语义化 `Button` 或链接，不能用嵌套可点击 Card。

---

## 2. 任务 1：建立 shared DTO 与 Dashboard 后端聚合

**文件：**

- 创建：`shared/src/types/api/dashboard.ts`
- 修改：`shared/src/index.ts`
- 创建：`backend/src/services/dashboard.service.ts`
- 创建：`backend/src/controllers/dashboard.controller.ts`
- 创建：`backend/src/routes/dashboard.routes.ts`
- 修改：`backend/src/routes/index.ts`
- 创建：`backend/src/__tests__/dashboard.service.test.ts`
- 创建：`backend/src/__tests__/dashboard.routes.test.ts`

### 2.1 实现要求

- [ ] 在 shared 包定义并导出第 1 节所列 DTO；不把 Prisma 类型暴露给前端。
- [ ] 在 `dashboard.service.ts` 集中实现 `getDashboardSummary(userId)`；使用现有 Prisma singleton，不创建第二个 `PrismaClient`。
- [ ] 复用或抽取与 Learning/Fitness 一致的 UTC 日期 helper；保持严格日期和周一为一周起点的既有口径。
- [ ] 使用 Prisma `_count`、`aggregate`、`groupBy` 或有界 `findFirst` 查询生成摘要；每个模块仅查询 Dashboard 所需字段。
- [ ] 显式为每项查询传入 `where: { userId }` 或等效的用户归属条件；关联过滤也必须限制当前用户。
- [ ] Fitness 从活动目标、今日打卡、本周打卡及最近体重生成摘要，且无数据时返回定义好的零值/null 值。
- [ ] Learning 选择未归档、日期最近的考试，调用与 `learning.service.ts` 一致的聚合口径计算总进度与今日学习时长；不要通过 HTTP 调用自身 learning API。
- [ ] Finance 与 Wedding 使用各自 Phase 6/7 已确定的数据模型和口径；实现前先将最终字段名、预算含义和状态枚举补充到本计划的实施记录中。
- [ ] Controller 仅从 `req.user.userId` 取用户 ID、调用 service、返回统一 `success` 包络；路由使用现有认证中间件。
- [ ] 资源不存在和空数据都不是 Dashboard 错误，返回完整的零值/null 摘要；数据库异常按现有错误中间件处理。

### 2.2 测试要求

- [ ] DTO 编译测试：shared build 可被 backend 与 frontend 导入。
- [ ] Service 测试覆盖：无任何数据、四模块均有数据、无可用考试、无预算、预算超支、过去婚期、Decimal 映射、UTC 周/月边界。
- [ ] Service 测试断言每个 Prisma 查询都带 `userId`，并断言不会调用逐资源循环查询。
- [ ] Route 测试覆盖：未认证返回 401、认证用户成功返回包络、service 异常走现有 500 错误格式。
- [ ] 双用户测试：用户 A 的汇总不能包含用户 B 的打卡、消费、任务、预算或考试数据。

### 2.3 验证

```bash
pnpm --filter @xiaowoniu/shared build
pnpm --filter @xiaowoniu/backend test -- dashboard.service dashboard.routes
pnpm --filter @xiaowoniu/backend build
```

### 2.4 提交边界

```bash
git add shared/src backend/src/services/dashboard.service.ts \
  backend/src/controllers/dashboard.controller.ts backend/src/routes \
  backend/src/__tests__/dashboard.service.test.ts backend/src/__tests__/dashboard.routes.test.ts
git commit -m "feat: add dashboard summary API"
```

---

## 3. 任务 2：重构 Dashboard 为真实跨模块工作台

**文件：**

- 创建：`frontend/src/services/dashboard.service.ts`
- 创建：`frontend/src/services/dashboard.service.test.ts`
- 创建：`frontend/src/store/dashboard.store.ts`
- 创建：`frontend/src/store/dashboard.store.test.ts`
- 修改：`frontend/src/pages/Dashboard.tsx`
- 创建：`frontend/src/pages/dashboard-page.test.tsx`
- 修改：`frontend/src/routes/index.tsx`
- 按需要创建：`frontend/src/components/dashboard/*.tsx` 及对应测试

### 3.1 服务与状态

- [ ] 在 `dashboard.service.ts` 使用现有 Axios `api` 实例调用 `/dashboard/summary`；保持现有错误提取与 response envelope 解包模式。
- [ ] 建立最小 Zustand store：`summary`、`isLoading`、`error`、`fetchSummary`、`reset`。不要存储模块明细或复制其他模块 store。
- [ ] Dashboard 初次加载和从子页面返回时刷新摘要；避免在单次渲染中重复请求。
- [ ] 请求失败时保留最后一次成功摘要并显示局部错误提示与重试动作；首次加载失败时展示完整错误状态和重试。
- [ ] 登出及认证失效时重置 Dashboard store，避免下一位用户看见前一位用户的摘要。

### 3.2 页面与交互

- [ ] 将当前个人资料欢迎 Card 压缩为轻量页头，保留登出入口；首页主体改为四个数据驱动的模块摘要。
- [ ] 将 Finance、Wedding 卡片从“即将上线”替换为真实摘要并导航到 `/finance`、`/wedding`。
- [ ] 路由用和 Fitness/Learning 相同的 `lazy` + `Suspense` + `ProtectedRoute` 模式注册 Finance 与 Wedding；回退文本应匹配当前页面语言。
- [ ] 四个模块均提供一个主要快捷操作：Fitness 新增打卡、Learning 新增学习记录/考试、Finance 新增消费、Wedding 新增任务。快捷操作应导航到模块页面并通过 URL query 或页面状态预打开既有 dialog；不要在 Dashboard 复制四套表单。
- [ ] 用明确标签呈现“未设置”“今日已记录”“超支”“已结束”等业务状态；金额使用 `Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' })` 格式化，禁止手写 `¥${value}`。
- [ ] 关键数据为空时展示与数据缺失匹配的 CTA，不能用“0”造成误导。
- [ ] 使用现有 Lucide 图标和项目 Card/Button 组件；图标按钮具备 `aria-label` 或可见文本。
- [ ] 页面布局遵循现有 Tailwind 约定：390px 单列，`md` 两列，`lg` 四模块摘要或清晰的两行布局；确保 44px 最小触控区域，文本不溢出。

### 3.3 前端测试

- [ ] Service 测试验证正确请求路径、包络解包及 API 错误传播。
- [ ] Store 测试覆盖成功、失败、重试、登出 reset，以及不保留过期用户摘要。
- [ ] 页面测试覆盖 loading、首屏失败、局部失败、四模块完整数据、空数据 CTA、点击模块导航、键盘 Enter/Space 导航、登出。
- [ ] 路由测试验证 `/finance`、`/wedding` 未认证时跳转登录，认证后可懒加载进入。
- [ ] 对超长考试名、任务名、金额负值/大值与窄视口文字折行补充回归用例。

### 3.4 验证

```bash
pnpm --filter @xiaowoniu/frontend test -- dashboard
pnpm --filter @xiaowoniu/frontend build
```

### 3.5 提交边界

```bash
git add frontend/src/services/dashboard.service.ts frontend/src/store/dashboard.store.ts \
  frontend/src/pages/Dashboard.tsx frontend/src/components/dashboard frontend/src/routes \
  frontend/src/**/*.test.ts frontend/src/**/*.test.tsx
git commit -m "feat(frontend): integrate dashboard module summaries"
```

---

## 4. 任务 3：跨模块导航、边界状态与数据一致性回归

**文件：**

- 修改：`frontend/src/pages/Fitness/index.tsx`
- 修改：`frontend/src/pages/Learning/index.tsx`
- 修改：`frontend/src/pages/Finance/index.tsx`（Phase 6 产物）
- 修改：`frontend/src/pages/Wedding/index.tsx`（Phase 7 产物）
- 修改或创建：相关前端页面测试与后端 service 测试

### 4.1 实现要求

- [ ] 定义并统一支持的 Dashboard 快捷操作 query 参数，例如 `?action=checkin`、`?action=create-expense`；仅接受白名单动作，页面完成打开 dialog 后清除 query，防止刷新重复打开。
- [ ] 各模块收到非法或已不适用的 action 时安全忽略，页面仍正常加载。
- [ ] 每个模块的成功写入或删除后，返回 Dashboard 时必须获取新摘要，不能依赖旧缓存。
- [ ] 验证各模块无数据、部分数据、资源删除后能返回 Dashboard，摘要与页面统计一致。
- [ ] 统一四个模块的返回 Dashboard 入口、加载状态和错误提示风格；不强制重构内部视觉设计。
- [ ] 检查所有删除操作仍保留确认 dialog，快捷入口不得绕过确认步骤。

### 4.2 测试要求

- [ ] 逐模块测试 Dashboard 快捷操作能到达正确页面并打开正确的既有 dialog。
- [ ] 测试非法 action、重复刷新、用户取消 dialog、表单提交失败和操作成功后的导航状态。
- [ ] 后端回归覆盖删除/归档后 Dashboard 摘要：删除当天打卡、归档当前考试、删除当月消费、完成/取消备婚任务、更新预算。
- [ ] 断言摘要与对应模块详情页使用相同的服务端口径，不在前端自行二次计算。

### 4.3 验证

```bash
pnpm --filter @xiaowoniu/backend test
pnpm --filter @xiaowoniu/frontend test
```

### 4.4 提交边界

```bash
git add backend/src frontend/src
git commit -m "test: add cross-module dashboard regression coverage"
```

---

## 5. 任务 4：响应式、可访问性与用户路径验收

**文件：**

- 修改：受测页面和组件中的必要样式/语义问题
- 创建：`docs/qa/phase8-acceptance-checklist.md`
- 可选创建：针对已发现回归的 focused 测试文件

### 5.1 响应式验收

- [ ] 在 390px 宽度检查登录、Dashboard、Fitness、Learning、Finance、Wedding 的首屏、表单 dialog、日历/图表和记录列表。
- [ ] 在 768px 与 1024px+ 检查网格、图表、对话框和页头不重叠、不横向溢出，且核心操作不被折叠隐藏。
- [ ] 所有 icon-only 控件达到至少 44x44px 的可触控范围，且有无障碍名称。
- [ ] 表格或长记录列表在移动端使用横向滚动、卡片化或摘要布局之一；禁止压缩到不可读。
- [ ] 只修复实际发现的布局问题，不为假设设备新增无测试的断点。

### 5.2 可访问性验收

- [ ] 使用键盘完成注册/登录、进入四模块、创建记录、取消/确认删除、返回 Dashboard、登出。
- [ ] Dialog 打开时焦点进入内容，关闭后回到触发控件；Esc 能关闭非破坏性 dialog。
- [ ] 页面拥有单一可见 `h1`，主要区域有语义化 landmark；错误与加载状态使用适当的 `role`/`aria-live`。
- [ ] 仅颜色表达的状态同时提供文字、图标或数值；粉蓝主题中的文字与背景对比度符合 WCAG AA。
- [ ] 对使用日期、金额、进度与倒计时的控件检查中文辅助文本是否可理解。

### 5.3 核心人工路径

在存在隔离测试数据的本地环境执行，并把结果记录到验收清单：

1. 注册用户 A，依次新增健身打卡、学习考试/科目/打卡、消费/预算、备婚任务/预算；刷新 Dashboard，确认四模块摘要准确。
2. 从每个 Dashboard 快捷操作进入模块，提交一次有效记录，返回 Dashboard，确认摘要更新。
3. 删除或归档每类资源，确认模块详情与 Dashboard 同步，且没有残留入口或错误计数。
4. 注册用户 B，确认其 Dashboard 是独立空状态，无法借由 URL、刷新或浏览器后退看到用户 A 数据。
5. 在 390px 和 1280px 完成第 1–4 条，记录浏览器、视口、日期和结果。

### 5.4 验证

```bash
pnpm --filter @xiaowoniu/frontend test
pnpm --filter @xiaowoniu/frontend build
```

开发服务器可用时，以真实浏览器执行第 5.3 节并保存截图或可复现的失败步骤；不要用单元测试替代视觉与键盘验收。

### 5.5 提交边界

```bash
git add frontend/src docs/qa/phase8-acceptance-checklist.md
git commit -m "fix(frontend): harden cross-module responsive interactions"
```

---

## 6. 任务 5：建立发布前质量门禁与文档

**文件：**

- 修改：`package.json`
- 按需修改：`backend/package.json`、`frontend/package.json`、`shared/package.json`
- 创建或修改：`.env.example`、`backend/.env.example`、`frontend/.env.example`
- 修改：`README.md`
- 修改：`backend/API.md`
- 修改：`backend/README.md`
- 修改：`frontend/README.md`
- 创建：`docs/qa/phase8-release-checklist.md`

### 6.1 工程门禁

- [ ] 逐个检查所有 workspace 的 `build`、`test`、`lint` 是否真实存在；为缺失的 lint 脚本补充项目现有 ESLint/TypeScript 方案，或将根聚合脚本调整为只执行真实存在的脚本。不得用 `|| true` 掩盖失败。
- [ ] 在根 package 新增清晰的 `verify` 脚本，按顺序执行 shared build、Prisma schema 校验、全部测试、全部 lint 和全部 build。脚本失败必须返回非零状态。
- [ ] Prisma 校验使用明确配置的 `DATABASE_URL`；`prisma validate`/`generate` 与真实迁移部署分开，避免把本地验证误写成生产迁移。
- [ ] 校验开发/生产所需环境变量都有无密钥示例文件，且 `.env` 仍被忽略。不得将真实 token、数据库密码或测试用户密码写入文档。
- [ ] 检查 `pnpm-lock.yaml` 与 package manifest 一致，避免未声明依赖只在本机可用。

### 6.2 文档更新

- [ ] README 更新为四个模块均已实现，移除“即将上线”或“待开发”的陈旧描述。
- [ ] 后端 API 文档补充 Dashboard summary 的认证要求、字段语义、空值规则与成功/错误示例。
- [ ] 前后端 README 描述 Dashboard 真实摘要、四个受保护路由、开发命令与完整验证命令。
- [ ] 在 release checklist 中列出：依赖安装、环境变量、数据库备份、迁移审查、`pnpm verify`、手工核心路径、浏览器/移动端复测、版本号、变更日志、回滚方案。
- [ ] 文档明确 Phase 8 不部署生产环境，生产发布必须经过后续部署计划审批。

### 6.3 最终验证

```bash
pnpm install --frozen-lockfile
pnpm --filter @xiaowoniu/shared build
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' \
  pnpm --filter @xiaowoniu/backend exec prisma validate
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' \
  pnpm --filter @xiaowoniu/backend exec prisma generate
pnpm test
pnpm lint
pnpm build
pnpm verify
```

若本地没有 PostgreSQL，只能跳过需要连接数据库的迁移部署和真实 API 数据流验证；仍须运行 schema validate/generate，并在验收清单中明确记录未执行项及原因。不能声称完整发布验证已通过。

### 6.4 提交边界

```bash
git add package.json pnpm-lock.yaml README.md backend frontend shared docs/qa
git commit -m "chore: add release verification checklist"
```

---

## 7. 完成定义（Definition of Done）

- [ ] 四个业务模块已具备可用的独立页面与 API，且 Phase 6/7 前置条件已满足。
- [ ] `GET /api/dashboard/summary` 仅返回当前用户的聚合数据，空数据、预算超支、过去日期和无活跃考试等边界行为有测试。
- [ ] Dashboard 不再展示 Finance/Wedding 占位卡片，能展示真实摘要、可靠跳转和模块级快捷操作。
- [ ] 任何单模块摘要失败不会阻塞其他模块或登出；用户能重试。
- [ ] 所有核心写入/删除后回到 Dashboard 的数据一致性经过自动化回归和人工路径验证。
- [ ] Dashboard 与四大模块在 390px、768px、1024px+ 视口下没有阻断性布局、触控或键盘问题。
- [ ] 认证、数据隔离、删除确认和错误包络没有因整合回归而被绕过。
- [ ] `pnpm test`、`pnpm lint`、`pnpm build`、`pnpm verify` 均通过；不能运行的外部依赖验证有明确记录。
- [ ] README、API 文档、环境变量示例和 Phase 8 验收/发布检查清单与最终行为一致。
- [ ] 本阶段不包含真实生产部署；部署需在后续阶段取得单独批准后执行。

---

## 8. 风险与实施顺序

| 风险 | 影响 | 控制措施 |
| --- | --- | --- |
| Phase 6/7 数据模型与指标口径尚未固定 | Dashboard DTO 频繁变更 | 在开始任务 1 前冻结 Finance/Wedding API 契约；若未完成则暂停 Phase 8。 |
| 聚合端点泄露跨用户数据 | 高安全风险 | 每条查询直接带 `userId`；使用双用户测试；禁止服务层先查全量再过滤。 |
| 聚合查询退化为 N+1 | 首页性能下降 | 使用固定数量的 aggregate/count/findFirst 查询；service mock 断言调用次数。 |
| 摘要与模块详情统计不同 | 用户失去信任 | 复用后端计算 helper 或同一查询口径；删除/归档等回归测试比对。 |
| 快捷操作复制业务表单 | 维护成本和行为漂移 | Dashboard 只导航并预开现有模块 dialog，表单仍属于模块。 |
| 聚合 lint 脚本在子包缺失时假绿 | 发布前未发现质量问题 | 任务 5 验证每个 workspace 的脚本真实执行，禁止吞错。 |

建议提交顺序：任务 1（契约与 API）-> 任务 2（Dashboard）-> 任务 3（回归）-> 任务 4（人工质量验收）-> 任务 5（工程门禁与文档）。每个提交应可独立构建和测试，不混入 Finance/Wedding 的未完成开发改动。
