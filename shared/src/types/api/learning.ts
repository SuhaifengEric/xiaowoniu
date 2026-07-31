import type {
  ExamCountdownResponse,
  StudyCheckinResponse,
  StudySubjectResponse,
} from '../models/learning'

export interface CreateExamRequest {
  examName: string
  examDate: string
}

export interface UpdateExamRequest {
  examName?: string
  examDate?: string
  isArchived?: boolean
}

export interface CreateStudySubjectRequest {
  examId: string
  subjectName: string
  totalChapters: number
  targetCompletionDate?: string | null
}

export interface UpdateStudySubjectRequest {
  subjectName?: string
  totalChapters?: number
  targetCompletionDate?: string | null
}

export interface CreateStudyCheckinRequest {
  subjectId: string
  date: string
  completedChapters: number[]
  studyHours: number
  notes?: string
}

export interface LearningQueryParams {
  examId?: string
  subjectId?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export interface LearningProgressResponse {
  exam: {
    id: string
    examName: string
    examDate: string
    isArchived: boolean
    daysRemaining: number
  }
  summary: {
    subjectsCount: number
    completedSubjectsCount: number
    overallProgressPercentage: number
    totalStudyHours: number
    totalCheckins: number
  }
  subjects: Array<{
    id: string
    subjectName: string
    totalChapters: number
    currentChapter: number
    progressPercentage: number
    targetCompletionDate: string | null
    totalStudyHours: number
    checkinsCount: number
  }>
  dailyActivity: Array<{
    date: string
    checkinsCount: number
    studyHours: number
    completedChaptersCount: number
  }>
}

export type LearningModelResponse =
  | ExamCountdownResponse
  | StudySubjectResponse
  | StudyCheckinResponse
