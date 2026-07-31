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

### 数据库初始化

```bash
pnpm --filter backend prisma:generate
pnpm --filter backend prisma:migrate
```

### 测试

```bash
pnpm test
```

## 四大模块

- **瘦瘦瘦（已实现）** - 运动打卡与月历、体重记录与趋势图、健身目标和周/月统计
- **学学学（待开发）** - 考试倒计时、学习进度
- **省省省（待开发）** - 消费记录、存钱计划
- **嫁嫁嫁（待开发）** - 备婚任务、预算管理

## 文档

- [架构设计](docs/superpowers/specs/2026-07-29-architecture-design.md)
- [设计系统](DESIGN_SYSTEM.md)
- [项目规划](PROJECT_PLAN.md)
- [后端说明](backend/README.md)
- [API 文档](backend/API.md)
- [前端说明](frontend/README.md)

## License

MIT
