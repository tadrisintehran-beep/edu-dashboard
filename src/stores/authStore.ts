import { create } from 'zustand'

interface User {
  id: string
  name: string
  role: 'SUPER_ADMIN' | 'DEPUTY_MINISTER' | 'OFFICE_MANAGER' | 'DATA_ENTRY' | 'VIEWER'
  avatar?: string
}

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (username: string, password: string) => {
    set({ isLoading: true })

    // فعلاً mock — بعداً به API وصل می‌کنیم
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (username === 'admin' && password === '1234') {
      set({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: '1',
          name: 'محمد رضایی',
          role: 'DEPUTY_MINISTER',
        }
      })
      return true
    }

    set({ isLoading: false })
    return false
  },

  logout: () => {
    set({ user: null, isAuthenticated: false })
  }
}))