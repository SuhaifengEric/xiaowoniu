import { Prisma } from '@prisma/client'
import {
  ActionOwnerRole,
  AgreementStatus,
  CreateWeddingExpenseRequest,
  CreateWeddingTaskRequest,
  EngagementMode,
  MarriageNodeKey,
  MarriageNodeStatus,
  MarriageOrder,
  MarriageRecorderRole,
  PaidStatus,
  RecordSource,
  TaskStatus,
  UpdateWeddingExpenseRequest,
  UpdateWeddingTaskRequest,
  UpsertWeddingBudgetRequest,
  WeddingBudgetResponse,
  WeddingExpenseQueryParams,
  WeddingExpenseResponse,
  WeddingOverviewResponse,
  WeddingTaskCategory,
  WeddingTaskQueryParams,
  WeddingTaskResponse,
  WeddingTimelineResponse,
  AgreementTopicResponse,
  CreateAgreementTopicRequest,
  MarriageNodeHistoryResponse,
  MarriageNodeResponse,
  MarriageProcessResponse,
  MarriageOverviewSummary,
  PutMarriageProcessRequest,
  UpdateAgreementTopicRequest,
  UpdateMarriageNodeRequest,
  UpdateMarriageSettingsRequest,
  WeddingTimelineNodeItem,
  VisitOrder,
} from '@xiaowoniu/shared'
import {
  AgreementStatusLabels,
  MarriageNodeKeyLabels,
  MarriageNodeStatusLabels,
} from '@xiaowoniu/shared'
import prisma from '../config/database'

export class WeddingNotFoundError extends Error {
  constructor(message = '备婚资源不存在') {
    super(message)
    this.name = 'WeddingNotFoundError'
  }
}

export class WeddingValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WeddingValidationError'
  }
}

export const utcDate = (value: string) => new Date(`${value}T00:00:00.000Z`)
export const formatDate = (value: Date) => value.toISOString().slice(0, 10)
export const utcToday = () => {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

const numberValue = (value: Prisma.Decimal | number) => typeof value === 'number' ? value : value.toNumber()
const decimalValue = (value: Prisma.Decimal | number | string) => new Prisma.Decimal(value)
const roundPercentage = (value: Prisma.Decimal | number) => {
  const decimal = value instanceof Prisma.Decimal ? value : decimalValue(value)
  return decimal.toDecimalPlaces(2).toNumber()
}

const MARRIAGE_NODE_ORDER: MarriageNodeKey[] = [
  MarriageNodeKey.INTENTION,
  MarriageNodeKey.MALE_VISIT,
  MarriageNodeKey.FEMALE_VISIT,
  MarriageNodeKey.PARENTS_MEETING,
  MarriageNodeKey.AGREEMENT,
  MarriageNodeKey.ENGAGEMENT,
  MarriageNodeKey.REGISTRATION,
  MarriageNodeKey.WEDDING,
]

const DEFAULT_AGREEMENT_TITLES = [
  '是否确定进入婚姻',
  '婚后居住城市 / 居住安排',
  '领证与婚礼时间',
  '婚礼规模和双方家庭参与方式',
  '费用、礼金和预算边界',
  '婚后家庭责任和重要生活安排',
]

const hasMarriageDelegate = () => Boolean((prisma as any).marriageProcess)
const nullableText = (value: string | null | undefined) => {
  if (value === undefined || value === null) return value === null ? null : undefined
  const trimmed = value.trim()
  return trimmed || null
}

function isTerminalNode(node: { nodeKey: MarriageNodeKey; status: MarriageNodeStatus }) {
  return node.status === MarriageNodeStatus.COMPLETED
    || (node.nodeKey === MarriageNodeKey.ENGAGEMENT && node.status === MarriageNodeStatus.SKIPPED)
}

function toAgreementResponse(record: any): AgreementTopicResponse {
  return {
    id: record.id,
    processId: record.processId,
    title: record.title,
    status: record.status as AgreementStatus,
    sortOrder: record.sortOrder,
    notes: record.notes,
    archivedAt: record.archivedAt ? record.archivedAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function toNodeResponse(record: any, actionItemCount: number, today: Date): MarriageNodeResponse {
  const nodeKey = record.nodeKey as MarriageNodeKey
  const status = record.status as MarriageNodeStatus
  return {
    id: record.id,
    processId: record.processId,
    nodeKey,
    status,
    plannedDate: record.plannedDate ? formatDate(record.plannedDate) : null,
    actualDate: record.actualDate ? formatDate(record.actualDate) : null,
    participants: record.participants,
    conclusion: record.conclusion,
    disagreements: record.disagreements,
    nextStep: record.nextStep,
    notes: record.notes,
    skipReason: record.skipReason,
    backfilled: Boolean(record.backfilled),
    recordSource: record.backfilled ? RecordSource.BACKFILLED : RecordSource.DIRECT,
    actionItemCount,
    isOverdue: Boolean(record.plannedDate)
      && record.plannedDate < today
      && !isTerminalNode({ nodeKey, status }),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function toHistoryResponse(record: any): MarriageNodeHistoryResponse {
  return {
    id: record.id,
    nodeId: record.nodeId,
    eventType: record.eventType,
    fromStatus: record.fromStatus as MarriageNodeStatus | null,
    toStatus: record.toStatus as MarriageNodeStatus | null,
    fromPlannedDate: record.fromPlannedDate ? formatDate(record.fromPlannedDate) : null,
    toPlannedDate: record.toPlannedDate ? formatDate(record.toPlannedDate) : null,
    fromActualDate: record.fromActualDate ? formatDate(record.fromActualDate) : null,
    toActualDate: record.toActualDate ? formatDate(record.toActualDate) : null,
    reason: record.reason,
    createdAt: record.createdAt.toISOString(),
  }
}

function orderedNodes(records: any[]) {
  return [...records].sort((left, right) => MARRIAGE_NODE_ORDER.indexOf(left.nodeKey) - MARRIAGE_NODE_ORDER.indexOf(right.nodeKey))
}

function getNode(records: any[], nodeKey: MarriageNodeKey) {
  return records.find((record) => record.nodeKey === nodeKey)
}

function deriveMarriageState(process: any, nodes: MarriageNodeResponse[], agreements: AgreementTopicResponse[]) {
  const byKey = new Map(nodes.map((node) => [node.nodeKey, node]))
  const terminalNodes = nodes.filter((node) => isTerminalNode(node))
  const completed = terminalNodes.length
  const percentage = MARRIAGE_NODE_ORDER.length === 0 ? 0 : roundPercentage(decimalValue(completed).div(MARRIAGE_NODE_ORDER.length).mul(100))
  const outOfOrder = MARRIAGE_NODE_ORDER.some((key, index) => {
    const current = byKey.get(key)
    if (!current || isTerminalNode(current)) return false
    return MARRIAGE_NODE_ORDER.slice(index + 1).some((laterKey) => {
      const later = byKey.get(laterKey)
      return Boolean(later && isTerminalNode(later))
    })
  })

  let recommendedNext: MarriageNodeKey | null = null
  const intention = byKey.get(MarriageNodeKey.INTENTION)
  const maleVisit = byKey.get(MarriageNodeKey.MALE_VISIT)
  const femaleVisit = byKey.get(MarriageNodeKey.FEMALE_VISIT)
  if (intention && !isTerminalNode(intention)) recommendedNext = MarriageNodeKey.INTENTION
  else if (maleVisit && femaleVisit && (!isTerminalNode(maleVisit) || !isTerminalNode(femaleVisit))) {
    const preferred = process.visitOrder === VisitOrder.FEMALE_FIRST
      ? [femaleVisit, maleVisit]
      : [maleVisit, femaleVisit]
    recommendedNext = preferred.find((node) => !isTerminalNode(node))?.nodeKey ?? null
  } else {
    for (const key of MARRIAGE_NODE_ORDER.slice(3)) {
      const node = byKey.get(key)
      if (node && !isTerminalNode(node)) {
        recommendedNext = key
        break
      }
    }
  }

  let currentStage: MarriageNodeKey | null = null
  for (const key of MARRIAGE_NODE_ORDER) {
    const node = byKey.get(key)
    if (node && !isTerminalNode(node)) {
      currentStage = key
      break
    }
  }
  if (!currentStage && completed < MARRIAGE_NODE_ORDER.length) currentStage = recommendedNext

  const warnings: MarriageProcessResponse['warnings'] = []
  const addWarning = (code: string, level: 'info' | 'warning' | 'risk', message: string, nodeKey?: MarriageNodeKey, agreementId?: string) => {
    warnings.push({ code, level, message, ...(nodeKey ? { nodeKey } : {}), ...(agreementId ? { agreementId } : {}) })
  }

  if (maleVisit && !isTerminalNode(maleVisit)) addWarning('MISSING_MALE_VISIT', 'warning', '男方上门尚未完成，请记录安排或实际结果。', MarriageNodeKey.MALE_VISIT)
  if (femaleVisit && !isTerminalNode(femaleVisit)) addWarning('MISSING_FEMALE_VISIT', 'warning', '女方上门尚未完成，请记录安排或实际结果。', MarriageNodeKey.FEMALE_VISIT)
  const parentsMeeting = byKey.get(MarriageNodeKey.PARENTS_MEETING)
  if (parentsMeeting?.status === MarriageNodeStatus.COMPLETED && (parentsMeeting.disagreements || !parentsMeeting.nextStep)) {
    addWarning('PARENTS_MEETING_FOLLOW_UP', 'warning', '双方父母见面已记录，请继续处理分歧或补充下一步。', MarriageNodeKey.PARENTS_MEETING)
  }
  for (const agreement of agreements) {
    if (agreement.status === AgreementStatus.NEEDS_DISCUSSION || agreement.status === AgreementStatus.NOT_DISCUSSED) {
      addWarning(
        agreement.status === AgreementStatus.NEEDS_DISCUSSION ? 'AGREEMENT_NEEDS_DISCUSSION' : 'AGREEMENT_NOT_DISCUSSED',
        agreement.status === AgreementStatus.NEEDS_DISCUSSION ? 'risk' : 'warning',
        `共识议题“${agreement.title}”${AgreementStatusLabels[agreement.status]}。`,
        MarriageNodeKey.AGREEMENT,
        agreement.id,
      )
    }
  }
  for (const node of nodes) {
    if (node.isOverdue) addWarning('NODE_OVERDUE', 'risk', `${MarriageNodeKeyLabels[node.nodeKey]}的计划日期已过，但尚未记录完成。`, node.nodeKey)
  }
  const registration = byKey.get(MarriageNodeKey.REGISTRATION)
  const wedding = byKey.get(MarriageNodeKey.WEDDING)
  if (registration && !registration.plannedDate && !isTerminalNode(registration)) addWarning('REGISTRATION_DATE_MISSING', 'info', '还没有设置依法办理结婚登记的计划日期。', MarriageNodeKey.REGISTRATION)
  if (wedding && !wedding.plannedDate && !isTerminalNode(wedding)) addWarning('WEDDING_DATE_MISSING', 'info', '还没有设置婚礼计划日期。', MarriageNodeKey.WEDDING)

  return {
    currentStage,
    recommendedNext,
    outOfOrder,
    progress: { completed, total: MARRIAGE_NODE_ORDER.length, percentage },
    warnings,
  }
}

function prismaErrorCode(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : undefined
}

function safePagination(value: unknown, minimum: number) {
  if (value === undefined || value === null || value === '') return undefined
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= minimum ? number : undefined
}

function pagination(query: Pick<WeddingTaskQueryParams, 'limit' | 'offset'>) {
  const limit = safePagination(query.limit, 1)
  const offset = safePagination(query.offset, 0)
  return {
    ...(limit === undefined ? {} : { take: limit }),
    ...(offset === undefined ? {} : { skip: offset }),
  }
}

function toTaskResponse(record: any): WeddingTaskResponse {
  const response: WeddingTaskResponse = {
    id: record.id,
    userId: record.userId,
    taskName: record.taskName,
    category: record.category as WeddingTaskCategory,
    plannedDate: record.plannedDate ? formatDate(record.plannedDate) : null,
    completedDate: record.completedDate ? formatDate(record.completedDate) : null,
    status: record.status as TaskStatus,
    priority: record.priority,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
  if (record.processId !== undefined) response.processId = record.processId
  if (record.stageKey !== undefined) response.stageKey = record.stageKey as MarriageNodeKey | null
  if (record.ownerRole !== undefined) response.ownerRole = (record.ownerRole ?? ActionOwnerRole.BOTH) as ActionOwnerRole
  if (record.completionCriteria !== undefined) response.completionCriteria = record.completionCriteria
  return response
}

function toExpenseResponse(record: any): WeddingExpenseResponse {
  return {
    id: record.id,
    userId: record.userId,
    taskId: record.taskId,
    task: record.task
      ? { id: record.task.id, taskName: record.task.taskName }
      : null,
    date: formatDate(record.date),
    itemName: record.itemName,
    category: record.category as WeddingTaskCategory,
    plannedAmount: numberValue(record.plannedAmount),
    actualAmount: numberValue(record.actualAmount),
    paidStatus: record.paidStatus as PaidStatus,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function toBudgetResponse(record: any): WeddingBudgetResponse {
  return {
    id: record.id,
    totalBudget: numberValue(record.totalBudget),
    weddingDate: formatDate(record.weddingDate),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function signedDayDiff(from: Date, to: Date) {
  const fromUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  const toUtc = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())
  return Math.round((toUtc - fromUtc) / 86_400_000)
}

function taskStatusMachine(currentStatus: TaskStatus, nextStatus: TaskStatus, currentCompletedDate: Date | null, today: Date) {
  if (currentStatus !== TaskStatus.COMPLETED && nextStatus === TaskStatus.COMPLETED) {
    return today
  }
  if (currentStatus === TaskStatus.COMPLETED && nextStatus === TaskStatus.COMPLETED) {
    return currentCompletedDate
  }
  if (currentStatus === TaskStatus.COMPLETED && nextStatus !== TaskStatus.COMPLETED) {
    return null
  }
  return currentCompletedDate
}

function expenseDateFilter(query: Pick<WeddingExpenseQueryParams, 'startDate' | 'endDate'>) {
  const date: { gte?: Date; lte?: Date } = {}
  if (query.startDate) date.gte = utcDate(query.startDate)
  if (query.endDate) date.lte = utcDate(query.endDate)
  return Object.keys(date).length ? date : undefined
}

function buildMarriageProcessResponse(record: any, today: Date): MarriageProcessResponse {
  const tasksByStage = new Map<string, number>()
  for (const task of record.tasks ?? []) {
    if (task.stageKey) tasksByStage.set(task.stageKey, (tasksByStage.get(task.stageKey) ?? 0) + 1)
  }
  const nodes = orderedNodes(record.nodes ?? []).map((node) => toNodeResponse(node, tasksByStage.get(node.nodeKey) ?? 0, today))
  const agreements = (record.agreements ?? []).map(toAgreementResponse)
  const derived = deriveMarriageState(record, nodes, agreements)
  return {
    id: record.id,
    recorderRole: record.recorderRole as MarriageRecorderRole,
    visitOrder: record.visitOrder as VisitOrder,
    marriageOrder: record.marriageOrder as MarriageOrder,
    engagementMode: record.engagementMode as EngagementMode,
    nodes,
    agreements,
    ...derived,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function processInclude() {
  return {
    nodes: { orderBy: { createdAt: 'asc' } },
    agreements: { where: { archivedAt: null }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
    tasks: { select: { stageKey: true } },
  }
}

export class WeddingService {
  private async findProcess(userId: string) {
    if (!hasMarriageDelegate()) return null
    return (prisma as any).marriageProcess.findUnique({ where: { userId }, include: processInclude() })
  }

  private async requireProcess(userId: string) {
    const process = await this.findProcess(userId)
    if (!process) throw new WeddingNotFoundError('婚姻进程不存在')
    return process
  }

  async getMarriageProcess(userId: string): Promise<MarriageProcessResponse | null> {
    const process = await this.findProcess(userId)
    return process ? buildMarriageProcessResponse(process, utcToday()) : null
  }

  async ensureMarriageProcess(userId: string, data: PutMarriageProcessRequest): Promise<MarriageProcessResponse> {
    if (!hasMarriageDelegate()) throw new WeddingValidationError('婚姻进程数据表尚未就绪')
    const existing = await this.findProcess(userId)
    if (existing) return buildMarriageProcessResponse(existing, utcToday())

    const createData = {
      userId,
      recorderRole: data.recorderRole,
      visitOrder: data.visitOrder ?? VisitOrder.MALE_FIRST,
      marriageOrder: data.marriageOrder ?? MarriageOrder.REGISTRATION_FIRST,
      engagementMode: data.engagementMode ?? EngagementMode.UNDECIDED,
    }
    try {
      await (prisma as any).$transaction(async (tx: any) => {
        const process = await tx.marriageProcess.create({ data: createData })
        const budget = await tx.weddingBudget.findUnique({ where: { userId }, select: { weddingDate: true } })
        await tx.marriageNode.createMany({
          data: MARRIAGE_NODE_ORDER.map((nodeKey) => ({
            processId: process.id,
            nodeKey,
            ...(nodeKey === MarriageNodeKey.WEDDING && budget ? { plannedDate: budget.weddingDate } : {}),
          })),
        })
        await tx.agreementTopic.createMany({
          data: DEFAULT_AGREEMENT_TITLES.map((title, sortOrder) => ({ processId: process.id, title, sortOrder })),
        })
        await tx.weddingTask.updateMany({
          where: { userId, processId: null },
          data: { processId: process.id, stageKey: MarriageNodeKey.WEDDING, ownerRole: ActionOwnerRole.BOTH },
        })
      })
    } catch (error) {
      if (prismaErrorCode(error) !== 'P2002') throw error
    }
    const process = await this.requireProcess(userId)
    return buildMarriageProcessResponse(process, utcToday())
  }

  async updateMarriageSettings(userId: string, data: UpdateMarriageSettingsRequest): Promise<MarriageProcessResponse> {
    const process = await this.requireProcess(userId)
    const nodes = process.nodes ?? []
    if (data.visitOrder !== undefined && data.visitOrder !== process.visitOrder) {
      const visitCompleted = nodes.some((node: any) => [MarriageNodeKey.MALE_VISIT, MarriageNodeKey.FEMALE_VISIT].includes(node.nodeKey) && node.status === MarriageNodeStatus.COMPLETED)
      if (visitCompleted) throw new WeddingValidationError('已有上门记录后不能覆盖事实顺序，只能调整未完成节点的计划日期')
    }
    if (data.marriageOrder !== undefined && data.marriageOrder !== process.marriageOrder) {
      const marriageFactRecorded = nodes.some((node: any) => [MarriageNodeKey.REGISTRATION, MarriageNodeKey.WEDDING].includes(node.nodeKey) && isTerminalNode(node))
      if (marriageFactRecorded) throw new WeddingValidationError('领证或婚礼已有事实记录后不能覆盖历史顺序')
    }
    if (data.engagementMode !== undefined && data.engagementMode !== process.engagementMode) {
      const engagement = getNode(nodes, MarriageNodeKey.ENGAGEMENT)
      if (engagement && isTerminalNode(engagement)) throw new WeddingValidationError('订婚节点已有事实记录后不能直接改变选择')
    }
    await (prisma as any).marriageProcess.update({ where: { id: process.id }, data })
    const updated = await this.requireProcess(userId)
    return buildMarriageProcessResponse(updated, utcToday())
  }

  async getMarriageNodes(userId: string): Promise<MarriageNodeResponse[]> {
    const process = await this.requireProcess(userId)
    return buildMarriageProcessResponse(process, utcToday()).nodes
  }

  async updateMarriageNode(userId: string, nodeKey: MarriageNodeKey, data: UpdateMarriageNodeRequest): Promise<MarriageNodeResponse> {
    const process = await this.requireProcess(userId)
    const existing = getNode(process.nodes ?? [], nodeKey)
    if (!existing) throw new WeddingNotFoundError('婚姻进程节点不存在')
    const nextStatus = data.status ?? existing.status as MarriageNodeStatus
    if (nextStatus === MarriageNodeStatus.SKIPPED && nodeKey !== MarriageNodeKey.ENGAGEMENT) {
      throw new WeddingValidationError('只有订婚节点可以跳过')
    }
    const actualDate = data.actualDate === undefined
      ? existing.actualDate
      : data.actualDate === null ? null : utcDate(data.actualDate)
    if (nextStatus === MarriageNodeStatus.COMPLETED && existing.status !== MarriageNodeStatus.COMPLETED && !actualDate) {
      throw new WeddingValidationError('节点标记为已完成时必须提供实际日期')
    }
    if (existing.status === MarriageNodeStatus.COMPLETED && nextStatus === MarriageNodeStatus.COMPLETED && data.actualDate !== undefined && data.actualDate !== (existing.actualDate ? formatDate(existing.actualDate) : null)) {
      throw new WeddingValidationError('已完成节点的实际日期不能通过普通编辑覆盖')
    }
    if (existing.status === MarriageNodeStatus.COMPLETED && nextStatus !== MarriageNodeStatus.COMPLETED && data.actualDate !== undefined && data.actualDate !== (existing.actualDate ? formatDate(existing.actualDate) : null)) {
      throw new WeddingValidationError('重新打开节点时仍保留历史实际日期')
    }
    if (nodeKey === MarriageNodeKey.PARENTS_MEETING && nextStatus === MarriageNodeStatus.COMPLETED) {
      const visitsComplete = [MarriageNodeKey.MALE_VISIT, MarriageNodeKey.FEMALE_VISIT].every((key) => {
        const node = getNode(process.nodes ?? [], key)
        return node?.status === MarriageNodeStatus.COMPLETED
      })
      if (!visitsComplete && !data.backfilled && !existing.backfilled) {
        throw new WeddingValidationError('两次上门尚未都完成时补录父母见面，必须明确标记为用户补录')
      }
    }
    const updateData: Record<string, unknown> = {
      ...(data.status !== undefined ? { status: nextStatus } : {}),
      ...(data.plannedDate !== undefined ? { plannedDate: data.plannedDate === null ? null : utcDate(data.plannedDate) } : {}),
      ...(data.actualDate !== undefined && !(existing.status === MarriageNodeStatus.COMPLETED && nextStatus !== MarriageNodeStatus.COMPLETED) ? { actualDate } : {}),
      ...(data.participants !== undefined ? { participants: nullableText(data.participants) } : {}),
      ...(data.conclusion !== undefined ? { conclusion: nullableText(data.conclusion) } : {}),
      ...(data.disagreements !== undefined ? { disagreements: nullableText(data.disagreements) } : {}),
      ...(data.nextStep !== undefined ? { nextStep: nullableText(data.nextStep) } : {}),
      ...(data.notes !== undefined ? { notes: nullableText(data.notes) } : {}),
      ...(data.skipReason !== undefined ? { skipReason: nullableText(data.skipReason) } : {}),
      ...(data.backfilled !== undefined ? { backfilled: data.backfilled } : {}),
    }
    if (nextStatus === MarriageNodeStatus.SKIPPED) {
      updateData.actualDate = null
      updateData.backfilled = false
    }
    if (nodeKey === MarriageNodeKey.WEDDING && data.plannedDate === null) {
      const budget = await prisma.weddingBudget.findUnique({ where: { userId }, select: { weddingDate: true } })
      if (budget) throw new WeddingValidationError('已有预算时不能清空婚礼计划日期，请通过预算设置修改')
    }
    const hasChange = Object.keys(updateData).some((key) => {
      const oldValue = existing[key]
      const newValue = updateData[key]
      if (oldValue instanceof Date && newValue instanceof Date) return oldValue.getTime() !== newValue.getTime()
      return oldValue !== newValue
    })
    await (prisma as any).$transaction(async (tx: any) => {
      await tx.marriageNode.update({ where: { id: existing.id }, data: updateData })
      if (hasChange) {
        await tx.marriageNodeHistory.create({
          data: {
            processId: process.id,
            nodeId: existing.id,
            eventType: existing.status === MarriageNodeStatus.COMPLETED && nextStatus !== MarriageNodeStatus.COMPLETED ? 'reopened' : 'updated',
            fromStatus: existing.status,
            toStatus: nextStatus,
            fromPlannedDate: existing.plannedDate,
            toPlannedDate: data.plannedDate === undefined ? existing.plannedDate : data.plannedDate ? utcDate(data.plannedDate) : null,
            fromActualDate: existing.actualDate,
            toActualDate: nextStatus === MarriageNodeStatus.SKIPPED ? null : (existing.status === MarriageNodeStatus.COMPLETED && nextStatus !== MarriageNodeStatus.COMPLETED ? existing.actualDate : actualDate),
            reason: nullableText(data.reason) ?? null,
          },
        })
      }
      if (nodeKey === MarriageNodeKey.WEDDING && data.plannedDate) {
        await tx.weddingBudget.updateMany({ where: { userId }, data: { weddingDate: data.plannedDate ? utcDate(data.plannedDate) : null } })
      }
      if (nodeKey === MarriageNodeKey.ENGAGEMENT && nextStatus === MarriageNodeStatus.SKIPPED) {
        await tx.marriageProcess.update({ where: { id: process.id }, data: { engagementMode: EngagementMode.SKIP } })
      }
    })
    const updatedProcess = await this.requireProcess(userId)
    const updatedNode = getNode(updatedProcess.nodes ?? [], nodeKey)
    if (!updatedNode) throw new WeddingNotFoundError('婚姻进程节点不存在')
    return toNodeResponse(updatedNode, (updatedProcess.tasks ?? []).filter((task: any) => task.stageKey === nodeKey).length, utcToday())
  }

  async getMarriageNodeHistory(userId: string, nodeKey: MarriageNodeKey): Promise<MarriageNodeHistoryResponse[]> {
    const process = await this.requireProcess(userId)
    const node = getNode(process.nodes ?? [], nodeKey)
    if (!node) throw new WeddingNotFoundError('婚姻进程节点不存在')
    const histories = await (prisma as any).marriageNodeHistory.findMany({ where: { processId: process.id, nodeId: node.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })
    return histories.map(toHistoryResponse)
  }

  async getAgreements(userId: string): Promise<AgreementTopicResponse[]> {
    const process = await this.requireProcess(userId)
    const records = await (prisma as any).agreementTopic.findMany({ where: { processId: process.id, archivedAt: null }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
    return records.map(toAgreementResponse)
  }

  async createAgreement(userId: string, data: CreateAgreementTopicRequest): Promise<AgreementTopicResponse> {
    const process = await this.requireProcess(userId)
    const record = await (prisma as any).agreementTopic.create({ data: { processId: process.id, title: data.title.trim(), status: data.status ?? AgreementStatus.NOT_DISCUSSED, notes: nullableText(data.notes) ?? null, sortOrder: data.sortOrder ?? 0 } })
    return toAgreementResponse(record)
  }

  async updateAgreement(userId: string, id: string, data: UpdateAgreementTopicRequest): Promise<AgreementTopicResponse> {
    const process = await this.requireProcess(userId)
    const existing = await (prisma as any).agreementTopic.findFirst({ where: { id, processId: process.id, archivedAt: null } })
    if (!existing) throw new WeddingNotFoundError('共识议题不存在')
    const updateData = {
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.notes !== undefined ? { notes: nullableText(data.notes) } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    }
    const record = await (prisma as any).agreementTopic.update({ where: { id: existing.id }, data: updateData })
    return toAgreementResponse(record)
  }

  async archiveAgreement(userId: string, id: string): Promise<void> {
    const process = await this.requireProcess(userId)
    const result = await (prisma as any).agreementTopic.updateMany({ where: { id, processId: process.id, archivedAt: null }, data: { archivedAt: new Date() } })
    if (result.count === 0) throw new WeddingNotFoundError('共识议题不存在')
  }

  async getTasks(userId: string, query: WeddingTaskQueryParams): Promise<WeddingTaskResponse[]> {
    const records = await prisma.weddingTask.findMany({
      where: {
        userId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.processId ? { processId: query.processId } : {}),
        ...(query.stageKey ? { stageKey: query.stageKey } : {}),
      },
      orderBy: [{ priority: 'desc' }, { plannedDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      ...pagination(query),
    })
    return records.map(toTaskResponse)
  }

  async createTask(userId: string, data: CreateWeddingTaskRequest): Promise<WeddingTaskResponse> {
    const status = data.status ?? TaskStatus.PENDING
    const category = data.category ?? WeddingTaskCategory.OTHER
    if (data.processId) {
      const process = await (prisma as any).marriageProcess?.findFirst({ where: { id: data.processId, userId } })
      if (!process) throw new WeddingNotFoundError('婚姻进程不存在')
    }
    const ownerRole = data.ownerRole ?? ActionOwnerRole.BOTH
    const record = await prisma.weddingTask.create({
      data: {
        userId,
        taskName: data.taskName.trim(),
        category,
        plannedDate: data.plannedDate ? utcDate(data.plannedDate) : null,
        ...(status === TaskStatus.COMPLETED ? { completedDate: utcToday() } : {}),
        status,
        priority: data.priority ?? 3,
        notes: data.notes === undefined || data.notes === null ? null : data.notes.trim() || null,
        processId: data.processId ?? null,
        stageKey: data.stageKey ?? MarriageNodeKey.WEDDING,
        ownerRole,
        completionCriteria: nullableText(data.completionCriteria) ?? null,
      },
    })
    return toTaskResponse(record)
  }

  async updateTask(userId: string, id: string, data: UpdateWeddingTaskRequest): Promise<WeddingTaskResponse> {
    try {
      const existing = await prisma.weddingTask.findFirst({ where: { id, userId } })
      if (!existing) throw new WeddingNotFoundError('备婚任务不存在')

      const updateData: Record<string, unknown> = {}
      if (data.taskName !== undefined) updateData.taskName = data.taskName.trim()
      if (data.category !== undefined) updateData.category = data.category
      if (data.plannedDate !== undefined) updateData.plannedDate = data.plannedDate ? utcDate(data.plannedDate) : null
      if (data.priority !== undefined) updateData.priority = data.priority
      if (data.notes !== undefined) updateData.notes = data.notes === null ? null : data.notes.trim() || null
      if (data.processId !== undefined) updateData.processId = data.processId
      if (data.stageKey !== undefined) updateData.stageKey = data.stageKey
      if (data.ownerRole !== undefined) updateData.ownerRole = data.ownerRole
      if (data.completionCriteria !== undefined) updateData.completionCriteria = nullableText(data.completionCriteria)
      if (data.processId) {
        const process = await (prisma as any).marriageProcess?.findFirst({ where: { id: data.processId, userId } })
        if (!process) throw new WeddingNotFoundError('婚姻进程不存在')
      }
      if (data.status !== undefined) {
        const currentStatus = existing.status as TaskStatus
        const nextStatus = data.status
        updateData.status = nextStatus
        updateData.completedDate = taskStatusMachine(
          currentStatus,
          nextStatus,
          existing.completedDate,
          utcToday(),
        )
      }

      const record = await prisma.weddingTask.update({ where: { id }, data: updateData })
      return toTaskResponse(record)
    } catch (error) {
      if (error instanceof WeddingNotFoundError) throw error
      if (prismaErrorCode(error) === 'P2025') throw new WeddingNotFoundError('备婚任务不存在')
      throw error
    }
  }

  async deleteTask(userId: string, id: string): Promise<void> {
    const result = await prisma.weddingTask.deleteMany({ where: { id, userId } })
    if (result.count === 0) throw new WeddingNotFoundError('备婚任务不存在')
  }

  async getExpenses(userId: string, query: WeddingExpenseQueryParams): Promise<WeddingExpenseResponse[]> {
    const date = expenseDateFilter(query)
    const records = await prisma.weddingExpense.findMany({
      where: {
        userId,
        ...(date ? { date } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.paidStatus ? { paidStatus: query.paidStatus } : {}),
      },
      include: { task: { select: { id: true, taskName: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      ...pagination(query),
    })
    return records.map(toExpenseResponse)
  }

  async createExpense(userId: string, data: CreateWeddingExpenseRequest): Promise<WeddingExpenseResponse> {
    if (data.taskId !== undefined && data.taskId !== null) {
      const task = await prisma.weddingTask.findFirst({ where: { id: data.taskId, userId } })
      if (!task) throw new WeddingNotFoundError('备婚任务不存在')
    }
    const record = await prisma.weddingExpense.create({
      data: {
        userId,
        taskId: data.taskId ?? null,
        date: utcDate(data.date),
        itemName: data.itemName.trim(),
        category: data.category,
        plannedAmount: decimalValue(data.plannedAmount),
        actualAmount: decimalValue(data.actualAmount),
        paidStatus: data.paidStatus,
        notes: data.notes === undefined || data.notes === null ? null : data.notes.trim() || null,
      },
      include: { task: { select: { id: true, taskName: true } } },
    })
    return toExpenseResponse(record)
  }

  async updateExpense(userId: string, id: string, data: UpdateWeddingExpenseRequest): Promise<WeddingExpenseResponse> {
    try {
      const existing = await prisma.weddingExpense.findFirst({ where: { id, userId } })
      if (!existing) throw new WeddingNotFoundError('备婚花费不存在')

      const updateData: Record<string, unknown> = {}
      if (data.taskId !== undefined) {
        if (data.taskId !== null) {
          const task = await prisma.weddingTask.findFirst({ where: { id: data.taskId, userId } })
          if (!task) throw new WeddingNotFoundError('备婚任务不存在')
        }
        updateData.taskId = data.taskId
      }
      if (data.date !== undefined) updateData.date = utcDate(data.date)
      if (data.itemName !== undefined) updateData.itemName = data.itemName.trim()
      if (data.category !== undefined) updateData.category = data.category
      if (data.plannedAmount !== undefined) updateData.plannedAmount = decimalValue(data.plannedAmount)
      if (data.actualAmount !== undefined) updateData.actualAmount = decimalValue(data.actualAmount)
      if (data.paidStatus !== undefined) updateData.paidStatus = data.paidStatus
      if (data.notes !== undefined) updateData.notes = data.notes === null ? null : data.notes.trim() || null

      const record = await prisma.weddingExpense.update({
        where: { id },
        data: updateData,
        include: { task: { select: { id: true, taskName: true } } },
      })
      return toExpenseResponse(record)
    } catch (error) {
      if (error instanceof WeddingNotFoundError) throw error
      if (prismaErrorCode(error) === 'P2025' || prismaErrorCode(error) === 'P2003') {
        throw new WeddingNotFoundError('备婚花费不存在')
      }
      throw error
    }
  }

  async deleteExpense(userId: string, id: string): Promise<void> {
    const result = await prisma.weddingExpense.deleteMany({ where: { id, userId } })
    if (result.count === 0) throw new WeddingNotFoundError('备婚花费不存在')
  }

  async getBudget(userId: string): Promise<WeddingBudgetResponse | null> {
    const record = await prisma.weddingBudget.findUnique({ where: { userId } })
    return record ? toBudgetResponse(record) : null
  }

  async upsertBudget(userId: string, data: UpsertWeddingBudgetRequest): Promise<WeddingBudgetResponse> {
    const weddingDate = utcDate(data.weddingDate)
    const record = hasMarriageDelegate()
      ? await (prisma as any).$transaction(async (tx: any) => {
        const budget = await tx.weddingBudget.upsert({
          where: { userId },
          create: { userId, totalBudget: decimalValue(data.totalBudget), weddingDate },
          update: { totalBudget: decimalValue(data.totalBudget), weddingDate },
        })
        const process = await tx.marriageProcess.findUnique({ where: { userId }, select: { id: true } })
        if (process) {
          await tx.marriageNode.updateMany({ where: { processId: process.id, nodeKey: MarriageNodeKey.WEDDING }, data: { plannedDate: weddingDate } })
        }
        return budget
      })
      : await prisma.weddingBudget.upsert({
        where: { userId },
        create: { userId, totalBudget: decimalValue(data.totalBudget), weddingDate },
        update: { totalBudget: decimalValue(data.totalBudget), weddingDate },
      })
    return toBudgetResponse(record)
  }

  async getOverview(userId: string): Promise<WeddingOverviewResponse> {
    const [budgetRecord, expenses, taskGroups, processRecord] = await Promise.all([
      prisma.weddingBudget.findUnique({ where: { userId } }),
      prisma.weddingExpense.findMany({ where: { userId } }),
      prisma.weddingTask.groupBy({
        by: ['status'],
        where: { userId },
        _count: { _all: true },
      }),
      this.findProcess(userId),
    ])

    let plannedExpenseTotal = decimalValue(0)
    let actualExpenseTotal = decimalValue(0)
    const categoryAmounts = new Map<WeddingTaskCategory, { planned: Prisma.Decimal; actual: Prisma.Decimal; count: number }>()
    for (const category of Object.values(WeddingTaskCategory)) {
      categoryAmounts.set(category, { planned: decimalValue(0), actual: decimalValue(0), count: 0 })
    }

    for (const record of expenses) {
      const planned = decimalValue(record.plannedAmount)
      const actual = decimalValue(record.actualAmount)
      plannedExpenseTotal = plannedExpenseTotal.add(planned)
      actualExpenseTotal = actualExpenseTotal.add(actual)
      const item = categoryAmounts.get(record.category as WeddingTaskCategory)
      if (item) {
        item.planned = item.planned.add(planned)
        item.actual = item.actual.add(actual)
        item.count += 1
      }
    }

    const counts: Record<TaskStatus, number> = {
      [TaskStatus.PENDING]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.COMPLETED]: 0,
      [TaskStatus.CANCELLED]: 0,
    }
    for (const group of taskGroups) {
      const status = group.status as TaskStatus
      if (status in counts) counts[status] = group._count._all
    }
    const activeTotal = counts[TaskStatus.PENDING] + counts[TaskStatus.IN_PROGRESS] + counts[TaskStatus.COMPLETED]
    const taskCompletionPercentage = activeTotal === 0
      ? 0
      : roundPercentage(decimalValue(counts[TaskStatus.COMPLETED]).div(activeTotal).mul(100))

    const categoryBreakdown = Object.values(WeddingTaskCategory).map((category) => {
      const item = categoryAmounts.get(category)!
      return {
        category,
        plannedAmount: item.planned.toNumber(),
        actualAmount: item.actual.toNumber(),
        expenseCount: item.count,
        actualPercentage: actualExpenseTotal.eq(0)
          ? 0
          : roundPercentage(item.actual.div(actualExpenseTotal).mul(100)),
      }
    })

    const hasBudget = budgetRecord !== null
    const totalBudget = budgetRecord ? decimalValue(budgetRecord.totalBudget) : null
    const daysUntilWedding = budgetRecord
      ? signedDayDiff(utcToday(), budgetRecord.weddingDate)
      : null

    const response: WeddingOverviewResponse = {
      budget: budgetRecord ? toBudgetResponse(budgetRecord) : null,
      plannedExpenseTotal: plannedExpenseTotal.toNumber(),
      actualExpenseTotal: actualExpenseTotal.toNumber(),
      expenseCount: expenses.length,
      remainingBudget: totalBudget ? totalBudget.sub(actualExpenseTotal).toNumber() : null,
      budgetUsedPercentage: hasBudget && totalBudget && totalBudget.gt(0)
        ? roundPercentage(actualExpenseTotal.div(totalBudget).mul(100))
        : null,
      plannedBudgetPercentage: hasBudget && totalBudget && totalBudget.gt(0)
        ? roundPercentage(plannedExpenseTotal.div(totalBudget).mul(100))
        : null,
      actualVsPlannedPercentage: plannedExpenseTotal.gt(0)
        ? roundPercentage(actualExpenseTotal.div(plannedExpenseTotal).mul(100))
        : null,
      daysUntilWedding,
      taskCounts: {
        pending: counts[TaskStatus.PENDING],
        inProgress: counts[TaskStatus.IN_PROGRESS],
        completed: counts[TaskStatus.COMPLETED],
        cancelled: counts[TaskStatus.CANCELLED],
        activeTotal,
        completionPercentage: taskCompletionPercentage,
      },
      categoryBreakdown,
    }
    if (processRecord) {
      const process = buildMarriageProcessResponse(processRecord, utcToday())
      const registration = process.nodes.find((node) => node.nodeKey === MarriageNodeKey.REGISTRATION)
      const wedding = process.nodes.find((node) => node.nodeKey === MarriageNodeKey.WEDDING)
      const marriage: MarriageOverviewSummary = {
        processId: process.id,
        currentStage: process.currentStage,
        recommendedNext: process.recommendedNext,
        progress: process.progress,
        warnings: process.warnings,
        registrationDate: registration?.actualDate ?? null,
        weddingDate: wedding?.plannedDate ?? null,
        registrationCompleted: registration?.status === MarriageNodeStatus.COMPLETED,
        weddingCompleted: wedding?.status === MarriageNodeStatus.COMPLETED,
        marriageStageCompleted: registration?.status === MarriageNodeStatus.COMPLETED && wedding?.status === MarriageNodeStatus.COMPLETED,
        visitOrder: process.visitOrder,
        marriageOrder: process.marriageOrder,
        engagementMode: process.engagementMode,
      }
      response.marriage = marriage
    } else {
      response.marriage = null
    }
    return response
  }

  async getTimeline(userId: string): Promise<WeddingTimelineResponse> {
    const [budgetRecord, tasks, processRecord] = await Promise.all([
      prisma.weddingBudget.findUnique({ where: { userId } }),
      prisma.weddingTask.findMany({
        where: {
          userId,
          status: { not: TaskStatus.CANCELLED },
          plannedDate: { not: null },
        },
        orderBy: [{ plannedDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      }),
      this.findProcess(userId),
    ])

    const today = utcToday()
    const items = tasks.map((record) => ({
      taskId: record.id,
      taskName: record.taskName,
      category: record.category as WeddingTaskCategory,
      status: record.status as TaskStatus,
      priority: record.priority,
      plannedDate: formatDate(record.plannedDate!),
      completedDate: record.completedDate ? formatDate(record.completedDate) : null,
      isOverdue: record.status !== TaskStatus.COMPLETED && record.plannedDate! < today,
    }))

    const response: WeddingTimelineResponse = {
      weddingDate: budgetRecord ? formatDate(budgetRecord.weddingDate) : null,
      daysUntilWedding: budgetRecord ? signedDayDiff(today, budgetRecord.weddingDate) : null,
      items,
    }
    if (processRecord) {
      const process = buildMarriageProcessResponse(processRecord, today)
      response.marriageNodes = process.nodes
        .filter((node) => node.plannedDate || node.actualDate)
        .map((node): WeddingTimelineNodeItem => ({
          nodeId: node.id,
          nodeKey: node.nodeKey,
          nodeName: MarriageNodeKeyLabels[node.nodeKey],
          status: node.status,
          plannedDate: node.plannedDate,
          actualDate: node.actualDate,
          isOverdue: node.isOverdue,
          backfilled: node.backfilled,
        }))
        .sort((left, right) => (left.actualDate ?? left.plannedDate ?? '').localeCompare(right.actualDate ?? right.plannedDate ?? ''))
    }
    return response
  }
}

export default new WeddingService()
