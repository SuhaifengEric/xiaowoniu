const MAX_LATENCY_SAMPLES = 1024
const DASHBOARD_SUMMARY_ROUTE = '/api/dashboard/summary'

interface RequestBucket {
  total: number
  failures: number
  latencySamples: number[]
}

function createRequestBucket(): RequestBucket {
  return { total: 0, failures: 0, latencySamples: [] }
}

function addLatencySample(bucket: RequestBucket, durationMs: number) {
  const normalizedDuration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0
  bucket.latencySamples.push(normalizedDuration)
  if (bucket.latencySamples.length > MAX_LATENCY_SAMPLES) {
    bucket.latencySamples.shift()
  }
}

function percentile(samples: number[], percentileValue: number): number {
  if (samples.length === 0) {
    return 0
  }

  const ordered = [...samples].sort((left, right) => left - right)
  const index = Math.ceil(ordered.length * percentileValue) - 1
  return ordered[Math.max(0, index)]
}

function snapshotBucket(bucket: RequestBucket) {
  return {
    requestsTotal: bucket.total,
    responses5xxTotal: bucket.failures,
    latencyMs: {
      p50: percentile(bucket.latencySamples, 0.5),
      p95: percentile(bucket.latencySamples, 0.95),
    },
  }
}

export class RuntimeMetrics {
  private readonly startedAt = Date.now()
  private readonly http = createRequestBucket()
  private readonly dashboardSummary = createRequestBucket()
  private readonly readiness = createRequestBucket()
  private databaseQueryErrorsTotal = 0

  recordRequest(route: string, statusCode: number, durationMs: number) {
    this.recordIntoBucket(this.http, statusCode, durationMs)
    if (route === DASHBOARD_SUMMARY_ROUTE) {
      this.recordIntoBucket(this.dashboardSummary, statusCode, durationMs)
    }
  }

  recordReadiness(success: boolean, durationMs: number) {
    this.readiness.total += 1
    if (!success) {
      this.readiness.failures += 1
    }
    addLatencySample(this.readiness, durationMs)
  }

  recordDatabaseQueryError() {
    this.databaseQueryErrorsTotal += 1
  }

  snapshot() {
    const readinessSnapshot = snapshotBucket(this.readiness)
    return {
      generatedAt: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      http: snapshotBucket(this.http),
      dashboardSummary: snapshotBucket(this.dashboardSummary),
      database: {
        readinessChecksTotal: readinessSnapshot.requestsTotal,
        readinessFailuresTotal: readinessSnapshot.responses5xxTotal,
        readinessLatencyMs: readinessSnapshot.latencyMs,
        queryErrorsTotal: this.databaseQueryErrorsTotal,
      },
    }
  }

  private recordIntoBucket(bucket: RequestBucket, statusCode: number, durationMs: number) {
    bucket.total += 1
    if (statusCode >= 500) {
      bucket.failures += 1
    }
    addLatencySample(bucket, durationMs)
  }
}

export const runtimeMetrics = new RuntimeMetrics()
