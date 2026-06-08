import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  checkSession: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  checkSession: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      set({
        isAuthenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email || '',
          name: 'رضا کیاهی',
          role: 'DEPUTY_MINISTER',
        }
      })
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      set({ isLoading: false })
      return false
    }
    set({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: data.user.id,
        email: data.user.email || '',
        name: 'رضا کیاهی ',
        role: 'DEPUTY_MINISTER',
      }
    })
    return true
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, isAuthenticated: false })
  }
}))