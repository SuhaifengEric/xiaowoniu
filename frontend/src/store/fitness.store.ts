import { create } from 'zustand'
import type {
  ApiErrorResponse,
  CreateCheckinRequest,
  CreateWeightRecordRequest,
  FitnessCheckinResponse,
  FitnessGoalResponse,
  FitnessQueryParams,
  FitnessStatsResponse,
  UpsertGoalRequest,
  WeightRecordResponse,
} from '@xiaowoniu/shared'
import { fitnessService } from '@/services/fitness.service'

interface FitnessDataState {
  checkins: FitnessCheckinResponse[]
  weights: WeightRecordResponse[]
  goal: FitnessGoalResponse | null
  stats: FitnessStatsResponse | null
  loading: boolean
  error: string | null
}

interface FitnessActions {
  fetchDashboard: (checkinParams?: FitnessQueryParams) => Promise<void>
  fetchCheckins: (params?: FitnessQueryParams) => Promise<void>
  fetchWeights: (params?: FitnessQueryParams) => Promise<void>
  fetchGoal: () => Promise<void>
  fetchStats: () => Promise<void>
  createCheckin: (data: CreateCheckinRequest) => Promise<void>
  deleteCheckin: (id: string) => Promise<void>
  createWeight: (data: CreateWeightRecordRequest) => Promise<void>
  deleteWeight: (id: string) => Promise<void>
  upsertGoal: (data: UpsertGoalRequest) => Promise<void>
  clearError: () => void
  reset: () => void
}

export type FitnessState = FitnessDataState & FitnessActions

export const initialFitnessState: FitnessDataState = {
  checkins: [],
  weights: [],
  goal: null,
  stats: null,
  loading: false,
  error: null,
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getErrorMessage = (error: unknown): string => {
  if (isRecord(error) && isRecord(error.response) && isRecord(error.response.data)) {
    const data = error.response.data as Partial<ApiErrorResponse>
    if (data.error?.message) return data.error.message
  }
  return error instanceof Error ? error.message : '健身数据操作失败'
}

type Resource = 'checkins' | 'weights' | 'goal' | 'stats'
interface RequestToken {
  generation: number
  version: number
  resource: Resource
}

const resourceNames: Resource[] = ['checkins', 'weights', 'goal', 'stats']
const refreshFailureMessage = '操作已成功，但数据刷新失败'

export const useFitnessStore = create<FitnessState>((set, get) => {
  let generation = 0
  let activeActions = 0
  const versions: Record<Resource, number> = {
    checkins: 0,
    weights: 0,
    goal: 0,
    stats: 0,
  }

  const nextToken = (resource: Resource): RequestToken => ({
    generation,
    resource,
    version: ++versions[resource],
  })

  const isCurrent = (token: RequestToken): boolean =>
    token.generation === generation && token.version === versions[token.resource]

  const runAction = async (
    action: () => Promise<void>,
    canWriteError: () => boolean = () => true
  ): Promise<void> => {
    const actionGeneration = generation
    activeActions += 1
    set({ loading: true, error: null })
    try {
      await action()
    } catch (error: unknown) {
      if (actionGeneration === generation && canWriteError()) {
        set({ error: getErrorMessage(error) })
      }
      throw error
    } finally {
      if (actionGeneration === generation) {
        activeActions = Math.max(0, activeActions - 1)
        set({ loading: activeActions > 0 })
      }
    }
  }

  const refreshAfterMutation = async (
    requests: Array<{
      token: RequestToken
      request: Promise<unknown>
      apply: (value: unknown) => void
    }>
  ): Promise<void> => {
    const results = await Promise.allSettled(requests.map(({ request }) => request))
    let currentRefreshFailed = false

    results.forEach((result, index) => {
      const { token, apply } = requests[index]
      if (!isCurrent(token)) return
      if (result.status === 'fulfilled') {
        apply(result.value)
      } else {
        currentRefreshFailed = true
      }
    })

    if (currentRefreshFailed) set({ error: refreshFailureMessage })
  }

  return {
    ...initialFitnessState,

    fetchDashboard: (checkinParams) => {
      const tokens = Object.fromEntries(
        resourceNames.map((resource) => [resource, nextToken(resource)])
      ) as Record<Resource, RequestToken>
      return runAction(async () => {
        const [checkins, weights, goal, stats] = await Promise.all([
          fitnessService.getCheckins(checkinParams),
          fitnessService.getWeights(),
          fitnessService.getGoal(),
          fitnessService.getStats(),
        ])
        if (isCurrent(tokens.checkins)) set({ checkins })
        if (isCurrent(tokens.weights)) set({ weights })
        if (isCurrent(tokens.goal)) set({ goal })
        if (isCurrent(tokens.stats)) set({ stats })
      }, () => resourceNames.every((resource) => isCurrent(tokens[resource])))
    },

    fetchCheckins: (params) => {
      const token = nextToken('checkins')
      return runAction(async () => {
        const checkins = await fitnessService.getCheckins(params)
        if (isCurrent(token)) set({ checkins })
      }, () => isCurrent(token))
    },

    fetchWeights: (params) => {
      const token = nextToken('weights')
      return runAction(async () => {
        const weights = await fitnessService.getWeights(params)
        if (isCurrent(token)) set({ weights })
      }, () => isCurrent(token))
    },

    fetchGoal: () => {
      const token = nextToken('goal')
      return runAction(async () => {
        const goal = await fitnessService.getGoal()
        if (isCurrent(token)) set({ goal })
      }, () => isCurrent(token))
    },

    fetchStats: () => {
      const token = nextToken('stats')
      return runAction(async () => {
        const stats = await fitnessService.getStats()
        if (isCurrent(token)) set({ stats })
      }, () => isCurrent(token))
    },

    createCheckin: (data) => {
      const mutationToken = nextToken('checkins')
      return runAction(async () => {
        const created = await fitnessService.createCheckin(data)
        if (!isCurrent(mutationToken)) return
        set({ checkins: [created, ...get().checkins.filter(({ id }) => id !== created.id)] })
        const checkinsToken = nextToken('checkins')
        const statsToken = nextToken('stats')
        await refreshAfterMutation([
          {
            token: checkinsToken,
            request: fitnessService.getCheckins(),
            apply: (value) => set({ checkins: value as FitnessCheckinResponse[] }),
          },
          {
            token: statsToken,
            request: fitnessService.getStats(),
            apply: (value) => set({ stats: value as FitnessStatsResponse }),
          },
        ])
      }, () => isCurrent(mutationToken))
    },

    deleteCheckin: (id) => {
      const mutationToken = nextToken('checkins')
      return runAction(async () => {
        await fitnessService.deleteCheckin(id)
        if (!isCurrent(mutationToken)) return
        set({ checkins: get().checkins.filter((checkin) => checkin.id !== id) })
        const checkinsToken = nextToken('checkins')
        const statsToken = nextToken('stats')
        await refreshAfterMutation([
          {
            token: checkinsToken,
            request: fitnessService.getCheckins(),
            apply: (value) => set({ checkins: value as FitnessCheckinResponse[] }),
          },
          {
            token: statsToken,
            request: fitnessService.getStats(),
            apply: (value) => set({ stats: value as FitnessStatsResponse }),
          },
        ])
      }, () => isCurrent(mutationToken))
    },

    createWeight: (data) => {
      const mutationToken = nextToken('weights')
      return runAction(async () => {
        const created = await fitnessService.createWeight(data)
        if (!isCurrent(mutationToken)) return
        set({ weights: [created, ...get().weights.filter(({ id }) => id !== created.id)] })
        const weightsToken = nextToken('weights')
        const statsToken = nextToken('stats')
        await refreshAfterMutation([
          {
            token: weightsToken,
            request: fitnessService.getWeights(),
            apply: (value) => set({ weights: value as WeightRecordResponse[] }),
          },
          {
            token: statsToken,
            request: fitnessService.getStats(),
            apply: (value) => set({ stats: value as FitnessStatsResponse }),
          },
        ])
      }, () => isCurrent(mutationToken))
    },

    deleteWeight: (id) => {
      const mutationToken = nextToken('weights')
      return runAction(async () => {
        await fitnessService.deleteWeight(id)
        if (!isCurrent(mutationToken)) return
        set({ weights: get().weights.filter((weight) => weight.id !== id) })
        const weightsToken = nextToken('weights')
        const statsToken = nextToken('stats')
        await refreshAfterMutation([
          {
            token: weightsToken,
            request: fitnessService.getWeights(),
            apply: (value) => set({ weights: value as WeightRecordResponse[] }),
          },
          {
            token: statsToken,
            request: fitnessService.getStats(),
            apply: (value) => set({ stats: value as FitnessStatsResponse }),
          },
        ])
      }, () => isCurrent(mutationToken))
    },

    upsertGoal: (data) => {
      const mutationToken = nextToken('goal')
      return runAction(async () => {
        const updated = await fitnessService.upsertGoal(data)
        if (!isCurrent(mutationToken)) return
        set({ goal: updated })
        const goalToken = nextToken('goal')
        const statsToken = nextToken('stats')
        await refreshAfterMutation([
          {
            token: goalToken,
            request: fitnessService.getGoal(),
            apply: (value) => set({ goal: value as FitnessGoalResponse | null }),
          },
          {
            token: statsToken,
            request: fitnessService.getStats(),
            apply: (value) => set({ stats: value as FitnessStatsResponse }),
          },
        ])
      }, () => isCurrent(mutationToken))
    },

    clearError: () => set({ error: null }),

    reset: () => {
      generation += 1
      activeActions = 0
      resourceNames.forEach((resource) => {
        versions[resource] = 0
      })
      set(initialFitnessState)
    },
  }
})
