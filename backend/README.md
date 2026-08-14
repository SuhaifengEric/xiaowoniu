# @xiaowoniu/backend

小窝牛平台的后端 API 服务。

## 技术栈

- **框架**: Express 4.x + TypeScript
- **数据库**: PostgreSQL 15+ + Prisma ORM
- **认证**: JWT + bcryptjs
- **验证**: Zod
- **日志**: Winston

## 开发环境要求

- Node.js >= 20.0.0
- PostgreSQL >= 15
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

编辑 `.env` 文件，配置数据库连接等信息。

### 3. 数据库迁移

```bash
pnpm prisma:migrate
```

### 4. 生成 Prisma Client

```bash
pnpm prisma:generate
```

### 5. 运行种子数据（可选）

```bash
pnpm prisma:seed
```

### 6. 启动开发服务器

```bash
pnpm dev
```

服务器将在 `http://localhost:3000` 启动。

## 可用脚本

- `pnpm dev` - 启动开发服务器（热重载）
- `pnpm build` - 编译 TypeScript
- `pnpm test` - 运行 Vitest 测试
- `pnpm lint` - 运行 TypeScript 类型检查
- `pnpm start` - 启动生产服务器
- `pnpm prisma:generate` - 生成 Prisma Client
- `pnpm prisma:migrate` - 运行数据库迁移
- `pnpm prisma:studio` - 打开 Prisma Studio
- `pnpm prisma:seed` - 运行种子数据
- `pnpm clean` - 清理构建产物

## 项目结构

```
src/
├── config/          # 配置文件
├── controllers/     # 控制器（处理 HTTP 请求）
├── services/        # 业务逻辑
├── middlewares/     # 中间件
├── routes/          # 路由定义
├── utils/           # 工具函数
├── types/           # TypeScript 类型
├── app.ts           # Express 应用配置
└── server.ts        # 服务器入口
```

Fitness 后端提供按当前用户隔离的运动打卡、体重记录、单一有效目标及周/月统计 API，所有端点均需要 JWT。对应实现位于 `fitness.controller.ts`、`fitness.service.ts`、`fitness.routes.ts` 和 `fitness.schemas.ts`。

学习模块提供按用户隔离的考试倒计时、考试科目和学习打卡 API，路由前缀为 `/api/learning`。考试、科目和打卡分别支持查询、创建、更新或删除；打卡创建和删除会在事务内按章节去重重算科目进度，并使用 PostgreSQL advisory transaction lock 保护同一科目的并发更新。删除考试会级联删除科目和打卡，删除科目会级联删除打卡。日期使用 `YYYY-MM-DD`，资源不存在或跨用户访问统一返回 `404`。

Finance 模块提供按用户隔离的消费记录、月度预算、支出汇总、存钱计划和存入记录 API，路由前缀为 `/api/finance`。15 条路由为：消费记录 `GET/POST /expenses`、`PATCH/DELETE /expenses/:id`；汇总 `GET /summary`；预算 `GET /budgets`、`PUT /budgets`；存钱计划 `GET/POST /saving-plans`、`PATCH/DELETE /saving-plans/:id`；存入记录 `GET/POST /saving-plans/:id/deposits`、`PATCH/DELETE /saving-plans/:id/deposits/:depositId`。预算使用 `(userId, month)` 复合唯一键 upsert；汇总和存钱计划进度由 Prisma Decimal 聚合后转换为 shared DTO 的 number；存入记录新增、编辑、删除在 Serializable 事务中校验目标余额，冲突返回 `409`。对应表为 `expenses`、`monthly_budgets`、`saving_plans` 和 `saving_deposits`，阶段 A 迁移目录为 `prisma/migrations/20260814120000_add_saving_deposits`，旧金额核对脚本为 `prisma/verify_saving_deposits_backfill.sql`。所有 Finance 资源都通过认证用户 `userId` 过滤，不存在或跨用户资源统一返回 `404`。

Wedding 模块提供按用户隔离的备婚任务、备婚花费和备婚预算 API，路由前缀为 `/api/wedding`。12 条路由为：任务 `GET/POST /tasks`、`PATCH/DELETE /tasks/:id`；花费 `GET/POST /expenses`、`PATCH/DELETE /expenses/:id`；预算 `GET/PUT /budget`；统计 `GET /overview`；时间线 `GET /timeline`。对应表为 `wedding_tasks`、`wedding_expenses` 和 `wedding_budgets`，迁移目录为 `prisma/migrations/20260804120000_add_wedding_tables`。预算以 `userId` 唯一键幂等 upsert，不持久化任何花费、百分比或倒计时派生值；金额聚合全部使用 Prisma Decimal 完成后再转换为 shared DTO 的 number；任务完成日期由服务端状态机维护：首次完成写入 UTC 当天、重复完成保留、离开 completed 清空、再完成重写。删除任务时关联花费通过外键 `ON DELETE SET NULL` 保留并解除关联，删除用户时三个 Wedding 资源级联清理。任务/花费/预算/概览/时间线全部按认证用户 `userId` 过滤，跨用户资源与不存在资源统一返回 `404`，消息不泄露资源归属。

学习模块相关 Prisma 表为 `exam_countdowns`、`study_subjects` 和 `study_checkins`，迁移目录为 `prisma/migrations/20260731120000_add_learning_tables`。执行迁移前必须配置可用的 PostgreSQL；`prisma validate` 和 `prisma generate` 只能验证 schema 或生成 client，不代表迁移已经部署。Wedding 迁移同样需要可连接的 PostgreSQL 才能执行 `prisma migrate deploy`。

数据库迁移包含 `add_fitness_tables` 和 `ensure_single_active_fitness_goal`，后者保证每位用户最多有一个有效目标。测试覆盖路由中间件、请求边界、用户隔离删除、目标替换事务及 UTC 周/月统计。

Dashboard 提供 `GET /api/dashboard/summary`，按当前 JWT 用户以服务端 UTC 当天、周和月边界聚合 Fitness、Learning、Finance、Wedding 摘要；无资源时返回 `null`，空计数返回 `0`，预算剩余允许为负数。完整接口契约见 [API.md](./API.md)。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | - |
| `JWT_SECRET` | JWT 密钥 | - |
| `JWT_EXPIRES_IN` | JWT 过期时间 | `7d` |
| `PORT` | 服务器端口 | `3000` |
| `NODE_ENV` | 运行环境 | `development` |
| `FRONTEND_URL` | 前端 URL（CORS） | `http://localhost:5173` |

## 测试账号

种子数据创建的测试账号：

- 邮箱：`test@example.com`
- 密码：`password123`
