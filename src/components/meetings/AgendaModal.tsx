'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { useAuthStore } from '@/stores/authStore'
import { toJalali } from '@/lib/date'

interface AgendaModalProps {
  meeting: any
  onClose: () => void
  onChanged?: () => void
}

const statusLabel: Record<string, string> = { pending: 'باقی‌مانده', discussed: 'مطرح شد', deferred: 'موکول شد' }
const statusColor: Record<string, string> = { pending: '#c9a84c', discussed: '#3dbb82', deferred: '#8b90a8' }

export function AgendaModal({ meeting, onClose, onChanged }: AgendaModalProps) {
  const { t } = useTheme()
  const { can } = useAuthStore()
  const { showToast, ToastComponent } = useToast()
  const canEdit = can('meetings', 'update')

  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newItem, setNewItem] = useState({ title: '', description: '', duration_minutes: '', presenter_name: '' })

  const fetchItems = useCallback(async () => {
    const { data } = await supabase.from('meeting_agenda_items').select('*').eq('meeting_id', meeting.id).order('order_num', { ascending: true })
    if (data) setItems(data)
  }, [meeting.id])

  useEffect(() => {
    (async () => { setLoading(true); await fetchItems(); setLoading(false) })()
  }, [fetchItems])

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

  const handleAdd = async () => {
    if (!newItem.title.trim()) { showToast('لطفاً عنوان بند دستور جلسه را وارد کنید', 'error'); return }
    const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.order_num || 0)) + 1 : 1
    const { error } = await supabase.from('meeting_agenda_items').insert([{
      meeting_id: meeting.id,
      order_num: nextOrder,
      title: newItem.title.trim(),
      description: newItem.description.trim() || null,
      duration_minutes: newItem.duration_minutes ? Number(newItem.duration_minutes) : null,
      presenter_name: newItem.presenter_name.trim() || null,
      status: 'pending',
    }])
    if (error) { showToast('خطا در افزودن بند دستور جلسه', 'error'); return }
    setNewItem({ title: '', description: '', duration_minutes: '', presenter_name: '' })
    fetchItems()
    onChanged?.()
  }

  const handleStatus = async (id: string, status: string) => {
    await supabase.from('meeting_agenda_items').update({ status }).eq('id', id)
    fetchItems()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('meeting_agenda_items').delete().eq('id', id)
    fetchItems()
    onChanged?.()
  }

  const handleMove = async (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= items.length) return
    const a = items[index]
    const b = items[target]
    await Promise.all([
      supabase.from('meeting_agenda_items').update({ order_num: b.order_num }).eq('id', a.id),
      supabase.from('meeting_agenda_items').update({ order_num: a.order_num }).eq('id', b.id),
    ])
    fetchItems()
  }

  const handlePrint = () => {
    const content = document.getElementById(`print-agenda-content-${meeting.id}`)
    if (!content) return
    const pw = window.open('', '_blank', 'width=900,height=700')
    if (!pw) return
    pw.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="UTF-8">
<title>دستور جلسه — ${meeting.title_fa}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; color: #1a1a2e; background: #fff; font-size: 11px; line-height: 1.7; padding: 24px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 3px solid #1a1a2e; margin-bottom: 20px; }
.logo { display: flex; align-items: center; gap: 12px; }
.logo-icon { width: 48px; height: 48px; background: #1a1a2e; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.logo-text h1 { font-size: 16px; font-weight: 800; }
.logo-text p { font-size: 11px; color: #666; margin-top: 2px; }
.meta { text-align: left; }
.meta .title { font-size: 13px; font-weight: 700; }
.meta .date { font-size: 10px; color: #888; margin-top: 4px; }
table { width: 100%; border-collapse: collapse; font-size: 10px; }
thead tr { background: #1a1a2e; color: #fff; }
thead th { padding: 8px 10px; text-align: right; font-weight: 600; }
tbody tr { border-bottom: 1px solid #f0f0f0; }
tbody tr:nth-child(even) { background: #f9f9f9; }
tbody td { padding: 7px 10px; vertical-align: top; }
.footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; font-size: 9px; color: #aaa; }
@media print { @page { size: A4; margin: 12mm; } }
</style>
</head>
<body>
${content.innerHTML}
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}</script>
</body>
</html>`)
    pw.document.close()
  }

  const handleSend = async () => {
    setSending(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/agenda/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ meetingId: meeting.id }),
    })
    const result = await res.json()
    setSending(false)
    if (!res.ok) { showToast(result.error || 'خطا در ارسال', 'error'); return }
    showToast('دستور جلسه ارسال شد ✅', 'success')
  }

  const totalDuration = items.reduce((sum, i) => sum + (i.duration_minutes || 0), 0)

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="agenda-modal-title" style={{
      position: 'fixed', inset: 0, background: '#00000077',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9998, direction: 'rtl', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease', padding: '16px',
    }}>
      <div style={{
        background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px',
        width: '100%', maxWidth: '700px', maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        animation: 'fadeInUp 0.2s ease', boxShadow: '0 20px 60px #00000055', color: t.text,
      }}>
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0, gap: '10px', flexWrap: 'wrap' }}>
          <div>
            <div id="agenda-modal-title" style={{ color: t.text, fontSize: '14px', fontWeight: '700' }}>📋 دستور جلسه</div>
            <div style={{ color: t.muted, fontSize: '11px', marginTop: '3px' }}>{meeting.title_fa} — {meeting.day_of_week} {toJalali(meeting.date)}</div>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={handlePrint} title="چاپ دستور جلسه" style={{ background: '#1a1a2e22', border: '1px solid #1a1a2e44', borderRadius: '8px', padding: '8px 12px', color: t.sub, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>🖨️ چاپ</button>
            {canEdit && items.length > 0 && (
              <button onClick={handleSend} disabled={sending} className="btn-gold" style={{ padding: '8px 14px', fontSize: '12px', opacity: sending ? 0.6 : 1 }}>
                {sending ? 'در حال ارسال...' : '📤 ارسال به شرکت‌کنندگان'}
              </button>
            )}
            <button onClick={onClose} aria-label="بستن" style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', width: '30px', height: '30px', color: t.sub, cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit' }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: t.sub, fontSize: '12px', padding: '20px' }}>⏳ در حال بارگذاری...</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: canEdit ? '16px' : '0' }}>
                {items.length === 0 ? (
                  <div style={{ color: t.muted, fontSize: '12px', padding: '20px', textAlign: 'center', background: t.inner, borderRadius: '8px' }}>بندی برای دستور جلسه ثبت نشده</div>
                ) : items.map((item, i) => (
                  <div key={item.id} style={{ background: t.inner, borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    {canEdit && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                        <button onClick={() => handleMove(i, -1)} disabled={i === 0} aria-label="جابه‌جایی به بالا" style={{ background: 'transparent', border: 'none', color: i === 0 ? t.muted : t.sub, cursor: i === 0 ? 'default' : 'pointer', fontSize: '12px', padding: '2px' }}>▲</button>
                        <button onClick={() => handleMove(i, 1)} disabled={i === items.length - 1} aria-label="جابه‌جایی به پایین" style={{ background: 'transparent', border: 'none', color: i === items.length - 1 ? t.muted : t.sub, cursor: i === items.length - 1 ? 'default' : 'pointer', fontSize: '12px', padding: '2px' }}>▼</button>
                      </div>
                    )}
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#c9a84c22', color: '#e8c96a', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: t.text, fontSize: '12px', fontWeight: '600' }}>{item.title}</div>
                      {item.description && <div style={{ color: t.sub, fontSize: '11px', marginTop: '3px', lineHeight: '1.6' }}>{item.description}</div>}
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {item.presenter_name && <span style={{ color: t.muted, fontSize: '11px' }}>🎤 {item.presenter_name}</span>}
                        {item.duration_minutes && <span style={{ color: t.muted, fontSize: '11px' }}>⏱ {item.duration_minutes} دقیقه</span>}
                      </div>
                    </div>
                    {canEdit ? (
                      <select value={item.status} onChange={e => handleStatus(item.id, e.target.value)}
                        style={{ background: (statusColor[item.status] || '#555') + '22', border: `1px solid ${(statusColor[item.status] || '#555')}44`, borderRadius: '8px', padding: '3px 8px', color: statusColor[item.status] || '#555', fontSize: '10px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', outline: 'none', direction: 'rtl', flexShrink: 0 }}>
                        <option value="pending">باقی‌مانده</option>
                        <option value="discussed">مطرح شد</option>
                        <option value="deferred">موکول شد</option>
                      </select>
                    ) : (
                      <span style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '600', background: (statusColor[item.status] || '#555') + '22', color: statusColor[item.status] || '#555', flexShrink: 0 }}>
                        {statusLabel[item.status]}
                      </span>
                    )}
                    {canEdit && (
                      <button onClick={() => handleDelete(item.id)} aria-label="حذف بند" style={{ background: '#e0555511', border: '1px solid #e0555533', borderRadius: '6px', padding: '4px 8px', color: '#e05555', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>🗑</button>
                    )}
                  </div>
                ))}
                {items.length > 0 && totalDuration > 0 && (
                  <div style={{ color: t.muted, fontSize: '11px', textAlign: 'left' }}>مجموع زمان‌بندی: {totalDuration} دقیقه</div>
                )}
              </div>

              {canEdit && (
                <div style={{ background: t.inner, borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input style={inputStyle} placeholder="عنوان بند دستور جلسه"
                    value={newItem.title} onChange={e => setNewItem(p => ({ ...p, title: e.target.value }))} />
                  <textarea style={{ ...inputStyle, minHeight: '50px', resize: 'vertical' as const }} placeholder="توضیحات (اختیاری)"
                    value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} />
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input style={{ ...inputStyle, flex: 1, minWidth: '140px' }} placeholder="ارائه‌دهنده"
                      value={newItem.presenter_name} onChange={e => setNewItem(p => ({ ...p, presenter_name: e.target.value }))} />
                    <input style={{ ...inputStyle, flex: '0 0 110px' }} type="number" min="0" placeholder="مدت (دقیقه)"
                      value={newItem.duration_minutes} onChange={e => setNewItem(p => ({ ...p, duration_minutes: e.target.value }))} />
                    <button onClick={handleAdd} className="btn-gold" style={{ padding: '8px 18px', fontSize: '12px', flexShrink: 0 }}>+ افزودن</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* محتوای مخفی برای چاپ */}
      <div id={`print-agenda-content-${meeting.id}`} style={{ display: 'none' }}>
        <div className="header">
          <div className="logo">
            <div className="logo-icon">🏛️</div>
            <div className="logo-text">
              <h1>وزارت آموزش و پرورش</h1>
              <p>معاونت آموزش متوسطه — دستور جلسه</p>
            </div>
          </div>
          <div className="meta">
            <div className="title">{meeting.title_fa}</div>
            <div className="date">{meeting.day_of_week} {toJalali(meeting.date)} — {meeting.time}{meeting.end_time ? `—${meeting.end_time}` : ''}</div>
            {meeting.location && <div className="date">مکان: {meeting.location}</div>}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: '30px' }}>#</th>
              <th>عنوان</th>
              <th>ارائه‌دهنده</th>
              <th>مدت</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id}>
                <td>{i + 1}</td>
                <td style={{ fontWeight: 600 }}>
                  {item.title}
                  {item.description && <div style={{ fontWeight: 400, color: '#666', marginTop: '3px' }}>{item.description}</div>}
                </td>
                <td>{item.presenter_name || '—'}</td>
                <td>{item.duration_minutes ? `${item.duration_minutes} دقیقه` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="footer">
          <span>سامانه مدیریت معاونت آموزش متوسطه</span>
          <span>مجموع زمان‌بندی: {totalDuration} دقیقه</span>
        </div>
      </div>

      {ToastComponent}
    </div>
  )
}
