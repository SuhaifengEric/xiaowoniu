import type { ApiSuccessResponse, DashboardSummaryResponse } from '@xiaowoniu/shared'
import api from './api'

export const dashboardService = {
  async getSummary(): Promise<DashboardSummaryResponse> {
    const response = await api.get<ApiSuccessResponse<DashboardSummaryResponse>>('/api/dashboard/summary')
    return response.data.data
  },
}

export default dashboardService
