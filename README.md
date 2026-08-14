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

### 配置数据库

在 `backend/.env` 中配置 `DATABASE_URL`、`JWT_SECRET` 等变量，然后生成 Prisma Client 并执行迁移：

```bash
pnpm --filter @xiaowoniu/backend prisma:generate
pnpm --filter @xiaowoniu/backend prisma:migrate
```

`prisma:migrate` 需要可连接的 PostgreSQL；仅运行 schema 校验和 `prisma:generate` 不会部署数据库迁移。

### 开发模式

```bash
# 启动所有服务
pnpm dev

# 启动指定包
pnpm --filter @xiaowoniu/backend dev
pnpm --filter @xiaowoniu/frontend dev
```

后端默认运行在 `http://localhost:3000`，前端默认运行在 `http://localhost:5173`。

### 构建与测试

```bash
pnpm build
pnpm test
pnpm lint
pnpm verify

# 也可以分别验证各包
pnpm --filter @xiaowoniu/shared build
pnpm --filter @xiaowoniu/backend test
pnpm --filter @xiaowoniu/backend build
pnpm --filter @xiaowoniu/frontend test
pnpm --filter @xiaowoniu/frontend build
```

## 四大模块

- **Dashboard（已实现）** - 四个模块的服务端聚合摘要、空值/错误/重试状态和快捷操作，入口为受保护路由 `/dashboard`
- **瘦瘦瘦（已实现）** - 运动打卡与月历、体重记录与趋势图、健身目标和周/月统计
- **学学学（已实现）** - 考试倒计时、学习科目进度、学习打卡、42 天学习日历和近期记录，入口为受保护路由 `/learning`
- **省省省（已实现）** - 消费记录、月度预算、支出汇总、每日趋势、存钱计划和可追踪的存入历史，入口为受保护路由 `/finance`
- **嫁嫁嫁（已实现）** - 以婚姻进程为主线，记录确认意愿、两次上门、双方父母见面、基本共识、订婚、领证和婚礼 8 个节点；同时保留阶段行动项、预算、花费和时间线，入口为受保护路由 `/wedding`

Dashboard 摘要由后端 `GET /api/dashboard/summary` 按当前用户和服务端 UTC 边界聚合，前端快捷操作使用白名单 `action` 参数进入既有模块 dialog；没有预算、考试或婚期时使用 `null`，预算超支保留负数。所有受保护入口为 `/dashboard`、`/fitness`、`/learning`、`/finance`、`/wedding`。

Finance 后端接口以 `/api/finance` 为前缀，月度汇总由服务端按 `YYYY-MM` 计算，分类和每日趋势包含零值数据。消费、预算、存钱计划和存入记录均按当前 JWT 用户隔离；存钱计划的累计金额、进度和剩余金额由存入记录聚合派生，金额最多两位小数。执行 Finance 迁移前必须连接 PostgreSQL，`prisma validate` 和 `prisma generate` 不能替代 `prisma migrate deploy`。

Wedding 后端接口以 `/api/wedding` 为前缀。`PUT /api/wedding/process` 幂等初始化 8 个婚姻节点和 6 个默认共识议题；节点的计划日期、实际日期、状态、补录标记和历史分开保存，日期到了不会自动完成，父母见面也不表示审批。领证和婚礼独立记录，可分别调整计划顺序；阶段行动项扩展自原有备婚任务，未传阶段默认归入婚礼、负责人默认为双方。原有任务看板、预算与婚期、花费明细、里程碑时间线和倒计时仍可使用；花费按类别独立快照并可关联行动项，删除行动项后花费保留并解除关联。预算、节点概览、任务完成率、类别统计、时间线和有符号倒计时全部由服务端按当前用户实时派生。任务、节点、共识、花费、预算和统计均按当前 JWT 用户隔离，跨用户资源统一返回 `404`；金额最多两位小数，日期使用 `YYYY-MM-DD`。执行 Wedding 迁移前必须连接 PostgreSQL，`prisma validate` 和 `prisma generate` 不能替代 `prisma migrate deploy`。

## 文档

- [架构设计](docs/superpowers/specs/2026-07-29-architecture-design.md)
- [设计系统](DESIGN_SYSTEM.md)
- [项目规划](PROJECT_PLAN.md)
- [后端说明](backend/README.md)
- [API 文档](backend/API.md)
- [前端说明](frontend/README.md)

## License

MIT
