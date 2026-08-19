'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useIsMobile } from '@/lib/useIsMobile'
import { useAuthStore } from '@/stores/authStore'
import { JalaliDatePicker } from '@/components/ui/JalaliDatePicker'
import { toJalali } from '@/lib/date'
import { activateOnKey } from '@/lib/a11y'
import { ALLOWED_UPLOAD_EXT, validateUploadFile } from '@/lib/fileValidation'
import { PRIORITY_LABELS as priorityLabel, PRIORITY_COLORS as priorityColor } from '@/lib/constants'
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

const typeLabel: Record<string, string> = { incoming: 'وارده', outgoing: 'صادره' }
const typeColor: Record<string, string> = { incoming: '#4a9eff', outgoing: '#3dbb82' }

const statusColor: Record<string, string> = {
  open: '#c9a84c', referred: '#4a9eff', in_progress: '#4a9eff', done: '#3dbb82', archived: '#8a8a8a',
}
const statusLabel: Record<string, string> = {
  open: 'باز', referred: 'ارجاع شده', in_progress: 'در حال انجام', done: 'انجام شد', archived: 'بایگانی',
}

const referralStatusColor: Record<string, string> = {
  pending: '#c9a84c', in_progress: '#4a9eff', done: '#3dbb82',
}
const referralStatusLabel: Record<string, string> = {
  pending: 'در انتظار', in_progress: 'در حال انجام', done: 'انجام شد',
}

export default function LettersPage() {
  const { t } = useTheme()
  const { user, can } = useAuthStore()
  const { showToast, ToastComponent } = useToast()
  const isMobile = useIsMobile()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [letters, setLetters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'incoming' | 'outgoing'>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [attachFile, setAttachFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const [newLetter, setNewLetter] = useState({
    number: '', subject: '', type: 'incoming', correspondent: '',
    letter_date: '', priority: 'low',
  })

  // ارجاعات هر نامه + کاربران هم‌معاونت برای انتخاب گیرنده‌ی ارجاع
  const [referrals, setReferrals] = useState<Record<string, any[]>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deptUsersByDept, setDeptUsersByDept] = useState<Record<string, any[]>>({})
  const [referralForm, setReferralForm] = useState<{ letterId: string | null; to: string; note: string; due: string }>({
    letterId: null, to: '', note: '', due: '',
  })

  const fetchLetters = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('letters')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setLetters(data)
    else if (error) showToast('خطا در دریافت نامه‌ها', 'error')
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDeptUsers = useCallback(async (departmentId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name_fa')
      .eq('department_id', departmentId)
      .eq('is_active', true)
      .neq('id', user?.id || '')
    if (data) setDeptUsersByDept(prev => ({ ...prev, [departmentId]: data }))
  }, [user?.id])

  const fetchReferrals = useCallback(async (letterId: string) => {
    const { data } = await supabase
      .from('letter_referrals')
      .select('*, to_profile:profiles!letter_referrals_to_user_id_fkey(name_fa), from_profile:profiles!letter_referrals_from_user_id_fkey(name_fa)')
      .eq('letter_id', letterId)
      .order('created_at', { ascending: false })
    if (data) setReferrals(prev => ({ ...prev, [letterId]: data }))
  }, [])

  useEffect(() => {
    fetchLetters()
    const channel = supabase
      .channel('letters-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'letters' }, fetchLetters)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'letter_referrals' }, () => {
        if (expanded) fetchReferrals(expanded)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchLetters])

  const toggleExpand = (id: string) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    fetchReferrals(id)
  }

  const validateFile = (file: File): boolean => {
    const error = validateUploadFile(file)
    if (error) {
      showToast(error, 'error')
      return false
    }
    return true
  }

  const resetForm = () => {
    setNewLetter({ number: '', subject: '', type: 'incoming', correspondent: '', letter_date: '', priority: 'low' })
    setAttachFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAdd = async () => {
    if (!newLetter.subject.trim()) {
      showToast('لطفاً موضوع نامه را وارد کنید', 'error')
      return
    }
    setSaving(true)

    let attachment_path: string | null = null
    let attachment_name: string | null = null
    if (attachFile) {
      const ext = attachFile.name.split('.').pop()
      const path = `letters/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, attachFile)
      if (uploadError) {
        showToast('خطا در آپلود پیوست: ' + uploadError.message, 'error')
        setSaving(false)
        return
      }
      attachment_path = path
      attachment_name = attachFile.name
    }

    const { error } = await supabase.from('letters').insert([{
      number: newLetter.number.trim() || null,
      subject: newLetter.subject.trim(),
      type: newLetter.type,
      correspondent: newLetter.correspondent.trim() || null,
      letter_date: newLetter.letter_date || null,
      priority: newLetter.priority,
      attachment_path,
      attachment_name,
    }])

    setSaving(false)
    if (error) {
      showToast('خطا در ثبت نامه', 'error')
      return
    }
    showToast('نامه با موفقیت ثبت شد ✅', 'success')
    resetForm()
    setShowForm(false)
    fetchLetters()
  }

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from('letters').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    showToast('وضعیت نامه بروزرسانی شد', 'success')
    fetchLetters()
  }

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return
    const { error } = await supabase.from('letters').delete().eq('id', confirmDelete)
    if (error) showToast('خطا در حذف نامه', 'error')
    else showToast('نامه حذف شد', 'info')
    setConfirmDelete(null)
    fetchLetters()
  }

  const handleDownload = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from('documents').download(path)
    if (error || !data) {
      showToast('خطا در دانلود پیوست', 'error')
      return
    }
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  const openReferralForm = (letterId: string, departmentId: string) => {
    setReferralForm({ letterId, to: '', note: '', due: '' })
    if (!deptUsersByDept[departmentId]) fetchDeptUsers(departmentId)
  }

  const submitReferral = async () => {
    if (!referralForm.letterId || !referralForm.to) {
      showToast('لطفاً گیرنده‌ی ارجاع را انتخاب کنید', 'error')
      return
    }
    const { error } = await supabase.from('letter_referrals').insert([{
      letter_id: referralForm.letterId,
      to_user_id: referralForm.to,
      note: referralForm.note.trim() || null,
      due_date: referralForm.due || null,
    }])
    if (error) {
      showToast('ارجاع فقط در داخل همان معاونت مجاز است', 'error')
      return
    }
    showToast('نامه ارجاع داده شد ✅', 'success')
    setReferralForm({ letterId: null, to: '', note: '', due: '' })
    fetchReferrals(referralForm.letterId)
    fetchLetters()
  }

  const handleReferralStatus = async (referralId: string, letterId: string, status: string) => {
    await supabase.from('letter_referrals').update({
      status, completed_at: status === 'done' ? new Date().toISOString() : null,
    }).eq('id', referralId)
    fetchReferrals(letterId)
  }

  const filtered = letters.filter(l =>
    (filterType === 'all' || l.type === filterType) &&
    (filterStatus === 'all' || l.status === filterStatus)
  )
  const openCount = letters.filter(l => l.status === 'open').length

  const inputStyle = {
    width: '100%', background: t.input, border: `1px solid ${t.border}`,
    borderRadius: '8px', padding: '8px 12px', color: t.text,
    fontSize: '12px', outline: 'none', direction: 'rtl' as const, fontFamily: 'inherit',
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <Skeleton width="140px" height="20px" />
        <Skeleton width="140px" height="36px" borderRadius="8px" />
      </div>
      <SkeletonList rows={6} stripe lines={2} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', direction: 'rtl' }}>

      {/* هدر */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ color: t.text, fontSize: isMobile ? '16px' : '18px', fontWeight: '700' }}>گردش نامه</h1>
          <p style={{ color: t.muted, fontSize: '12px', marginTop: '4px' }}>
            {letters.length} نامه — {openCount} باز
          </p>
        </div>
        {can('letters', 'create') && (
          <button onClick={() => setShowForm(!showForm)} className="btn-gold">+ نامه جدید</button>
        )}
      </div>

      {/* فیلتر نوع */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {([
          { key: 'all', label: 'همه' },
          { key: 'incoming', label: 'وارده' },
          { key: 'outgoing', label: 'صادره' },
        ] as const).map(f => (
          <div key={f.key} onClick={() => setFilterType(f.key)}
            role="button" tabIndex={0} aria-pressed={filterType === f.key}
            onKeyDown={e => activateOnKey(e, () => setFilterType(f.key))}
            style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
              background: filterType === f.key ? '#c9a84c22' : t.card,
              border: filterType === f.key ? '1px solid #c9a84c44' : `1px solid ${t.border}`,
              color: filterType === f.key ? t.goldText : t.sub,
            }}>
            {f.label}
          </div>
        ))}
        <div style={{ width: '1px', background: t.border, margin: '0 4px' }} />
        {([
          { key: 'all', label: 'همه وضعیت‌ها' },
          { key: 'open', label: 'باز' },
          { key: 'referred', label: 'ارجاع شده' },
          { key: 'in_progress', label: 'در حال انجام' },
          { key: 'done', label: 'انجام شد' },
          { key: 'archived', label: 'بایگانی' },
        ]).map(f => (
          <div key={f.key} onClick={() => setFilterStatus(f.key)}
            role="button" tabIndex={0} aria-pressed={filterStatus === f.key}
            onKeyDown={e => activateOnKey(e, () => setFilterStatus(f.key))}
            style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
              background: filterStatus === f.key ? '#4a9eff22' : t.card,
              border: filterStatus === f.key ? '1px solid #4a9eff44' : `1px solid ${t.border}`,
              color: filterStatus === f.key ? t.blueText : t.sub,
            }}>
            {f.label}
          </div>
        ))}
      </div>

      {/* فرم نامه جدید */}
      {showForm && (
        <div style={{ background: t.card, border: '1px solid #c9a84c33', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: t.goldText, fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
            ✉️ ثبت نامه جدید
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>موضوع نامه *</label>
              <input style={inputStyle} placeholder="مثال: پیگیری اجرای بخشنامه شماره..."
                value={newLetter.subject} onChange={e => setNewLetter(p => ({ ...p, subject: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>شماره نامه</label>
              <input style={inputStyle} placeholder="مثال: ۱۲۳۴۵/۱۴۰۳"
                value={newLetter.number} onChange={e => setNewLetter(p => ({ ...p, number: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>نوع نامه</label>
              <select style={inputStyle} value={newLetter.type} onChange={e => setNewLetter(p => ({ ...p, type: e.target.value }))}>
                <option value="incoming">وارده</option>
                <option value="outgoing">صادره</option>
              </select>
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>
                {newLetter.type === 'incoming' ? 'فرستنده' : 'گیرنده'}
              </label>
              <input style={inputStyle} placeholder="نام سازمان یا شخص"
                value={newLetter.correspondent} onChange={e => setNewLetter(p => ({ ...p, correspondent: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>تاریخ نامه</label>
              <JalaliDatePicker
                value={newLetter.letter_date}
                onChange={(gregorian) => setNewLetter(p => ({ ...p, letter_date: gregorian }))}
                placeholder="انتخاب تاریخ شمسی"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>اولویت</label>
              <select style={inputStyle} value={newLetter.priority} onChange={e => setNewLetter(p => ({ ...p, priority: e.target.value }))}>
                <option value="low">عادی</option>
                <option value="med">متوسط</option>
                <option value="high">مهم</option>
                <option value="critical">فوری</option>
              </select>
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>پیوست (اختیاری)</label>
              <input ref={fileInputRef} type="file" accept={ALLOWED_UPLOAD_EXT} style={inputStyle}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f && validateFile(f)) setAttachFile(f)
                  else if (f) { e.target.value = '' }
                }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); resetForm() }} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 16px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>انصراف</button>
            <button onClick={handleAdd} disabled={saving} className="btn-gold" style={{ padding: '8px 20px', fontSize: '12px', opacity: saving ? 0.6 : 1, cursor: saving ? 'default' : 'pointer' }}>
              {saving ? 'در حال ثبت...' : 'ثبت نامه'}
            </button>
          </div>
        </div>
      )}

      {/* فهرست نامه‌ها */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.length === 0 ? (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px' }}>
            {(filterType !== 'all' || filterStatus !== 'all') ? (
              <EmptyState variant="no-results" icon="🔍" title="نامه‌ای یافت نشد"
                description="فیلترهای انتخاب‌شده نتیجه‌ای نداشتند" actionLabel="پاک کردن فیلترها"
                onAction={() => { setFilterType('all'); setFilterStatus('all') }} />
            ) : (
              <EmptyState variant="empty" icon="✉️" title="نامه‌ای ثبت نشده"
                description="نامه‌های وارده و صادره در اینجا نمایش داده می‌شوند"
                actionLabel={can('letters', 'create') ? '+ نامه جدید' : undefined}
                onAction={can('letters', 'create') ? () => setShowForm(true) : undefined} />
            )}
          </div>
        ) : filtered.map(letter => (
          <div key={letter.id} style={{
            background: t.card, border: `1px solid ${t.border}`,
            borderRadius: '12px', padding: '14px 16px',
            borderRight: `4px solid ${priorityColor[letter.priority] || '#555'}`,
            opacity: letter.status === 'archived' ? 0.6 : 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <span style={{ padding: '1px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '600', background: typeColor[letter.type] + '22', color: typeColor[letter.type] }}>
                    {typeLabel[letter.type]}
                  </span>
                  <span style={{ color: t.text, fontSize: '13px', fontWeight: '600' }}>{letter.subject}</span>
                  <span style={{ padding: '1px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '600', background: (priorityColor[letter.priority] || '#555') + '22', color: priorityColor[letter.priority] || '#555' }}>
                    {priorityLabel[letter.priority]}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {letter.number && <span style={{ color: t.muted, fontSize: '11px' }}>🔢 {letter.number}</span>}
                  {letter.correspondent && <span style={{ color: t.muted, fontSize: '11px' }}>👤 {letter.correspondent}</span>}
                  {letter.letter_date && <span style={{ color: t.muted, fontSize: '11px' }}>📅 {toJalali(letter.letter_date)}</span>}
                  {letter.attachment_path && (
                    <span onClick={() => handleDownload(letter.attachment_path, letter.attachment_name)}
                      role="button" tabIndex={0}
                      onKeyDown={e => activateOnKey(e, () => handleDownload(letter.attachment_path, letter.attachment_name))}
                      style={{ color: t.blueText, fontSize: '11px', cursor: 'pointer' }}>
                      📎 {letter.attachment_name}
                    </span>
                  )}
                </div>

                <div
                  onClick={() => toggleExpand(letter.id)}
                  role="button" tabIndex={0}
                  onKeyDown={e => activateOnKey(e, () => toggleExpand(letter.id))}
                  style={{ color: t.goldText, fontSize: '11px', marginTop: '8px', cursor: 'pointer' }}
                >
                  {expanded === letter.id ? '▲ بستن ارجاعات' : `▼ ارجاعات (${referrals[letter.id]?.length ?? '…'})`}
                </div>

                {expanded === letter.id && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(referrals[letter.id] || []).map(ref => (
                      <div key={ref.id} style={{ background: t.inner, borderRadius: '8px', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: t.text, fontSize: '11px' }}>
                            {ref.from_profile?.name_fa || '—'} ← ارجاع به ← {ref.to_profile?.name_fa || '—'}
                          </div>
                          {ref.note && <div style={{ color: t.muted, fontSize: '11px', marginTop: '2px' }}>{ref.note}</div>}
                          {ref.due_date && <div style={{ color: t.muted, fontSize: '10px', marginTop: '2px' }}>مهلت: {toJalali(ref.due_date)}</div>}
                        </div>
                        {ref.to_user_id === user?.id ? (
                          <select value={ref.status} onChange={e => handleReferralStatus(ref.id, letter.id, e.target.value)}
                            style={{
                              background: (referralStatusColor[ref.status] || '#555') + '22',
                              border: `1px solid ${(referralStatusColor[ref.status] || '#555')}44`,
                              borderRadius: '8px', padding: '3px 8px', color: referralStatusColor[ref.status] || '#555',
                              fontSize: '10px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', outline: 'none', direction: 'rtl',
                            }}>
                            <option value="pending">در انتظار</option>
                            <option value="in_progress">در حال انجام</option>
                            <option value="done">انجام شد</option>
                          </select>
                        ) : (
                          <span style={{ background: (referralStatusColor[ref.status] || '#555') + '22', border: `1px solid ${(referralStatusColor[ref.status] || '#555')}44`, borderRadius: '8px', padding: '3px 8px', color: referralStatusColor[ref.status] || '#555', fontSize: '10px', fontWeight: '600' }}>
                            {referralStatusLabel[ref.status]}
                          </span>
                        )}
                      </div>
                    ))}
                    {(referrals[letter.id]?.length ?? 0) === 0 && (
                      <div style={{ color: t.muted, fontSize: '11px' }}>هنوز ارجاعی ثبت نشده</div>
                    )}

                    {can('letters', 'update') && (
                      referralForm.letterId === letter.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: t.inner, borderRadius: '8px', padding: '10px' }}>
                          <select style={inputStyle} value={referralForm.to} onChange={e => setReferralForm(p => ({ ...p, to: e.target.value }))}>
                            <option value="">— انتخاب گیرنده (هم‌معاونت) —</option>
                            {(deptUsersByDept[letter.department_id] || []).map(u => <option key={u.id} value={u.id}>{u.name_fa}</option>)}
                          </select>
                          <input style={inputStyle} placeholder="توضیح ارجاع (اختیاری)"
                            value={referralForm.note} onChange={e => setReferralForm(p => ({ ...p, note: e.target.value }))} />
                          <JalaliDatePicker
                            value={referralForm.due}
                            onChange={(gregorian) => setReferralForm(p => ({ ...p, due: gregorian }))}
                            placeholder="مهلت انجام (اختیاری)"
                            style={inputStyle}
                          />
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setReferralForm({ letterId: null, to: '', note: '', due: '' })}
                              style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 12px', color: t.sub, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>انصراف</button>
                            <button onClick={submitReferral} className="btn-gold" style={{ padding: '6px 14px', fontSize: '11px' }}>ثبت ارجاع</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => openReferralForm(letter.id, letter.department_id)}
                          style={{ alignSelf: 'flex-start', background: '#4a9eff11', border: '1px solid #4a9eff33', borderRadius: '6px', padding: '5px 12px', color: t.blueText, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>
                          ↪ ارجاع نامه
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', flexShrink: 0 }}>
                {can('letters', 'update') ? (
                  <select
                    value={letter.status}
                    onChange={e => handleStatusChange(letter.id, e.target.value)}
                    style={{
                      background: (statusColor[letter.status] || '#555') + '22',
                      border: `1px solid ${(statusColor[letter.status] || '#555')}44`,
                      borderRadius: '8px', padding: '4px 10px',
                      color: statusColor[letter.status] || '#555',
                      fontSize: '11px', fontWeight: '600',
                      cursor: 'pointer', fontFamily: 'inherit',
                      outline: 'none', direction: 'rtl',
                    }}
                  >
                    <option value="open">باز</option>
                    <option value="referred">ارجاع شده</option>
                    <option value="in_progress">در حال انجام</option>
                    <option value="done">انجام شد</option>
                    <option value="archived">بایگانی</option>
                  </select>
                ) : (
                  <span style={{ background: (statusColor[letter.status] || '#555') + '22', border: `1px solid ${(statusColor[letter.status] || '#555')}44`, borderRadius: '8px', padding: '4px 10px', color: statusColor[letter.status] || '#555', fontSize: '11px', fontWeight: '600' }}>
                    {statusLabel[letter.status]}
                  </span>
                )}

                {can('letters', 'delete') && (
                  <button onClick={() => setConfirmDelete(letter.id)} style={{ background: '#e0555511', border: '1px solid #e0555533', borderRadius: '6px', padding: '4px 10px', color: t.redText, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    🗑 حذف
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="حذف نامه"
          message="آیا از حذف این نامه مطمئن هستید؟ تمام ارجاعات مربوط به آن نیز حذف می‌شود."
          confirmLabel="بله، حذف کن"
          type="danger"
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {ToastComponent}
    </div>
  )
}
