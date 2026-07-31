import type {
  ApiSuccessResponse,
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
import api from './api'

export const learningService = {
  async getExams(): Promise<ExamCountdownResponse[]> {
    const response = await api.get<ApiSuccessResponse<ExamCountdownResponse[]>>('/api/learning/exams')
    return response.data.data
  },
  async createExam(data: CreateExamRequest): Promise<ExamCountdownResponse> {
    const response = await api.post<ApiSuccessResponse<ExamCountdownResponse>>('/api/learning/exams', data)
    return response.data.data
  },
  async updateExam(id: string, data: UpdateExamRequest): Promise<ExamCountdownResponse> {
    const response = await api.patch<ApiSuccessResponse<ExamCountdownResponse>>(`/api/learning/exams/${id}`, data)
    return response.data.data
  },
  async deleteExam(id: string): Promise<null> {
    const response = await api.delete<ApiSuccessResponse<null>>(`/api/learning/exams/${id}`)
    return response.data.data
  },
  async getSubjects(examId: string): Promise<StudySubjectResponse[]> {
    const response = await api.get<ApiSuccessResponse<StudySubjectResponse[]>>('/api/learning/subjects', { params: { examId } })
    return response.data.data
  },
  async createSubject(data: CreateStudySubjectRequest): Promise<StudySubjectResponse> {
    const response = await api.post<ApiSuccessResponse<StudySubjectResponse>>('/api/learning/subjects', data)
    return response.data.data
  },
  async updateSubject(id: string, data: UpdateStudySubjectRequest): Promise<StudySubjectResponse> {
    const response = await api.patch<ApiSuccessResponse<StudySubjectResponse>>(`/api/learning/subjects/${id}`, data)
    return response.data.data
  },
  async deleteSubject(id: string): Promise<null> {
    const response = await api.delete<ApiSuccessResponse<null>>(`/api/learning/subjects/${id}`)
    return response.data.data
  },
  async getCheckins(params?: LearningQueryParams): Promise<StudyCheckinResponse[]> {
    const response = await api.get<ApiSuccessResponse<StudyCheckinResponse[]>>('/api/learning/checkins', { params })
    return response.data.data
  },
  async createCheckin(data: CreateStudyCheckinRequest): Promise<StudyCheckinResponse> {
    const response = await api.post<ApiSuccessResponse<StudyCheckinResponse>>('/api/learning/checkins', data)
    return response.data.data
  },
  async deleteCheckin(id: string): Promise<null> {
    const response = await api.delete<ApiSuccessResponse<null>>(`/api/learning/checkins/${id}`)
    return response.data.data
  },
  async getProgress(params: Pick<LearningQueryParams, 'examId' | 'startDate' | 'endDate'>): Promise<LearningProgressResponse> {
    const response = await api.get<ApiSuccessResponse<LearningProgressResponse>>('/api/learning/progress', { params })
    return response.data.data
  },
}

export default learningService
