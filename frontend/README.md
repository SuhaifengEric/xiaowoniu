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
- **图表**: Recharts

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
- `pnpm test` - 运行 Vitest 测试
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
- ✅ 瘦瘦瘦模块
- ✅ 学学学模块

瘦瘦瘦模块位于受保护路由 `/fitness`，可从 Dashboard 进入。页面支持运动打卡、体重记录、健身目标替换、月历查询、周/月统计、目标进度、体重趋势和最近体重删除，并提供加载、空数据、成功和错误状态。

学学学模块位于受保护路由 `/learning`，可从 Dashboard 进入。页面支持考试倒计时、考试归档、科目进度、学习打卡、打卡删除、级联删除、42 天 Monday-first 学习日历和近期记录；请求失败、加载中、空数据和操作成功状态均有对应反馈。

### 待开发
- ⏳ 省省省模块
- ⏳ 嫁嫁嫁模块

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_URL` | 后端服务根地址，客户端请求会追加 `/api/...` | `http://localhost:3000` |

## 测试账号

- 邮箱：test@example.com
- 密码：password123
