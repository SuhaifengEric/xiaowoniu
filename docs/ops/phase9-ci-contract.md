# Phase 9 CI 与构建产物契约

## 目标

让每一次候选发布都能由干净 checkout、锁定依赖和唯一提交 SHA 重现；CI 平台尚未确定，因此本契约不假设 GitHub Actions、GitLab CI 或其他服务。

## 平台无关入口

CI 应在仓库根目录执行：

```bash
pnpm run ci:verify
```

该入口依次执行：

1. `pnpm install --frozen-lockfile`
2. `pnpm verify`
3. 生成 `.release/release-metadata.json`

CI 必须提供 `BUILD_SHA`，或提供平台原生的 `GITHUB_SHA` / `CI_COMMIT_SHA`。在 `CI=true` 或 `CI=1` 时，缺少提交 SHA 会失败；本地运行则会明确标为 `local`，不能用于发布。

## 依赖生命周期脚本

本地验证使用的 pnpm 10 报告过 Prisma、esbuild 等依赖的 lifecycle scripts 被策略忽略。虽然本项目随后显式执行了 `prisma generate`，且完整 build 已通过，但这不能替代一台全新 CI 运行器上的验证。

- 目标 CI 的依赖脚本策略必须由发布/安全负责人审阅；不要为了消除警告而无差别放开所有依赖脚本。
- 对需要批准的包，记录批准的包名、理由、审核人和日期，并在干净运行器上重新运行本入口。
- 只有该干净运行器仍能生成 Prisma Client、通过 Vite build 并保存产物时，才能把生命周期策略视为已完成。

## 必须保存的产物与证据

| 项目 | 来源 | 用途 |
|---|---|---|
| 测试、lint、build 的 CI 日志 | CI 任务输出 | 排查失败，不允许使用 `|| true` 吞错。 |
| `backend/dist/` | 后端 build | 候选后端产物。 |
| `frontend/dist/` | 前端 build | 候选前端静态产物。 |
| `.release/release-metadata.json` | CI 入口生成 | 记录版本、提交 SHA、构建时间、Node 版本与 lockfile SHA-256。 |
| `pnpm-lock.yaml` | 被检出的提交 | 与元数据中的 SHA-256 对照。 |

构建平台应将这些项目保存为不可变产物，并在 Staging 与生产之间提升同一份产物；禁止在生产环境从工作树重新构建。

## 环境变量边界

- CI 可以注入 `BUILD_SHA`、`BUILD_TIME`、`BUILD_NUMBER` 和 `APP_VERSION` 等非敏感构建元数据。
- CI 不得持有生产 `DATABASE_URL`、`JWT_SECRET`、`METRICS_TOKEN` 或其他运行 Secret。
- CI 只执行 Prisma `validate`、`generate` 与迁移目录审阅；不得自动执行 `prisma migrate deploy`。
- 前端 `VITE_API_URL` 是构建期变量。构建 Staging 产物前必须由发布负责人确认其目标地址；本文件不填写具体地址。

## 接入 CI 后的验收

- [ ] 从干净 checkout 执行一次入口，`pnpm install --frozen-lockfile` 与 `pnpm verify` 都通过。
- [ ] 元数据中的提交 SHA、lockfile SHA-256 与被检出提交一致。
- [ ] 失败时没有产物被标记为可发布。
- [ ] 任务日志与上述四类产物均按平台保留策略保存。
