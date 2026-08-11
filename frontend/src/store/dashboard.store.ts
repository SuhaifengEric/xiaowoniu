import { create } from 'zustand'
import type { ApiErrorResponse, DashboardSummaryResponse } from '@xiaowoniu/shared'
import { dashboardService } from '@/services/dashboard.service'

interface DashboardDataState {
  summary: DashboardSummaryResponse | null
  loading: boolean
  error: string | null
}

interface DashboardActions {
  fetchSummary: () => Promise<void>
  clearError: () => void
  reset: () => void
}

export type DashboardState = DashboardDataState & DashboardActions

export const initialDashboardState: DashboardDataState = {
  summary: null,
  loading: false,
  error: null,
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getErrorMessage = (value: unknown): string => {
  if (isRecord(value) && isRecord(value.response) && isRecord(value.response.data)) {
    const data = value.response.data as Partial<ApiErrorResponse>
    if (data.error?.message) return data.error.message
  }
  return value instanceof Error ? value.message : 'Dashboard 数据加载失败'
}

export const useDashboardStore = create<DashboardState>((set) => {
  let generation = 0
  let requestVersion = 0

  return {
    ...initialDashboardState,

    fetchSummary: async () => {
      const currentGeneration = generation
      const currentVersion = ++requestVersion
      set({ loading: true, error: null })
      try {
        const summary = await dashboardService.getSummary()
        if (currentGeneration === generation && currentVersion === requestVersion) set({ summary })
      } catch (error: unknown) {
        if (currentGeneration === generation && currentVersion === requestVersion) {
          set({ error: getErrorMessage(error) })
        }
        throw error
      } finally {
        if (currentGeneration === generation && currentVersion === requestVersion) {
          set({ loading: false })
        }
      }
    },

    clearError: () => set({ error: null }),

    reset: () => {
      generation += 1
      requestVersion = 0
      set(initialDashboardState)
    },
  }
})
