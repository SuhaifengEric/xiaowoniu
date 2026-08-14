import type {
  ApiSuccessResponse,
  CreateWeddingExpenseRequest,
  CreateWeddingTaskRequest,
  CreateAgreementTopicRequest,
  MarriageNodeHistoryResponse,
  MarriageNodeKey,
  MarriageNodeResponse,
  MarriageProcessResponse,
  PutMarriageProcessRequest,
  UpdateAgreementTopicRequest,
  UpdateMarriageNodeRequest,
  UpdateMarriageSettingsRequest,
  UpdateWeddingExpenseRequest,
  UpdateWeddingTaskRequest,
  UpsertWeddingBudgetRequest,
  WeddingBudgetResponse,
  WeddingExpenseQueryParams,
  WeddingExpenseResponse,
  WeddingOverviewResponse,
  WeddingTaskQueryParams,
  WeddingTaskResponse,
  WeddingTimelineResponse,
} from '@xiaowoniu/shared'
import api from './api'

export const weddingService = {
  async getTasks(params?: WeddingTaskQueryParams): Promise<WeddingTaskResponse[]> {
    const response = await api.get<ApiSuccessResponse<WeddingTaskResponse[]>>(
      '/api/wedding/tasks',
      { params }
    )
    return response.data.data
  },

  async getProcess(): Promise<MarriageProcessResponse | null> {
    const response = await api.get<ApiSuccessResponse<MarriageProcessResponse | null>>('/api/wedding/process')
    return response.data.data
  },

  async createProcess(data: PutMarriageProcessRequest): Promise<MarriageProcessResponse> {
    const response = await api.put<ApiSuccessResponse<MarriageProcessResponse>>('/api/wedding/process', data)
    return response.data.data
  },

  async updateProcessSettings(data: UpdateMarriageSettingsRequest): Promise<MarriageProcessResponse> {
    const response = await api.patch<ApiSuccessResponse<MarriageProcessResponse>>('/api/wedding/process/settings', data)
    return response.data.data
  },

  async getNodes(): Promise<MarriageNodeResponse[]> {
    const response = await api.get<ApiSuccessResponse<MarriageNodeResponse[]>>('/api/wedding/process/nodes')
    return response.data.data
  },

  async updateNode(nodeKey: MarriageNodeKey, data: UpdateMarriageNodeRequest): Promise<MarriageNodeResponse> {
    const response = await api.patch<ApiSuccessResponse<MarriageNodeResponse>>(`/api/wedding/process/nodes/${nodeKey}`, data)
    return response.data.data
  },

  async getNodeHistory(nodeKey: MarriageNodeKey): Promise<MarriageNodeHistoryResponse[]> {
    const response = await api.get<ApiSuccessResponse<MarriageNodeHistoryResponse[]>>(`/api/wedding/process/nodes/${nodeKey}/history`)
    return response.data.data
  },

  async getAgreements(): Promise<MarriageProcessResponse['agreements']> {
    const response = await api.get<ApiSuccessResponse<MarriageProcessResponse['agreements']>>('/api/wedding/process/agreements')
    return response.data.data
  },

  async createAgreement(data: CreateAgreementTopicRequest): Promise<MarriageProcessResponse['agreements'][number]> {
    const response = await api.post<ApiSuccessResponse<MarriageProcessResponse['agreements'][number]>>('/api/wedding/process/agreements', data)
    return response.data.data
  },

  async updateAgreement(id: string, data: UpdateAgreementTopicRequest): Promise<MarriageProcessResponse['agreements'][number]> {
    const response = await api.patch<ApiSuccessResponse<MarriageProcessResponse['agreements'][number]>>(`/api/wedding/process/agreements/${id}`, data)
    return response.data.data
  },

  async archiveAgreement(id: string): Promise<null> {
    const response = await api.delete<ApiSuccessResponse<null>>(`/api/wedding/process/agreements/${id}`)
    return response.data.data
  },

  async createTask(data: CreateWeddingTaskRequest): Promise<WeddingTaskResponse> {
    const response = await api.post<ApiSuccessResponse<WeddingTaskResponse>>(
      '/api/wedding/tasks',
      data
    )
    return response.data.data
  },

  async updateTask(id: string, data: UpdateWeddingTaskRequest): Promise<WeddingTaskResponse> {
    const response = await api.patch<ApiSuccessResponse<WeddingTaskResponse>>(
      `/api/wedding/tasks/${id}`,
      data
    )
    return response.data.data
  },

  async deleteTask(id: string): Promise<null> {
    const response = await api.delete<ApiSuccessResponse<null>>(
      `/api/wedding/tasks/${id}`
    )
    return response.data.data
  },

  async getExpenses(params?: WeddingExpenseQueryParams): Promise<WeddingExpenseResponse[]> {
    const response = await api.get<ApiSuccessResponse<WeddingExpenseResponse[]>>(
      '/api/wedding/expenses',
      { params }
    )
    return response.data.data
  },

  async createExpense(data: CreateWeddingExpenseRequest): Promise<WeddingExpenseResponse> {
    const response = await api.post<ApiSuccessResponse<WeddingExpenseResponse>>(
      '/api/wedding/expenses',
      data
    )
    return response.data.data
  },

  async updateExpense(id: string, data: UpdateWeddingExpenseRequest): Promise<WeddingExpenseResponse> {
    const response = await api.patch<ApiSuccessResponse<WeddingExpenseResponse>>(
      `/api/wedding/expenses/${id}`,
      data
    )
    return response.data.data
  },

  async deleteExpense(id: string): Promise<null> {
    const response = await api.delete<ApiSuccessResponse<null>>(
      `/api/wedding/expenses/${id}`
    )
    return response.data.data
  },

  async getBudget(): Promise<WeddingBudgetResponse | null> {
    const response = await api.get<ApiSuccessResponse<WeddingBudgetResponse | null>>(
      '/api/wedding/budget'
    )
    return response.data.data
  },

  async upsertBudget(data: UpsertWeddingBudgetRequest): Promise<WeddingBudgetResponse> {
    const response = await api.put<ApiSuccessResponse<WeddingBudgetResponse>>(
      '/api/wedding/budget',
      data
    )
    return response.data.data
  },

  async getOverview(): Promise<WeddingOverviewResponse> {
    const response = await api.get<ApiSuccessResponse<WeddingOverviewResponse>>(
      '/api/wedding/overview'
    )
    return response.data.data
  },

  async getTimeline(): Promise<WeddingTimelineResponse> {
    const response = await api.get<ApiSuccessResponse<WeddingTimelineResponse>>(
      '/api/wedding/timeline'
    )
    return response.data.data
  },
}

export default weddingService
