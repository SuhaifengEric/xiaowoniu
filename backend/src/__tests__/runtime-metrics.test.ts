import { describe, expect, it } from 'vitest'
import { RuntimeMetrics } from '../observability/runtime-metrics'

describe('runtime metrics', () => {
  it('tracks HTTP, Dashboard, and database readiness signals with bounded latency summaries', () => {
    const metrics = new RuntimeMetrics()

    metrics.recordRequest('/api/fitness/checkins', 200, 10)
    metrics.recordRequest('/api/dashboard/summary', 500, 50)
    metrics.recordRequest('/api/dashboard/summary', 200, 100)
    metrics.recordReadiness(true, 7)
    metrics.recordReadiness(false, 13)
    metrics.recordDatabaseQueryError()

    expect(metrics.snapshot()).toMatchObject({
      http: {
        requestsTotal: 3,
        responses5xxTotal: 1,
        latencyMs: { p50: 50, p95: 100 },
      },
      dashboardSummary: {
        requestsTotal: 2,
        responses5xxTotal: 1,
        latencyMs: { p50: 50, p95: 100 },
      },
      database: {
        readinessChecksTotal: 2,
        readinessFailuresTotal: 1,
        readinessLatencyMs: { p50: 7, p95: 13 },
        queryErrorsTotal: 1,
      },
    })
  })
})
