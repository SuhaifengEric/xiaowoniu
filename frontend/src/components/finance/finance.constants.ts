import type { ExpenseCategory, PaymentMethod } from '@xiaowoniu/shared'

export const financeCategoryOptions: Array<{ value: ExpenseCategory; label: string }> = [
  { value: 'food' as ExpenseCategory, label: '餐饮' },
  { value: 'transport' as ExpenseCategory, label: '交通' },
  { value: 'shopping' as ExpenseCategory, label: '购物' },
  { value: 'entertainment' as ExpenseCategory, label: '娱乐' },
  { value: 'health' as ExpenseCategory, label: '健康' },
  { value: 'other' as ExpenseCategory, label: '其他' },
]

export const financeCategoryLabels: Record<string, string> = Object.fromEntries(
  financeCategoryOptions.map(({ value, label }) => [value, label]),
)

export const financePaymentMethodOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'cash' as PaymentMethod, label: '现金' },
  { value: 'alipay' as PaymentMethod, label: '支付宝' },
  { value: 'wechat' as PaymentMethod, label: '微信支付' },
  { value: 'card' as PaymentMethod, label: '银行卡' },
  { value: 'other' as PaymentMethod, label: '其他' },
]
