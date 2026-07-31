import { Prisma } from '@prisma/client'
import {
  CreateExamRequest,
  CreateStudyCheckinRequest,
  CreateStudySubjectRequest,
  ExamCountdownResponse,
  LearningProgressResponse,
  LearningQueryParams,
  StudyCheckinResponse,
  StudySubjectResponse,
  UpdateExamRequest,
  UpdateStudySubjectRequest,
} from '@xiaowoniu/shared'
import prisma from '../config/database'

export class LearningNotFoundError extends Error {
  constructor(message = '学习资源不存在') {
    super(message)
    this.name = 'LearningNotFoundError'
  }
}

export class LearningConflictError extends Error {
  constructor(message = '学习资源存在冲突') {
    super(message)
    this.name = 'LearningConflictError'
  }
}

export const utcDate = (value: string) => new Date(`${value}T00:00:00.000Z`)
export const formatDate = (value: Date) => value.toISOString().slice(0, 10)
const numberValue = (value: Prisma.Decimal | number) => typeof value === 'number' ? value : value.toNumber()
const roundHours = (value: number) => Math.round(value * 100) / 100
const clampProgress = (value: number) => Math.min(100, Math.max(0, value))

function dateFilter(query: Pick<LearningQueryParams, 'startDate' | 'endDate'>) {
  const date: { gte?: Date; lte?: Date } = {}
  if (query.startDate) date.gte = utcDate(query.startDate)
  if (query.endDate) date.lte = utcDate(query.endDate)
  return Object.keys(date).length ? date : undefined
}

function pagination(query: Pick<LearningQueryParams, 'limit' | 'offset'>) {
  return {
    ...(query.limit === undefined ? {} : { take: query.limit }),
    ...(query.offset === undefined ? {} : { skip: query.offset }),
  }
}

function toExamResponse(record: any): ExamCountdownResponse {
  return {
    id: record.id,
    userId: record.userId,
    examName: record.examName,
    examDate: formatDate(record.examDate),
    isArchived: record.isArchived,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function toSubjectResponse(record: any): StudySubjectResponse {
  return {
    id: record.id,
    userId: record.userId,
    examId: record.examId,
    subjectName: record.subjectName,
    totalChapters: record.totalChapters,
    currentChapter: record.currentChapter,
    progressPercentage: clampProgress(record.progressPercentage),
    targetCompletionDate: record.targetCompletionDate ? formatDate(record.targetCompletionDate) : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function toCheckinResponse(record: any): StudyCheckinResponse {
  return {
    id: record.id,
    userId: record.userId,
    subjectId: record.subjectId,
    date: formatDate(record.date),
    completedChapters: [...record.completedChapters].sort((a: number, b: number) => a - b),
    studyHours: roundHours(numberValue(record.studyHours)),
    notes: record.notes,
    progressPercentage: clampProgress(record.progressPercentage),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function assertName(value: string) {
  const name = value.trim()
  if (!name) throw new LearningConflictError('名称不能为空')
  return name
}

function assertTargetDate(targetCompletionDate: string | null | undefined, examDate: Date) {
  if (targetCompletionDate && utcDate(targetCompletionDate) < examDate) {
    throw new LearningConflictError('目标完成日期不能早于考试日期')
  }
}

function calculateProgress(completedChapters: number[], totalChapters: number) {
  const chapters = new Set(completedChapters.filter((chapter) => chapter >= 1 && chapter <= totalChapters))
  const currentChapter = Math.min(totalChapters, chapters.size)
  return {
    currentChapter,
    progressPercentage: clampProgress(Math.floor(currentChapter / totalChapters * 100)),
  }
}

async function lockSubject(tx: any, subjectId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${subjectId}, 0))`
}

async function recalculateSubject(tx: any, subjectId: string, totalChapters: number) {
  const records = await tx.studyCheckin.findMany({
    where: { subjectId },
    select: { completedChapters: true },
  })
  const chapters = records.flatMap((record: { completedChapters: number[] }) => record.completedChapters)
  const progress = calculateProgress(chapters, totalChapters)
  await tx.studySubject.update({ where: { id: subjectId }, data: progress })
  return progress
}

function startOfVisibleCalendar(date = new Date()) {
  const current = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
  const mondayIndex = (current.getUTCDay() + 6) % 7
  current.setUTCDate(current.getUTCDate() - mondayIndex)
  return current
}

function endOfVisibleCalendar(date = new Date()) {
  const start = startOfVisibleCalendar(date)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 41)
  return end
}

function daysBetween(start: Date, end: Date) {
  const result: Date[] = []
  for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    result.push(new Date(date))
  }
  return result
}

export class LearningService {
  async listExams(userId: string): Promise<ExamCountdownResponse[]> {
    const records = await prisma.examCountdown.findMany({
      where: { userId },
      orderBy: [{ isArchived: 'asc' }, { examDate: 'asc' }, { createdAt: 'asc' }],
    })
    return records.map(toExamResponse)
  }

  async createExam(userId: string, data: CreateExamRequest): Promise<ExamCountdownResponse> {
    const record = await prisma.examCountdown.create({
      data: {
        userId,
        examName: assertName(data.examName),
        examDate: utcDate(data.examDate),
        isArchived: false,
      },
    })
    return toExamResponse(record)
  }

  async updateExam(userId: string, id: string, data: UpdateExamRequest): Promise<ExamCountdownResponse> {
    const existing = await prisma.examCountdown.findFirst({ where: { id, userId } })
    if (!existing) throw new LearningNotFoundError('考试不存在')
    const updateData: Record<string, unknown> = {}
    if (data.examName !== undefined) updateData.examName = assertName(data.examName)
    if (data.examDate !== undefined) updateData.examDate = utcDate(data.examDate)
    if (data.isArchived !== undefined) updateData.isArchived = data.isArchived
    const record = await prisma.examCountdown.update({ where: { id }, data: updateData })
    return toExamResponse(record)
  }

  async deleteExam(userId: string, id: string): Promise<void> {
    const existing = await prisma.examCountdown.findFirst({ where: { id, userId } })
    if (!existing) throw new LearningNotFoundError('考试不存在')
    await prisma.examCountdown.delete({ where: { id } })
  }

  async listSubjects(userId: string, examId: string): Promise<StudySubjectResponse[]> {
    const exam = await prisma.examCountdown.findFirst({ where: { id: examId, userId } })
    if (!exam) throw new LearningNotFoundError('考试不存在')
    const records = await prisma.studySubject.findMany({
      where: { userId, examId },
      orderBy: { createdAt: 'asc' },
    })
    return records.map(toSubjectResponse)
  }

  async createSubject(userId: string, data: CreateStudySubjectRequest): Promise<StudySubjectResponse> {
    const exam = await prisma.examCountdown.findFirst({ where: { id: data.examId, userId } })
    if (!exam) throw new LearningNotFoundError('考试不存在')
    const subjectName = assertName(data.subjectName)
    const duplicate = await prisma.studySubject.findFirst({ where: { examId: data.examId, subjectName } })
    if (duplicate) throw new LearningConflictError('同一考试下不能有同名科目')
    assertTargetDate(data.targetCompletionDate, exam.examDate)
    const record = await prisma.studySubject.create({
      data: {
        userId,
        examId: data.examId,
        subjectName,
        totalChapters: data.totalChapters,
        targetCompletionDate: data.targetCompletionDate ? utcDate(data.targetCompletionDate) : null,
      },
    })
    return toSubjectResponse(record)
  }

  async updateSubject(userId: string, id: string, data: UpdateStudySubjectRequest): Promise<StudySubjectResponse> {
    const existing = await prisma.studySubject.findFirst({
      where: { id, userId },
      include: { exam: true },
    })
    if (!existing) throw new LearningNotFoundError('科目不存在')
    if (data.totalChapters !== undefined && data.totalChapters < existing.currentChapter) {
      throw new LearningConflictError('总章节数不能少于已完成章节数')
    }
    const updateData: Record<string, unknown> = {}
    if (data.subjectName !== undefined) {
      const subjectName = assertName(data.subjectName)
      const duplicate = await prisma.studySubject.findFirst({ where: { examId: existing.examId, subjectName } })
      if (duplicate && duplicate.id !== id) throw new LearningConflictError('同一考试下不能有同名科目')
      updateData.subjectName = subjectName
    }
    if (data.totalChapters !== undefined) updateData.totalChapters = data.totalChapters
    if (data.targetCompletionDate !== undefined) {
      assertTargetDate(data.targetCompletionDate, existing.exam.examDate)
      updateData.targetCompletionDate = data.targetCompletionDate ? utcDate(data.targetCompletionDate) : null
    }
    const record = await prisma.studySubject.update({ where: { id }, data: updateData })
    return toSubjectResponse(record)
  }

  async deleteSubject(userId: string, id: string): Promise<void> {
    const existing = await prisma.studySubject.findFirst({ where: { id, userId } })
    if (!existing) throw new LearningNotFoundError('科目不存在')
    await prisma.studySubject.delete({ where: { id } })
  }

  async listCheckins(userId: string, query: LearningQueryParams): Promise<StudyCheckinResponse[]> {
    if (query.subjectId) {
      const subject = await prisma.studySubject.findFirst({ where: { id: query.subjectId, userId } })
      if (!subject) throw new LearningNotFoundError('科目不存在')
    }
    const date = dateFilter(query)
    const records = await prisma.studyCheckin.findMany({
      where: {
        userId,
        ...(query.subjectId ? { subjectId: query.subjectId } : {}),
        ...(query.examId ? { subject: { examId: query.examId } } : {}),
        ...(date ? { date } : {}),
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      ...pagination(query),
    })
    return records.map(toCheckinResponse)
  }

  async createCheckin(userId: string, data: CreateStudyCheckinRequest): Promise<StudyCheckinResponse> {
    const subject = await prisma.studySubject.findFirst({
      where: { id: data.subjectId, userId },
    })
    if (!subject) throw new LearningNotFoundError('科目不存在')
    const chapters = [...data.completedChapters].sort((a, b) => a - b)
    if (chapters.some((chapter) => chapter > subject.totalChapters)) {
      throw new LearningConflictError('完成章节不能超过科目总章节数')
    }
    const record = await prisma.$transaction(async (tx: any) => {
      await lockSubject(tx, data.subjectId)
      const created = await tx.studyCheckin.create({
        data: {
          userId,
          subjectId: data.subjectId,
          date: utcDate(data.date),
          completedChapters: chapters,
          studyHours: data.studyHours,
          notes: data.notes?.trim() || null,
          progressPercentage: 0,
        },
      })
      const progress = await recalculateSubject(tx, data.subjectId, subject.totalChapters)
      return tx.studyCheckin.update({ where: { id: created.id }, data: { progressPercentage: progress.progressPercentage } })
    })
    return toCheckinResponse(record)
  }

  async deleteCheckin(userId: string, id: string): Promise<void> {
    const existing = await prisma.studyCheckin.findFirst({ where: { id, userId } })
    if (!existing) throw new LearningNotFoundError('学习打卡不存在')
    const subject = await prisma.studySubject.findFirst({ where: { id: existing.subjectId, userId } })
    if (!subject) throw new LearningNotFoundError('科目不存在')
    await prisma.$transaction(async (tx: any) => {
      await lockSubject(tx, subject.id)
      await tx.studyCheckin.delete({ where: { id } })
      await recalculateSubject(tx, subject.id, subject.totalChapters)
    })
  }

  async getProgress(
    userId: string,
    examId: string,
    dateRange: Pick<LearningQueryParams, 'startDate' | 'endDate'> = {},
  ): Promise<LearningProgressResponse> {
    const exam = await prisma.examCountdown.findFirst({ where: { id: examId, userId } })
    if (!exam) throw new LearningNotFoundError('考试不存在')
    const subjects = await prisma.studySubject.findMany({
      where: { userId, examId },
      orderBy: { createdAt: 'asc' },
    })
    const date = dateFilter(dateRange)
    const checkins = await prisma.studyCheckin.findMany({
      where: {
        userId,
        subject: { examId },
        ...(date ? { date } : {}),
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    })
    const stats = new Map<string, { totalStudyHours: number; checkinsCount: number }>()
    for (const subject of subjects) stats.set(subject.id, { totalStudyHours: 0, checkinsCount: 0 })
    for (const checkin of checkins) {
      const stat = stats.get(checkin.subjectId)
      if (!stat) continue
      stat.totalStudyHours += numberValue(checkin.studyHours)
      stat.checkinsCount += 1
    }
    const totalChapters = subjects.reduce((sum, subject) => sum + subject.totalChapters, 0)
    const completedChapters = subjects.reduce((sum, subject) => sum + Math.min(subject.currentChapter, subject.totalChapters), 0)
    const totalStudyHours = checkins.reduce((sum, checkin) => sum + numberValue(checkin.studyHours), 0)
    const dailyStart = dateRange.startDate ? utcDate(dateRange.startDate) : startOfVisibleCalendar()
    const dailyEnd = dateRange.endDate ? utcDate(dateRange.endDate) : endOfVisibleCalendar()
    const activityByDate = new Map<string, { checkinsCount: number; studyHours: number; completedChaptersCount: number }>()
    for (const checkin of checkins) {
      const key = formatDate(checkin.date)
      const current = activityByDate.get(key) ?? { checkinsCount: 0, studyHours: 0, completedChaptersCount: 0 }
      current.checkinsCount += 1
      current.studyHours += numberValue(checkin.studyHours)
      current.completedChaptersCount += checkin.completedChapters.length
      activityByDate.set(key, current)
    }
    const dailyActivity = daysBetween(dailyStart, dailyEnd).map((day) => {
      const dateKey = formatDate(day)
      const activity = activityByDate.get(dateKey) ?? { checkinsCount: 0, studyHours: 0, completedChaptersCount: 0 }
      return { date: dateKey, ...activity, studyHours: roundHours(activity.studyHours) }
    })
    const today = new Date()
    const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    const examUtc = Date.UTC(exam.examDate.getUTCFullYear(), exam.examDate.getUTCMonth(), exam.examDate.getUTCDate())
    return {
      exam: {
        id: exam.id,
        examName: exam.examName,
        examDate: formatDate(exam.examDate),
        isArchived: exam.isArchived,
        daysRemaining: Math.floor((examUtc - todayUtc) / 86_400_000),
      },
      summary: {
        subjectsCount: subjects.length,
        completedSubjectsCount: subjects.filter((subject) => subject.currentChapter >= subject.totalChapters).length,
        overallProgressPercentage: totalChapters === 0 ? 0 : clampProgress(Math.floor(completedChapters / totalChapters * 100)),
        totalStudyHours: roundHours(totalStudyHours),
        totalCheckins: checkins.length,
      },
      subjects: subjects.map((subject) => {
        const stat = stats.get(subject.id)!
        return {
          id: subject.id,
          subjectName: subject.subjectName,
          totalChapters: subject.totalChapters,
          currentChapter: subject.currentChapter,
          progressPercentage: clampProgress(subject.progressPercentage),
          targetCompletionDate: subject.targetCompletionDate ? formatDate(subject.targetCompletionDate) : null,
          totalStudyHours: roundHours(stat.totalStudyHours),
          checkinsCount: stat.checkinsCount,
        }
      }),
      dailyActivity,
    }
  }
}

export default new LearningService()
