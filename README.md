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

# 也可以分别验证各包
pnpm --filter @xiaowoniu/shared build
pnpm --filter @xiaowoniu/backend test
pnpm --filter @xiaowoniu/backend build
pnpm --filter @xiaowoniu/frontend test
pnpm --filter @xiaowoniu/frontend build
```

## 四大模块

- **瘦瘦瘦（已实现）** - 运动打卡与月历、体重记录与趋势图、健身目标和周/月统计
- **学学学（已实现）** - 考试倒计时、学习科目进度、学习打卡、42 天学习日历和近期记录，入口为受保护路由 `/learning`
- **省省省（已实现）** - 消费记录、月度预算、支出汇总、每日趋势和存钱计划，入口为受保护路由 `/finance`
- **嫁嫁嫁（待开发）** - 备婚任务、预算管理

学习模块后端接口以 `/api/learning` 为前缀，完整契约见 [API 文档](backend/API.md)。学习数据按当前 JWT 用户隔离；删除考试或科目会级联删除下属数据，打卡增删会在事务中重算进度。

Finance 后端接口以 `/api/finance` 为前缀，月度汇总由服务端按 `YYYY-MM` 计算，分类和每日趋势包含零值数据。消费、预算和存钱计划均按当前 JWT 用户隔离，金额最多两位小数；执行 Finance 迁移前必须连接 PostgreSQL，`prisma validate` 和 `prisma generate` 不能替代 `prisma migrate deploy`。

## 文档

- [架构设计](docs/superpowers/specs/2026-07-29-architecture-design.md)
- [设计系统](DESIGN_SYSTEM.md)
- [项目规划](PROJECT_PLAN.md)
- [后端说明](backend/README.md)
- [API 文档](backend/API.md)
- [前端说明](frontend/README.md)

## License

MIT
