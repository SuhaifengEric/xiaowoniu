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
