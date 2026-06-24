import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { logAction } from '@/lib/logger'
import { hasPermission, type Resource, type Action } from '@/lib/permissions'

interface User {
  id: string
  email: string
  name: string
  role: string
  is_active: boolean
}

interface AuthState {
  user: User | null
  isChecking: boolean
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  fetchProfile: () => Promise<void>
  signOut: () => Promise<void>
  can: (resource: Resource, action: Action) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isChecking: true,
  isAuthenticated: false,

  setUser: (user) => set({ user }),

  fetchProfile: async () => {
    set({ isChecking: true })
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        set({ user: null, isChecking: false, isAuthenticated: false })
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profile) {
        if (profile.is_active === false) {
          await supabase.auth.signOut()
          set({ user: null, isChecking: false, isAuthenticated: false })
          return
        }

        const user = {
          id: authUser.id,
          email: authUser.email || '',
          name: profile.name_fa || authUser.email || '',
          role: profile.role || 'VIEWER',
          is_active: profile.is_active ?? true,
        }
        set({ user, isChecking: false, isAuthenticated: true })

        await supabase.from('profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', authUser.id)
      } else {
        set({ user: null, isChecking: false, isAuthenticated: false })
      }
    } catch {
      set({ user: null, isChecking: false, isAuthenticated: false })
    }
  },

  signOut: async () => {
    const user = get().user
    if (user) {
      await logAction({ action: 'logout', userName: user.name, userEmail: user.email })
      await supabase.from('profiles')
        .update({ last_logout: new Date().toISOString() })
        .eq('id', user.id)
    }
    await supabase.auth.signOut()
    set({ user: null, isAuthenticated: false })
  },

  can: (resource: Resource, action: Action) => {
    const user = get().user
    if (!user) return false
    return hasPermission(user.role, resource, action)
  },
}))