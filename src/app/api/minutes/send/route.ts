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
    .select('role, department_id')
    .eq('id', caller.id)
    .single()

  if (!callerProfile || !['SUPER_ADMIN', 'DEPUTY_MINISTER', 'SECRETARY'].includes(callerProfile.role)) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 })
  }

  const { minutesId } = await request.json()
  if (!minutesId) {
    return NextResponse.json({ error: 'شناسه صورت‌جلسه مشخص نشده' }, { status: 400 })
  }

  const { data: minutes, error: minutesError } = await supabaseAdmin
    .from('meeting_minutes')
    .select('*, meetings(id, title_fa, department_id)')
    .eq('id', minutesId)
    .single()

  if (minutesError || !minutes) {
    return NextResponse.json({ error: 'صورت‌جلسه یافت نشد' }, { status: 404 })
  }

  const meeting = minutes.meetings
  if (callerProfile.role !== 'SUPER_ADMIN' && meeting?.department_id !== callerProfile.department_id) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 })
  }

  if (!minutes.finalized) {
    return NextResponse.json({ error: 'ابتدا صورت‌جلسه را نهایی کنید' }, { status: 400 })
  }

  const { data: attendees } = await supabaseAdmin
    .from('meeting_attendees')
    .select('*')
    .eq('meeting_id', meeting.id)

  const now = new Date().toISOString()

  const logRows = await Promise.all((attendees || []).map(async a => {
    if (a.is_external) {
      return { minutes_id: minutesId, sent_to_name: a.external_name, sent_to_email: null, sent_via: 'log', sent_at: now }
    }
    let email: string | null = null
    if (a.user_id) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(a.user_id)
      email = authUser?.user?.email || null
    }
    return {
      minutes_id: minutesId,
      sent_to_name: a.user_name,
      sent_to_email: email,
      sent_via: email ? 'email' : 'log',
      sent_at: now,
    }
  }))

  if (logRows.length > 0) {
    const { error: logError } = await supabaseAdmin.from('minutes_send_log').insert(logRows)
    if (logError) {
      return NextResponse.json({ error: 'خطا در ثبت گزارش ارسال' }, { status: 500 })
    }
  }

  await supabaseAdmin.from('alerts').insert([{
    title: `صورت‌جلسه ارسال شد: ${meeting.title_fa}`,
    body: logRows.length > 0
      ? `صورت‌جلسه به ${logRows.length} نفر از شرکت‌کنندگان ارسال شد.`
      : 'این جلسه شرکت‌کننده‌ای برای ارسال نداشت.',
    level: 'info',
    is_read: false,
    is_snoozed: false,
  }])

  return NextResponse.json({ success: true, sentCount: logRows.length })
}
