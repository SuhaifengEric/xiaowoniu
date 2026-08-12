# AGENTS.md

本文件适用于仓库根目录及其所有子目录。若更深层目录存在自己的 `AGENTS.md`，以距离目标文件最近的规则为准；系统指令、用户明确要求优先于本文件。

## 项目概览

小窝牛是一个基于 pnpm workspace 的全栈个人生活管理平台，包含健身、学习、财务和备婚模块。

主要目录：

- `shared/`：前后端共用的 TypeScript 类型、DTO、枚举和标签；不依赖 `backend/` 或 `frontend/`。
- `backend/`：Express + TypeScript + Prisma API 服务，数据库为 PostgreSQL。
- `frontend/`：React + TypeScript + Vite Web 应用。
- `docs/`：架构、规划、QA 和运维文档。
- `scripts/`：仓库级 CI 校验和发布元数据脚本。

受保护的前端入口为 `/dashboard`、`/fitness`、`/learning`、`/finance`、`/wedding`。后端 API 使用 `/api/...` 前缀；完整接口契约见 `backend/API.md`。

## 环境与依赖

- Node.js `>=20.0.0`
- pnpm `>=8.0.0`
- PostgreSQL `>=15`

首次开发时在仓库根目录安装依赖：

```bash
pnpm install
```

环境变量文件只从示例复制，不提交真实值：

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

后端至少需要配置 `DATABASE_URL` 和开发环境的 `JWT_SECRET`；默认后端端口为 `3000`，前端端口为 `5173`。前端的 `VITE_API_URL` 是构建期变量，默认指向 `http://localhost:3000`。本机 PostgreSQL 使用其他端口时，优先通过单次命令的 `DATABASE_URL` 覆盖，不要修改示例文件或提交本地配置。

## 常用命令

以下命令均在仓库根目录执行：

```bash
pnpm dev             # 并行启动 shared、backend、frontend
pnpm build           # 构建全部 workspace 包
pnpm test            # 运行 backend 与 frontend 的 Vitest 测试
pnpm lint            # 运行 shared、backend、frontend 的静态检查
pnpm verify          # Prisma 校验/生成 + 测试 + lint + build
pnpm run ci:verify   # 冻结安装、完整 verify，并生成发布元数据
```

按包执行时使用 workspace filter：

```bash
pnpm --filter @xiaowoniu/shared build
pnpm --filter @xiaowoniu/backend dev
pnpm --filter @xiaowoniu/backend test
pnpm --filter @xiaowoniu/backend lint
pnpm --filter @xiaowoniu/backend build
pnpm --filter @xiaowoniu/frontend dev
pnpm --filter @xiaowoniu/frontend test
pnpm --filter @xiaowoniu/frontend lint
pnpm --filter @xiaowoniu/frontend build
```

修改 Prisma schema 或迁移后，先在本地确认数据库目标，再执行：

```bash
pnpm --filter @xiaowoniu/backend prisma:generate
pnpm --filter @xiaowoniu/backend prisma:migrate
```

`prisma validate` 和 `prisma generate` 只校验 schema 或生成客户端，不代表数据库迁移已经部署。共享环境、Staging 或生产环境不得使用 `prisma migrate reset`；目标环境的 `prisma migrate deploy` 只能在已确认数据库、备份、变更窗口和负责人并获得明确发布授权后执行。

## 开发约定

### 类型与 API 契约

- 先在 `shared/src/` 更新跨前后端使用的类型、DTO、枚举或标签，再同步实现后端和前端。
- TypeScript 保持严格模式；避免无理由使用 `any`、重复定义共享枚举或绕过类型检查。
- 后端按 `routes → controllers → services` 分层，输入边界使用现有的 Zod schema；不要把业务规则散落在路由或 React 组件中。
- 受保护资源必须按认证用户的 `userId` 隔离查询和写入；不存在资源与跨用户访问统一按既有契约返回 `404`，不得泄露资源归属。
- 金额在数据库和服务端聚合中使用 Prisma `Decimal`，对外 DTO 再转换为数字；金额最多保留两位小数。
- 日期遵循现有契约：时间戳使用 ISO 8601，日期字段使用 `YYYY-MM-DD`；周/月边界等服务端统计以 UTC 规则为准。
- 新增或修改 API 时，同时更新对应测试和 `backend/API.md`；涉及用户可见行为时更新 README 或相关 QA 文档。

### 前端行为

- 页面和 store 要明确处理加载中、空数据、成功、失败和重试状态；失败时不要清空用户仍可修正的表单输入。
- 删除操作保留确认和焦点恢复语义；新增模块需保持受保护路由、用户隔离和响应式布局。
- 复用现有组件、store、service 和设计系统，不要为同一行为创建平行实现。涉及动效时保留 reduced-motion 支持。
- 先让 `shared` 构建通过，再验证依赖它的后端和前端。

### 代码与文件

- 遵循现有目录、命名、导入和格式风格；改动尽量小且聚焦，不顺手重构无关代码。
- 不直接编辑 `dist/`、`build/`、`coverage/` 或 `node_modules/` 等生成目录。
- 不提交 `.env`、数据库连接串、JWT、密码、Cookie、访问令牌或其他真实 Secret；日志也不得记录这些内容及完整请求体。
- 修改观测性行为时遵循 `docs/ops/phase9-observability.md` 中的脱敏、request ID 和端点契约。

## 验证与证据边界

完成代码改动后，按风险运行最小充分检查；涉及跨包或发布候选时运行：

```bash
pnpm verify
git diff --check
```

发布候选应从干净 checkout 执行 `pnpm install --frozen-lockfile` 和 `pnpm run ci:verify`，并保留测试、lint、build、`backend/dist/`、`frontend/dist/` 及 release metadata。CI 的 `BUILD_SHA` 必须对应被检出的提交；本地标记为 `local` 的构建不能作为发布证据。

请明确区分以下证据：

- 自动化测试、类型检查和构建，只证明仓库代码在对应测试环境通过。
- 本地真实 PostgreSQL、HTTP 或浏览器操作，是本地验收证据；需要真实浏览器时使用 Ego Browser。
- Staging 或生产验收必须使用目标环境的真实地址、受管 Secret、数据库迁移和授权记录；本地通过不能替代这些证据。

后端运行状态端点的语义如下：`/health` 只证明进程存活，`/readyz` 需要数据库查询成功，`/version` 用于核对构建元数据，`/metrics` 仅在配置受保护的 `METRICS_TOKEN` 后开放。

## 发布与外部系统

- 发布计划、QA 清单或运维文档不是部署授权。未获得明确授权时，只完成仓库内代码、测试和文档工作，不执行 Staging/生产迁移、发布、备份恢复或回滚。
- 生产发布应提升已验证的同一份不可变构建产物，不在生产环境从工作树重新构建。
- 任何外部服务、域名、TLS、Secret、数据库或监控系统的变更，都必须先确认目标、范围、负责人和回滚方式；不得因一个项目的需求修改同机其他项目。
- 数据库变更前检查迁移顺序和可恢复性；不要假设存在安全的 down migration。失败时停止提升，保留证据并通知回滚授权人。

## Git 与工作区安全

- 先查看当前分支和工作区状态，保留用户已有的修改、未跟踪文件和本地配置。
- 未经明确要求不执行提交、推送、重置、强制切换分支或删除工作树。
- 不使用 `git reset --hard`、`git checkout --` 或面向宽泛路径的递归删除来清理工作区；任何破坏性操作都要先确认精确目标和可恢复性。
- 交付时说明实际运行过的验证命令、结果，以及尚未执行的数据库、浏览器、Staging 或生产检查，不把推测写成缺陷或验收结论。

## 重要文档入口

- `README.md`：项目总览、启动和模块约定。
- `backend/README.md`：后端结构、环境变量和迁移说明。
- `backend/API.md`：API 请求、响应和错误契约。
- `DESIGN_SYSTEM.md`：前端视觉与组件约定。
- `docs/superpowers/`：架构和阶段规划。
- `docs/qa/`：本地及发布验收清单。
- `docs/ops/`：CI、发布、数据库和可观测性运行手册。
