# 个人中心与账号设置验收清单

> 适用范围：`/profile`、登录后顶部用户菜单、昵称更新和密码修改。
>
> 证据边界：自动化门禁、本地真实环境验收、Staging/生产验收必须分开记录；本地通过不等于 Staging 或生产通过。

## 一、自动化证据

- [x] Shared build 通过，`UpdateProfileRequest` 和 `ChangePasswordRequest` 从 `@xiaowoniu/shared` 导入。
- [x] 后端 auth service 测试通过：用户隔离、trim/清空昵称、当前密码校验、哈希更新、错误时不 update、响应不含 password/hash。
- [x] 后端 auth route 测试通过：未认证 401、`authMiddleware → validateRequest → controller`、未知字段/非法长度 400、明确错误 code 和统一响应包络。
- [x] 前端 auth service/store 测试通过：请求路径和 body 正确、昵称同步 Zustand 与 `localStorage.user`、密码不改变 token/user/业务 store、不持久化密码。
- [x] `AccountMenu` 测试通过：昵称/用户名 fallback、个人中心导航、登出、Enter/Space、Escape 焦点回归。
- [x] Profile 页面测试通过：资料显示、昵称 trim/清空/超长、失败保留输入、密码字段校验、旧密码错误、成功清空密码输入。
- [x] `MobileTabBar` 回归测试通过，仍只有五项业务入口。
- [x] `pnpm verify`、`git diff --check`、前端 lint 和 backend build 通过。

## 二、本地真实 PostgreSQL / HTTP / 浏览器证据

记录日期：2026-08-12  执行人：Codex  环境地址：`http://localhost:5173` / `http://localhost:3000`

### HTTP 与数据库

- [x] 本地服务 `/health` 返回进程存活。
- [x] 本地服务 `/readyz` 返回数据库就绪。
- [x] 使用本地测试账号登录成功，获得真实 JWT。
- [x] `PATCH /api/auth/me` 修改昵称成功，返回完整 `UserResponse` 且不含 password/hash。
- [x] 空昵称提交成功并写入 `null`；刷新或重新获取 `/api/auth/me` 后仍为 `null`。
- [x] `PATCH /api/auth/password` 使用正确当前密码成功，返回 `data: null`。
- [x] 错误当前密码返回 `INVALID_CURRENT_PASSWORD`，数据库 password 未改变。
- [x] 新旧密码相同返回 `PASSWORD_UNCHANGED`，数据库 password 未改变。
- [x] 修改密码后当前 JWT 仍可访问受保护接口；本期不宣称所有设备退出。
- [ ] 用户 A 的 JWT 不能读取或修改用户 B 的资料或密码：未执行双用户真实流程；自动化用户隔离测试已通过。
- [x] 数据库 password 仍为 bcrypt 哈希，日志、URL、localStorage 和用户响应中没有密码明文。
- [x] 昵称更新后 `updatedAt` 正确变化，用户资料未串号。

### Ego Browser 页面操作

- [x] 1280px：五个登录后页面顶部都能看到统一头像/昵称用户菜单。
- [x] 1280px：菜单可打开个人中心和登出，外部点击及 Escape 可关闭。
- [x] 1280px：个人中心两张卡片保持现有粉蓝、圆角、边框和按钮风格，无明显溢出。
- [x] 390px：顶部品牌和用户菜单不重叠，昵称可回退为用户名。
- [x] 390px：基本资料卡和账号安全卡为单列，按钮和输入框可操作。
- [x] 390px：底部仍只有五项业务导航，个人中心不增加第六项。
- [x] 键盘 Tab 可到达菜单触发器、菜单项、表单输入和按钮。
- [x] Enter/Space 可打开用户菜单并执行菜单项；Escape 关闭菜单后焦点回到触发器。
- [x] 昵称成功、清空、失败重试流程符合页面提示和输入保留规则。
- [x] 密码错误、密码成功、刷新页面流程符合页面提示和登录状态规则。
- [x] Token 失效后沿用既有 401 处理并跳转 `/login`。

### 本次本地验收观测记录

- 自动化：`pnpm verify` 通过；shared 构建、Prisma validate/generate、后端 22 个测试文件 193 个测试、前端 34 个测试文件 240 个测试、shared/backend/frontend lint 和全量 build 均通过；`git diff --check` 通过。
- 服务：`GET /health` 返回 HTTP 200 和 `{"status":"ok"}`；`GET /readyz` 返回 HTTP 200 和 `{"status":"ready"}`。
- 资料：真实浏览器中完成昵称修改、清空为 `null`、刷新读回，并最终恢复测试账号默认昵称“测试用户”；桌面与移动端顶部菜单同步正确。
- 密码：错误当前密码返回 `INVALID_CURRENT_PASSWORD` 且输入保留；临时密码修改成功后当前会话仍有效，随后恢复原密码；新旧密码相同时返回 `PASSWORD_UNCHANGED`。
- 安全边界：数据库记录最终昵称为“测试用户”，`updatedAt`随更新变化；密码字段为 `$2b$` bcrypt 哈希、长度 60；浏览器 `localStorage` 仅有 `token` 和 `user`，没有密码字段；用户响应和页面没有 password/hash。
- 页面：1280px 下六个登录后页面均显示统一 `AccountMenu` 且无横向溢出；390px 下顶部无重叠、资料/安全卡单列、底部导航保持 5 项且无横向溢出；Enter/Space、Escape、外部点击和 Token 失效跳转均已验证。

## 三、Staging / 生产验收边界

本计划不包含 Staging/生产部署、迁移、备份、回滚或域名配置。以下项目在获得明确发布授权、目标地址、受管 Secret、数据库负责人和变更窗口前均标记为“未验证”：

- [ ] Staging 真实地址登录和 `/profile` 流程：未验证。
- [ ] Staging 真实数据库迁移与数据隔离：本期无 schema/migration 变更，仍未验证目标环境：未验证。
- [ ] Staging 真实浏览器桌面/移动端验收：未验证。
- [ ] 生产真实地址、受管 Secret、备份、回滚和观察窗口：未验证。
- [ ] 生产发布和生产验收：未执行、未验证。
