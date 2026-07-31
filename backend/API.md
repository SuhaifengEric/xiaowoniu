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

### 4. 用户登出

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
| `UNAUTHORIZED` | 401 | 未认证或 Token 无效 |
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
