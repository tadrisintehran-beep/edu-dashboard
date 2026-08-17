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

  const { signatureId } = await request.json()
  if (!signatureId) {
    return NextResponse.json({ error: 'شناسه امضا مشخص نشده' }, { status: 400 })
  }

  const { data: signature, error: signatureError } = await supabaseAdmin
    .from('minutes_signatures')
    .select('id, user_id, is_signed')
    .eq('id', signatureId)
    .single()

  if (signatureError || !signature) {
    return NextResponse.json({ error: 'ردیف امضا یافت نشد' }, { status: 404 })
  }

  if (signature.user_id !== caller.id) {
    return NextResponse.json({ error: 'این ردیف امضا متعلق به شما نیست' }, { status: 403 })
  }

  if (signature.is_signed) {
    return NextResponse.json({ error: 'قبلاً امضا شده است' }, { status: 400 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || null

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('minutes_signatures')
    .update({ is_signed: true, signed_at: new Date().toISOString(), ip_address: ip })
    .eq('id', signatureId)
    .select()
    .single()

  if (updateError || !updated) {
    return NextResponse.json({ error: 'خطا در ثبت امضا' }, { status: 500 })
  }

  return NextResponse.json({ success: true, signature: updated })
}
