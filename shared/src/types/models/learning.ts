/**
 * 学习考试倒计时响应
 */
export interface ExamCountdownResponse {
  id: string
  userId: string
  examName: string
  examDate: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 学习科目响应
 */
export interface StudySubjectResponse {
  id: string
  userId: string
  examId: string
  subjectName: string
  totalChapters: number
  currentChapter: number
  progressPercentage: number
  targetCompletionDate: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 学习打卡响应
 */
export interface StudyCheckinResponse {
  id: string
  userId: string
  subjectId: string
  date: string
  completedChapters: number[]
  studyHours: number
  notes: string | null
  progressPercentage: number
  createdAt: string
  updatedAt: string
}
