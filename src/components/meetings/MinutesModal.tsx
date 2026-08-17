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
  allMeetings?: any[]
  onNavigate?: (meeting: any) => void
}

const priorityLabel: Record<string, string> = { low: 'عادی', med: 'متوسط', high: 'مهم', critical: 'فوری' }
const priorityColor: Record<string, string> = { low: '#4a9eff', med: '#c9a84c', high: '#e09444', critical: '#e05555' }
const statusLabel: Record<string, string> = { pending: 'در انتظار', in_progress: 'در حال انجام', done: 'انجام شد', cancelled: 'لغو شد' }
const statusColor: Record<string, string> = { pending: '#c9a84c', in_progress: '#4a9eff', done: '#3dbb82', cancelled: '#e05555' }
const relationTypeLabel: Record<string, string> = { followup: 'پیگیری', related: 'مرتبط', continuation: 'ادامه' }
const attendeeRoleLabel: Record<string, string> = { decision_maker: 'تصمیم‌گیر', participant: 'شرکت‌کننده', observer: 'ناظر' }
const reminderOptions: { key: string; label: string; days: number }[] = [
  { key: '1d', label: '۱ روز قبل از مهلت', days: 1 },
  { key: '3d', label: '۳ روز قبل از مهلت', days: 3 },
  { key: '7d', label: '۱ هفته قبل از مهلت', days: 7 },
]

function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export function MinutesModal({ meeting, onClose, onChanged, allMeetings = [], onNavigate }: MinutesModalProps) {
  const { t } = useTheme()
  const { user, can } = useAuthStore()
  const { showToast, ToastComponent } = useToast()
  const isMobile = useIsMobile()
  const canEdit = can('meetings', 'update')

  const [modalTab, setModalTab] = useState<'content' | 'related' | 'signatures'>('content')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [showSendLog, setShowSendLog] = useState(false)

  const [minutes, setMinutes] = useState<any | null>(null)
  const [actionItems, setActionItems] = useState<any[]>([])
  const [remindersByItem, setRemindersByItem] = useState<Record<string, any[]>>({})
  const [attendees, setAttendees] = useState<any[]>([])
  const [sendLog, setSendLog] = useState<any[]>([])
  const [relations, setRelations] = useState<any[]>([])
  const [signatures, setSignatures] = useState<any[]>([])
  const [signing, setSigning] = useState<string | null>(null)
  const [syncingSignatures, setSyncingSignatures] = useState(false)

  const [draft, setDraft] = useState({
    summary: '', decisions: '', next_meeting_date: '', next_meeting_notes: '',
  })

  const [newItem, setNewItem] = useState({
    title: '', assigned_to_name: '', assigned_to_user_id: '', due_date: '', priority: 'med',
  })

  const [relationDraft, setRelationDraft] = useState({ targetId: '', type: 'related', note: '' })

  const fetchAttendees = useCallback(async () => {
    const { data } = await supabase.from('meeting_attendees').select('*').eq('meeting_id', meeting.id).order('created_at')
    if (data) setAttendees(data)
  }, [meeting.id])

  const fetchReminders = useCallback(async (itemIds: string[]) => {
    if (itemIds.length === 0) { setRemindersByItem({}); return }
    const { data } = await supabase.from('action_item_reminders').select('*').in('action_item_id', itemIds).order('remind_at', { ascending: true })
    if (data) {
      const map: Record<string, any[]> = {}
      data.forEach(r => { map[r.action_item_id] = [...(map[r.action_item_id] || []), r] })
      setRemindersByItem(map)
    }
  }, [])

  const fetchActionItems = useCallback(async (minutesId: string) => {
    const { data } = await supabase.from('meeting_action_items').select('*').eq('minutes_id', minutesId).order('created_at', { ascending: true })
    if (data) {
      setActionItems(data)
      fetchReminders(data.map(i => i.id))
    }
  }, [fetchReminders])

  const fetchSendLog = useCallback(async (minutesId: string) => {
    const { data } = await supabase.from('minutes_send_log').select('*').eq('minutes_id', minutesId).order('sent_at', { ascending: false })
    if (data) setSendLog(data)
  }, [])

  const fetchSignatures = useCallback(async (minutesId: string) => {
    const { data } = await supabase.from('minutes_signatures').select('*').eq('minutes_id', minutesId).order('created_at', { ascending: true })
    if (data) setSignatures(data)
  }, [])

  const fetchRelations = useCallback(async () => {
    const { data } = await supabase.from('meeting_relations').select('*').or(`meeting_id.eq.${meeting.id},related_meeting_id.eq.${meeting.id}`).order('created_at', { ascending: false })
    if (data) setRelations(data)
  }, [meeting.id])

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [{ data: m }] = await Promise.all([
      supabase.from('meeting_minutes').select('*').eq('meeting_id', meeting.id).maybeSingle(),
      fetchAttendees(),
      fetchRelations(),
    ])
    if (m) {
      setMinutes(m)
      setDraft({
        summary: m.summary || '', decisions: m.decisions || '',
        next_meeting_date: m.next_meeting_date || '', next_meeting_notes: m.next_meeting_notes || '',
      })
      await Promise.all([fetchActionItems(m.id), fetchSendLog(m.id), fetchSignatures(m.id)])
    } else {
      setMinutes(null)
      setDraft({ summary: '', decisions: '', next_meeting_date: '', next_meeting_notes: '' })
      setActionItems([])
      setSendLog([])
      setSignatures([])
      setRemindersByItem({})
    }
    setLoading(false)
  }, [meeting.id, fetchAttendees, fetchRelations, fetchActionItems, fetchSendLog, fetchSignatures])

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

  const handleAddReminder = async (item: any, days: number) => {
    if (!item.due_date) { showToast('این تکلیف مهلت انجام ندارد', 'error'); return }
    const { error } = await supabase.from('action_item_reminders').insert([{
      action_item_id: item.id,
      remind_at: subtractDays(item.due_date, days),
      sent: false,
    }])
    if (error) { showToast('خطا در ثبت یادآور', 'error'); return }
    if (minutes) fetchActionItems(minutes.id)
  }

  const handleDeleteReminder = async (id: string) => {
    await supabase.from('action_item_reminders').delete().eq('id', id)
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

  const handleAddRelation = async () => {
    if (!relationDraft.targetId) { showToast('لطفاً جلسه مرتبط را انتخاب کنید', 'error'); return }
    const { error } = await supabase.from('meeting_relations').insert([{
      meeting_id: meeting.id,
      related_meeting_id: relationDraft.targetId,
      relation_type: relationDraft.type,
      note: relationDraft.note.trim() || null,
    }])
    if (error) { showToast('خطا در ثبت ارتباط', 'error'); return }
    setRelationDraft({ targetId: '', type: 'related', note: '' })
    fetchRelations()
  }

  const handleDeleteRelation = async (id: string) => {
    await supabase.from('meeting_relations').delete().eq('id', id)
    fetchRelations()
  }

  const handleNavigateRelation = (otherId: string) => {
    const target = allMeetings.find(m => m.id === otherId)
    if (target && onNavigate) onNavigate(target)
  }

  const handleSyncSignatures = async () => {
    if (!minutes) return
    setSyncingSignatures(true)
    const existingUserIds = new Set(signatures.map(s => s.user_id))
    const rows = attendees
      .filter(a => !a.is_external && a.user_id && !existingUserIds.has(a.user_id))
      .map(a => ({
        minutes_id: minutes.id,
        user_id: a.user_id,
        user_name: a.user_name,
        user_role: attendeeRoleLabel[a.role_in_meeting] || a.role_in_meeting,
        is_signed: false,
        signature_token: crypto.randomUUID(),
      }))
    if (rows.length > 0) {
      const { error } = await supabase.from('minutes_signatures').insert(rows)
      if (error) { showToast('خطا در همگام‌سازی امضاکنندگان', 'error'); setSyncingSignatures(false); return }
      showToast(`${rows.length} امضاکننده اضافه شد`, 'success')
      fetchSignatures(minutes.id)
    } else {
      showToast('امضاکننده جدیدی برای افزودن نیست', 'info')
    }
    setSyncingSignatures(false)
  }

  const handleSign = async (signatureId: string) => {
    setSigning(signatureId)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/minutes/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ signatureId }),
    })
    const result = await res.json()
    setSigning(null)
    if (!res.ok) { showToast(result.error || 'خطا در ثبت امضا', 'error'); return }
    showToast('امضای شما ثبت شد ✅', 'success')
    if (minutes) fetchSignatures(minutes.id)
  }

  const attendeeOptions = attendees.map(a => ({
    key: a.id,
    label: a.is_external ? a.external_name : a.user_name,
    user_id: a.is_external ? '' : (a.user_id || ''),
  }))

  const otherMeetingsForRelation = allMeetings.filter(m => m.id !== meeting.id)

  const printMinutesData = { ...(minutes || {}), ...draft, finalized: minutes?.finalized || false }

  const tabs: { key: typeof modalTab; label: string }[] = [
    { key: 'content', label: 'محتوا' },
    { key: 'related', label: `جلسات مرتبط${relations.length > 0 ? ` (${relations.length})` : ''}` },
    { key: 'signatures', label: `امضاها${signatures.length > 0 ? ` (${signatures.filter(s => s.is_signed).length}/${signatures.length})` : ''}` },
  ]

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
            {!loading && <PrintMinutes meeting={meeting} minutes={printMinutesData} actionItems={actionItems} attendees={attendees} signatures={signatures} />}
            <button onClick={onClose} aria-label="بستن" style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', width: '30px', height: '30px', color: t.sub, cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit' }}>✕</button>
          </div>
        </div>

        {/* تب‌ها */}
        <div role="tablist" aria-label="بخش‌های صورت‌جلسه" style={{ display: 'flex', gap: '6px', padding: '10px 20px 0', flexShrink: 0, flexWrap: 'wrap' }}>
          {tabs.map(tb => (
            <div key={tb.key} onClick={() => setModalTab(tb.key)}
              role="tab" tabIndex={0} aria-selected={modalTab === tb.key}
              onKeyDown={e => activateOnKey(e, () => setModalTab(tb.key))}
              style={{
                padding: '7px 14px', borderRadius: '8px 8px 0 0', fontSize: '12px', cursor: 'pointer',
                background: modalTab === tb.key ? t.inner : 'transparent',
                borderBottom: modalTab === tb.key ? '2px solid #c9a84c' : '2px solid transparent',
                color: modalTab === tb.key ? '#e8c96a' : t.sub, fontWeight: modalTab === tb.key ? '600' : '400',
              }}>
              {tb.label}
            </div>
          ))}
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: t.sub, fontSize: '12px', padding: '20px' }}>⏳ در حال بارگذاری...</div>
          ) : modalTab === 'content' ? (
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
                    <div key={ai.id} style={{ background: t.inner, borderRadius: '8px', padding: '9px 12px', borderRight: `3px solid ${priorityColor[ai.priority] || '#555'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: t.text, fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {ai.title}
                            {ai.is_carried_over && <span style={{ padding: '1px 7px', borderRadius: '8px', fontSize: '9px', background: '#8b90a822', color: '#8b90a8', border: '1px solid #8b90a844' }}>↻ منتقل‌شده</span>}
                          </div>
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

                      {/* یادآورها */}
                      {(canEdit || (remindersByItem[ai.id]?.length ?? 0) > 0) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '7px', paddingTop: '7px', borderTop: `1px solid ${t.border}` }}>
                          {(remindersByItem[ai.id] || []).map(rem => (
                            <span key={rem.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '8px', fontSize: '10px', background: rem.sent ? t.card : '#c9a84c22', border: `1px solid ${rem.sent ? t.border : '#c9a84c44'}`, color: rem.sent ? t.muted : '#e8c96a' }}>
                              🔔 {toJalali(rem.remind_at)}{rem.sent ? ' ✓' : ''}
                              {canEdit && (
                                <span onClick={() => handleDeleteReminder(rem.id)} role="button" tabIndex={0}
                                  onKeyDown={e => activateOnKey(e, () => handleDeleteReminder(rem.id))}
                                  aria-label="حذف یادآور" style={{ cursor: 'pointer' }}>✕</span>
                              )}
                            </span>
                          ))}
                          {canEdit && (
                            <select value="" onChange={e => { if (e.target.value) handleAddReminder(ai, Number(e.target.value)) }}
                              disabled={!ai.due_date} title={!ai.due_date ? 'ابتدا مهلت انجام را تعیین کنید' : ''}
                              style={{ background: 'transparent', border: `1px dashed ${t.border}`, borderRadius: '8px', padding: '2px 8px', color: t.muted, fontSize: '10px', cursor: ai.due_date ? 'pointer' : 'default', fontFamily: 'inherit', outline: 'none', direction: 'rtl' }}>
                              <option value="">+ یادآور</option>
                              {reminderOptions.map(o => <option key={o.key} value={o.days}>{o.label}</option>)}
                            </select>
                          )}
                        </div>
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
          ) : modalTab === 'related' ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {relations.length === 0 ? (
                  <div style={{ color: t.muted, fontSize: '12px', padding: '20px', textAlign: 'center', background: t.inner, borderRadius: '8px' }}>جلسه مرتبطی ثبت نشده</div>
                ) : relations.map(rel => {
                  const otherId = rel.meeting_id === meeting.id ? rel.related_meeting_id : rel.meeting_id
                  const other = allMeetings.find(m => m.id === otherId)
                  return (
                    <div key={rel.id} style={{ background: t.inner, borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ padding: '2px 9px', borderRadius: '8px', fontSize: '10px', fontWeight: '600', background: '#4a9eff22', color: '#4a9eff', border: '1px solid #4a9eff44', flexShrink: 0 }}>
                        {relationTypeLabel[rel.relation_type] || rel.relation_type}
                      </span>
                      <div
                        onClick={() => handleNavigateRelation(otherId)}
                        role="button" tabIndex={0}
                        onKeyDown={e => activateOnKey(e, () => handleNavigateRelation(otherId))}
                        style={{ flex: 1, minWidth: 0, cursor: other ? 'pointer' : 'default' }}>
                        <div style={{ color: other ? '#e8c96a' : t.muted, fontSize: '12px', fontWeight: '600' }}>{other ? other.title_fa : 'جلسه دیگر'}</div>
                        {other && <div style={{ color: t.muted, fontSize: '11px', marginTop: '2px' }}>{other.day_of_week} {toJalali(other.date)}</div>}
                        {rel.note && <div style={{ color: t.sub, fontSize: '11px', marginTop: '2px' }}>{rel.note}</div>}
                      </div>
                      {canEdit && (
                        <button onClick={() => handleDeleteRelation(rel.id)} aria-label="حذف ارتباط" style={{ background: '#e0555511', border: '1px solid #e0555533', borderRadius: '6px', padding: '4px 8px', color: '#e05555', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>🗑</button>
                      )}
                    </div>
                  )
                })}
              </div>

              {canEdit && (
                <div style={{ background: t.inner, borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <select style={{ ...inputStyle, flex: 2, minWidth: '180px' }} value={relationDraft.targetId} onChange={e => setRelationDraft(p => ({ ...p, targetId: e.target.value }))}>
                      <option value="">— انتخاب جلسه —</option>
                      {otherMeetingsForRelation.map(m => (
                        <option key={m.id} value={m.id}>{m.day_of_week} {toJalali(m.date)} — {m.title_fa}</option>
                      ))}
                    </select>
                    <select style={{ ...inputStyle, flex: '0 0 130px' }} value={relationDraft.type} onChange={e => setRelationDraft(p => ({ ...p, type: e.target.value }))}>
                      <option value="followup">پیگیری</option>
                      <option value="related">مرتبط</option>
                      <option value="continuation">ادامه</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input style={{ ...inputStyle, flex: 1, minWidth: '160px' }} placeholder="یادداشت (اختیاری)"
                      value={relationDraft.note} onChange={e => setRelationDraft(p => ({ ...p, note: e.target.value }))} />
                    <button onClick={handleAddRelation} className="btn-gold" style={{ padding: '8px 18px', fontSize: '12px', flexShrink: 0 }}>+ افزودن ارتباط</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {!minutes ? (
                <div style={{ color: t.muted, fontSize: '12px', padding: '20px', textAlign: 'center', background: t.inner, borderRadius: '8px' }}>ابتدا صورت‌جلسه را ذخیره کنید</div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ color: t.sub, fontSize: '11px' }}>
                      {signatures.filter(s => s.is_signed).length} از {signatures.length} نفر امضا کرده‌اند
                    </div>
                    {canEdit && (
                      <button onClick={handleSyncSignatures} disabled={syncingSignatures} style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '6px 14px', color: t.sub, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', opacity: syncingSignatures ? 0.6 : 1 }}>
                        {syncingSignatures ? 'در حال همگام‌سازی...' : '🔄 همگام‌سازی از شرکت‌کنندگان'}
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {signatures.length === 0 ? (
                      <div style={{ color: t.muted, fontSize: '12px', padding: '20px', textAlign: 'center', background: t.inner, borderRadius: '8px' }}>امضاکننده‌ای ثبت نشده</div>
                    ) : signatures.map(sig => (
                      <div key={sig.id} style={{ background: t.inner, borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: t.text, fontSize: '12px', fontWeight: '600' }}>{sig.user_name}</div>
                          <div style={{ color: t.muted, fontSize: '11px', marginTop: '2px' }}>{sig.user_role}</div>
                        </div>
                        {sig.is_signed ? (
                          <span style={{ padding: '2px 9px', borderRadius: '8px', fontSize: '10px', fontWeight: '600', background: '#3dbb8222', color: '#3dbb82', border: '1px solid #3dbb8244' }}>
                            ✓ امضا شد — {toJalali(sig.signed_at)}
                          </span>
                        ) : sig.user_id === user?.id ? (
                          <button onClick={() => handleSign(sig.id)} disabled={signing === sig.id} className="btn-gold" style={{ padding: '6px 14px', fontSize: '11px', opacity: signing === sig.id ? 0.6 : 1 }}>
                            {signing === sig.id ? 'در حال ثبت...' : '✍️ امضای من'}
                          </button>
                        ) : (
                          <span style={{ padding: '2px 9px', borderRadius: '8px', fontSize: '10px', fontWeight: '600', background: '#c9a84c22', color: '#e8c96a', border: '1px solid #c9a84c44' }}>
                            ⏳ در انتظار امضا
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* پاورقی — دکمه‌های ذخیره (فقط در تب محتوا) */}
        {!loading && canEdit && modalTab === 'content' && (
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
