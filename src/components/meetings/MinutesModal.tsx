'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { useIsMobile } from '@/lib/useIsMobile'
import { useAuthStore } from '@/stores/authStore'
import { JalaliDatePicker } from '@/components/ui/JalaliDatePicker'
import { toJalali } from '@/lib/date'
import { activateOnKey } from '@/lib/a11y'
import { PrintMinutes } from './PrintMinutes'

interface MinutesModalProps {
  meeting: any
  onClose: () => void
  onChanged?: () => void
}

const priorityLabel: Record<string, string> = { low: 'عادی', med: 'متوسط', high: 'مهم', critical: 'فوری' }
const priorityColor: Record<string, string> = { low: '#4a9eff', med: '#c9a84c', high: '#e09444', critical: '#e05555' }
const statusLabel: Record<string, string> = { pending: 'در انتظار', in_progress: 'در حال انجام', done: 'انجام شد', cancelled: 'لغو شد' }
const statusColor: Record<string, string> = { pending: '#c9a84c', in_progress: '#4a9eff', done: '#3dbb82', cancelled: '#e05555' }

export function MinutesModal({ meeting, onClose, onChanged }: MinutesModalProps) {
  const { t } = useTheme()
  const { can } = useAuthStore()
  const { showToast, ToastComponent } = useToast()
  const isMobile = useIsMobile()
  const canEdit = can('meetings', 'update')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [showSendLog, setShowSendLog] = useState(false)

  const [minutes, setMinutes] = useState<any | null>(null)
  const [actionItems, setActionItems] = useState<any[]>([])
  const [attendees, setAttendees] = useState<any[]>([])
  const [sendLog, setSendLog] = useState<any[]>([])

  const [draft, setDraft] = useState({
    summary: '', decisions: '', next_meeting_date: '', next_meeting_notes: '',
  })

  const [newItem, setNewItem] = useState({
    title: '', assigned_to_name: '', assigned_to_user_id: '', due_date: '', priority: 'med',
  })

  const fetchAttendees = useCallback(async () => {
    const { data } = await supabase.from('meeting_attendees').select('*').eq('meeting_id', meeting.id).order('created_at')
    if (data) setAttendees(data)
  }, [meeting.id])

  const fetchActionItems = useCallback(async (minutesId: string) => {
    const { data } = await supabase.from('meeting_action_items').select('*').eq('minutes_id', minutesId).order('created_at', { ascending: true })
    if (data) setActionItems(data)
  }, [])

  const fetchSendLog = useCallback(async (minutesId: string) => {
    const { data } = await supabase.from('minutes_send_log').select('*').eq('minutes_id', minutesId).order('sent_at', { ascending: false })
    if (data) setSendLog(data)
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [{ data: m }] = await Promise.all([
      supabase.from('meeting_minutes').select('*').eq('meeting_id', meeting.id).maybeSingle(),
      fetchAttendees(),
    ])
    if (m) {
      setMinutes(m)
      setDraft({
        summary: m.summary || '', decisions: m.decisions || '',
        next_meeting_date: m.next_meeting_date || '', next_meeting_notes: m.next_meeting_notes || '',
      })
      await Promise.all([fetchActionItems(m.id), fetchSendLog(m.id)])
    }
    setLoading(false)
  }, [meeting.id, fetchAttendees, fetchActionItems, fetchSendLog])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const inputStyle = {
    width: '100%', background: t.input, border: `1px solid ${t.border}`,
    borderRadius: '8px', padding: '8px 12px', color: t.text,
    fontSize: '12px', outline: 'none', direction: 'rtl' as const, fontFamily: 'inherit',
  }

  // ذخیره پیش‌نویس؛ اگر هنوز رکورد صورت‌جلسه ساخته نشده، همینجا ساخته می‌شه
  const saveDraft = async (): Promise<any | null> => {
    setSaving(true)
    let result: any = null
    if (minutes) {
      const { data, error } = await supabase.from('meeting_minutes').update({
        summary: draft.summary, decisions: draft.decisions,
        next_meeting_date: draft.next_meeting_date || null, next_meeting_notes: draft.next_meeting_notes || null,
      }).eq('id', minutes.id).select().single()
      if (!error) result = data
    } else {
      const { data, error } = await supabase.from('meeting_minutes').insert([{
        meeting_id: meeting.id,
        summary: draft.summary, decisions: draft.decisions,
        next_meeting_date: draft.next_meeting_date || null, next_meeting_notes: draft.next_meeting_notes || null,
        finalized: false,
      }]).select().single()
      if (!error) result = data
    }
    setSaving(false)
    if (!result) { showToast('خطا در ذخیره صورت‌جلسه', 'error'); return null }
    setMinutes(result)
    onChanged?.()
    return result
  }

  const handleSaveDraft = async () => {
    const result = await saveDraft()
    if (result) showToast('پیش‌نویس ذخیره شد ✅', 'success')
  }

  const handleFinalize = async () => {
    const base = minutes || await saveDraft()
    if (!base) return
    const { data, error } = await supabase.from('meeting_minutes').update({
      finalized: true, finalized_at: new Date().toISOString(),
    }).eq('id', base.id).select().single()
    if (error) { showToast('خطا در نهایی‌سازی', 'error'); return }
    setMinutes(data)
    showToast('صورت‌جلسه نهایی شد ✅', 'success')
    onChanged?.()
  }

  const handleReopen = async () => {
    if (!minutes) return
    const { data, error } = await supabase.from('meeting_minutes').update({
      finalized: false, finalized_at: null,
    }).eq('id', minutes.id).select().single()
    if (error) { showToast('خطا در بازگشایی', 'error'); return }
    setMinutes(data)
    showToast('صورت‌جلسه برای ویرایش بازگشایی شد', 'info')
    onChanged?.()
  }

  const handleAddItem = async () => {
    if (!newItem.title.trim()) { showToast('لطفاً عنوان تکلیف را وارد کنید', 'error'); return }
    const base = minutes || await saveDraft()
    if (!base) return
    const { error } = await supabase.from('meeting_action_items').insert([{
      minutes_id: base.id, meeting_id: meeting.id,
      title: newItem.title.trim(),
      assigned_to_name: newItem.assigned_to_name.trim() || null,
      assigned_to_user_id: newItem.assigned_to_user_id || null,
      due_date: newItem.due_date || null,
      priority: newItem.priority,
      status: 'pending',
    }])
    if (error) { showToast('خطا در افزودن تکلیف', 'error'); return }
    setNewItem({ title: '', assigned_to_name: '', assigned_to_user_id: '', due_date: '', priority: 'med' })
    fetchActionItems(base.id)
  }

  const handleItemStatus = async (id: string, status: string) => {
    await supabase.from('meeting_action_items').update({ status }).eq('id', id)
    if (minutes) fetchActionItems(minutes.id)
  }

  const handleDeleteItem = async (id: string) => {
    await supabase.from('meeting_action_items').delete().eq('id', id)
    if (minutes) fetchActionItems(minutes.id)
  }

  const handleSend = async () => {
    if (!minutes?.finalized) return
    setSending(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/minutes/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ minutesId: minutes.id }),
    })
    const result = await res.json()
    setSending(false)
    if (!res.ok) { showToast(result.error || 'خطا در ارسال', 'error'); return }
    showToast(`صورت‌جلسه به ${result.sentCount} نفر ارسال شد ✅`, 'success')
    fetchSendLog(minutes.id)
    setShowSendLog(true)
  }

  const attendeeOptions = attendees.map(a => ({
    key: a.id,
    label: a.is_external ? a.external_name : a.user_name,
    user_id: a.is_external ? '' : (a.user_id || ''),
  }))

  const printMinutesData = { ...(minutes || {}), ...draft, finalized: minutes?.finalized || false }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="minutes-modal-title" style={{
      position: 'fixed', inset: 0, background: '#00000077',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9998, direction: 'rtl', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease', padding: '16px',
    }}>
      <div style={{
        background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px',
        width: '100%', maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        animation: 'fadeInUp 0.2s ease', boxShadow: '0 20px 60px #00000055', color: t.text,
      }}>
        {/* هدر */}
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0, gap: '10px', flexWrap: 'wrap' }}>
          <div>
            <div id="minutes-modal-title" style={{ color: t.text, fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              📝 صورت‌جلسه
              {minutes && (
                <span style={{ padding: '2px 9px', borderRadius: '10px', fontSize: '10px', fontWeight: '600', background: minutes.finalized ? '#3dbb8222' : '#c9a84c22', color: minutes.finalized ? '#3dbb82' : '#e8c96a', border: `1px solid ${minutes.finalized ? '#3dbb8244' : '#c9a84c44'}` }}>
                  {minutes.finalized ? '✓ نهایی‌شده' : 'پیش‌نویس'}
                </span>
              )}
            </div>
            <div style={{ color: t.muted, fontSize: '11px', marginTop: '3px' }}>{meeting.title_fa} — {meeting.day_of_week} {toJalali(meeting.date)}</div>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {!loading && <PrintMinutes meeting={meeting} minutes={printMinutesData} actionItems={actionItems} attendees={attendees} />}
            <button onClick={onClose} aria-label="بستن" style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', width: '30px', height: '30px', color: t.sub, cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit' }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: t.sub, fontSize: '12px', padding: '20px' }}>⏳ در حال بارگذاری...</div>
          ) : (
            <>
              {/* خلاصه مذاکرات */}
              <div>
                <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '6px' }}>خلاصه مذاکرات</label>
                <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' as const }} disabled={!canEdit || minutes?.finalized}
                  placeholder="خلاصه‌ای از مباحث مطرح‌شده در جلسه..." value={draft.summary}
                  onChange={e => setDraft(p => ({ ...p, summary: e.target.value }))} />
              </div>

              {/* تصمیمات */}
              <div>
                <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '6px' }}>تصمیمات</label>
                <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' as const }} disabled={!canEdit || minutes?.finalized}
                  placeholder="تصمیمات نهایی جلسه..." value={draft.decisions}
                  onChange={e => setDraft(p => ({ ...p, decisions: e.target.value }))} />
              </div>

              {/* تکالیف */}
              <div>
                <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '8px' }}>تکالیف ({actionItems.length})</label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: canEdit && !minutes?.finalized ? '10px' : '0' }}>
                  {actionItems.length === 0 ? (
                    <div style={{ color: t.muted, fontSize: '12px', padding: '10px', textAlign: 'center', background: t.inner, borderRadius: '8px' }}>تکلیفی ثبت نشده</div>
                  ) : actionItems.map(ai => (
                    <div key={ai.id} style={{ background: t.inner, borderRadius: '8px', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', borderRight: `3px solid ${priorityColor[ai.priority] || '#555'}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: t.text, fontSize: '12px', fontWeight: '600' }}>{ai.title}</div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '3px' }}>
                          {ai.assigned_to_name && <span style={{ color: t.sub, fontSize: '11px' }}>👤 {ai.assigned_to_name}</span>}
                          {ai.due_date && <span style={{ color: t.muted, fontSize: '11px' }}>📅 {toJalali(ai.due_date)}</span>}
                        </div>
                      </div>
                      <span style={{ padding: '1px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '600', background: (priorityColor[ai.priority] || '#555') + '22', color: priorityColor[ai.priority] || '#555' }}>
                        {priorityLabel[ai.priority]}
                      </span>
                      {canEdit ? (
                        <select value={ai.status} onChange={e => handleItemStatus(ai.id, e.target.value)}
                          style={{ background: (statusColor[ai.status] || '#555') + '22', border: `1px solid ${(statusColor[ai.status] || '#555')}44`, borderRadius: '8px', padding: '3px 8px', color: statusColor[ai.status] || '#555', fontSize: '10px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', outline: 'none', direction: 'rtl' }}>
                          <option value="pending">در انتظار</option>
                          <option value="in_progress">در حال انجام</option>
                          <option value="done">انجام شد</option>
                          <option value="cancelled">لغو شد</option>
                        </select>
                      ) : (
                        <span style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '600', background: (statusColor[ai.status] || '#555') + '22', color: statusColor[ai.status] || '#555' }}>
                          {statusLabel[ai.status]}
                        </span>
                      )}
                      {canEdit && !minutes?.finalized && (
                        <button onClick={() => handleDeleteItem(ai.id)} aria-label="حذف تکلیف" style={{ background: '#e0555511', border: '1px solid #e0555533', borderRadius: '6px', padding: '4px 8px', color: '#e05555', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>🗑</button>
                      )}
                    </div>
                  ))}
                </div>

                {canEdit && !minutes?.finalized && (
                  <div style={{ background: t.inner, borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <input style={{ ...inputStyle, flex: 2, minWidth: '160px' }} placeholder="عنوان تکلیف"
                        value={newItem.title} onChange={e => setNewItem(p => ({ ...p, title: e.target.value }))} />
                      <select style={{ ...inputStyle, flex: 1, minWidth: '130px' }}
                        value={newItem.assigned_to_name}
                        onChange={e => {
                          const opt = attendeeOptions.find(o => o.label === e.target.value)
                          setNewItem(p => ({ ...p, assigned_to_name: e.target.value, assigned_to_user_id: opt?.user_id || '' }))
                        }}>
                        <option value="">— انتخاب مسئول —</option>
                        {attendeeOptions.map(o => <option key={o.key} value={o.label}>{o.label}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input style={{ ...inputStyle, flex: 1, minWidth: '130px' }} placeholder="یا نام مسئول را تایپ کنید"
                        value={newItem.assigned_to_name} onChange={e => setNewItem(p => ({ ...p, assigned_to_name: e.target.value, assigned_to_user_id: '' }))} />
                      <div style={{ flex: 1, minWidth: '130px' }}>
                        <JalaliDatePicker value={newItem.due_date} onChange={g => setNewItem(p => ({ ...p, due_date: g }))} placeholder="مهلت انجام" style={inputStyle} />
                      </div>
                      <select style={{ ...inputStyle, flex: '0 0 110px' }} value={newItem.priority} onChange={e => setNewItem(p => ({ ...p, priority: e.target.value }))}>
                        <option value="low">عادی</option>
                        <option value="med">متوسط</option>
                        <option value="high">مهم</option>
                        <option value="critical">فوری</option>
                      </select>
                      <button onClick={handleAddItem} className="btn-gold" style={{ padding: '8px 16px', fontSize: '12px', flexShrink: 0 }}>+ افزودن</button>
                    </div>
                  </div>
                )}
              </div>

              {/* جلسه بعدی */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '10px' }}>
                <div>
                  <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '6px' }}>تاریخ جلسه بعدی</label>
                  <JalaliDatePicker value={draft.next_meeting_date} onChange={g => setDraft(p => ({ ...p, next_meeting_date: g }))}
                    placeholder="اختیاری" style={{ ...inputStyle, opacity: (!canEdit || minutes?.finalized) ? 0.6 : 1, pointerEvents: (!canEdit || minutes?.finalized) ? 'none' : 'auto' }} />
                </div>
                <div>
                  <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '6px' }}>یادداشت جلسه بعدی</label>
                  <input style={inputStyle} disabled={!canEdit || minutes?.finalized} placeholder="موضوعات جلسه بعدی..."
                    value={draft.next_meeting_notes} onChange={e => setDraft(p => ({ ...p, next_meeting_notes: e.target.value }))} />
                </div>
              </div>

              {/* ارسال و تاریخچه */}
              {minutes && (
                <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div
                      onClick={() => setShowSendLog(v => !v)}
                      role="button" tabIndex={0}
                      onKeyDown={e => activateOnKey(e, () => setShowSendLog(v => !v))}
                      style={{ color: '#c9a84c', fontSize: '11px', cursor: 'pointer' }}>
                      {showSendLog ? '▲ بستن تاریخچه ارسال' : `▼ تاریخچه ارسال (${sendLog.length})`}
                    </div>
                    {canEdit && minutes.finalized && (
                      <button onClick={handleSend} disabled={sending} className="btn-gold" style={{ padding: '7px 16px', fontSize: '12px', opacity: sending ? 0.6 : 1 }}>
                        {sending ? 'در حال ارسال...' : `📤 ارسال صورت‌جلسه به ${attendees.length} نفر`}
                      </button>
                    )}
                  </div>
                  {showSendLog && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {sendLog.length === 0 ? (
                        <div style={{ color: t.muted, fontSize: '11px' }}>هنوز ارسال نشده</div>
                      ) : sendLog.map(log => (
                        <div key={log.id} style={{ background: t.inner, borderRadius: '8px', padding: '7px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', flexWrap: 'wrap', gap: '6px' }}>
                          <span style={{ color: t.text }}>{log.sent_to_name}{log.sent_to_email ? ` — ${log.sent_to_email}` : ''}</span>
                          <span style={{ color: t.muted }}>{toJalali(log.sent_at)} · {log.sent_via === 'email' ? '📧 ایمیل' : '📋 ثبت‌شده'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* پاورقی — دکمه‌های ذخیره */}
        {!loading && canEdit && (
          <div style={{ padding: '14px 20px', borderTop: `1px solid ${t.border}`, display: 'flex', justifyContent: 'flex-end', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
            {minutes?.finalized ? (
              <button onClick={handleReopen} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '9px 16px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                🔓 بازگشایی برای ویرایش
              </button>
            ) : (
              <>
                <button onClick={handleSaveDraft} disabled={saving} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '9px 16px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'در حال ذخیره...' : '💾 ذخیره پیش‌نویس'}
                </button>
                <button onClick={handleFinalize} disabled={saving} className="btn-gold" style={{ padding: '9px 20px', fontSize: '12px', opacity: saving ? 0.6 : 1 }}>
                  ✓ نهایی‌سازی صورت‌جلسه
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {ToastComponent}
    </div>
  )
}
