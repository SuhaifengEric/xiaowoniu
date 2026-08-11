export interface DashboardSummaryResponse {
  generatedAt: string
  fitness: {
    todayCheckinCount: number
    weeklyCheckinCount: number
    weeklyTarget: number | null
    latestWeightKg: number | null
  }
  learning: {
    activeExam: {
      id: string
      examName: string
      daysRemaining: number
    } | null
    overallProgressPercentage: number | null
    todayStudyHours: number
  }
  finance: {
    currentMonthExpense: number
    currentMonthBudget: number | null
    budgetRemaining: number | null
    activeSavingPlansCount: number
  }
  wedding: {
    weddingDate: string | null
    daysRemaining: number | null
    pendingTasksCount: number
    completedTasksCount: number
    budgetRemaining: number | null
  }
}
