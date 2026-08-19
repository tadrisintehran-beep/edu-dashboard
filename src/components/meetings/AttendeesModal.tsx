'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { useIsMobile } from '@/lib/useIsMobile'
import { activateOnKey } from '@/lib/a11y'

interface AttendeesModalProps {
  meeting: any
  onClose: () => void
}

type AddMode = 'internal' | 'org' | 'expert'

const roleLabel: Record<string, string> = {
  decision_maker: 'تصمیم‌گیر', participant: 'شرکت‌کننده', observer: 'ناظر',
}
const roleColor: Record<string, string> = {
  decision_maker: '#e05555', participant: '#4a9eff', observer: '#8b90a8',
}
const externalTypeLabel: Record<string, string> = {
  organization: 'سازمان/نهاد خارجی', expert: 'کارشناس مدعو',
}

export function AttendeesModal({ meeting, onClose }: AttendeesModalProps) {
  const { t } = useTheme()
  const { showToast, ToastComponent } = useToast()
  const isMobile = useIsMobile()

  const [attendees, setAttendees] = useState<any[]>([])
  const [deptProfiles, setDeptProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const [mode, setMode] = useState<AddMode>('internal')
  const [form, setForm] = useState({
    user_id: '', role_in_meeting: 'participant',
    external_name: '', external_org: '',
  })

  const fetchAttendees = useCallback(async () => {
    const { data } = await supabase
      .from('meeting_attendees')
      .select('*')
      .eq('meeting_id', meeting.id)
      .order('created_at', { ascending: true })
    if (data) setAttendees(data)
  }, [meeting.id])

  const fetchDeptProfiles = useCallback(async () => {
    if (!meeting.department_id) return
    const { data } = await supabase
      .from('profiles')
      .select('id, name_fa, role, departments(name_fa)')
      .eq('department_id', meeting.department_id)
      .eq('is_active', true)
    if (data) setDeptProfiles(data)
  }, [meeting.department_id])

  useEffect(() => {
    (async () => {
      setLoading(true)
      await Promise.all([fetchAttendees(), fetchDeptProfiles()])
      setLoading(false)
    })()
  }, [fetchAttendees, fetchDeptProfiles])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const resetForm = () => setForm({ user_id: '', role_in_meeting: 'participant', external_name: '', external_org: '' })

  const handleAdd = async () => {
    if (mode === 'internal') {
      if (!form.user_id) { showToast('لطفاً یک نفر را انتخاب کنید', 'error'); return }
      if (attendees.some(a => a.user_id === form.user_id)) { showToast('این شخص قبلاً اضافه شده', 'error'); return }
      const profile = deptProfiles.find(p => p.id === form.user_id)
      setSaving(true)
      const { error } = await supabase.from('meeting_attendees').insert([{
        meeting_id: meeting.id,
        user_id: form.user_id,
        user_name: profile?.name_fa || '',
        role_in_meeting: form.role_in_meeting,
        department_name: profile?.departments?.name_fa || null,
        is_external: false,
        attended: false,
      }])
      setSaving(false)
      if (error) { showToast('خطا در افزودن شرکت‌کننده', 'error'); return }
    } else {
      if (!form.external_name.trim()) { showToast('لطفاً نام را وارد کنید', 'error'); return }
      setSaving(true)
      const { error } = await supabase.from('meeting_attendees').insert([{
        meeting_id: meeting.id,
        external_name: form.external_name.trim(),
        external_org: form.external_org.trim() || null,
        external_type: mode === 'org' ? 'organization' : 'expert',
        role_in_meeting: form.role_in_meeting,
        is_external: true,
        attended: false,
      }])
      setSaving(false)
      if (error) { showToast('خطا در افزودن شرکت‌کننده', 'error'); return }
    }
    showToast('شرکت‌کننده اضافه شد ✅', 'success')
    resetForm()
    fetchAttendees()
  }

  const toggleAttended = async (id: string, current: boolean) => {
    await supabase.from('meeting_attendees').update({ attended: !current }).eq('id', id)
    fetchAttendees()
  }

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return
    await supabase.from('meeting_attendees').delete().eq('id', confirmDelete)
    showToast('شرکت‌کننده حذف شد', 'info')
    setConfirmDelete(null)
    fetchAttendees()
  }

  const inputStyle = {
    width: '100%', background: t.input, border: `1px solid ${t.border}`,
    borderRadius: '8px', padding: '8px 12px', color: t.text,
    fontSize: '12px', outline: 'none', direction: 'rtl' as const, fontFamily: 'inherit',
  }

  const modeTabs: { key: AddMode; label: string }[] = [
    { key: 'internal', label: 'همکار داخلی' },
    { key: 'org', label: 'سازمان خارجی' },
    { key: 'expert', label: 'کارشناس مدعو' },
  ]

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="attendees-modal-title" style={{
      position: 'fixed', inset: 0, background: '#00000077',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9998, direction: 'rtl', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease', padding: '16px',
    }}>
      <div style={{
        background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px',
        width: '100%', maxWidth: '640px', maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        animation: 'fadeInUp 0.2s ease', boxShadow: '0 20px 60px #00000055',
      }}>
        {/* هدر */}
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div id="attendees-modal-title" style={{ color: t.text, fontSize: '14px', fontWeight: '700' }}>👥 شرکت‌کنندگان</div>
            <div style={{ color: t.muted, fontSize: '11px', marginTop: '3px' }}>{meeting.title_fa}</div>
          </div>
          <button onClick={onClose} aria-label="بستن" style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', width: '30px', height: '30px', color: t.sub, cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit' }}>✕</button>
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: t.sub, fontSize: '12px', padding: '20px' }}>⏳ در حال بارگذاری...</div>
          ) : (
            <>
              {/* فرم افزودن */}
              <div style={{ background: t.inner, borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                <div role="tablist" aria-label="نوع شرکت‌کننده" style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {modeTabs.map(mt => (
                    <div key={mt.key} onClick={() => { setMode(mt.key); resetForm() }}
                      role="tab" tabIndex={0} aria-selected={mode === mt.key}
                      onKeyDown={e => activateOnKey(e, () => { setMode(mt.key); resetForm() })}
                      style={{
                        padding: '6px 12px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer',
                        background: mode === mt.key ? '#c9a84c22' : t.card,
                        border: mode === mt.key ? '1px solid #c9a84c44' : `1px solid ${t.border}`,
                        color: mode === mt.key ? t.goldText : t.sub,
                      }}>
                      {mt.label}
                    </div>
                  ))}
                </div>

                {mode === 'internal' ? (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                    <select style={inputStyle} value={form.user_id} onChange={e => setForm(p => ({ ...p, user_id: e.target.value }))}>
                      <option value="">— انتخاب همکار —</option>
                      {deptProfiles.map(p => <option key={p.id} value={p.id}>{p.name_fa}</option>)}
                    </select>
                    <select style={{ ...inputStyle, maxWidth: isMobile ? '100%' : '150px' }} value={form.role_in_meeting} onChange={e => setForm(p => ({ ...p, role_in_meeting: e.target.value }))}>
                      <option value="decision_maker">تصمیم‌گیر</option>
                      <option value="participant">شرکت‌کننده</option>
                      <option value="observer">ناظر</option>
                    </select>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                    <input style={inputStyle} placeholder={mode === 'org' ? 'نام نماینده' : 'نام کارشناس'}
                      value={form.external_name} onChange={e => setForm(p => ({ ...p, external_name: e.target.value }))} />
                    <input style={inputStyle} placeholder={mode === 'org' ? 'نام سازمان' : 'عنوان/تخصص'}
                      value={form.external_org} onChange={e => setForm(p => ({ ...p, external_org: e.target.value }))} />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button onClick={handleAdd} disabled={saving} className="btn-gold" style={{ padding: '7px 18px', fontSize: '12px', opacity: saving ? 0.6 : 1 }}>
                    {saving ? 'در حال ثبت...' : '+ افزودن'}
                  </button>
                </div>
              </div>

              {/* فهرست */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {attendees.length === 0 ? (
                  <div style={{ textAlign: 'center', color: t.muted, fontSize: '12px', padding: '20px' }}>هنوز شرکت‌کننده‌ای اضافه نشده</div>
                ) : attendees.map(a => (
                  <div key={a.id} style={{ background: t.inner, borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ color: t.text, fontSize: '12px', fontWeight: '600' }}>{a.is_external ? a.external_name : a.user_name}</span>
                        <span style={{ padding: '1px 7px', borderRadius: '8px', fontSize: '10px', fontWeight: '600', background: (roleColor[a.role_in_meeting] || '#555') + '22', color: roleColor[a.role_in_meeting] || '#555' }}>
                          {roleLabel[a.role_in_meeting] || a.role_in_meeting}
                        </span>
                        {a.is_external && (
                          <span style={{ padding: '1px 7px', borderRadius: '8px', fontSize: '10px', background: '#e0944422', color: '#e09444', border: '1px solid #e0944444' }}>
                            {externalTypeLabel[a.external_type] || a.external_type}
                          </span>
                        )}
                      </div>
                      <div style={{ color: t.muted, fontSize: '11px', marginTop: '2px' }}>
                        {a.is_external ? (a.external_org || '—') : (a.department_name || '—')}
                      </div>
                    </div>
                    <div
                      onClick={() => toggleAttended(a.id, a.attended)}
                      role="button" tabIndex={0} aria-pressed={a.attended}
                      onKeyDown={e => activateOnKey(e, () => toggleAttended(a.id, a.attended))}
                      style={{
                        padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '600', cursor: 'pointer',
                        background: a.attended ? '#3dbb8222' : t.card, border: `1px solid ${a.attended ? '#3dbb8244' : t.border}`,
                        color: a.attended ? t.greenText : t.muted,
                      }}>
                      {a.attended ? '✓ حاضر' : 'حضور؟'}
                    </div>
                    <button onClick={() => setConfirmDelete(a.id)} aria-label="حذف شرکت‌کننده" style={{ background: '#e0555511', border: '1px solid #e0555533', borderRadius: '6px', padding: '4px 8px', color: t.redText, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>🗑</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '20px', maxWidth: '340px', textAlign: 'center' }}>
            <div style={{ color: t.text, fontSize: '13px', marginBottom: '16px' }}>حذف این شرکت‌کننده؟</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '9px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>انصراف</button>
              <button onClick={confirmDeleteAction} style={{ flex: 1, background: '#e0555522', border: '1px solid #e0555544', borderRadius: '8px', padding: '9px', color: t.redText, fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>حذف</button>
            </div>
          </div>
        </div>
      )}
      {ToastComponent}
    </div>
  )
}
