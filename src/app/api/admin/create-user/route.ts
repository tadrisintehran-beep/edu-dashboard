import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin'

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

  const { email, password, name_fa, role } = await request.json()
  if (!email || !password || !name_fa || !role) {
    return NextResponse.json({ error: 'لطفاً همه فیلدها را پر کنید' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' }, { status: 400 })
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message || 'خطا در ساخت کاربر' }, { status: 400 })
  }

  const { error: profileError } = await supabaseAdmin.from('profiles').insert([{
    id: created.user.id,
    name_fa,
    role,
  }])

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: 'خطا در ذخیره پروفایل' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
