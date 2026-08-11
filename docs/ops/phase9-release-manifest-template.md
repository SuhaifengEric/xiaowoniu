# 发布清单模板

> 每一次 Staging 和生产提升各复制一份本模板。没有完整字段或审批记录时，发布不得继续。

## 基本信息

- 环境：`Staging` / `Production`
- 发布编号：
- 提交 SHA：
- 版本：
- 构建时间（UTC）：
- 构建编号：
- `pnpm-lock.yaml` SHA-256：
- 构建产物位置与不可变校验值：
- `backend/dist/` 校验值：
- `frontend/dist/` 校验值：
- `.release/release-metadata.json` 校验值：

## 质量门禁

- [ ] 从干净 checkout 运行 `pnpm install --frozen-lockfile` 成功。
- [ ] `pnpm verify` 成功；失败日志已保存。
- [ ] `git diff --check` 成功。
- [ ] 密钥扫描无真实 Secret、token、连接串或私钥；例外已记录并获安全负责人批准。
- [ ] 当前改动已完成代码审查，且 Dashboard 仍直接使用 Prisma 聚合。

## 数据库变更

- migration 目录/名称：
- 迁移负责人：
- 迁移前 `prisma migrate status` 记录位置：
- 备份标识、校验结果和保留期：
- 隔离恢复演练记录位置：
- 变更窗口：
- `prisma migrate deploy` 执行人和开始/结束时间：
- 迁移后 `prisma migrate status`、`/readyz` 与冒烟记录：

## 部署与验收

- 操作人：
- 部署开始/结束时间（UTC）：
- `/health`：
- `/readyz`：
- `/version` 与构建元数据匹配：
- Staging 浏览器验收记录：
- 观察窗口、观察人和日志/指标快照位置：
- 已知问题与处置：

## 审批与回滚

- 发布负责人批准：
- 数据库负责人批准：
- 安全/Secret 负责人确认：
- 回滚授权人：
- 应用回退产物/SHA：
- 数据库恢复点与运行手册版本：
- 停止或回滚触发结果：

生产发布必须引用已通过 Staging 的同一份产物、相同提交 SHA 和相同 release manifest，不能重新构建。
