import { useAuthStore } from '@/store/auth.store'

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    updateProfile,
    changePassword,
    logout,
    checkAuth,
    clearError,
  } = useAuthStore()

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    updateProfile,
    changePassword,
    logout,
    checkAuth,
    clearError,
  }
}

export default useAuth
