# Phase 8 发布检查清单

## 范围

Phase 8 交付 Dashboard 跨模块摘要、四个模块的快捷入口、Finance/Wedding 集成基线、回归测试和发布前门禁。本阶段不部署生产环境；生产发布必须经过独立的部署计划、审批和回滚演练。

## 代码与依赖

- [ ] 工作树中没有未授权的删除、密钥、token 或真实数据库连接串。
- [x] `pnpm install --frozen-lockfile` 成功，lockfile 与 package manifest 一致。
- [x] shared/backend/frontend 的 `build`、`test`、`lint` 均为真实可执行脚本。
- [x] `pnpm verify` 成功且不会使用 `|| true` 吞掉错误。
- [ ] 变更经过代码审查，Dashboard 查询直接使用 Prisma，不通过内部 HTTP 调用自身。

## 环境与数据库

- [ ] 已根据 `backend/.env.example` 配置 `DATABASE_URL`、`JWT_SECRET`、`FRONTEND_URL` 等变量。
- [ ] 生产密钥通过部署平台注入，不写入仓库或文档。
- [ ] 已确认 PostgreSQL 备份、恢复点和负责人。
- [ ] 已审查 Finance、Learning、Wedding、Dashboard 相关迁移的顺序与回滚影响。
- [x] `prisma validate` 与 `prisma generate` 已执行。
- [ ] 只有在确认目标数据库和变更窗口后，才执行 `prisma migrate deploy`。

## 自动化验证

- [x] shared build
- [x] Prisma schema validate/generate
- [x] backend tests
- [x] frontend tests
- [x] shared/backend/frontend lint
- [x] shared/backend/frontend build
- [x] 结果和失败日志已记录

## 手工验收

- [x] 登录后 Dashboard 展示四模块摘要、空值语义、刷新和错误重试。
- [x] 四个模块的 Dashboard 快捷入口打开正确 dialog，提交成功后数据刷新。
- [x] 390px、768px、1280px+ 通过响应式验收清单。
- [x] 键盘、焦点、ARIA、删除确认和 reduced-motion 通过验收清单。
- [x] 使用两个隔离用户确认数据隔离、登出清理和登录切换不串数据。
- [x] 可用本地服务时完成真实 HTTP smoke test 和浏览器 GUI 验收。

## 版本与回滚

- [ ] 版本号和变更日志已更新（如发布流程要求）。
- [ ] 发布负责人和观察窗口已确认。
- [ ] 已准备回滚提交/构建产物和数据库恢复方案。
- [ ] 未执行生产部署；后续部署前重新确认迁移、备份、环境变量和回滚方案。

## 结果

- 验收日期：2026-08-11
- 执行人：Codex
- 通过/阻塞：本地质量门禁、真实数据库状态和浏览器验收均通过；生产发布仍未授权，且生产环境前置项尚未执行。
- 已验证：`pnpm verify`、`git diff --check`、临时连接本机 PostgreSQL 后的 `prisma migrate status`。本次 `pnpm verify` 包含 shared build、Prisma schema validate/generate、后端 14 个测试文件/163 项测试、前端 28 个测试文件/219 项测试、shared/backend/frontend lint 和三个 workspace build。迁移状态为 6 个 migration，schema up to date。
- 已完成的浏览器证据：账号 A 的 Fitness、Learning、Finance、Wedding 数据录入及 Dashboard 回写；账号 B 的四模块详情隔离；账号 C 的 Finance 预算 ¥100 与消费 ¥120.50，Finance 显示“已超支”和 ¥-20.50，Dashboard 显示 -¥20.50；网络阻断下的初次加载失败与重试恢复；快捷入口 action 清理、刷新不重复打开、删除确认、焦点恢复、三档响应式和 reduced motion。
- 未执行项及原因：未连接目标生产环境；未注入生产密钥；未确认备份、恢复点、负责人、变更窗口和回滚演练；未执行 `prisma migrate deploy`；未产生发布提交或构建产物。当前工作树仍包含既有 Phase 8 未提交改动，按要求未提交、未推送。
- 后续行动：获得独立部署审批后，在目标环境重新确认环境变量、备份与恢复演练、migration deploy 和回滚方案，再执行生产发布。
