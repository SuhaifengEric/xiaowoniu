import type {
  ApiSuccessResponse,
  CreateBudgetRequest,
  CreateExpenseRequest,
  CreateSavingPlanRequest,
  ExpenseResponse,
  FinanceExpenseQueryParams,
  FinanceSummaryResponse,
  MonthlyBudgetResponse,
  SavingPlanResponse,
  UpdateExpenseRequest,
  UpdateSavingPlanRequest,
} from '@xiaowoniu/shared'
import api from './api'

export const financeService = {
  async getExpenses(params?: FinanceExpenseQueryParams): Promise<ExpenseResponse[]> {
    const response = await api.get<ApiSuccessResponse<ExpenseResponse[]>>(
      '/api/finance/expenses',
      { params }
    )
    return response.data.data
  },

  async createExpense(data: CreateExpenseRequest): Promise<ExpenseResponse> {
    const response = await api.post<ApiSuccessResponse<ExpenseResponse>>(
      '/api/finance/expenses',
      data
    )
    return response.data.data
  },

  async updateExpense(id: string, data: UpdateExpenseRequest): Promise<ExpenseResponse> {
    const response = await api.patch<ApiSuccessResponse<ExpenseResponse>>(
      `/api/finance/expenses/${id}`,
      data
    )
    return response.data.data
  },

  async deleteExpense(id: string): Promise<null> {
    const response = await api.delete<ApiSuccessResponse<null>>(
      `/api/finance/expenses/${id}`
    )
    return response.data.data
  },

  async getSummary(month: string): Promise<FinanceSummaryResponse> {
    const response = await api.get<ApiSuccessResponse<FinanceSummaryResponse>>(
      '/api/finance/summary',
      { params: { month } }
    )
    return response.data.data
  },

  async getBudget(month: string): Promise<MonthlyBudgetResponse | null> {
    const response = await api.get<ApiSuccessResponse<MonthlyBudgetResponse | null>>(
      '/api/finance/budgets',
      { params: { month } }
    )
    return response.data.data
  },

  async upsertBudget(data: CreateBudgetRequest): Promise<MonthlyBudgetResponse> {
    const response = await api.put<ApiSuccessResponse<MonthlyBudgetResponse>>(
      '/api/finance/budgets',
      data
    )
    return response.data.data
  },

  async getSavingPlans(): Promise<SavingPlanResponse[]> {
    const response = await api.get<ApiSuccessResponse<SavingPlanResponse[]>>(
      '/api/finance/saving-plans'
    )
    return response.data.data
  },

  async createSavingPlan(data: CreateSavingPlanRequest): Promise<SavingPlanResponse> {
    const response = await api.post<ApiSuccessResponse<SavingPlanResponse>>(
      '/api/finance/saving-plans',
      data
    )
    return response.data.data
  },

  async updateSavingPlan(id: string, data: UpdateSavingPlanRequest): Promise<SavingPlanResponse> {
    const response = await api.patch<ApiSuccessResponse<SavingPlanResponse>>(
      `/api/finance/saving-plans/${id}`,
      data
    )
    return response.data.data
  },

  async deleteSavingPlan(id: string): Promise<null> {
    const response = await api.delete<ApiSuccessResponse<null>>(
      `/api/finance/saving-plans/${id}`
    )
    return response.data.data
  },
}

export default financeService
