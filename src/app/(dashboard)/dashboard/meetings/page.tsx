'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'

const priorityLabel: Record<string, string> = {
  low: 'عادی', med: 'متوسط', high: 'مهم', critical: 'فوری',
}
const priorityColor: Record<string, string> = {
  low: '#4a9eff', med: '#c9a84c', high: '#e09444', critical: '#e05555',
}
const statusLabel: Record<string, string> = {
  pending: 'در انتظار تأیید', approved: 'تأیید شده', cancelled: 'لغو شده',
}
const statusColor: Record<string, string> = {
  pending: '#c9a84c', approved: '#3dbb82', cancelled: '#e05555',
}

export default function MeetingsPage() {
  const { t } = useTheme()
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [newMeeting, setNewMeeting] = useState({
    title: '', date: '', time: '', duration: '', location: '', participants: '', priority: 'med',
  })

  useEffect(() => { fetchMeetings() }, [])

  const fetchMeetings = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setMeetings(data)
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newMeeting.title || !newMeeting.date || !newMeeting.time) return
    const { error } = await supabase.from('meetings').insert([{
      title_fa: newMeeting.title,
      date: newMeeting.date,
      time: newMeeting.time,
      duration: newMeeting.duration,
      location: newMeeting.location,
      participants: Number(newMeeting.participants) || 1,
      priority: newMeeting.priority,
      status: 'pending',
    }])
    if (!error) {
      fetchMeetings()
      setNewMeeting({ title: '', date: '', time: '', duration: '', location: '', participants: '', priority: 'med' })
      setShowForm(false)
    }
  }

  const handleApprove = async (id: string) => {
    await supabase.from('meetings').update({ status: 'approved' }).eq('id', id)
    fetchMeetings()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('meetings').delete().eq('id', id)
    fetchMeetings()
  }

  const filtered = filter === 'all' ? meetings : meetings.filter(m => m.priority === filter || m.status === filter)

  const filters = [
    { key: 'all', label: 'همه' },
    { key: 'approved', label: 'تأیید شده' },
    { key: 'pending', label: 'در انتظار' },
    { key: 'critical', label: 'فوری' },
    { key: 'high', label: 'مهم' },
  ]

  const inputStyle = {
    width: '100%', background: t.input, border: `1px solid ${t.border}`,
    borderRadius: '8px', padding: '8px 12px', color: t.text,
    fontSize: '12px', outline: 'none', direction: 'rtl' as const, fontFamily: 'inherit',
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: t.sub, fontSize: '13px' }}>
      ⏳ در حال بارگذاری...
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: t.text, fontSize: '18px', fontWeight: '700' }}>مدیریت جلسات</h1>
          <p style={{ color: t.muted, fontSize: '12px', marginTop: '4px' }}>{meetings.length} جلسه ثبت شده</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold">+ جلسه جدید</button>
      </div>

      {showForm && (
        <div style={{ background: t.card, border: '1px solid #c9a84c33', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#e8c96a', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>ثبت جلسه جدید</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            {[
              { label: 'عنوان جلسه', key: 'title', placeholder: 'عنوان جلسه' },
              { label: 'تاریخ', key: 'date', placeholder: '۱۴۰۳/۰۳/۲۰' },
              { label: 'ساعت', key: 'time', placeholder: '۱۰:۰۰' },
              { label: 'مکان', key: 'location', placeholder: 'اتاق کنفرانس' },
              { label: 'تعداد شرکت‌کننده', key: 'participants', placeholder: '۵' },
            ].map(field => (
              <div key={field.key}>
                <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>{field.label}</label>
                <input style={inputStyle} placeholder={field.placeholder}
                  value={newMeeting[field.key as keyof typeof newMeeting]}
                  onChange={e => setNewMeeting(p => ({ ...p, [field.key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>اولویت</label>
              <select style={inputStyle} value={newMeeting.priority} onChange={e => setNewMeeting(p => ({ ...p, priority: e.target.value }))}>
                <option value="low">عادی</option>
                <option value="med">متوسط</option>
                <option value="high">مهم</option>
                <option value="critical">فوری</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 16px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>انصراف</button>
            <button onClick={handleAdd} className="btn-gold" style={{ padding: '8px 16px', fontSize: '12px' }}>ثبت جلسه</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        {filters.map(f => (
          <div key={f.key} onClick={() => setFilter(f.key)} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', background: filter === f.key ? '#c9a84c22' : t.card, border: filter === f.key ? '1px solid #c9a84c44' : `1px solid ${t.border}`, color: filter === f.key ? '#e8c96a' : t.sub, transition: 'all 0.2s' }}>
            {f.label}
          </div>
        ))}
      </div>

      <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map(meeting => (
          <div key={meeting.id} className="hover-card" style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '4px', height: '50px', borderRadius: '2px', background: priorityColor[meeting.priority] || '#555', flexShrink: 0 }}></div>
            <div style={{ textAlign: 'center', flexShrink: 0, minWidth: '60px' }}>
              <div style={{ color: '#e8c96a', fontSize: '16px', fontWeight: '700' }}>{meeting.time}</div>
              <div style={{ color: t.muted, fontSize: '10px', marginTop: '2px' }}>{meeting.date}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: t.text, fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>{meeting.title_fa}</div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ color: t.sub, fontSize: '11px' }}>📍 {meeting.location}</span>
                <span style={{ color: t.sub, fontSize: '11px' }}>👥 {meeting.participants} نفر</span>
                <span style={{ color: t.sub, fontSize: '11px' }}>⏱ {meeting.duration}</span>
              </div>
            </div>
            <div style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', background: (priorityColor[meeting.priority] || '#555') + '22', color: priorityColor[meeting.priority] || '#555', flexShrink: 0 }}>
              {priorityLabel[meeting.priority] || meeting.priority}
            </div>
            <div style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', background: (statusColor[meeting.status] || '#555') + '22', color: statusColor[meeting.status] || '#555', flexShrink: 0 }}>
              {statusLabel[meeting.status] || meeting.status}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              {meeting.status === 'pending' && (
                <button onClick={() => handleApprove(meeting.id)} style={{ background: '#3dbb8222', border: '1px solid #3dbb8244', borderRadius: '6px', padding: '5px 10px', color: '#3dbb82', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>تأیید</button>
              )}
              <button onClick={() => handleDelete(meeting.id)} style={{ background: '#e0555522', border: '1px solid #e0555544', borderRadius: '6px', padding: '5px 10px', color: '#e05555', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>حذف</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '40px', textAlign: 'center', color: t.muted, fontSize: '13px' }}>جلسه‌ای یافت نشد</div>
        )}
      </div>
    </div>
  )
}