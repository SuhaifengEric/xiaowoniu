# Phase 5: 学学学模块 - 实现计划

> **面向 AI 代理的工作者：** 使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务逐项执行。所有步骤使用复选框（`- [ ]`）跟踪；每项完成后先运行其验证，再进入下一项。

**目标：** 实现“学学学”学习模块，形成“考试倒计时 -> 科目管理 -> 学习打卡 -> 进度与日历统计”的完整闭环。

**架构：** 复用 Fitness 已验证的垂直切片模式：Prisma 数据模型和迁移 + shared DTO + Express/Zod/JWT API + Axios/Zustand 前端状态 + React 响应式页面与 Radix Dialog 表单。

**技术栈：** PostgreSQL 15+、Prisma、Express、Zod、Vitest、React 18、React Router v6、Zustand、Radix UI、Lucide、Tailwind CSS、Recharts（不新增 React Query 或其他状态库）。

---

## 0. 阶段边界与已确认规则

### 0.1 前置条件

本计划以以下基础能力已经存在并可用为前提：

- `shared`、`backend`、`frontend` 的 pnpm workspace 可构建。
- JWT 中间件将当前用户标识注入 `req.user.userId`。
- API 统一使用 `/api/*` 路径、统一响应包络和现有错误处理中间件。
- 前端复用 Axios `api` 实例、认证状态和受保护路由。
- Fitness 模块的 Prisma singleton、Zod 验证、Zustand 请求失效、表单和测试模式可被复用。

不要单独为 Learning 引入 `/api/v1`、React Query、Hugeicons 或新的 UI 框架。架构规格中有这些历史候选项，但当前代码实际采用 `/api`、Zustand、Lucide 和 Radix UI，Phase 5 应保持一致。

### 0.2 本阶段范围

本阶段必须实现：

1. 考试倒计时的创建、查询、编辑、删除和归档。
2. 考试下的学习科目创建、查询、编辑、删除。
3. 学习打卡的创建、查询、删除。
4. 后端权威进度计算与考试级统计。
5. `/learning` 受保护页面、Dashboard 学习入口、考试选择、倒计时、科目进度、学习日历和记录列表。
6. 桌面及 390px 移动端完整操作流程。
7. 与 Fitness 同等级别的后端、前端、构建、Prisma 和浏览器验证。

### 0.3 明确不在范围内

以下内容不在 Phase 5 内，不应在实施过程中顺带加入：

- Finance、Wedding、个人资料、跨模块 Dashboard 聚合。
- Excel/CSV 导出、备份恢复、暗色模式、PWA、Docker、CI/CD、监控。
- 知识点树或章节树。当前领域只支持正整数编号的章节集合，没有章节层级数据模型。
- 自由排序、拖拽排序、学习计划自动排程、通知提醒、表单草稿恢复。
- 用户时区建模。继续采用浏览器本地日期显示与后端 UTC 日期存储的既有约定。

### 0.4 领域对象与关系

```text
User
 └─ ExamCountdown (一个用户可有多个考试)
     └─ StudySubject (一个考试可有多个科目)
         └─ StudyCheckin (一个科目可有多次学习打卡)
```

- `ExamCountdown`：考试名称、考试日期、是否归档。
- `StudySubject`：科目名称、总章节数、目标完成日期、当前完成章节数、进度百分比。
- `StudyCheckin`：学习日期、完成章节编号集合、学习时长、备注，以及创建时的进度快照。

### 0.5 数据权威来源和写入规则

为避免 `currentChapter`、`progressPercentage` 和打卡章节集合彼此漂移，采用以下规则：

1. **权威来源：** 某科目所有 `StudyCheckin.completedChapters` 的去重并集。
2. **派生字段：** `StudySubject.currentChapter` 是去重章节数；`progressPercentage` 为 `floor(currentChapter / totalChapters * 100)`，限制在 `0..100`。
3. **快照字段：** `StudyCheckin.progressPercentage` 只表示这次打卡写入后的科目进度，用于历史展示；当前科目进度始终以 `StudySubject` 为准。
4. **新增与删除打卡：** 必须在同一 Prisma transaction 内写入/删除打卡并重算该科目，不能由前端累加，也不能只做增量加法。
5. **并发写入：** 同一科目的打卡重算需要事务内串行化，优先采用 PostgreSQL advisory transaction lock，锁 key 由 `subjectId` 生成。不同科目不互相阻塞。
6. **章节编号：** 必须为唯一正整数，范围为 `1..totalChapters`；同一条打卡中不允许重复章节。不同打卡中重复章节允许保存，但统计时只计一次。
7. **删除级联：** 删除考试级联删除其科目和打卡；删除科目级联删除其打卡。前端必须确认后才执行删除。

### 0.6 日期、枚举、数值与错误规则

- API 日期字段只接受严格 `YYYY-MM-DD`，存储为 UTC 零点的 PostgreSQL `DATE`。
- 考试日期可以是今天、未来或过去；过去考试在 UI 中标记为“已结束”，不自动删除。
- 一个用户可以有多个未归档考试；页面默认选择最近的未归档考试。若不存在未归档考试，选择考试日期最近的考试；没有任何考试时显示空状态。
- `examName` 和 `subjectName` 去除首尾空格后不能为空，最大 100 字符。
- `totalChapters` 是 `1..10000` 的整数。
- `studyHours` 是 `0.01..24.00` 的两位小数；单条打卡不允许超过 24 小时。
- `completedChapters` 为长度 `1..1000` 的整数数组，排序和去重在服务端完成。
- `notes` 最大 2000 字符，服务端保存 trim 后的文本；空字符串保存为 `null`。
- 所有读取、修改和删除都按当前用户 `userId` 过滤。不存在的资源和属于其他用户的资源同样返回 `404 NOT_FOUND`，不暴露资源归属。
- 参数校验失败返回 `400 VALIDATION_ERROR`；数据库唯一约束或业务冲突返回 `409 CONFLICT`；未认证返回 `401 UNAUTHORIZED`。

---

## 1. API 契约

所有路径均以 `/api/learning` 为前缀并需要 Bearer JWT。

### 1.1 考试接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/exams` | 查询当前用户考试，默认按未归档和考试日期升序 |
| `POST` | `/exams` | 创建考试倒计时 |
| `PATCH` | `/exams/:id` | 部分更新考试名称、日期或归档状态 |
| `DELETE` | `/exams/:id` | 删除考试及其所有科目、打卡 |

`POST /exams` 请求：

```json
{
  "examName": "教师资格证笔试",
  "examDate": "2026-11-01"
}
```

`PATCH /exams/:id` 请求：

```json
{
  "examName": "教师资格证笔试（下半年）",
  "examDate": "2026-11-08",
  "isArchived": false
}
```

### 1.2 科目接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/subjects?examId=:examId` | 查询某考试下的科目 |
| `POST` | `/subjects` | 创建科目 |
| `PATCH` | `/subjects/:id` | 更新科目名称、总章节数或目标日期 |
| `DELETE` | `/subjects/:id` | 删除科目及其打卡 |

`POST /subjects` 请求：

```json
{
  "examId": "uuid",
  "subjectName": "教育知识与能力",
  "totalChapters": 24,
  "targetCompletionDate": "2026-10-15"
}
```

更新 `totalChapters` 时，后端必须拒绝小于当前已完成章节数的值，返回 `409 CONFLICT`。`targetCompletionDate` 可为 `null`，表示清除目标日期。

### 1.3 学习打卡接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/checkins?examId=&subjectId=&startDate=&endDate=&limit=&offset=` | 查询学习打卡 |
| `POST` | `/checkins` | 新增学习打卡并事务性重算进度 |
| `DELETE` | `/checkins/:id` | 删除打卡并事务性重算进度 |

`POST /checkins` 请求：

```json
{
  "subjectId": "uuid",
  "date": "2026-07-30",
  "completedChapters": [3, 4],
  "studyHours": 1.5,
  "notes": "完成了重点章节练习"
}
```

### 1.4 进度统计接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/progress?examId=:examId&startDate=&endDate=` | 返回考试、科目、学习日历和汇总统计 |

`GET /progress` 的 `examId` 必填；`startDate/endDate` 可选，若省略则日历统计返回当前可见月的 42 天范围，由前端明确传入以避免前后端显示范围不一致。

统计响应必须包含：

```typescript
interface LearningProgressResponse {
  exam: {
    id: string
    examName: string
    examDate: string
    isArchived: boolean
    daysRemaining: number
  }
  summary: {
    subjectsCount: number
    completedSubjectsCount: number
    overallProgressPercentage: number
    totalStudyHours: number
    totalCheckins: number
  }
  subjects: Array<{
    id: string
    subjectName: string
    totalChapters: number
    currentChapter: number
    progressPercentage: number
    targetCompletionDate: string | null
    totalStudyHours: number
    checkinsCount: number
  }>
  dailyActivity: Array<{
    date: string
    checkinsCount: number
    studyHours: number
    completedChaptersCount: number
  }>
}
```

`daysRemaining` 以后端 UTC 日期计算：考试日在今天为 `0`，过去日期为负数。前端只负责格式化为“今天考试”“还剩 N 天”或“已结束 N 天”，不重新计算业务值。

---

## 2. 文件结构概览

```text
xiaowoniu/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   │       └── <timestamp>_add_learning_tables/migration.sql
│   └── src/
│       ├── __tests__/
│       │   ├── learning.schemas.test.ts
│       │   ├── learning.service.test.ts
│       │   └── learning.routes.test.ts
│       ├── controllers/
│       │   └── learning.controller.ts
│       ├── routes/
│       │   ├── index.ts
│       │   └── learning.routes.ts
│       ├── services/
│       │   └── learning.service.ts
│       └── validation/
│           └── learning.schemas.ts
├── shared/
│   └── src/
│       ├── index.ts
│       └── types/
│           ├── api/
│           │   └── learning.ts
│           └── models/
│               └── learning.ts
├── frontend/
│   └── src/
│       ├── components/
│       │   └── learning/
│       │       ├── ExamDialog.tsx
│       │       ├── SubjectDialog.tsx
│       │       ├── StudyCheckinDialog.tsx
│       │       └── learning-dialogs.test.tsx
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   └── Learning/
│       │       ├── index.tsx
│       │       ├── ExamCountdown.tsx
│       │       ├── SubjectProgressBoard.tsx
│       │       ├── StudyCalendar.tsx
│       │       ├── learning-components.test.tsx
│       │       └── learning-page.test.tsx
│       ├── routes/
│       │   └── index.tsx
│       ├── services/
│       │   ├── learning.service.ts
│       │   └── learning.service.test.ts
│       ├── store/
│       │   ├── auth.store.ts
│       │   ├── learning.store.ts
│       │   └── learning.store.test.ts
│       └── index.css
├── backend/API.md
├── backend/README.md
├── frontend/README.md
└── README.md
```

---

## 3. 任务 1：Prisma 数据模型与迁移

**文件：**

- 修改：`backend/prisma/schema.prisma`
- 创建：`backend/prisma/migrations/<timestamp>_add_learning_tables/migration.sql`

### 3.1 定义 Prisma 模型

- [ ] 在 `User` 中新增反向关系：`examCountdowns`、`studySubjects`、`studyCheckins`。
- [ ] 新增 `ExamCountdown`：
  - `id` UUID 主键。
  - `userId` 与 `User` 的外键，`onDelete: Cascade`。
  - `examName` 最大长度由 Zod 保证，数据库使用 `VARCHAR(100)`。
  - `examDate` 为 `@db.Date`。
  - `isArchived` 默认 `false`。
  - `createdAt`、`updatedAt`。
  - 使用 `@@index([userId, isArchived, examDate])` 支持默认列表。
- [ ] 新增 `StudySubject`：
  - `userId` 保留冗余外键以强制每条资源直接按用户过滤。
  - `examId` 外键指向 `ExamCountdown`，`onDelete: Cascade`。
  - `subjectName`、`totalChapters`、`currentChapter`（默认 0）、`progressPercentage`（默认 0）、`targetCompletionDate`（可空）。
  - `@@index([userId, examId])`。
  - `@@unique([examId, subjectName])`，同一考试内不允许重复科目名称。
- [ ] 新增 `StudyCheckin`：
  - `userId` 和 `subjectId` 外键，均使用 `onDelete: Cascade`。
  - `date` 为 `@db.Date`。
  - `completedChapters` 为 PostgreSQL `Int[]`。
  - `studyHours` 为 `Decimal(4, 2)`。
  - `notes` 可空 `TEXT`。
  - `progressPercentage` 为创建时快照。
  - `createdAt`、`updatedAt`。
  - `@@index([userId, date])`、`@@index([subjectId, date])`。
- [ ] 不创建“每用户每日期唯一”约束，允许同一天对同一科目进行多次学习记录。

### 3.2 创建迁移

- [ ] 使用项目已经建立的 migration 约定生成 SQL migration。
- [ ] 检查 SQL 中的表名、列名、索引和外键删除策略与 Prisma schema 一致。
- [ ] 不修改任何既有 migration，也不要重新格式化既有 Fitness migration。
- [ ] 若工作环境无可用 PostgreSQL，保留 migration 文件并明确记录不能运行真实 `migrate deploy`；仍必须执行 `prisma validate` 和 `prisma generate`。

### 3.3 验证

```bash
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' \
  pnpm --dir backend exec prisma validate
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' \
  pnpm --dir backend exec prisma generate
```

预期：schema 有效，Prisma Client 包含 `examCountdown`、`studySubject`、`studyCheckin` delegate。

### 3.4 提交边界

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(backend): add learning module database models"
```

---

## 4. 任务 2：Shared Learning 类型与 API DTO

**文件：**

- 创建：`shared/src/types/models/learning.ts`
- 创建：`shared/src/types/api/learning.ts`
- 修改：`shared/src/index.ts`

### 4.1 模型响应类型

- [ ] 定义 `ExamCountdownResponse`：`id`、`userId`、`examName`、`examDate`、`isArchived`、`createdAt`、`updatedAt`。
- [ ] 定义 `StudySubjectResponse`：`id`、`userId`、`examId`、`subjectName`、`totalChapters`、`currentChapter`、`progressPercentage`、`targetCompletionDate`、`createdAt`、`updatedAt`。
- [ ] 定义 `StudyCheckinResponse`：`id`、`userId`、`subjectId`、`date`、`completedChapters`、`studyHours`、`notes`、`progressPercentage`、`createdAt`、`updatedAt`。
- [ ] 所有日期在 shared DTO 中使用 `string`（`YYYY-MM-DD`），所有 Decimal 在 DTO 中使用 `number`。

### 4.2 请求和查询类型

- [ ] `CreateExamRequest`：`examName`、`examDate`。
- [ ] `UpdateExamRequest`：至少包含一个字段的 `examName`、`examDate`、`isArchived`。
- [ ] `CreateStudySubjectRequest`：`examId`、`subjectName`、`totalChapters`、可选 `targetCompletionDate`。
- [ ] `UpdateStudySubjectRequest`：可更新 `subjectName`、`totalChapters`、`targetCompletionDate`，并在类型上允许 `targetCompletionDate: null`。
- [ ] `CreateStudyCheckinRequest`：`subjectId`、`date`、`completedChapters`、`studyHours`、可选 `notes`。
- [ ] `LearningQueryParams`：`examId`、`subjectId`、`startDate`、`endDate`、`limit`、`offset`。
- [ ] 定义 `LearningProgressResponse`，与第 1.4 节的接口契约完全一致。

### 4.3 统一导出与构建

- [ ] 在 `shared/src/index.ts` 导出 Learning 模型和 API 类型。
- [ ] 不在 `shared/src/constants/enums.ts` 新增伪枚举。Learning 当前没有固定分类枚举。
- [ ] 运行：

```bash
pnpm --filter @xiaowoniu/shared build
```

- [ ] 在 backend 和 frontend 中临时导入关键 DTO，确认 workspace 类型解析正确后再删除临时代码或通过实际后续任务验证。

### 4.4 提交边界

```bash
git add shared/
git commit -m "feat(shared): add learning module type definitions"
```

---

## 5. 任务 3：后端验证与学习业务服务

**文件：**

- 创建：`backend/src/validation/learning.schemas.ts`
- 创建：`backend/src/services/learning.service.ts`
- 创建：`backend/src/__tests__/learning.schemas.test.ts`
- 创建：`backend/src/__tests__/learning.service.test.ts`

### 5.1 Zod schema

- [ ] 复用 Fitness 的严格 `YYYY-MM-DD` 规则：正则、UTC Date 解析和 round-trip 校验三者缺一不可。
- [ ] `GET` 查询中的 `limit` 仅允许 `1..100`，`offset` 仅允许 `0..1000000`；日期范围允许只给一端，但两端均存在时不允许反转。
- [ ] 考试名称、科目名称需 trim 后为 `1..100` 字符；禁止仅含空白字符。
- [ ] `totalChapters` 仅允许 `1..10000` 安全整数。
- [ ] `completedChapters` 必须为非空数组，长度 `1..1000`，每项为正安全整数且在数组内唯一。
- [ ] `studyHours` 必须为有限数值、最多两位小数、`0.01..24`。
- [ ] `notes` 限制为 2000 字符；服务层实际写入 trim 后内容。
- [ ] PATCH body 使用 `.refine` 确保至少有一个可更新字段；不得接受未知字段。
- [ ] `targetCompletionDate` 可显式为 `null`；当存在非空日期时必须不早于考试日期。该关联验证在服务层读取所属考试后执行。

### 5.2 服务层通用约定

- [ ] 从 `backend/src/config/database.ts` 导入 Prisma singleton；不要创建新的 `PrismaClient`。
- [ ] 显式挑选每个 request DTO 字段传给 Prisma，禁止 `data: { ...request.body }`。
- [ ] 建立小型日期和 DTO helper：
  - `utcDate(value: string)`：构造 UTC 零点。
  - `formatDate(value: Date)`：返回 `YYYY-MM-DD`。
  - Decimal 转 number 的映射 helper。
- [ ] 定义 `LearningNotFoundError`、`LearningConflictError`；Controller 根据错误类型映射为 404/409。
- [ ] 每个需要关联资源的操作先用 `userId` 查找归属资源，再访问或修改。不能仅凭 UUID 使用 Prisma 的 `update/delete`。

### 5.3 考试服务方法

- [ ] `listExams(userId)`：返回所有考试，未归档优先，随后按考试日期升序、创建时间升序。
- [ ] `createExam(userId, data)`：保存 trim 后名称和 UTC 日期，默认 `isArchived: false`。
- [ ] `updateExam(userId, id, data)`：只更新传入字段；名称 trim 后为空要在写入前拒绝。
- [ ] `deleteExam(userId, id)`：按 `id + userId` 找到考试后删除，依靠迁移中的级联删除清除下层资源。

### 5.4 科目服务方法

- [ ] `listSubjects(userId, examId)`：先确认考试属于用户，再返回其科目，排序按创建时间升序。
- [ ] `createSubject(userId, data)`：先确认 `examId` 属于当前用户，并拒绝同考试同名科目冲突。
- [ ] `updateSubject(userId, id, data)`：
  - 不允许直接更新 `currentChapter` 或 `progressPercentage`。
  - 变更 `totalChapters` 时，若小于该科目完成章节数，返回 `LearningConflictError`。
  - 设置非空 `targetCompletionDate` 时，校验不早于所属考试日期。
  - 更新名称时保持同考试内唯一性。
- [ ] `deleteSubject(userId, id)`：确认归属后删除并级联打卡。

### 5.5 打卡与重算服务方法

- [ ] `listCheckins(userId, params)`：
  - 必须按 `userId` 过滤。
  - 若给出 `examId`，通过 `subject.examId` 过滤；若给出 `subjectId`，确认其归属用户。
  - 支持单边/双边日期范围与分页。
  - 按 `date desc`、`createdAt desc` 返回，映射 Decimal 和数组。
- [ ] `createCheckin(userId, data)`：
  - 确认 `subjectId` 属于当前用户。
  - 在 transaction 内先获得该科目的 advisory transaction lock。
  - 在服务端排序章节数组、确认最大章节不超过 `totalChapters`。
  - 创建记录，再重读该科目的所有打卡章节并集，更新 `currentChapter`、`progressPercentage`，并把相同进度写入新记录的快照字段。
  - 返回完成后的打卡 DTO。
- [ ] `deleteCheckin(userId, id)`：
  - 先查找 `id + userId` 得到 `subjectId`；不存在时抛出 404。
  - 在同一 transaction 串行化该科目，删除打卡，重新计算科目进度。
- [ ] 重算时使用 set 去重章节，`currentChapter` 不超过 `totalChapters`，进度为 `Math.floor` 且 clamp 至 `0..100`。

### 5.6 进度统计服务方法

- [ ] `getProgress(userId, examId, dateRange)`：先确认考试属于用户。
- [ ] 对考试所有科目聚合：科目数量、完成科目数量、所有科目总进度（按章节总数加权而非简单平均）、总学习小时、总打卡数。
- [ ] 每个科目统计当前已完成章节、进度、范围内学习时长、范围内打卡数。
- [ ] `dailyActivity` 必须包含前端请求日期范围的每一天，即使当天为零；避免日历出现缺失单元格。
- [ ] `daysRemaining` 在后端以 UTC 日期计算，避免各页面使用不同算法。
- [ ] 空科目、空打卡和已结束考试都必须返回完整零值结构，不抛出错误。

### 5.7 后端测试

先写失败测试，再实现最小行为使其通过。

- [ ] `learning.schemas.test.ts`：严格日期、空白名称、名称长度、章节数组去重、章节/时长/分页边界、PATCH 空 body、反转日期范围。
- [ ] `learning.service.test.ts`：
  - Decimal 和日期 DTO 转换。
  - 每类资源的用户隔离和 404 行为。
  - 不受信任字段不会被写入 Prisma。
  - 删除考试/科目调用正确的级联根资源。
  - 章节跨打卡去重、删除后回退进度、0%/100% clamp。
  - 总章节数不能降到已完成章节数以下。
  - 范围内日历补零和考试级加权进度。
  - 同一科目的并发写入采用锁并返回一致进度。
- [ ] 每个 mock 都必须断言 transaction、`where.userId` 和显式 data 字段，避免测试只验证返回值。

### 5.8 验证与提交边界

```bash
pnpm --filter @xiaowoniu/backend test
pnpm --filter @xiaowoniu/backend build
```

```bash
git add backend/src/validation backend/src/services backend/src/__tests__
git commit -m "feat(backend): implement learning business logic"
```

---

## 6. 任务 4：后端 Controller、路由与 API 文档

**文件：**

- 创建：`backend/src/controllers/learning.controller.ts`
- 创建：`backend/src/routes/learning.routes.ts`
- 修改：`backend/src/routes/index.ts`
- 创建：`backend/src/__tests__/learning.routes.test.ts`
- 修改：`backend/API.md`

### 6.1 Controller

- [ ] 每个 handler 使用 `req.user!.userId`，而不是请求 body/query 中的任何用户标识。
- [ ] 使用现有 `sendSuccess` 响应 helper，保持 `data` 与 `message` 包络一致。
- [ ] 成功消息统一为：
  - 考试：`考试已创建`、`考试已更新`、`考试已删除`。
  - 科目：`科目已创建`、`科目已更新`、`科目已删除`。
  - 打卡：`学习打卡已保存`、`学习打卡已删除`。
- [ ] 将 `LearningNotFoundError` 映射 `404 NOT_FOUND`，将 `LearningConflictError` 映射 `409 CONFLICT`；其他错误交给现有全局错误中间件。

### 6.2 路由

- [ ] 每条路由保持 `auth -> validate -> controller` 顺序。
- [ ] 注册以下路由：

```text
GET    /learning/exams
POST   /learning/exams
PATCH  /learning/exams/:id
DELETE /learning/exams/:id

GET    /learning/subjects
POST   /learning/subjects
PATCH  /learning/subjects/:id
DELETE /learning/subjects/:id

GET    /learning/checkins
POST   /learning/checkins
DELETE /learning/checkins/:id

GET    /learning/progress
```

- [ ] 在根 API router 中挂载 `/learning`，不修改 Auth 或 Fitness 的既有路由顺序。

### 6.3 路由测试

- [ ] 验证所有 13 条端点存在。
- [ ] 验证每个端点都先通过认证中间件，再通过正确 schema，最后调用 controller。
- [ ] 至少包含一个未认证请求、一个验证失败请求和一个跨用户 404 行为的 API 层测试。

### 6.4 API 文档

- [ ] 在 `backend/API.md` 增加“学习模块”章节。
- [ ] 为每个资源列出路径、方法、请求字段、返回字段和成功消息。
- [ ] 写明章节去重统计、删除级联、资源用户隔离、严格日期、分页边界与数值限制。
- [ ] 写明成功写入沿用当前后端的 HTTP 200 响应，而不是文档假设的 201/204。

### 6.5 验证与提交边界

```bash
pnpm --filter @xiaowoniu/backend test
pnpm --filter @xiaowoniu/backend build
```

```bash
git add backend/src/controllers backend/src/routes backend/src/__tests__/learning.routes.test.ts backend/API.md
git commit -m "feat(backend): expose learning module API"
```

---

## 7. 任务 5：前端 Learning Service 与 Zustand Store

**文件：**

- 创建：`frontend/src/services/learning.service.ts`
- 创建：`frontend/src/services/learning.service.test.ts`
- 创建：`frontend/src/store/learning.store.ts`
- 创建：`frontend/src/store/learning.store.test.ts`
- 修改：`frontend/src/store/auth.store.ts`
- 修改：`frontend/src/store/auth.store.test.ts`

### 7.1 Learning Service

- [ ] 通过现有 `api` Axios 实例请求 `/api/learning/*`，不创建第二个 Axios client。
- [ ] 对每条端点增加对应 service 方法并返回 `response.data.data`。
- [ ] 请求参数通过 Axios `params` 发送，不在 URL 中手写拼接查询字符串。
- [ ] Service 测试覆盖方法、URL、body、query params 和响应解包。

建议接口：

```typescript
getExams(): Promise<ExamCountdownResponse[]>
createExam(data: CreateExamRequest): Promise<ExamCountdownResponse>
updateExam(id: string, data: UpdateExamRequest): Promise<ExamCountdownResponse>
deleteExam(id: string): Promise<void>

getSubjects(examId: string): Promise<StudySubjectResponse[]>
createSubject(data: CreateStudySubjectRequest): Promise<StudySubjectResponse>
updateSubject(id: string, data: UpdateStudySubjectRequest): Promise<StudySubjectResponse>
deleteSubject(id: string): Promise<void>

getCheckins(params?: LearningQueryParams): Promise<StudyCheckinResponse[]>
createCheckin(data: CreateStudyCheckinRequest): Promise<StudyCheckinResponse>
deleteCheckin(id: string): Promise<void>
getProgress(params: Pick<LearningQueryParams, 'examId' | 'startDate' | 'endDate'>): Promise<LearningProgressResponse>
```

### 7.2 Store 状态和并发策略

- [ ] 状态至少包含：`exams`、`subjects`、`checkins`、`progress`、`selectedExamId`、`loading`、`error`。
- [ ] Actions 至少包含：`fetchDashboard`、`fetchExams`、`selectExam`、`fetchSubjects`、`fetchCheckins`、`fetchProgress`、所有 create/update/delete action、`clearError`、`reset`。
- [ ] 完整复用 Fitness store 的成熟策略：
  - 全局 request generation，reset/身份切换后旧响应不得回写。
  - 每个资源独立 version token，较晚发出的选择/月份请求覆盖较早请求。
  - active action 计数，避免并行请求结束时过早关闭 loading。
  - 写操作先将返回值反映到本地状态，再用 `Promise.allSettled` 刷新依赖资源。
  - 变更已成功但刷新失败时，保留成功结果并设置 `操作已成功，但数据刷新失败`。
- [ ] `fetchDashboard(examId, calendarRange)` 并行请求 subjects、checkins、progress；没有选择考试时不请求这些需要 `examId` 的接口。
- [ ] `selectExam` 立即清理上一个考试的 subjects/checkins/progress，以免短暂显示错误考试的数据，然后以新的 resource version 加载新数据。
- [ ] `reset` 必须取消逻辑可见性（generation 增加）并清空全部资源和错误。

### 7.3 认证集成

- [ ] 成功登录、成功注册切换身份、`checkAuth` 识别身份变化，以及登出 `finally` 均调用 `useLearningStore.getState().reset()`。
- [ ] 继续保留 Fitness reset，不能为了添加 Learning 破坏 Fitness 的跨账户隔离。
- [ ] 认证测试同时断言 Fitness 和 Learning reset 已执行，网络失败登出仍清理两者。

### 7.4 Store 测试

- [ ] 初始 dashboard 请求传递 42 天可见日历范围。
- [ ] 考试切换只允许最终选择回写状态，旧请求 resolve 后不覆盖新选择。
- [ ] 删除考试后清空被删除考试的相关资源并选择下一个有效考试或 `null`。
- [ ] 新增/删除学习打卡后的本地进度和日历结果一致；刷新失败不会伪装为写入失败。
- [ ] reset 后的 in-flight 成功/失败响应不会回写。
- [ ] loading 在多个并行 action 完成前保持 true。

### 7.5 验证与提交边界

```bash
pnpm --filter @xiaowoniu/frontend test -- learning.service.test.ts learning.store.test.ts auth.store.test.ts
pnpm --filter @xiaowoniu/frontend build
```

```bash
git add frontend/src/services frontend/src/store
git commit -m "feat(frontend): add learning service and state management"
```

---

## 8. 任务 6：学习表单与删除确认交互

**文件：**

- 创建：`frontend/src/components/learning/ExamDialog.tsx`
- 创建：`frontend/src/components/learning/SubjectDialog.tsx`
- 创建：`frontend/src/components/learning/StudyCheckinDialog.tsx`
- 创建：`frontend/src/components/learning/learning-dialogs.test.tsx`

### 8.1 共同交互约定

- [ ] 复用现有 `Dialog`、`Button`、`Input`、`Label`、`Textarea` 和 `Select` 组件。
- [ ] 任何提交中对话框不能通过 Escape、外侧点击或取消关闭；成功才关闭，失败保留输入并显示 `role="alert"` 错误。
- [ ] 客户端验证与后端限制一致，使用 `aria-invalid`、错误文本 id 和 `aria-describedby` 显式关联。
- [ ] 编辑对话框打开时必须预填完整当前实体，保存未修改字段不会丢失数据。
- [ ] 所有删除操作进入独立确认对话框，清晰说明级联影响：
  - 删除考试会同时删除所有科目和学习记录。
  - 删除科目会同时删除该科目的学习记录。
  - 删除学习打卡会重新计算该科目的进度。

### 8.2 ExamDialog

- [ ] 支持创建和编辑模式，标题和提交按钮随模式调整。
- [ ] 字段：考试名称、考试日期、归档状态（仅编辑时使用 switch/checkbox）。
- [ ] 客户端验证空白名称、100 字符上限和严格日期。
- [ ] 不允许通过清空字段构造空 PATCH。

### 8.3 SubjectDialog

- [ ] 创建时带入当前选择的考试，但 UI 仍显示只读考试名称，避免用户误归属。
- [ ] 字段：科目名称、总章节数、可选目标完成日期。
- [ ] 编辑时预填全部现有字段，并在用户输入小于当前完成章节数的总章节数时即时提示，提交前拒绝。
- [ ] 没有已选考试时，不允许打开创建科目表单，应由页面禁用入口并提供非阻塞解释。

### 8.4 StudyCheckinDialog

- [ ] 字段：日期、科目、完成章节、学习时长、可选备注。
- [ ] 页面从日历点击进入时，`initialDate` 预填日期；从顶部入口进入时，使用浏览器本地今天。
- [ ] 完成章节使用文本输入 `1,2,3`，在提交前解析为整数数组；接受半角逗号分隔，trim 空白，拒绝空项、重复项、零、负数、小数和非数值。
- [ ] 显示当前科目总章节数，客户端拒绝大于总章节数的输入；服务端仍必须再次校验。
- [ ] 学习时长使用数字输入，`min=0.01`、`max=24`、`step=0.01`。

### 8.5 对话框测试

- [ ] 无效值不会提交，字段展示准确错误文本和 ARIA 关联。
- [ ] 有效提交期间按钮禁用，成功后关闭，失败后保持打开。
- [ ] 编辑考试和编辑科目会保留未修改字段。
- [ ] 打卡解析章节数组，并拒绝重复、越界和非整数输入。
- [ ] 删除确认中的取消不调用 action，确认才调用，提交中锁定对话框。

### 8.6 验证与提交边界

```bash
pnpm --filter @xiaowoniu/frontend test -- learning-dialogs.test.tsx
pnpm --filter @xiaowoniu/frontend build
```

```bash
git add frontend/src/components/learning
git commit -m "feat(frontend): add learning forms and confirmations"
```

---

## 9. 任务 7：Learning 页面、可视化、路由与 Dashboard 入口

**文件：**

- 创建：`frontend/src/pages/Learning/index.tsx`
- 创建：`frontend/src/pages/Learning/ExamCountdown.tsx`
- 创建：`frontend/src/pages/Learning/SubjectProgressBoard.tsx`
- 创建：`frontend/src/pages/Learning/StudyCalendar.tsx`
- 创建：`frontend/src/pages/Learning/learning-components.test.tsx`
- 创建：`frontend/src/pages/Learning/learning-page.test.tsx`
- 修改：`frontend/src/routes/index.tsx`
- 修改：`frontend/src/pages/Dashboard.tsx`
- 修改：`frontend/src/index.css`

### 9.1 页面信息架构

学习页按以下顺序呈现实际工作台，不创建营销 Landing Page：

```text
顶部导航：返回 Dashboard | 登出
页面头：学习记录 | 新建考试 | 新建科目 | 学习打卡
考试选择：下拉选择 + 编辑/删除图标按钮
考试概览：倒计时 | 总进度 | 累计学习时长 | 打卡次数
科目进度：并排科目卡片和进度条
学习日历：固定 42 天 Monday-first 网格
近期学习记录：按日期倒序，显示科目、章节、时长、进度快照、删除操作
```

- [ ] 采用学习模块蓝色为主色，但保持既有全局设计 token、清晰文本对比和非颜色唯一状态。
- [ ] 顶部按钮在有考试前可创建考试；无考试时科目/打卡入口 disabled。
- [ ] 通过 `Select` 显示考试切换，不能用一组可横向溢出的文本按钮替代。
- [ ] 编辑和删除使用 Lucide 图标按钮并带无障碍名称/tooltip；只有明确命令使用文字按钮。

### 9.2 ExamCountdown 组件

- [ ] 接收一个 `ExamCountdownResponse | null` 及后端 `daysRemaining`。
- [ ] 显示名称、考试日期和三个互斥状态：`还剩 N 天`、`今天考试`、`已结束 N 天`。
- [ ] 组件不自行 `setInterval` 或重算日期。倒计时精度为日，重新加载 dashboard 时更新即可，避免多组件计时器和时区差异。
- [ ] 无考试时显示紧凑空状态并引导使用已有“新建考试”命令，不生成不可用的倒计时数字。

### 9.3 SubjectProgressBoard 组件

- [ ] 显示科目名、`currentChapter / totalChapters`、进度条、目标完成日期、学习时长和打卡次数。
- [ ] 进度值在渲染前 clamp 到 `0..100`，但不在客户端修复后端数据。
- [ ] 完成科目提供视觉和文字标识，不能只依靠颜色。
- [ ] 至少支持 3 个科目并排；小屏幕自动单列，防止卡片文字和按钮重叠。
- [ ] 每张科目卡片包含编辑和删除图标按钮。

### 9.4 StudyCalendar 组件

- [ ] 复用 Fitness `CheckinCalendar` 的可测日期 helper 或抽取无业务耦合的本地日期 helper；不要复制带已知 bug 的日期计算。
- [ ] 采用 Monday-first、固定 42 格，显示上月/下月溢出日期。
- [ ] 通过 `getCalendarRange(month)` 请求完整可见范围，外部月份日期也应显示真实学习活动。
- [ ] 每日单元格显示可辨识的打卡数量或小时数；颜色强度仅作为辅助，不可作为唯一信息来源。
- [ ] 每个日期按钮具有完整 `aria-label`，包含日期、学习时长和打卡次数；点击打开学习打卡并预填日期。
- [ ] 提供上月/下月按钮、加载骨架、空月状态和保留旧数据的请求错误态。

### 9.5 记录列表和删除流程

- [ ] 近期记录默认显示最多 10 条，支持“加载更多”使用 offset 分页；避免一次渲染无限历史。
- [ ] 每条记录显示日期、科目名、章节集合、学习小时、进度快照和删除图标按钮。
- [ ] 删除后刷新当前考试的 progress、日历范围、记录分页和相关科目；如果刷新失败，仍保留“学习打卡已删除”的成功状态并显示刷新警告。

### 9.6 路由和 Dashboard

- [ ] 使用 `lazy(() => import('@/pages/Learning'))` 添加 `/learning` 受保护路由，放在现有 Suspense/ProtectedRoute 模式内。
- [ ] Dashboard 中“学学学”卡片变为可访问链接/按钮并导航到 `/learning`，移除“即将上线”状态。
- [ ] 不修改 Finance/Wedding 卡片的待上线状态。
- [ ] 为懒加载路由增加适当的 fallback 和测试，测试等待条件不得依赖不稳定的毫秒 sleep。

### 9.7 CSS 与响应式

- [ ] 在 `index.css` 添加作用域明确的 Learning class，避免覆盖 Fitness 页面规则。
- [ ] 最小点击/触摸区域 44px；图标按钮保持固定尺寸，文字在窄宽度时换行而非溢出。
- [ ] 支持 `prefers-reduced-motion`，不使用持续动画；学习日历和进度条在减少动效下即时渲染。
- [ ] 验证 390px、768px、1280px 三种宽度。页面根元素 `scrollWidth` 必须等于 `clientWidth`。

### 9.8 页面与组件测试

- [ ] `learning-components.test.tsx`：倒计时未来/当天/过去状态、进度 clamp、42 天日历、范围计算、非颜色文字信息、空态。
- [ ] `learning-page.test.tsx`：初始 42 天 dashboard 范围、考试切换、日期预填、创建打卡后的成功状态、删除确认取消/确认、错误 alert 关闭、无考试状态。
- [ ] 路由测试：未认证重定向、认证后 lazy page 加载、Dashboard 入口及三个表单打开/取消。

### 9.9 验证与提交边界

```bash
pnpm --filter @xiaowoniu/frontend test
pnpm --filter @xiaowoniu/frontend build
```

```bash
git add frontend/src/pages frontend/src/routes frontend/src/index.css
git commit -m "feat(frontend): add learning dashboard"
```

---

## 10. 任务 8：全量验证、浏览器验收与文档

**文件：**

- 修改：`README.md`
- 修改：`backend/README.md`
- 修改：`frontend/README.md`
- 修改：`backend/API.md`
- 创建或修改：Learning 对应全部 `*.test.ts` / `*.test.tsx`

### 10.1 自动化验证

- [ ] 运行 shared 构建：

```bash
pnpm --filter @xiaowoniu/shared build
```

- [ ] 运行后端测试和构建：

```bash
pnpm --filter @xiaowoniu/backend test
pnpm --filter @xiaowoniu/backend build
```

- [ ] 运行前端测试和构建：

```bash
pnpm --filter @xiaowoniu/frontend test
pnpm --filter @xiaowoniu/frontend build
```

- [ ] 运行全工作区构建：

```bash
pnpm build
```

- [ ] Prisma 校验和生成：

```bash
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' \
  pnpm --dir backend exec prisma validate
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/xiaowoniu' \
  pnpm --dir backend exec prisma generate
```

- [ ] 检查差异格式：

```bash
git diff --check
```

- [ ] 不把缺失 ESLint 配置的 `pnpm lint` 当作通过依据；若配置仍不可用，记录为既有项目限制。

### 10.2 浏览器黑盒验收

使用真实页面控件，不通过直接 DOM mutation、localStorage 注入或调用 store 绕过用户流程。若没有运行中后端，可用受 CORS 允许的本地 mock API 准备数据，但所有正式验证必须从实际登录表单和页面交互开始。

- [ ] 登录并从 Dashboard 进入 `/learning`。
- [ ] 创建考试，确认倒计时、选择器和总览出现。
- [ ] 创建至少 3 个科目，确认并行进度看板和小屏单列布局。
- [ ] 从日期单元格创建学习打卡，确认日期预填、章节/时长校验、成功状态、科目进度和日历强度更新。
- [ ] 在同一科目新增包含已完成章节的打卡，确认进度未重复累计。
- [ ] 删除打卡，确认弹窗取消不改变记录，确认删除后进度回算。
- [ ] 删除科目和考试，确认级联说明、确认流程和选择状态清理。
- [ ] 模拟一次日历范围或刷新失败，确认旧数据保持可见且错误可关闭。
- [ ] 在 1280px 与 390px 截图/DOM 交叉检查文字、表单、Dialog、日历和记录列表；确认 390px 下页面无横向溢出。

### 10.3 文档更新

- [ ] 根 `README.md`：将 Learning 标记为已实现，增加迁移、测试和模块链接。
- [ ] `backend/README.md`：列出 Learning service/controller/routes、迁移及测试覆盖。
- [ ] `frontend/README.md`：列出 `/learning` 的倒计时、科目、日历、打卡、加载/空/错误状态。
- [ ] `backend/API.md`：确保接口文档与第 1 节和实际 controller 一致。
- [ ] 明确说明：后端日期使用 UTC `DATE`；前端日历使用浏览器本地日期。不要声称已经支持用户时区。

### 10.4 最终提交边界

```bash
git add README.md backend/README.md frontend/README.md backend/API.md
git commit -m "docs: document learning module"
```

不在未经明确授权时执行 `git push`、创建 Pull Request、合并分支或删除 worktree。

---

## 11. 验收标准

### 数据与安全

- [ ] Prisma schema 与迁移正确建立 User -> Exam -> Subject -> Checkin 关系、索引和级联删除。
- [ ] 任何用户都无法读取、更新或删除另一个用户的考试、科目或打卡；所有此类访问返回 404。
- [ ] 请求体未知字段不会被传入 Prisma；日期、名称、章节、时长、备注、分页和关系 ID 都在写入前验证。
- [ ] 打卡创建与删除在同一事务内完成记录变更和进度回算；重复章节不会重复累计。
- [ ] 进度始终为 0..100，已完成章节不超过总章节数，减少总章节数不会使已完成数据失真。

### API 与类型契约

- [ ] shared 导出所有 Learning DTO，frontend/backend 均不定义冲突的重复领域类型。
- [ ] Controller、服务、API 文档和前端 service 的路径、HTTP 方法、参数与成功消息一致。
- [ ] Decimal 与 Date 已在后端 DTO 边界分别转换为 number 和 `YYYY-MM-DD`。
- [ ] 空数据、已结束考试、空科目和空日期范围都返回结构稳定的响应，而不是 `null` 崩溃或 500。

### 前端体验与可访问性

- [ ] `/learning` 受认证保护、懒加载，Dashboard 学习入口可通过鼠标和键盘到达。
- [ ] 考试选择、倒计时、至少三科目进度、42 天学习日历与近期记录可在同一工作台完成任务。
- [ ] 创建、编辑、删除和学习打卡表单具备 label、客户端验证、提交中锁定、失败保留与成功状态。
- [ ] 删除考试、科目和打卡均有明确确认步骤，取消不会产生网络写入。
- [ ] 页面有加载、空态、成功、错误和“成功但刷新失败”状态；状态不会只通过颜色传达。
- [ ] 390px 视图无横向滚动，关键触控目标不小于 44px，减少动效设置得到尊重。

### 自动化与手工验证

- [ ] 后端 schema、service、route 测试与前端 service、store、dialog、component、page、route 测试均通过。
- [ ] `pnpm build`、Prisma validate/generate 和 `git diff --check` 均通过。
- [ ] 使用浏览器完成“登录 -> 创建考试 -> 创建科目 -> 学习打卡 -> 查看进度 -> 删除并回算”的桌面和移动端流程。
- [ ] 若无真实 PostgreSQL，最终报告必须明确迁移没有经过 live `migrate deploy` 验证，不能将 schema validate 误报为迁移部署成功。

---

**Phase 5 计划完成。**
