# @xiaowoniu/frontend

小窝牛平台的前端应用。

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **UI 组件**: Shadcn/ui + Radix UI
- **样式**: Tailwind CSS 3
- **状态管理**: Zustand
- **路由**: React Router v6
- **HTTP 客户端**: Axios
- **图标**: Lucide React

## 开发环境要求

- Node.js >= 20.0.0
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

### 3. 启动开发服务器

```bash
pnpm dev
```

应用将在 `http://localhost:5173` 启动。

## 可用脚本

- `pnpm dev` - 启动开发服务器
- `pnpm build` - 构建生产版本
- `pnpm preview` - 预览生产构建
- `pnpm lint` - 运行 ESLint

## 项目结构

```
src/
├── components/      # React 组件
│   └── ui/         # Shadcn UI 组件
├── pages/          # 页面组件
├── routes/         # 路由配置
├── services/       # API 服务
├── store/          # Zustand 状态管理
├── hooks/          # 自定义 Hooks
├── lib/            # 工具库
├── types/          # TypeScript 类型
├── App.tsx         # 根组件
├── main.tsx        # 应用入口
└── index.css       # 全局样式
```

## 功能特性

### 已完成
- ✅ 用户注册
- ✅ 用户登录
- ✅ JWT 认证
- ✅ 受保护路由
- ✅ 响应式设计
- ✅ 错误处理

### 待开发
- ⏳ 瘦瘦瘦模块
- ⏳ 学学学模块
- ⏳ 省省省模块
- ⏳ 嫁嫁嫁模块

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_URL` | 后端 API 地址 | `http://localhost:3000` |

## 测试账号

- 邮箱：test@example.com
- 密码：password123
