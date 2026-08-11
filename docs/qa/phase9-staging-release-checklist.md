# Phase 9 Staging 发布与验收清单

## 当前状态

当前尚未指定 Staging 平台、Secret 管理、数据库备份目标、责任人或变更窗口。本清单用于这些决策完成后的受控执行；本轮没有执行 Staging 或生产部署。

## 发布前

- [ ] 发布决策记录中的平台、网络、TLS、Secret、备份和责任人已批准。
- [ ] release manifest 填写了唯一提交 SHA、lockfile SHA-256、不可变构建产物和审批记录。
- [ ] CI 从干净 checkout 通过 `pnpm install --frozen-lockfile` 与 `pnpm verify`。
- [ ] CI 保存后端/前端产物、测试日志和 release metadata；没有运行 `prisma migrate deploy`。
- [ ] Staging 使用合成数据或已批准的脱敏数据，且测试账号相互隔离。

## 部署与数据库

- [ ] 目标环境通过受管系统注入 `DATABASE_URL`、`JWT_SECRET`、`FRONTEND_URL`、`VITE_API_URL` 和必要的 `METRICS_TOKEN`；仓库中没有真实值。
- [ ] `NODE_ENV=staging` 在缺少 `JWT_SECRET` 或 `FRONTEND_URL` 时安全失败。
- [ ] `/health` 仅作为 liveness，`/readyz` 成功后才接收流量，`/version` 与 release metadata 一致。
- [ ] 已完成备份与隔离恢复演练，并在 release manifest 中记录证据。
- [ ] 已记录迁移前状态；负责人确认后执行 `prisma migrate deploy` 并记录迁移后状态。

## Staging 冒烟

- [ ] 真实 HTTP 冒烟通过登录、`/health`、`/readyz`、CORS、`/version` 和受保护 API。
- [ ] 需要浏览器操作时，使用 Ego 浏览器，以临时隔离账号完成登录、Dashboard 四模块摘要和四个快捷入口。
- [ ] 在四个模块创建一条可清理数据，验证删除确认、登出和两位用户的数据隔离。
- [ ] 安全触发一个可控失败，依据 `X-Request-Id` 从 JSON 日志定位，确认没有 JWT、密码、连接串、Cookie 或完整请求体。
- [ ] 记录 Dashboard 聚合延迟、5xx、readiness 和数据库异常快照；有未解释错误或串户疑点即停止提升。

## 生产提升

- [ ] 发布评审确认 Staging 证据、观察窗口、放行条件、停止条件与回滚授权人。
- [ ] 生产复用同一 SHA 和同一不可变产物；不从工作树重新构建。
- [ ] 生产仅执行非破坏性最小冒烟，并在观察窗口追踪认证、核心写入、Dashboard 和数据库健康。
- [ ] 任一停止条件满足时，按数据库运行手册停止提升并执行获授权的应用回退/恢复。
