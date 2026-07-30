import type {
  ApiSuccessResponse,
  CreateCheckinRequest,
  CreateWeightRecordRequest,
  FitnessCheckinResponse,
  FitnessGoalResponse,
  FitnessQueryParams,
  FitnessStatsResponse,
  UpsertGoalRequest,
  WeightRecordResponse,
} from '@xiaowoniu/shared'
import api from './api'

export const fitnessService = {
  async getCheckins(params?: FitnessQueryParams): Promise<FitnessCheckinResponse[]> {
    const response = await api.get<ApiSuccessResponse<FitnessCheckinResponse[]>>(
      '/api/fitness/checkins',
      { params }
    )
    return response.data.data
  },

  async createCheckin(data: CreateCheckinRequest): Promise<FitnessCheckinResponse> {
    const response = await api.post<ApiSuccessResponse<FitnessCheckinResponse>>(
      '/api/fitness/checkins',
      data
    )
    return response.data.data
  },

  async deleteCheckin(id: string): Promise<null> {
    const response = await api.delete<ApiSuccessResponse<null>>(
      `/api/fitness/checkins/${id}`
    )
    return response.data.data
  },

  async getWeights(params?: FitnessQueryParams): Promise<WeightRecordResponse[]> {
    const response = await api.get<ApiSuccessResponse<WeightRecordResponse[]>>(
      '/api/fitness/weights',
      { params }
    )
    return response.data.data
  },

  async createWeight(data: CreateWeightRecordRequest): Promise<WeightRecordResponse> {
    const response = await api.post<ApiSuccessResponse<WeightRecordResponse>>(
      '/api/fitness/weights',
      data
    )
    return response.data.data
  },

  async deleteWeight(id: string): Promise<null> {
    const response = await api.delete<ApiSuccessResponse<null>>(
      `/api/fitness/weights/${id}`
    )
    return response.data.data
  },

  async getGoal(): Promise<FitnessGoalResponse | null> {
    const response = await api.get<ApiSuccessResponse<FitnessGoalResponse | null>>(
      '/api/fitness/goal'
    )
    return response.data.data
  },

  async upsertGoal(data: UpsertGoalRequest): Promise<FitnessGoalResponse> {
    const response = await api.put<ApiSuccessResponse<FitnessGoalResponse>>(
      '/api/fitness/goal',
      data
    )
    return response.data.data
  },

  async getStats(): Promise<FitnessStatsResponse> {
    const response = await api.get<ApiSuccessResponse<FitnessStatsResponse>>(
      '/api/fitness/stats'
    )
    return response.data.data
  },
}

export default fitnessService
