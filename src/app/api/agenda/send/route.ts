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

  const { meetingId } = await request.json()
  if (!meetingId) {
    return NextResponse.json({ error: 'شناسه جلسه مشخص نشده' }, { status: 400 })
  }

  const { data: meeting, error: meetingError } = await supabaseAdmin
    .from('meetings')
    .select('id, title_fa, department_id')
    .eq('id', meetingId)
    .single()

  if (meetingError || !meeting) {
    return NextResponse.json({ error: 'جلسه یافت نشد' }, { status: 404 })
  }

  if (callerProfile.role !== 'SUPER_ADMIN' && meeting.department_id !== callerProfile.department_id) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 })
  }

  const { count: attendeeCount } = await supabaseAdmin
    .from('meeting_attendees')
    .select('id', { count: 'exact', head: true })
    .eq('meeting_id', meetingId)

  await supabaseAdmin.from('alerts').insert([{
    title: `دستور جلسه ارسال شد: ${meeting.title_fa}`,
    body: `دستور جلسه به ${attendeeCount || 0} نفر از شرکت‌کنندگان ارسال شد.`,
    level: 'info',
    is_read: false,
    is_snoozed: false,
  }])

  return NextResponse.json({ success: true })
}
