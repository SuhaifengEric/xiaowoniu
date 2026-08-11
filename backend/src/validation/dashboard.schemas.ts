import { z } from 'zod'

const empty = z.object({}).strict()

export const dashboardSummarySchema = z.object({
  body: empty,
  query: empty,
  params: empty,
})
