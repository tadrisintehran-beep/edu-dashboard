import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin'
import type { UserRole } from '@/lib/permissions'

const VALID_ROLES: UserRole[] = ['SUPER_ADMIN', 'DEPUTY_MINISTER', 'SECRETARY', 'VIEWER']

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 })
  }

  const supabaseAdmin = createSupabaseAdminClient()

  const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token)
  if (callerError || !caller) {
    return NextResponse.json({ error: 'توکن نامعتبر' }, { status: 401 })
  }

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (callerProfile?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 })
  }

  const { userId, role, department_id } = await request.json()
  if (!userId || !role) {
    return NextResponse.json({ error: 'اطلاعات ناقص است' }, { status: 400 })
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'نقش نامعتبر است' }, { status: 400 })
  }
  if (userId === caller.id) {
    return NextResponse.json({ error: 'امکان تغییر نقش حساب خودتان وجود ندارد' }, { status: 400 })
  }
  if (role !== 'SUPER_ADMIN' && !department_id) {
    return NextResponse.json({ error: 'انتخاب معاونت الزامی است' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('profiles')
    .update({ role, department_id: role === 'SUPER_ADMIN' ? null : department_id })
    .eq('id', userId)
  if (error) {
    return NextResponse.json({ error: 'خطا در بروزرسانی نقش' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
