import { supabase } from './supabase'

interface LogParams {
  action: 'login' | 'logout' | 'view' | 'create' | 'update' | 'delete'
  resource?: string
  details?: string
  userName?: string
  userEmail?: string
}

export async function logAction(params: LogParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('access_logs').insert([{
      user_id: user.id,
      user_name: params.userName || user.email,
      user_email: params.userEmail || user.email,
      action: params.action,
      resource: params.resource || null,
      details: params.details || null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    }])
  } catch (e) {
    // لاگ نباید باعث crash شه
    console.error('Log error:', e)
  }
}