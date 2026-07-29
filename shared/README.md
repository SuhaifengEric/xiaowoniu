# @xiaowoniu/shared

小窝牛平台的共享类型包，提供前后端通用的 TypeScript 类型定义和常量。

## 功能

- ✅ API 请求/响应类型（DTO）
- ✅ 业务实体类型
- ✅ 枚举常量
- ✅ 中文标签映射
- ✅ 通用工具类型

## 安装

在 workspace 中的其他包中使用：

```json
{
  "dependencies": {
    "@xiaowoniu/shared": "workspace:*"
  }
}
```

## 使用示例

### 在后端使用

```typescript
import { LoginRequest, UserResponse, ApiResponse } from '@xiaowoniu/shared'

function login(req: LoginRequest): ApiResponse<UserResponse> {
  // ...
}
```

### 在前端使用

```typescript
import { ActivityType, ActivityTypeLabels } from '@xiaowoniu/shared'

const label = ActivityTypeLabels[ActivityType.PILATES] // "普拉提"
```

## 开发

```bash
# 构建
pnpm build

# 监听模式
pnpm dev

# 清理
pnpm clean
```

## 类型组织

```
src/
├── types/
│   ├── common.ts        # 通用类型（ApiResponse, Pagination 等）
│   ├── models/          # 业务实体类型
│   │   └── user.ts
│   └── api/             # API DTO 类型
│       └── auth.ts
└── constants/
    ├── enums.ts         # 枚举定义
    └── labels.ts        # 中文标签映射
```

## 添加新类型

1. 在对应目录创建文件
2. 在 `src/index.ts` 中导出
3. 运行 `pnpm build` 编译
4. 前后端自动获得更新

## 注意事项

- 所有日期使用 ISO 8601 字符串格式
- 所有 ID 使用 string 类型（UUID）
- 枚举值使用小写下划线格式
- 中文标签单独维护，便于国际化
