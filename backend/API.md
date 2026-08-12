# API 文档

基础 URL: `http://localhost:3000/api`

## 认证

除登录和注册外，所有 API 都需要在请求头中携带 JWT Token：

```
Authorization: Bearer <token>
```

---

## 认证模块

### 1. 用户注册

**POST** `/auth/register`

**请求体：**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "nickname": "测试用户"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "username": "testuser",
      "email": "test@example.com",
      "nickname": "测试用户",
      "avatarUrl": null,
      "createdAt": "2026-07-29T12:00:00.000Z",
      "updatedAt": "2026-07-29T12:00:00.000Z"
    }
  },
  "message": "注册成功"
}
```

### 2. 用户登录

**POST** `/auth/login`

**请求体：**
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "username": "testuser",
      "email": "test@example.com",
      "nickname": "测试用户",
      "avatarUrl": null,
      "createdAt": "2026-07-29T12:00:00.000Z",
      "updatedAt": "2026-07-29T12:00:00.000Z"
    }
  },
  "message": "登录成功"
}
```

### 3. 获取当前用户信息

**GET** `/auth/me`

**请求头：**
```
Authorization: Bearer <token>
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "testuser",
    "email": "test@example.com",
    "nickname": "测试用户",
    "avatarUrl": null,
    "createdAt": "2026-07-29T12:00:00.000Z",
    "updatedAt": "2026-07-29T12:00:00.000Z"
  }
}
```

### 4. 更新当前用户资料

**PATCH** `/auth/me`

**请求头：**
```
Authorization: Bearer <token>
```

**请求体：**
```json
{
  "nickname": "花花"
}
```

昵称会先 trim；传入空字符串会规范化为 `null`，表示清空昵称。昵称最多 50 个字符。请求体只允许包含 `nickname`，用户身份始终从 JWT 读取，不接受 body 中的 `userId`。

**响应：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "testuser",
    "email": "test@example.com",
    "nickname": "花花",
    "avatarUrl": null,
    "createdAt": "2026-07-29T12:00:00.000Z",
    "updatedAt": "2026-07-29T12:10:00.000Z"
  },
  "message": "个人资料更新成功"
}
```

可能的错误：`400 VALIDATION_ERROR`（字段缺失、昵称过长或未知字段）、`401 UNAUTHORIZED`（未登录或 Token 无效）、`404 NOT_FOUND`（当前用户不存在）。响应不会包含 password 或密码哈希。

### 5. 修改当前用户密码

**PATCH** `/auth/password`

**请求头：**
```
Authorization: Bearer <token>
```

**请求体：**
```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

当前密码不能为空，新密码至少 6 位；请求体只允许包含这两个字段，确认密码只在前端表单内校验，不发送到后端。服务端会先验证当前密码，再 hash 新密码并只更新当前 JWT 对应用户的 password 字段。

**成功响应：**
```json
{
  "success": true,
  "data": null,
  "message": "密码修改成功"
}
```

可能的错误：`400 VALIDATION_ERROR`（字段缺失、密码过短或未知字段）、`400 INVALID_CURRENT_PASSWORD`（当前密码不正确）、`400 PASSWORD_UNCHANGED`（新密码与当前密码相同）、`401 UNAUTHORIZED`（未登录或 Token 无效）、`404 NOT_FOUND`（当前用户不存在）。本期修改密码后当前 JWT 仍保持有效，所有设备退出属于后续会话管理需求。

### 6. 用户登出

**POST** `/auth/logout`

**请求头：**
```
Authorization: Bearer <token>
```

**响应：**
```json
{
  "success": true,
  "data": null,
  "message": "登出成功"
}
```

**注意**：实际登出由客户端删除 Token 实现，此接口仅用于日志记录。

---

## 健身模块

所有健身接口均需要 JWT，并且只读写当前认证用户的数据。日期使用严格的 `YYYY-MM-DD` 格式。

### 查询运动打卡

**GET** `/fitness/checkins`

可选查询参数：`startDate`、`endDate`、`limit`、`offset`。日期范围包含首尾两天，`startDate` 不得晚于 `endDate`；`limit` 为 1–100，`offset` 为 0–1000000。

响应 `data` 为按日期倒序排列的打卡数组。

### 新增运动打卡

**POST** `/fitness/checkins`

```json
{
  "date": "2026-07-31",
  "activityType": "pilates",
  "durationMinutes": 45,
  "notes": "核心训练"
}
```

`activityType` 可为 `pilates`、`gym_slope`、`other`；`durationMinutes` 必须是 1–1440 之间的整数；`notes` 最多 2000 字符。成功消息为“打卡成功”。同一用户同一天只能有一条打卡。

### 删除运动打卡

**DELETE** `/fitness/checkins/:id`

只能删除当前用户的记录。记录不存在或属于其他用户时返回 `404 NOT_FOUND`。

### 查询体重记录

**GET** `/fitness/weights`

支持与打卡查询相同的 `startDate`、`endDate`、`limit`、`offset` 参数。响应 `data` 为体重记录数组。

### 新增体重记录

**POST** `/fitness/weights`

```json
{
  "date": "2026-07-31",
  "timeOfDay": "morning",
  "weightKg": 55.25,
  "notes": "早餐前"
}
```

`timeOfDay` 可为 `morning`、`evening`；`weightKg` 必须大于 0 且不超过 999.99；`notes` 最多 2000 字符。成功消息为“记录成功”。同一用户在同一天、同一时段只能有一条记录。

### 删除体重记录

**DELETE** `/fitness/weights/:id`

只能删除当前用户的记录。记录不存在或属于其他用户时返回 `404 NOT_FOUND`。

### 获取当前目标

**GET** `/fitness/goal`

返回当前有效目标；尚未设置目标时 `data` 为 `null`。

### 设置或替换目标

**PUT** `/fitness/goal`

```json
{
  "targetWeightKg": 52,
  "weeklyWorkoutTarget": 3,
  "startDate": "2026-07-31",
  "targetDate": "2026-12-31"
}
```

`weeklyWorkoutTarget` 必须是 0–100 之间的整数；可选的 `targetWeightKg` 必须大于 0 且不超过 999.99；`targetDate` 不得早于 `startDate`。该操作创建新的有效目标并停用旧目标，每位用户最多有一个有效目标。成功消息为“目标已更新”。

### 获取健身统计

**GET** `/fitness/stats`

```json
{
  "success": true,
  "data": {
    "currentWeek": {
      "checkinsCount": 2,
      "totalMinutes": 90,
      "goalCompletion": 66.67
    },
    "currentMonth": {
      "checkinsCount": 7,
      "totalMinutes": 320,
      "averagePerWeek": 1.75
    },
    "weightTrend": {
      "current": 55.2,
      "previous": 55.8,
      "change": -0.6
    }
  }
}
```

周统计以 UTC 周一为一周开始，月统计按 UTC 自然月计算，`goalCompletion` 限制在 0–100。没有体重记录时，`current`、`previous`、`change` 可以为 `null`。

创建和更新接口当前成功状态码为 `200`；删除成功时 `data` 为 `null`，消息为“删除成功”。

---

## 学习模块

所有学习接口均需要 JWT，且只读写当前认证用户的数据。日期字段严格使用 `YYYY-MM-DD`，成功响应统一为 HTTP `200`，包络为 `{ "success": true, "data": ..., "message": ... }`。

### 考试倒计时

| 方法 | 路径 | 成功消息 |
| --- | --- | --- |
| `GET` | `/learning/exams` | - |
| `POST` | `/learning/exams` | `考试已创建` |
| `PATCH` | `/learning/exams/:id` | `考试已更新` |
| `DELETE` | `/learning/exams/:id` | `考试已删除` |

创建请求：

```json
{
  "examName": "教师资格证笔试",
  "examDate": "2026-11-01"
}
```

考试名称 trim 后必须为 1–100 字符；考试日期可以是今天、未来或过去。更新至少提供一个字段，可更新 `examName`、`examDate`、`isArchived`。查询默认未归档优先，然后按考试日期和创建时间升序。

### 学习科目

| 方法 | 路径 | 成功消息 |
| --- | --- | --- |
| `GET` | `/learning/subjects?examId=:examId` | - |
| `POST` | `/learning/subjects` | `科目已创建` |
| `PATCH` | `/learning/subjects/:id` | `科目已更新` |
| `DELETE` | `/learning/subjects/:id` | `科目已删除` |

创建请求：

```json
{
  "examId": "uuid",
  "subjectName": "教育知识与能力",
  "totalChapters": 24,
  "targetCompletionDate": "2026-10-15"
}
```

科目名称 trim 后必须为 1–100 字符，`totalChapters` 为 1–10000 的整数，同一考试内名称唯一。目标日期可为 `null`，非空时不得早于考试日期；更新总章节数不得小于当前已完成章节数。

### 学习打卡

| 方法 | 路径 | 成功消息 |
| --- | --- | --- |
| `GET` | `/learning/checkins` | - |
| `POST` | `/learning/checkins` | `学习打卡已保存` |
| `DELETE` | `/learning/checkins/:id` | `学习打卡已删除` |

查询支持 `examId`、`subjectId`、`startDate`、`endDate`、`limit`、`offset`。日期范围包含首尾日期，允许只传一端；两端均传时不可反转。`limit` 为 1–100，`offset` 为 0–1000000。

创建请求：

```json
{
  "subjectId": "uuid",
  "date": "2026-07-30",
  "completedChapters": [3, 4],
  "studyHours": 1.5,
  "notes": "完成了重点章节练习"
}
```

章节数组长度为 1–1000，必须是唯一正整数；章节不得超过科目总章节数。`studyHours` 为 0.01–24 且最多两位小数，`notes` 最多 2000 字符，保存时 trim，空文本保存为 `null`。

### 进度统计

**GET** `/learning/progress?examId=:examId&startDate=&endDate=`

`examId` 必填。返回考试信息（含后端按 UTC 计算的 `daysRemaining`）、按总章节数加权的考试进度、各科目当前进度与范围内学习统计，以及日期范围内每天的 `dailyActivity`；没有活动的日期也返回零值。若省略日期范围，默认返回当前可见月的 42 天范围。

所有学习资源按当前 JWT 的 `userId` 过滤。资源不存在或属于其他用户统一返回 `404 NOT_FOUND`，不暴露资源归属。删除考试会级联删除科目和学习打卡，删除科目会级联删除其打卡；删除打卡会在事务内重新计算科目进度。章节统计使用所有打卡章节的去重并集，进度按 `floor(currentChapter / totalChapters * 100)` 限制在 `0..100`。学习打卡创建和删除均使用同一事务及科目级 PostgreSQL advisory lock。

## Finance 模块

所有 Finance 接口均需要 JWT 认证，并且只读写当前认证用户的数据。请求头统一为：

```http
Authorization: Bearer <token>
```

所有成功响应均为 HTTP `200`，统一包络为 `{ "success": true, "data": ..., "message": ... }`；GET 接口不设置 `message`。金额均为数字，最多保留两位小数；日期严格使用 `YYYY-MM-DD`，月份严格使用 `YYYY-MM`。

### 消费记录

| 方法 | 路径 | 认证 | 成功消息 |
| --- | --- | --- | --- |
| `GET` | `/finance/expenses` | JWT | - |
| `POST` | `/finance/expenses` | JWT | `消费记录已创建` |
| `PATCH` | `/finance/expenses/:id` | JWT | `消费记录已更新` |
| `DELETE` | `/finance/expenses/:id` | JWT | `消费记录已删除` |

查询消费记录：

```http
GET /api/finance/expenses?startDate=2026-07-01&endDate=2026-07-31&category=food&paymentMethod=alipay&limit=20&offset=0
Authorization: Bearer <token>
```

`startDate`、`endDate`、`category`、`paymentMethod`、`limit` 和 `offset` 均可选。日期范围包含首尾日期，开始日期不得晚于结束日期；`limit` 为 1–100，`offset` 为 0–1000000。`category` 使用 `food`、`transport`、`shopping`、`entertainment`、`health` 或 `other`；`paymentMethod` 使用 `cash`、`alipay`、`wechat`、`card` 或 `other`。

创建消费记录：

```http
POST /api/finance/expenses
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2026-07-31",
  "amount": 35.50,
  "category": "food",
  "paymentMethod": "alipay",
  "notes": "午餐"
}
```

更新消费记录：

```http
PATCH /api/finance/expenses/expense-id
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 38.00,
  "notes": "含饮料"
}
```

更新请求至少提供一个字段，可更新 `date`、`amount`、`category`、`paymentMethod` 或 `notes`；`notes` 可以为 `null`。删除消费记录：

```http
DELETE /api/finance/expenses/expense-id
Authorization: Bearer <token>
```

删除成功时 `data` 为 `null`，消息为 `消费记录已删除`。记录不存在或属于其他用户时统一返回 `404 NOT_FOUND`，不泄露记录是否存在。

### 月度汇总与预算

| 方法 | 路径 | 认证 | 成功消息 |
| --- | --- | --- | --- |
| `GET` | `/finance/summary` | JWT | - |
| `GET` | `/finance/budgets` | JWT | - |
| `PUT` | `/finance/budgets` | JWT | `预算已更新` |

获取月度汇总：

```http
GET /api/finance/summary?month=2026-07
Authorization: Bearer <token>
```

`month` 必填且必须是有效的 `YYYY-MM`。返回的 `data` 包含 `month`、`totalExpense`、`expenseCount`、`budget`、`categoryBreakdown` 和 `dailyBreakdown`。`categoryBreakdown` 按消费类别返回 `category`、`amount`、`percentage` 和 `count`；`dailyBreakdown` 为该月每天的 `date`、`amount` 和 `count`，没有消费的日期也返回零值。若没有该月预算，`budget` 为 `null`；有预算时还包含 `spent`、`remaining` 和 `usedPercentage`。预算金额为 `0` 表示预算已设置但不计算使用率，`usedPercentage` 返回 `0`，剩余金额仍按 `预算 - 消费` 计算。

获取月度预算：

```http
GET /api/finance/budgets?month=2026-07
Authorization: Bearer <token>
```

没有预算时 `data` 为 `null`。创建或更新月度预算：

```http
PUT /api/finance/budgets
Authorization: Bearer <token>
Content-Type: application/json

{
  "month": "2026-07",
  "amount": 5000.00
}
```

预算金额允许为 `0`，但不得为负数，最多保留两位小数；同一用户同一月份会更新已有预算。

### 存钱计划

| 方法 | 路径 | 认证 | 成功消息 |
| --- | --- | --- | --- |
| `GET` | `/finance/saving-plans` | JWT | - |
| `POST` | `/finance/saving-plans` | JWT | `存钱计划已创建` |
| `PATCH` | `/finance/saving-plans/:id` | JWT | `存钱计划已更新` |
| `DELETE` | `/finance/saving-plans/:id` | JWT | `存钱计划已删除` |

获取存钱计划：

```http
GET /api/finance/saving-plans
Authorization: Bearer <token>
```

创建存钱计划：

```http
POST /api/finance/saving-plans
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "旅行基金",
  "targetAmount": 10000.00,
  "currentAmount": 500.00,
  "targetDate": "2027-07-01"
}
```

`name` trim 后必须为 1–100 个字符；`targetAmount` 必须大于 `0`，`currentAmount` 默认为 `0` 且不得为负数；金额最多保留两位小数；`targetDate` 使用 `YYYY-MM-DD`。创建时 `currentAmount` 不得超过 `targetAmount`，否则返回 `409 CONFLICT`。

更新存钱计划：

```http
PATCH /api/finance/saving-plans/plan-id
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentAmount": 2500.00,
  "targetDate": "2027-09-01"
}
```

更新请求至少提供一个字段，可更新 `name`、`targetAmount`、`currentAmount` 或 `targetDate`；更新后的 `currentAmount` 不得超过更新后的 `targetAmount`，否则返回 `409 CONFLICT`。删除存钱计划：

```http
DELETE /api/finance/saving-plans/plan-id
Authorization: Bearer <token>
```

每个计划的响应会返回服务端派生字段 `progressPercentage`、`remainingAmount` 和 `isCompleted`：进度为已存金额除以目标金额后向下取整并限制在 `0..100`，剩余金额为目标金额减当前金额，当前金额达到目标金额时 `isCompleted` 为 `true`。计划不存在或属于其他用户时统一返回 `404 NOT_FOUND`，不泄露计划是否存在。

### Finance 错误

除资源不存在和目标金额冲突外，Finance 请求遵循统一错误包络：

- `400 VALIDATION_ERROR`：请求体、路径参数、日期、月份、金额或查询参数不合法；金额超过两位小数、日期不是有效的 `YYYY-MM-DD`、月份不是有效的 `YYYY-MM` 也属于此类。
- `401 UNAUTHORIZED`：未提供认证 Token。
- `401 INVALID_TOKEN`：Token 格式或签名无效。
- `401 TOKEN_EXPIRED`：Token 已过期。
- `404 NOT_FOUND`：消费记录或存钱计划不存在，或属于其他用户。
- `409 CONFLICT`：存钱计划当前金额超过目标金额，或更新后的目标金额低于当前金额。

---

## Wedding 模块

所有 Wedding 接口均需要 JWT 认证，并且只读写当前认证用户的数据。请求头统一为：

```http
Authorization: Bearer <token>
```

所有成功响应均为 HTTP `200`，统一包络为 `{ "success": true, "data": ..., "message": ... }`；GET 接口不设置 `message`。金额均为数字，最多保留两位小数；日期严格使用 `YYYY-MM-DD`。资源不存在或属于其他用户时统一返回 `404 NOT_FOUND`，消息不泄露记录是否存在。本模块没有 409 业务规则。

Wedding 共 12 条路由，全部以 `/api/wedding` 为前缀。

### 备婚任务

| 方法 | 路径 | 认证 | 成功消息 |
| --- | --- | --- | --- |
| `GET` | `/wedding/tasks` | JWT | - |
| `POST` | `/wedding/tasks` | JWT | `备婚任务已创建` |
| `PATCH` | `/wedding/tasks/:id` | JWT | `备婚任务已更新` |
| `DELETE` | `/wedding/tasks/:id` | JWT | `备婚任务已删除` |

查询任务：

```http
GET /api/wedding/tasks?status=pending&category=venue&limit=50&offset=0
Authorization: Bearer <token>
```

`status`、`category`、`limit` 和 `offset` 均可选。`status` 使用 `pending`、`in_progress`、`completed` 或 `cancelled`；`category` 使用 `venue`、`photo`、`invitation`、`dress`、`makeup`、`honeymoon` 或 `other`；`limit` 为 1–100，`offset` 为 0–1000000。列表按 `priority` 降序、`plannedDate` 升序（null 最后）、`createdAt` 升序、`id` 升序稳定排序。

创建任务：

```http
POST /api/wedding/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "taskName": "确认婚礼场地",
  "category": "venue",
  "plannedDate": "2026-10-01",
  "status": "pending",
  "priority": 5,
  "notes": "确认档期、菜单和定金"
}
```

`taskName` 和 `category` 必填；`plannedDate`、`status`、`priority`、`notes` 可缺省，缺省时分别取 `null`、`pending`、`3`、`null`。`plannedDate` 和 `notes` 可传 `null`。`priority` 为 1–5 的整数，5 最高。客户端不能提交 `completedDate`；当创建任务的最终状态为 `completed` 时，服务端写入 UTC 当天的完成日期。

更新任务：

```http
PATCH /api/wedding/tasks/task-id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed"
}
```

更新请求至少提供一个字段，可更新 `taskName`、`category`、`plannedDate`、`status`、`priority` 或 `notes`；`plannedDate: null` 清空计划日期，`notes: null` 清空备注，字段缺省表示不修改。完成日期完全由服务端维护：从非 `completed` 转为 `completed` 时写入服务端 UTC 当天；`completed -> completed` 保留原完成日期；从 `completed` 转为其他状态时清空完成日期，以后再完成时写入新的服务端 UTC 当天。

删除任务：

```http
DELETE /api/wedding/tasks/task-id
Authorization: Bearer <token>
```

删除成功时 `data` 为 `null`，消息为 `备婚任务已删除`。删除任务时，关联花费通过外键 `ON DELETE SET NULL` 解除关联，花费记录本身、金额、类别和日期全部保留。

### 备婚花费

| 方法 | 路径 | 认证 | 成功消息 |
| --- | --- | --- | --- |
| `GET` | `/wedding/expenses` | JWT | - |
| `POST` | `/wedding/expenses` | JWT | `备婚花费已创建` |
| `PATCH` | `/wedding/expenses/:id` | JWT | `备婚花费已更新` |
| `DELETE` | `/wedding/expenses/:id` | JWT | `备婚花费已删除` |

查询花费：

```http
GET /api/wedding/expenses?startDate=2026-08-01&endDate=2026-08-31&category=venue&paidStatus=partial&limit=50&offset=0
Authorization: Bearer <token>
```

`startDate`、`endDate`、`category`、`paidStatus`、`limit` 和 `offset` 均可选。日期范围包含首尾日期，开始日期不得晚于结束日期。`paidStatus` 使用 `unpaid`、`partial` 或 `paid`。列表按 `date` 降序、`createdAt` 降序、`id` 降序稳定排序。

创建花费：

```http
POST /api/wedding/expenses
Authorization: Bearer <token>
Content-Type: application/json

{
  "taskId": "task-id",
  "date": "2026-08-04",
  "itemName": "场地定金",
  "category": "venue",
  "plannedAmount": 20000,
  "actualAmount": 18000,
  "paidStatus": "partial",
  "notes": "已支付首期"
}
```

`date`、`itemName`、`category`、`plannedAmount`、`actualAmount` 和 `paidStatus` 必填；`taskId` 和 `notes` 可缺省（`taskId` 可传 `null`）。两个金额均为 `0..9999999999.99`，最多两位小数。`taskId` 非 `null` 时，服务端必须先确认该任务属于当前用户，其他用户任务 id 与不存在的 id 一样返回 `404 NOT_FOUND`。`actualAmount` 表示已确认发生的成本而非已支付现金，`unpaid` 且 `actualAmount > 0` 是合法组合；服务端不从 `paidStatus` 推导任何支付金额。

更新花费：

```http
PATCH /api/wedding/expenses/expense-id
Authorization: Bearer <token>
Content-Type: application/json

{
  "taskId": null,
  "actualAmount": 18500
}
```

更新请求至少提供一个字段，可更新 `taskId`、`date`、`itemName`、`category`、`plannedAmount`、`actualAmount`、`paidStatus` 或 `notes`；`taskId: null` 解除任务关联，`notes: null` 清空备注。改绑 `taskId` 时同样执行当前用户任务门禁。

删除花费：

```http
DELETE /api/wedding/expenses/expense-id
Authorization: Bearer <token>
```

删除成功时 `data` 为 `null`，消息为 `备婚花费已删除`。

### WeddingBudget

| 方法 | 路径 | 认证 | 成功消息 |
| --- | --- | --- | --- |
| `GET` | `/wedding/budget` | JWT | - |
| `PUT` | `/wedding/budget` | JWT | `备婚预算已更新` |

每位用户最多一条预算记录。`GET` 没有记录时 `data` 为 `null`；`PUT` 以当前用户为键幂等创建或替换预算与婚礼日期：

```http
PUT /api/wedding/budget
Authorization: Bearer <token>
Content-Type: application/json

{
  "totalBudget": 150000,
  "weddingDate": "2026-12-01"
}
```

两个字段均必填；`totalBudget` 为 `0..9999999999.99`，最多两位小数。预算记录不持久化任何花费、百分比或倒计时派生值。

### 概览统计

| 方法 | 路径 | 认证 | 成功消息 |
| --- | --- | --- | --- |
| `GET` | `/wedding/overview` | JWT | - |

```http
GET /api/wedding/overview
Authorization: Bearer <token>
```

响应中的预算、花费和任务统计全部由服务端按当前用户实时计算：

- `plannedExpenseTotal` 为全部当前用户花费的计划金额之和；`actualExpenseTotal` 为实际金额之和；两者包含未关联任务、已取消任务关联和任务删除后解除关联的全部花费。
- 有预算时 `remainingBudget = totalBudget - actualExpenseTotal`（允许为负数）；无预算时为 `null`。
- 有预算且 `totalBudget > 0` 时，`budgetUsedPercentage` 和 `plannedBudgetPercentage` 按实际/计划金额除以总预算计算，四舍五入到两位且不 clamp（允许大于 100）；无预算或预算为 0 时两者均为 `null`，不伪装成 0%。
- `actualVsPlannedPercentage = actualExpenseTotal / plannedExpenseTotal * 100`，计划总额为 0 时返回 `null`。
- `taskCounts.activeTotal` 只统计 `pending + in_progress + completed`，`cancelled` 不计入分母；`completionPercentage` 为完成数除以 activeTotal，没有非取消任务时为 0。
- `categoryBreakdown` 固定按类别枚举顺序返回全部七个类别（`venue`、`photo`、`invitation`、`dress`、`makeup`、`honeymoon`、`other`），零值类别也返回；`actualPercentage` 为该类别实际金额占全部实际金额的百分比，实际总额为 0 时所有类别返回 0。四舍五入后类别百分比之和不强求等于 100。
- `daysUntilWedding` 为婚礼日期与服务端 UTC 当天之间的有符号日历日差（未来为正、当天为 0、过去为负）；无预算时为 `null`。

### 里程碑时间线

| 方法 | 路径 | 认证 | 成功消息 |
| --- | --- | --- | --- |
| `GET` | `/wedding/timeline` | JWT | - |

```http
GET /api/wedding/timeline
Authorization: Bearer <token>
```

时间线 item 只来源于当前用户、`status != cancelled` 且 `plannedDate != null` 的任务，按 `plannedDate` 升序、`createdAt` 升序、`id` 升序稳定排序；`completedDate` 只作为完成信息展示，不代替 `plannedDate` 定位。`isOverdue` 为 `status != completed` 且计划日期早于服务端 UTC 当天。响应 header 返回 `weddingDate` 与有符号 `daysUntilWedding`（规则同概览），婚礼已过去不会自动改变任务状态。这是日期里程碑视图，不支持任务依赖或甘特关系。

### Wedding 错误

- `400 VALIDATION_ERROR`：请求体、路径参数、日期或查询参数不合法；金额超过两位小数、负数、超出上界、日期不是有效的 `YYYY-MM-DD`、空 PATCH、未知字段、`completedDate` 被提交、无效 UUID、反向日期范围均属于此类。
- `401 UNAUTHORIZED`：未提供认证 Token。
- `401 INVALID_TOKEN`：Token 格式或签名无效。
- `401 TOKEN_EXPIRED`：Token 已过期。
- `404 NOT_FOUND`：任务、花费或预算不存在，或属于其他用户；也用于把花费关联到不存在或跨用户的任务。

## Dashboard 摘要

### 获取跨模块摘要

**GET** `/dashboard/summary`

需要 JWT，且不接受 query、path 或 body 参数。服务端只读取当前 Token 对应用户的数据，按服务端 UTC 的当天、周和月份边界聚合四个模块；前端不应自行重算这些值。

**响应：**

```json
{
  "success": true,
  "data": {
    "generatedAt": "2026-08-06T08:00:00.000Z",
    "fitness": { "todayCheckinCount": 1, "weeklyCheckinCount": 3, "weeklyTarget": 4, "latestWeightKg": 61.2 },
    "learning": { "activeExam": { "id": "exam-id", "examName": "英语考试", "daysRemaining": 12 }, "overallProgressPercentage": 48.5, "todayStudyHours": 2.5 },
    "finance": { "currentMonthExpense": 1234.5, "currentMonthBudget": 2000, "budgetRemaining": 765.5, "activeSavingPlansCount": 2 },
    "wedding": { "weddingDate": "2026-12-01", "daysRemaining": 117, "pendingTasksCount": 3, "completedTasksCount": 8, "budgetRemaining": -5000 }
  }
}
```

字段规则：没有有效健身周目标或最近体重时，`weeklyTarget`/`latestWeightKg` 为 `null`；没有未归档考试时，`activeExam` 和 `overallProgressPercentage` 为 `null`，有考试但没有科目时总进度为 `0`；没有本月预算时 Finance 的 `currentMonthBudget` 和 `budgetRemaining` 为 `null`；没有婚礼预算时 Wedding 的日期、倒计时和预算剩余为 `null`。空记录计数和支出返回 `0`，预算剩余保留符号，负数表示超预算。`pendingTasksCount` 包含 `pending + in_progress`。倒计时为有符号天数：未来为正数、今天为 `0`、过去为负数；资源不存在时为 `null`。

常见错误遵循统一错误响应格式：未提供 Token 返回 `401 UNAUTHORIZED`，Token 无效返回 `401 INVALID_TOKEN`，请求参数不应存在时返回 `400 VALIDATION_ERROR`，未预期服务错误返回 `500 INTERNAL_ERROR`。

---

## 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}
  }
}
```

### 常见错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `UNAUTHORIZED` | 401 | 未提供认证 Token |
| `INVALID_TOKEN` | 401 | Token 格式或签名无效 |
| `TOKEN_EXPIRED` | 401 | Token 已过期 |
| `INVALID_CREDENTIALS` | 401 | 邮箱或密码错误 |
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `CONFLICT` | 409 | 资源冲突（如用户已存在） |
| `NOT_FOUND` | 404 | 资源不存在 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## 测试示例

### 使用 curl

```bash
# 健康检查
curl http://localhost:3000/health

# 注册
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123"}'

# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 获取用户信息（替换 <token>）
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"
```
