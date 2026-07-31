import { create } from 'zustand'
import type {
  ApiErrorResponse,
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
import { learningService } from '@/services/learning.service'

interface CalendarRange { startDate: string; endDate: string }
interface LearningDataState {
  exams: ExamCountdownResponse[]
  subjects: StudySubjectResponse[]
  checkins: StudyCheckinResponse[]
  progress: LearningProgressResponse | null
  selectedExamId: string | null
  loading: boolean
  error: string | null
}
interface LearningActions {
  fetchDashboard: (examId: string | null, calendarRange: CalendarRange) => Promise<void>
  fetchExams: () => Promise<void>
  selectExam: (examId: string | null, calendarRange: CalendarRange) => Promise<void>
  fetchSubjects: (examId: string) => Promise<void>
  fetchCheckins: (params?: LearningQueryParams) => Promise<void>
  fetchProgress: (params: Pick<LearningQueryParams, 'examId' | 'startDate' | 'endDate'>) => Promise<void>
  createExam: (data: CreateExamRequest) => Promise<void>
  updateExam: (id: string, data: UpdateExamRequest) => Promise<void>
  deleteExam: (id: string) => Promise<void>
  createSubject: (data: CreateStudySubjectRequest) => Promise<void>
  updateSubject: (id: string, data: UpdateStudySubjectRequest) => Promise<void>
  deleteSubject: (id: string) => Promise<void>
  createCheckin: (data: CreateStudyCheckinRequest) => Promise<void>
  deleteCheckin: (id: string) => Promise<void>
  clearError: () => void
  reset: () => void
}
export type LearningState = LearningDataState & LearningActions
export const initialLearningState: LearningDataState = {
  exams: [], subjects: [], checkins: [], progress: null, selectedExamId: null, loading: false, error: null,
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const getErrorMessage = (value: unknown) => {
  if (isRecord(value) && isRecord(value.response) && isRecord(value.response.data)) {
    const data = value.response.data as Partial<ApiErrorResponse>
    if (data.error?.message) return data.error.message
  }
  return value instanceof Error ? value.message : '学习数据操作失败'
}
const refreshFailureMessage = '操作已成功，但数据刷新失败'
type Resource = 'exams' | 'subjects' | 'checkins' | 'progress'
type Token = { generation: number; version: number; resource: Resource }
const resources: Resource[] = ['exams', 'subjects', 'checkins', 'progress']

export const useLearningStore = create<LearningState>((set, get) => {
  let generation = 0
  let activeActions = 0
  let selectedExamId: string | null = null
  let currentRange: CalendarRange | null = null
  const versions: Record<Resource, number> = { exams: 0, subjects: 0, checkins: 0, progress: 0 }
  const nextToken = (resource: Resource): Token => ({ generation, resource, version: ++versions[resource] })
  const isCurrent = (token: Token) => token.generation === generation && token.version === versions[token.resource]
  const runAction = async (action: () => Promise<void>, canWriteError: () => boolean = () => true) => {
    const actionGeneration = generation
    activeActions += 1
    set({ loading: true, error: null })
    try { await action() } catch (error) {
      if (actionGeneration === generation && canWriteError()) set({ error: getErrorMessage(error) })
      throw error
    } finally {
      if (actionGeneration === generation) {
        activeActions = Math.max(0, activeActions - 1)
        set({ loading: activeActions > 0 })
      }
    }
  }
  const refresh = async (requests: Array<{ token: Token; request: Promise<unknown>; apply: (value: unknown) => void }>) => {
    const results = await Promise.allSettled(requests.map(({ request }) => request))
    let failed = false
    results.forEach((result, index) => {
      const request = requests[index]
      if (!isCurrent(request.token)) return
      if (result.status === 'fulfilled') request.apply(result.value)
      else failed = true
    })
    if (failed) set({ error: refreshFailureMessage })
  }
  const refreshSelected = async (examId: string, range: CalendarRange) => {
    const subjectToken = nextToken('subjects')
    const checkinToken = nextToken('checkins')
    const progressToken = nextToken('progress')
    await refresh([
      { token: subjectToken, request: learningService.getSubjects(examId), apply: (value) => set({ subjects: value as StudySubjectResponse[] }) },
      { token: checkinToken, request: learningService.getCheckins({ examId, ...range, limit: 10, offset: 0 }), apply: (value) => set({ checkins: value as StudyCheckinResponse[] }) },
      { token: progressToken, request: learningService.getProgress({ examId, ...range }), apply: (value) => set({ progress: value as LearningProgressResponse }) },
    ])
  }
  const mutationRefresh = async (examId: string | null) => {
    if (!examId || !currentRange) return
    await refreshSelected(examId, currentRange)
  }

  return {
    ...initialLearningState,
    fetchDashboard: (examId, range) => {
      selectedExamId = examId
      currentRange = range
      const examToken = nextToken('exams')
      if (!examId) {
        versions.subjects += 1; versions.checkins += 1; versions.progress += 1
        set({ selectedExamId: null, subjects: [], checkins: [], progress: null })
        return runAction(async () => {
          const exams = await learningService.getExams()
          if (isCurrent(examToken)) set({ exams, selectedExamId: null })
        }, () => isCurrent(examToken))
      }
      const subjectToken = nextToken('subjects')
      const checkinToken = nextToken('checkins')
      const progressToken = nextToken('progress')
      set({ selectedExamId: examId, subjects: [], checkins: [], progress: null })
      return runAction(async () => {
        const [exams, subjects, checkins, progress] = await Promise.all([
          learningService.getExams(), learningService.getSubjects(examId),
          learningService.getCheckins({ examId, ...range, limit: 10, offset: 0 }), learningService.getProgress({ examId, ...range }),
        ])
        if (isCurrent(examToken)) set({ exams })
        if (isCurrent(subjectToken)) set({ subjects })
        if (isCurrent(checkinToken)) set({ checkins })
        if (isCurrent(progressToken)) set({ progress })
      }, () => [examToken, subjectToken, checkinToken, progressToken].every(isCurrent))
    },
    fetchExams: () => {
      const token = nextToken('exams')
      return runAction(async () => { const exams = await learningService.getExams(); if (isCurrent(token)) set({ exams }) }, () => isCurrent(token))
    },
    selectExam: (examId, range) => {
      selectedExamId = examId; currentRange = range
      versions.subjects += 1; versions.checkins += 1; versions.progress += 1
      set({ selectedExamId: examId, subjects: [], checkins: [], progress: null })
      if (!examId) return Promise.resolve()
      return runAction(async () => {
        const tokens = { subjects: nextToken('subjects'), checkins: nextToken('checkins'), progress: nextToken('progress') }
        const [subjects, checkins, progress] = await Promise.all([
          learningService.getSubjects(examId), learningService.getCheckins({ examId, ...range, limit: 10, offset: 0 }), learningService.getProgress({ examId, ...range }),
        ])
        if (isCurrent(tokens.subjects)) set({ subjects })
        if (isCurrent(tokens.checkins)) set({ checkins })
        if (isCurrent(tokens.progress)) set({ progress })
      })
    },
    fetchSubjects: (examId) => { const token = nextToken('subjects'); return runAction(async () => { const subjects = await learningService.getSubjects(examId); if (isCurrent(token)) set({ subjects }) }, () => isCurrent(token)) },
    fetchCheckins: (params) => { const token = nextToken('checkins'); return runAction(async () => { const checkins = await learningService.getCheckins(params); if (isCurrent(token)) set({ checkins }) }, () => isCurrent(token)) },
    fetchProgress: (params) => { const token = nextToken('progress'); return runAction(async () => { const progress = await learningService.getProgress(params); if (isCurrent(token)) set({ progress }) }, () => isCurrent(token)) },
    createExam: (data) => {
      const token = nextToken('exams')
      return runAction(async () => { const exam = await learningService.createExam(data); if (!isCurrent(token)) return; set({ exams: [exam, ...get().exams.filter((item) => item.id !== exam.id)] }); await refresh([{ token: nextToken('exams'), request: learningService.getExams(), apply: (value) => set({ exams: value as ExamCountdownResponse[] }) }]) }, () => isCurrent(token))
    },
    updateExam: (id, data) => {
      const token = nextToken('exams')
      return runAction(async () => { const exam = await learningService.updateExam(id, data); if (!isCurrent(token)) return; set({ exams: get().exams.map((item) => item.id === id ? exam : item) }); await refresh([{ token: nextToken('exams'), request: learningService.getExams(), apply: (value) => set({ exams: value as ExamCountdownResponse[] }) }]) }, () => isCurrent(token))
    },
    deleteExam: (id) => {
      const token = nextToken('exams')
      return runAction(async () => {
        await learningService.deleteExam(id)
        if (!isCurrent(token)) return
        const exams = get().exams.filter((item) => item.id !== id)
        const next = exams.find((item) => !item.isArchived) ?? exams[0] ?? null
        selectedExamId = next?.id ?? null
        set({ exams, selectedExamId: selectedExamId, subjects: [], checkins: [], progress: null })
        await refresh([{ token: nextToken('exams'), request: learningService.getExams(), apply: (value) => set({ exams: value as ExamCountdownResponse[] }) }])
      }, () => isCurrent(token))
    },
    createSubject: (data) => {
      const token = nextToken('subjects')
      return runAction(async () => { const subject = await learningService.createSubject(data); if (!isCurrent(token)) return; set({ subjects: [subject, ...get().subjects.filter((item) => item.id !== subject.id)] }); await mutationRefresh(selectedExamId) }, () => isCurrent(token))
    },
    updateSubject: (id, data) => {
      const token = nextToken('subjects')
      return runAction(async () => { const subject = await learningService.updateSubject(id, data); if (!isCurrent(token)) return; set({ subjects: get().subjects.map((item) => item.id === id ? subject : item) }); await mutationRefresh(selectedExamId) }, () => isCurrent(token))
    },
    deleteSubject: (id) => {
      const token = nextToken('subjects')
      return runAction(async () => { await learningService.deleteSubject(id); if (!isCurrent(token)) return; set({ subjects: get().subjects.filter((item) => item.id !== id), checkins: get().checkins.filter((item) => item.subjectId !== id) }); await mutationRefresh(selectedExamId) }, () => isCurrent(token))
    },
    createCheckin: (data) => {
      const token = nextToken('checkins')
      return runAction(async () => { const checkin = await learningService.createCheckin(data); if (!isCurrent(token)) return; set({ checkins: [checkin, ...get().checkins.filter((item) => item.id !== checkin.id)] }); await mutationRefresh(selectedExamId) }, () => isCurrent(token))
    },
    deleteCheckin: (id) => {
      const token = nextToken('checkins')
      return runAction(async () => { await learningService.deleteCheckin(id); if (!isCurrent(token)) return; set({ checkins: get().checkins.filter((item) => item.id !== id) }); await mutationRefresh(selectedExamId) }, () => isCurrent(token))
    },
    clearError: () => set({ error: null }),
    reset: () => { generation += 1; activeActions = 0; selectedExamId = null; currentRange = null; resources.forEach((resource) => { versions[resource] = 0 }); set(initialLearningState) },
  }
})
