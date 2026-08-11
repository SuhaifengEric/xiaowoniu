# Phase 9 数据库迁移、备份与恢复运行手册

## 使用边界

本手册只适用于已确认的目标环境和受权数据库凭据。当前没有执行任何 Staging 或生产 `prisma migrate deploy`、备份、恢复或回滚操作。

禁止事项：

- 不在仓库、CI 日志或本手册中记录真实 `DATABASE_URL`、备份地址或用户数据。
- 不使用 `prisma migrate reset` 处理共享环境。
- 不因应用回退就假设 Prisma 存在可安全执行的 down migration。

## 当前迁移目录审阅清单

按目录顺序确认以下迁移在目标数据库中的状态和数据影响：

1. `20260729132811_init`
2. `20260730170000_add_fitness_tables`
3. `20260730220000_ensure_single_active_fitness_goal`
4. `20260731120000_add_learning_tables`
5. `20260731160000_add_finance_tables`
6. `20260804120000_add_wedding_tables`

Dashboard 使用现有模块表进行 Prisma 聚合；迁移审阅还应核对其查询在目标数据库上的表现，而不是假设缓存或新表已经存在。

## 执行顺序

1. 发布负责人确认唯一构建产物、变更窗口和回滚授权人。
2. 数据库负责人在受管平台创建可验证备份，记录数据库标识、开始时间、校验结果、保留期和恢复点；备份文件不得落入仓库。
3. 在隔离数据库恢复该备份。使用无真实密码的受控验收账号，抽样核对用户隔离、Fitness 打卡、Learning 考试/科目/打卡、Finance 消费/预算、Wedding 任务/花费和 Dashboard 摘要。
4. 使用目标环境受权凭据记录迁移前状态：

   ```bash
   pnpm --filter @xiaowoniu/backend exec prisma migrate status
   ```

5. 仅在第 1–4 步均已记录后执行：

   ```bash
   pnpm --filter @xiaowoniu/backend exec prisma migrate deploy
   ```

6. 记录迁移后状态，检查 `/readyz`，再执行 Staging HTTP 与 Ego 浏览器冒烟。
7. 任何一步失败、数据库错误持续或数据隔离有疑点时，停止提升，保留日志和 release manifest，并通知回滚授权人。

## 恢复与回滚原则

1. 优先回退应用到已验证的同一构建产物，不重新从工作树构建。
2. 只有隔离恢复演练成功且数据库负责人批准时，才从指定恢复点恢复数据库。
3. 恢复后重新执行迁移状态检查、`/readyz`、关键数据抽样和浏览器冒烟。
4. 将恢复耗时、丢失窗口、异常和后续修复记录到 release manifest；据此更新 RPO/RTO 决策。
