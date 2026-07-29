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

## API 文档

详见 [API.md](./API.md)

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
