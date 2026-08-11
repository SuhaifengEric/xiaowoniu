# Phase 9 可观测性与日志安全

## 运行端点契约

| 端点 | 语义 | 成功条件 | 安全边界 |
|---|---|---|---|
| `GET /health` | liveness | HTTP 进程可响应，返回 `status: ok` | 不访问数据库，不能代替 readiness。 |
| `GET /readyz` | readiness | Prisma 成功执行最小数据库查询，返回 `status: ready` | 失败时只返回 `503` 和 `status: not_ready`，不回显连接串或内部异常。 |
| `GET /version` | 构建定位 | 返回服务名、环境、版本、构建 SHA、构建时间 | 只允许非敏感构建元数据。 |
| `GET /metrics` | 进程内最小指标 | 配置 `METRICS_TOKEN` 后，通过 `Authorization: Bearer <METRICS_TOKEN>` 访问 | 未配置时返回 404；不得把 token 写进 URL、日志或仓库。 |

`/metrics` 是单进程内存快照，进程重启会归零。目标监控平台确认后，应以受控方式采集并保留历史数据，不能把它误当作长期数据库。

## JSON 日志字段

所有控制台日志使用 JSON。常规请求完成事件包含：

- `timestamp`、`level`、`service`、`environment`、`version`、`buildSha`
- `event`、`requestId`、`method`、`route`、`statusCode`、`durationMs`

Dashboard 摘要额外记录 `dashboard_summary_request_completed` 事件。错误日志带同一 `requestId`、路由和经过脱敏的错误信息；客户端通过响应头 `X-Request-Id` 提供该 ID 给观察人定位。

不得写入日志的字段包括：`Authorization`、JWT、密码、`DATABASE_URL`、Cookie、完整请求体、邮箱/手机号/用户标识及其他个人敏感字段。代码中的脱敏器会处理这些字段和常见 token/连接串文本，但上线前仍须由安全负责人抽样审阅真实 Staging 日志。

## 最小指标

| 信号 | 指标字段 | 初始用途 |
|---|---|---|
| HTTP 请求量、5xx、p50/p95 | `http` | 发现发布后的总体退化。 |
| Dashboard 摘要量、5xx、p50/p95 | `dashboardSummary` | 单独观察跨模块聚合。 |
| 数据库 readiness 成功/失败、延迟 | `database.readiness*` | 判断是否可接流量。 |
| 路由中的 Prisma 错误数 | `database.queryErrorsTotal` | 排查数据库或迁移异常。 |

这些阈值只是首个观察窗口的候选信号，不是服务等级承诺；在选定监控平台、流量基线和责任人后再正式确认。

| 候选观察信号 | 建议动作 | 联系人 |
|---|---|---|
| 连续 5 分钟出现未解释的 5xx，或 5xx 占比高于 1% | 停止提升，检查 request ID、版本与数据库 readiness。 | 待指定 |
| Dashboard p95 相比 Staging 基线显著上升 | 保留查询与数据库证据，先排查索引/数据量，不预设缓存。 | 待指定 |
| readiness 连续失败或 `queryErrorsTotal` 增长 | 停止接入流量，通知数据库负责人并按恢复手册处理。 | 待指定 |
| 日志发现未脱敏字段 | 立即限制日志访问、停止进一步放量并轮换受影响 Secret。 | 待指定 |
