# 小窝牛平台 - 视觉设计系统

## 配色方案：粉蓝少女系

### 主色调
```css
/* 粉色系 */
--primary-pink: #FF6B9D;        /* 主粉色 - 按钮、链接 */
--pink-light: #FFB3D9;          /* 浅粉 - 背景、卡片 */
--pink-lighter: #FFE5F1;        /* 极浅粉 - 页面背景 */
--pink-deep: #E94B7B;           /* 深粉 - hover状态 */

/* 蓝色系 */
--primary-blue: #6BB6FF;        /* 主蓝色 - 信息、图表 */
--blue-light: #B3DCFF;          /* 浅蓝 - 次要元素 */
--blue-lighter: #E5F3FF;        /* 极浅蓝 - 卡片背景 */
--blue-deep: #4B9DE9;           /* 深蓝 - 强调 */

/* 渐变色 */
--gradient-pink-blue: linear-gradient(135deg, #FF6B9D 0%, #6BB6FF 100%);
--gradient-soft: linear-gradient(135deg, #FFE5F1 0%, #E5F3FF 100%);

/* 中性色 */
--text-primary: #2D3436;        /* 主文字 */
--text-secondary: #636E72;      /* 次要文字 */
--text-light: #B2BEC3;          /* 提示文字 */
--bg-white: #FFFFFF;            /* 纯白背景 */
--bg-gray: #F8F9FA;             /* 灰色背景 */
--border: #DFE6E9;              /* 边框色 */

/* 功能色 */
--success: #55EFC4;             /* 成功 - 薄荷绿 */
--warning: #FDCB6E;             /* 警告 - 柔和橙 */
--error: #FF7675;               /* 错误 - 柔和红 */
--info: #74B9FF;                /* 信息 - 天蓝 */
```

### 四大模块专属色

#### 瘦瘦瘦 - 粉色主导
- 主色：`#FF6B9D` (活力粉)
- 辅色：`#FFB3D9` (樱花粉)
- 图表色：粉色系渐变

#### 学学学 - 蓝色主导
- 主色：`#6BB6FF` (知识蓝)
- 辅色：`#B3DCFF` (晴空蓝)
- 图表色：蓝色系渐变

#### 省省省 - 绿色点缀
- 主色：`#55EFC4` (理财绿)
- 辅色：`#81ECEC` (薄荷绿)
- 图表色：绿-蓝渐变

#### 嫁嫁嫁 - 粉蓝渐变
- 主色：粉蓝渐变 `linear-gradient(135deg, #FF6B9D, #6BB6FF)`
- 辅色：`#FFB3D9` + `#B3DCFF`
- 图表色：粉蓝双色

## 字体系统

### 字体家族
```css
/* 主字体 */
--font-primary: 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', sans-serif;

/* 数字字体 */
--font-number: 'SF Pro Display', 'DIN Alternate', 'Arial', sans-serif;

/* 装饰字体（标题） */
--font-decorative: 'Inter', 'SF Pro Display', sans-serif;
```

### 字阶
```css
--text-xs: 12px;      /* 辅助信息 */
--text-sm: 14px;      /* 次要文字 */
--text-base: 16px;    /* 正文 */
--text-lg: 18px;      /* 小标题 */
--text-xl: 20px;      /* 标题 */
--text-2xl: 24px;     /* 大标题 */
--text-3xl: 30px;     /* 页面标题 */
--text-4xl: 36px;     /* 数字大屏 */
```

### 字重
```css
--font-light: 300;    /* 辅助文字 */
--font-normal: 400;   /* 正文 */
--font-medium: 500;   /* 强调 */
--font-semibold: 600; /* 小标题 */
--font-bold: 700;     /* 标题 */
```

## 圆角系统

```css
--radius-sm: 8px;     /* 小元素：按钮、标签 */
--radius-md: 12px;    /* 中等元素：输入框、卡片 */
--radius-lg: 16px;    /* 大元素：面板、模态框 */
--radius-xl: 20px;    /* 超大元素：页面容器 */
--radius-full: 9999px; /* 圆形：头像、徽章 */
```

## 间距系统

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

## 阴影系统

```css
/* 卡片阴影 */
--shadow-sm: 0 2px 8px rgba(255, 107, 157, 0.08);
--shadow-md: 0 4px 16px rgba(255, 107, 157, 0.12);
--shadow-lg: 0 8px 24px rgba(255, 107, 157, 0.16);

/* 悬浮阴影 */
--shadow-hover: 0 8px 32px rgba(107, 182, 255, 0.2);

/* 内阴影 */
--shadow-inner: inset 0 2px 4px rgba(0, 0, 0, 0.06);
```

## UI组件风格

### 按钮设计
```typescript
// 主按钮：粉色渐变
primary: {
  background: 'linear-gradient(135deg, #FF6B9D, #E94B7B)',
  color: 'white',
  borderRadius: '12px',
  padding: '12px 24px',
  boxShadow: '0 4px 12px rgba(255, 107, 157, 0.3)',
  hover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 16px rgba(255, 107, 157, 0.4)',
  }
}

// 次要按钮：蓝色描边
secondary: {
  background: 'transparent',
  color: '#6BB6FF',
  border: '2px solid #6BB6FF',
  borderRadius: '12px',
  hover: {
    background: '#E5F3FF',
  }
}

// 幽灵按钮：轻量级
ghost: {
  background: '#FFE5F1',
  color: '#FF6B9D',
  borderRadius: '12px',
}
```

### 卡片设计
```typescript
card: {
  background: 'white',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 2px 8px rgba(255, 107, 157, 0.08)',
  border: '1px solid #FFE5F1',
  hover: {
    boxShadow: '0 4px 16px rgba(107, 182, 255, 0.15)',
    transform: 'translateY(-4px)',
    transition: 'all 0.3s ease',
  }
}
```

### 输入框设计
```typescript
input: {
  background: '#F8F9FA',
  border: '2px solid transparent',
  borderRadius: '12px',
  padding: '12px 16px',
  fontSize: '16px',
  focus: {
    background: 'white',
    border: '2px solid #6BB6FF',
    boxShadow: '0 0 0 4px rgba(107, 182, 255, 0.1)',
  }
}
```

## 页面布局风格

### 整体风格
- **设计语言**：柔和、圆润、轻量、少女感
- **视觉层次**：使用渐变、阴影、圆角营造层次
- **动效**：流畅的过渡动画（Framer Motion）
- **图标**: Hugeicons (Stroke Rounded 风格 - 圆润线性)

### 首页 Dashboard
```
┌─────────────────────────────────────────┐
│  🌸 小窝牛  [头像]  [通知]               │  ← 粉蓝渐变顶栏
├─────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐               │
│  │ 💪 瘦瘦瘦 │  │ 📚 学学学 │               │  ← 圆角卡片
│  │ 今日已打卡│  │ 倒计时23天│               │     + 渐变背景
│  └─────────┘  └─────────┘               │
│  ┌─────────┐  ┌─────────┐               │
│  │ 💰 省省省 │  │ 💒 嫁嫁嫁 │               │
│  │ 本月¥2340│  │ 已完成8项 │               │
│  └─────────┘  └─────────┘               │
└─────────────────────────────────────────┘
```

### 模块页面布局
- **顶部**：模块标题 + 快捷操作（粉蓝渐变背景）
- **主区域**：统计卡片 + 图表区
- **底部**：数据列表（带搜索、筛选）

### 移动端适配
- 底部导航栏：4个模块图标（粉蓝配色）
- 卡片全宽显示
- 图表简化为关键数据
- 大号触控区域（最小44px）

## 图表配色方案

### 瘦瘦瘦模块
```javascript
// 体重趋势线图
colors: ['#FF6B9D', '#FFB3D9']
gradient: ['#FF6B9D', '#FFE5F1']

// 运动完成度环形图
colors: ['#FF6B9D', '#E94B7B', '#FFB3D9']
```

### 学学学模块
```javascript
// 学习进度柱状图
colors: ['#6BB6FF', '#B3DCFF', '#4B9DE9']

// 热力图
colors: ['#E5F3FF', '#B3DCFF', '#6BB6FF', '#4B9DE9']
```

### 省省省模块
```javascript
// 消费分类饼图
colors: [
  '#55EFC4', // 餐饮
  '#81ECEC', // 交通
  '#74B9FF', // 购物
  '#A29BFE', // 娱乐
  '#FD79A8', // 健康
  '#FDCB6E', // 其他
]

// 月度趋势折线图
colors: ['#55EFC4', '#81ECEC']
```

### 嫁嫁嫁模块
```javascript
// 预算对比图
colors: ['#FF6B9D', '#6BB6FF']

// 甘特图时间线
colors: ['#FFB3D9', '#B3DCFF', '#55EFC4', '#FDCB6E']
```

## 动画效果

### 页面过渡
```javascript
// 路由切换
{
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: 'easeOut' }
}
```

### 卡片悬停
```javascript
{
  whileHover: { 
    scale: 1.02, 
    y: -4,
    transition: { duration: 0.2 }
  },
  whileTap: { scale: 0.98 }
}
```

### 数字滚动
```javascript
// 统计数字从0递增动画
<CountUp 
  end={value} 
  duration={1.5} 
  separator="," 
/>
```

### 加载动画
```javascript
// 粉蓝渐变的Loading Spinner
<motion.div
  animate={{ rotate: 360 }}
  transition={{ 
    duration: 1, 
    repeat: Infinity, 
    ease: 'linear' 
  }}
  style={{
    background: 'linear-gradient(135deg, #FF6B9D, #6BB6FF)',
  }}
/>
```

## UI组件库选择

### 推荐方案1：Shadcn/ui + Radix UI
**优势**：
- 完全可定制，易于改造为粉蓝主题
- 组件代码直接加入项目，灵活度极高
- 现代化设计，支持暗色模式
- TypeScript原生支持
- 无捆绑，按需使用

**适合场景**：需要高度定制化的设计

### 推荐方案2：MUI Joy UI
**优势**：
- Material Design 3，更柔和圆润
- 开箱即用的精美组件
- 主题系统强大，易于定制粉蓝配色
- 文档完善，组件丰富
- 响应式支持好

**适合场景**：快速开发，保证美观度

### 最终建议
采用 **Shadcn/ui** + **Tailwind CSS** + **Framer Motion**

**理由**：
1. 完全定制化，打造独特的粉蓝少女风格
2. 性能优秀，打包体积小
3. 开发体验好，组件即代码
4. 社区活跃，更新快

## 参考灵感

### 视觉风格参考
- **Notion**：卡片式布局、圆角设计
- **Linear**：现代渐变、流畅动画
- **Dribbble 粉蓝主题作品**：配色灵感
- **iOS/iPadOS 设计语言**：圆润、轻量

### 交互参考
- **Stripe Dashboard**：数据可视化
- **Notion Calendar**：日历打卡
- **Mint/YNAB**：财务记录界面

---

**设计系统版本**: v1.0  
**更新时间**: 2026-07-29  
**配色定位**: 粉蓝少女系、轻量柔和、现代时尚
