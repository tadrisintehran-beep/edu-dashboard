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

async function fetchProfile(userId: string, email: string): Promise<User> {
  const { data } = await supabase
    .from('profiles')
    .select('name_fa, role')
    .eq('id', userId)
    .single()

  return {
    id: userId,
    email: email,
    name: data?.name_fa || email.split('@')[0],
    role: data?.role || 'VIEWER',
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  checkSession: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const user = await fetchProfile(session.user.id, session.user.email || '')
      set({ isAuthenticated: true, user })
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      set({ isLoading: false })
      return false
    }
    const user = await fetchProfile(data.user.id, data.user.email || '')
    set({ isAuthenticated: true, isLoading: false, user })
    return true
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, isAuthenticated: false })
  },
}))