'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useIsMobile } from '@/lib/useIsMobile'
import { exportMeetingsToExcel } from '@/lib/exportData'
import { PersianCalendar } from '@/components/ui/PersianCalendar'

const DAYS = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه']

const priorityColor: Record<string, string> = {
  low: '#4a9eff', med: '#c9a84c', high: '#e09444', critical: '#e05555',
}
const priorityLabel: Record<string, string> = {
  low: 'عادی', med: 'متوسط', high: 'مهم', critical: 'فوری',
}
const statusLabel: Record<string, string> = {
  pending: 'در انتظار', approved: 'تأیید شده', cancelled: 'لغو شده',
}
const statusColor: Record<string, string> = {
  pending: '#c9a84c', approved: '#3dbb82', cancelled: '#e05555',
}

function toJalaliSimple(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const jalaali = require('jalaali-js')
    const d = new Date(dateStr)
    const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
    return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`
  } catch { return dateStr }
}

function getNextWeekSaturday(): Date {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 6 ? 7 : (6 - day)
  const sat = new Date(today)
  sat.setDate(today.getDate() + diff)
  return sat
}

function getCurrentWeekSaturday(): Date {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 6 ? 0 : -(day + 1)
  const sat = new Date(today)
  sat.setDate(today.getDate() + diff)
  return sat
}

function getWeekDates(startSaturday: Date): Date[] {
  return DAYS.map((_, i) => {
    const d = new Date(startSaturday)
    d.setDate(startSaturday.getDate() + i)
    return d
  })
}

function dateToString(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getMeetingTimeStatus(date: string, time: string, endTime: string): 'past' | 'ongoing' | 'soon' | 'upcoming' {
  if (!date || !time) return 'upcoming'
  const now = new Date()
  const [h, m] = time.split(':').map(Number)
  const meetingStart = new Date(date)
  meetingStart.setHours(h, m, 0, 0)
  let meetingEnd = new Date(meetingStart)
  meetingEnd.setHours(meetingStart.getHours() + 2)
  if (endTime) {
    const [eh, em] = endTime.split(':').map(Number)
    meetingEnd = new Date(date)
    meetingEnd.setHours(eh, em, 0, 0)
  }
  if (now > meetingEnd) return 'past'
  if (now >= meetingStart && now <= meetingEnd) return 'ongoing'
  const diffMs = meetingStart.getTime() - now.getTime()
  if (diffMs <= 60 * 60 * 1000) return 'soon'
  return 'upcoming'
}

export default function MeetingsPage() {
  const { t } = useTheme()
  const { showToast, ToastComponent } = useToast()
  const isMobile = useIsMobile()
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'weekly' | 'list' | 'calendar' | 'report'>('weekly')
  const [showForm, setShowForm] = useState(false)
  const [editMeeting, setEditMeeting] = useState<any | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState<Date>(getCurrentWeekSaturday())
  const [reportFilter, setReportFilter] = useState<'month' | '3months' | '6months' | 'year'>('month')
  const [newMeeting, setNewMeeting] = useState({
    title: '', day: 'شنبه', time: '', end_time: '', location: '',
    participants: '', priority: 'med', meeting_type: 'جلسه',
  })

  const weekDates = getWeekDates(weekStart)

  const fetchMeetings = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('meetings').select('*').order('date', { ascending: true }).order('time', { ascending: true })
    if (!error && data) setMeetings(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMeetings()
    const channel = supabase
      .channel('meetings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, fetchMeetings)
      .subscribe()
    const notifInterval = setInterval(checkUpcomingNotifications, 60 * 1000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(notifInterval)
    }
  }, [fetchMeetings])

  const checkUpcomingNotifications = () => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    meetings.forEach(meeting => {
      const status = getMeetingTimeStatus(meeting.date, meeting.time, meeting.end_time)
      if (status === 'soon') {
        const lastNotif = localStorage.getItem(`notif_${meeting.id}`)
        const now = Date.now()
        if (!lastNotif || now - Number(lastNotif) > 30 * 60 * 1000) {
          new Notification('یادآوری جلسه', {
            body: `جلسه "${meeting.title_fa}" یک ساعت دیگر شروع می‌شود`,
            icon: '/icon-192.png',
            dir: 'rtl',
          })
          localStorage.setItem(`notif_${meeting.id}`, String(now))
        }
      }
    })
  }

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showToast('مرورگر شما از نوتیفیکیشن پشتیبانی نمی‌کند', 'error')
      return
    }
    const permission = await Notification.requestPermission()
    if (permission === 'granted') showToast('نوتیفیکیشن‌ها فعال شدند ✅', 'success')
    else showToast('اجازه نوتیفیکیشن داده نشد', 'error')
  }

  const handleAdd = async () => {
    if (!newMeeting.title || !newMeeting.time) {
      showToast('لطفاً عنوان و ساعت را وارد کنید', 'error')
      return
    }
    const dayIndex = DAYS.indexOf(newMeeting.day)
    const meetingDate = weekDates[dayIndex]
    const { error } = await (supabase.from('meetings') as any).insert([{
      title_fa: newMeeting.title,
      date: dateToString(meetingDate),
      time: newMeeting.time,
      end_time: newMeeting.end_time,
      duration: newMeeting.end_time ? `${newMeeting.time}-${newMeeting.end_time}` : '',
      location: newMeeting.location,
      participants: Number(newMeeting.participants) || 1,
      priority: newMeeting.priority,
      status: 'pending',
      day_of_week: newMeeting.day,
      week_start: dateToString(weekStart),
      meeting_type: newMeeting.meeting_type,
    }])
    if (!error) {
      showToast('جلسه با موفقیت ثبت شد', 'success')
      fetchMeetings()
      setNewMeeting({ title: '', day: 'شنبه', time: '', end_time: '', location: '', participants: '', priority: 'med', meeting_type: 'جلسه' })
      setShowForm(false)
    } else {
      showToast('خطا در ثبت جلسه', 'error')
    }
  }

  const handleUpdate = async () => {
    if (!editMeeting) return
    const { error } = await supabase.from('meetings').update({
      title_fa: editMeeting.title_fa,
      time: editMeeting.time,
      end_time: editMeeting.end_time,
      location: editMeeting.location,
      participants: editMeeting.participants,
      priority: editMeeting.priority,
      meeting_type: editMeeting.meeting_type,
      status: editMeeting.status,
    }).eq('id', editMeeting.id)
    if (!error) {
      showToast('جلسه ویرایش شد', 'success')
      fetchMeetings()
      setEditMeeting(null)
    } else {
      showToast('خطا در ویرایش', 'error')
    }
  }

  const handleApprove = async (id: string) => {
    await supabase.from('meetings').update({ status: 'approved' }).eq('id', id)
    showToast('جلسه تأیید شد', 'success')
    fetchMeetings()
  }

  const handleDelete = (id: string) => { setConfirmDelete(id) }

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return
    await supabase.from('meetings').delete().eq('id', confirmDelete)
    showToast('جلسه حذف شد', 'info')
    setConfirmDelete(null)
    fetchMeetings()
  }

  const weekMeetings = meetings.filter(m => {
    if (!m.date) return false
    const mDateStr = m.date.split('T')[0]
    const startStr = dateToString(weekStart)
    const endDate = new Date(weekStart)
    endDate.setDate(weekStart.getDate() + 6)
    const endStr = dateToString(endDate)
    return mDateStr >= startStr && mDateStr <= endStr
  })

  const meetingsByDay: Record<string, any[]> = {}
  DAYS.forEach(day => { meetingsByDay[day] = [] })
  weekMeetings.forEach(m => {
    let day = m.day_of_week
    if (!day) {
      const d = new Date(m.date)
      const jsDay = d.getDay()
      const irDay = jsDay === 6 ? 0 : jsDay + 1
      day = DAYS[irDay] || DAYS[0]
    }
    if (meetingsByDay[day]) meetingsByDay[day].push(m)
  })

  const getReportMeetings = () => {
    const now = new Date()
    const months = reportFilter === 'month' ? 1 : reportFilter === '3months' ? 3 : reportFilter === '6months' ? 6 : 12
    const fromDate = new Date(now)
    fromDate.setMonth(now.getMonth() - months)
    return meetings.filter(m => m.date >= dateToString(fromDate) && m.date <= dateToString(now))
  }

  const reportMeetings = getReportMeetings()
  const reportStats = {
    total: reportMeetings.length,
    approved: reportMeetings.filter(m => m.status === 'approved').length,
    pending: reportMeetings.filter(m => m.status === 'pending').length,
    cancelled: reportMeetings.filter(m => m.status === 'cancelled').length,
    byType: reportMeetings.reduce((acc: Record<string, number>, m) => { const type = m.meeting_type || 'سایر'; acc[type] = (acc[type] || 0) + 1; return acc }, {}),
    byPriority: reportMeetings.reduce((acc: Record<string, number>, m) => { acc[m.priority] = (acc[m.priority] || 0) + 1; return acc }, {}),
  }

  const inputStyle = {
    width: '100%', background: t.input, border: `1px solid ${t.border}`,
    borderRadius: '8px', padding: '8px 12px', color: t.text,
    fontSize: '12px', outline: 'none', direction: 'rtl' as const, fontFamily: 'inherit',
  }

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d) }
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d) }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: t.sub, fontSize: '13px' }}>
      ⏳ در حال بارگذاری...
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', direction: 'rtl' }}>

      {/* هدر */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ color: t.text, fontSize: isMobile ? '16px' : '18px', fontWeight: '700' }}>برنامه جلسات</h1>
          <p style={{ color: t.muted, fontSize: '12px', marginTop: '4px' }}>{meetings.length} جلسه ثبت شده</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {typeof window !== 'undefined' && Notification.permission !== 'granted' && (
            <button onClick={requestNotificationPermission} style={{ background: '#c9a84c22', border: '1px solid #c9a84c44', borderRadius: '8px', padding: '8px 12px', color: '#e8c96a', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              🔔 یادآور
            </button>
          )}
          <button onClick={() => exportMeetingsToExcel(meetings)} style={{ background: '#3dbb8222', border: '1px solid #3dbb8244', borderRadius: '8px', padding: '8px 14px', color: '#3dbb82', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
            📊 Excel
          </button>
          <div style={{ display: 'flex', background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', overflow: 'hidden' }}>
            {(['weekly', 'list', 'calendar', 'report'] as const).map((v, i) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '8px 10px', background: view === v ? '#c9a84c22' : 'transparent', border: 'none', color: view === v ? '#e8c96a' : t.sub, fontSize: isMobile ? '11px' : '12px', cursor: 'pointer', fontFamily: 'inherit', borderRight: i < 3 ? `1px solid ${t.border}` : 'none' }}>
                {v === 'weekly' ? '📅 هفتگی' : v === 'list' ? '📋 لیست' : v === 'calendar' ? '🗓 تقویم' : '📈 گزارش'}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-gold">+ جلسه جدید</button>
        </div>
      </div>

      {/* ناوبری هفته */}
      {view === 'weekly' && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <button onClick={prevWeek} style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '6px 14px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>← قبلی</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: t.text, fontSize: isMobile ? '12px' : '14px', fontWeight: '700' }}>
              {toJalaliSimple(dateToString(weekStart))} تا {toJalaliSimple(dateToString(weekDates[6]))}
            </div>
            <div style={{ color: t.muted, fontSize: '11px', marginTop: '3px' }}>{weekMeetings.length} جلسه</div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setWeekStart(getCurrentWeekSaturday())} style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '6px 10px', color: t.sub, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>این هفته</button>
            <button onClick={() => setWeekStart(getNextWeekSaturday())} style={{ background: '#c9a84c22', border: '1px solid #c9a84c44', borderRadius: '8px', padding: '6px 10px', color: '#e8c96a', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>هفته آینده</button>
            <button onClick={nextWeek} style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '6px 14px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>بعدی ←</button>
          </div>
        </div>
      )}

      {/* فرم جلسه جدید */}
      {showForm && (
        <div style={{ background: t.card, border: '1px solid #c9a84c33', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#e8c96a', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>ثبت جلسه جدید — هفته {toJalaliSimple(dateToString(weekStart))}</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>عنوان جلسه</label>
              <input style={inputStyle} placeholder="عنوان جلسه" value={newMeeting.title} onChange={e => setNewMeeting(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>روز هفته</label>
              <select style={inputStyle} value={newMeeting.day} onChange={e => setNewMeeting(p => ({ ...p, day: e.target.value }))}>
                {DAYS.map((day, i) => (
                  <option key={day} value={day}>{day} — {toJalaliSimple(dateToString(weekDates[i]))}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>نوع</label>
              <select style={inputStyle} value={newMeeting.meeting_type} onChange={e => setNewMeeting(p => ({ ...p, meeting_type: e.target.value }))}>
                {['جلسه', 'ملاقات', 'شورا', 'کنفرانس', 'بازدید', 'سفر', 'سایر'].map(tp => <option key={tp} value={tp}>{tp}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>ساعت شروع</label>
              <input style={inputStyle} type="time" value={newMeeting.time} onChange={e => setNewMeeting(p => ({ ...p, time: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>ساعت پایان</label>
              <input style={inputStyle} type="time" value={newMeeting.end_time} onChange={e => setNewMeeting(p => ({ ...p, end_time: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>مکان</label>
              <input style={inputStyle} placeholder="اتاق کنفرانس" value={newMeeting.location} onChange={e => setNewMeeting(p => ({ ...p, location: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>تعداد شرکت‌کننده</label>
              <input style={inputStyle} type="number" placeholder="۵" value={newMeeting.participants} onChange={e => setNewMeeting(p => ({ ...p, participants: e.target.value }))} />
            </div>
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
            <button onClick={handleAdd} className="btn-gold" style={{ padding: '8px 20px', fontSize: '12px' }}>ثبت جلسه</button>
          </div>
        </div>
      )}

      {/* فرم ویرایش */}
      {editMeeting && (
        <div style={{ background: t.card, border: '1px solid #4a9eff33', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#4a9eff', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>ویرایش جلسه</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>عنوان</label>
              <input style={inputStyle} value={editMeeting.title_fa} onChange={e => setEditMeeting({ ...editMeeting, title_fa: e.target.value })} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>ساعت شروع</label>
              <input style={inputStyle} type="time" value={editMeeting.time} onChange={e => setEditMeeting({ ...editMeeting, time: e.target.value })} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>ساعت پایان</label>
              <input style={inputStyle} type="time" value={editMeeting.end_time || ''} onChange={e => setEditMeeting({ ...editMeeting, end_time: e.target.value })} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>مکان</label>
              <input style={inputStyle} value={editMeeting.location || ''} onChange={e => setEditMeeting({ ...editMeeting, location: e.target.value })} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>نوع</label>
              <select style={inputStyle} value={editMeeting.meeting_type || 'جلسه'} onChange={e => setEditMeeting({ ...editMeeting, meeting_type: e.target.value })}>
                {['جلسه', 'ملاقات', 'شورا', 'کنفرانس', 'بازدید', 'سفر', 'سایر'].map(tp => <option key={tp} value={tp}>{tp}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>اولویت</label>
              <select style={inputStyle} value={editMeeting.priority} onChange={e => setEditMeeting({ ...editMeeting, priority: e.target.value })}>
                <option value="low">عادی</option>
                <option value="med">متوسط</option>
                <option value="high">مهم</option>
                <option value="critical">فوری</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setEditMeeting(null)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 16px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>انصراف</button>
            <button onClick={handleUpdate} style={{ background: '#4a9eff22', border: '1px solid #4a9eff44', borderRadius: '8px', padding: '8px 20px', color: '#4a9eff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>ذخیره تغییرات</button>
          </div>
        </div>
      )}

      {/* نمای هفتگی */}
      {view === 'weekly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {DAYS.map((day, i) => {
            const dayMeetings = (meetingsByDay[day] || []).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
            const isToday = dateToString(weekDates[i]) === dateToString(new Date())
            const isWeekend = day === 'جمعه'
            const isPast = weekDates[i] < new Date() && !isToday

            return (
              <div key={day} style={{ background: isWeekend ? t.inner : t.card, border: `1px solid ${isToday ? '#c9a84c55' : t.border}`, borderRadius: '12px', overflow: 'hidden', opacity: isWeekend ? 0.5 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: dayMeetings.length > 0 ? `1px solid ${t.border}` : 'none', background: isToday ? '#c9a84c11' : isPast ? t.inner : 'transparent' }}>
                  <div style={{ textAlign: 'center', minWidth: '90px' }}>
                    <div style={{ color: isToday ? '#e8c96a' : isPast ? t.muted : t.text, fontSize: '14px', fontWeight: '700' }}>{day}</div>
                    <div style={{ color: t.muted, fontSize: '11px', marginTop: '2px' }}>{toJalaliSimple(dateToString(weekDates[i]))}</div>
                  </div>
                  {isToday && <div style={{ padding: '2px 8px', borderRadius: '10px', background: '#c9a84c22', border: '1px solid #c9a84c44', color: '#e8c96a', fontSize: '10px', fontWeight: '600' }}>امروز</div>}
                  {isPast && !isToday && <div style={{ padding: '2px 8px', borderRadius: '10px', background: t.inner, border: `1px solid ${t.border}`, color: t.muted, fontSize: '10px' }}>گذشته</div>}
                  {dayMeetings.length === 0 && <div style={{ color: t.muted, fontSize: '12px' }}>جلسه‌ای ثبت نشده</div>}
                  <div style={{ flex: 1 }}></div>
                  {dayMeetings.length > 0 && <div style={{ color: t.muted, fontSize: '11px' }}>{dayMeetings.length} جلسه</div>}
                </div>

                {dayMeetings.length > 0 && (
                  <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {dayMeetings.map(meeting => {
                      const timeStatus = getMeetingTimeStatus(meeting.date, meeting.time, meeting.end_time)
                      const isPastMeeting = timeStatus === 'past'
                      const isOngoing = timeStatus === 'ongoing'
                      const isSoon = timeStatus === 'soon'

                      return (
                        <div key={meeting.id} style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                          background: isOngoing ? '#3dbb8211' : isSoon ? '#c9a84c11' : t.inner,
                          borderRadius: '10px',
                          borderRight: `4px solid ${isPastMeeting ? t.border : priorityColor[meeting.priority] || '#555'}`,
                          opacity: isPastMeeting ? 0.5 : 1,
                          transition: 'all 0.2s',
                        }}>
                          <div style={{ textAlign: 'center', minWidth: '60px', flexShrink: 0 }}>
                            <div style={{ color: isPastMeeting ? t.muted : '#e8c96a', fontSize: '13px', fontWeight: '700' }}>{meeting.time}</div>
                            {meeting.end_time && <div style={{ color: t.muted, fontSize: '10px' }}>{meeting.end_time}</div>}
                          </div>
                          <div style={{ width: '1px', height: '36px', background: t.border, flexShrink: 0 }}></div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                              <span style={{ color: isPastMeeting ? t.muted : t.text, fontSize: '13px', fontWeight: '600' }}>{meeting.title_fa}</span>
                              {isOngoing && <span style={{ padding: '1px 7px', borderRadius: '8px', fontSize: '10px', background: '#3dbb8222', color: '#3dbb82', border: '1px solid #3dbb8244' }}>● در حال برگزاری</span>}
                              {isSoon && <span style={{ padding: '1px 7px', borderRadius: '8px', fontSize: '10px', background: '#c9a84c22', color: '#e8c96a', border: '1px solid #c9a84c44' }}>⚡ به زودی</span>}
                              {isPastMeeting && <span style={{ padding: '1px 7px', borderRadius: '8px', fontSize: '10px', background: t.inner, color: t.muted, border: `1px solid ${t.border}` }}>برگزار شده</span>}
                              {meeting.meeting_type && <span style={{ padding: '1px 7px', borderRadius: '8px', fontSize: '10px', background: '#4a9eff22', color: '#4a9eff', border: '1px solid #4a9eff33' }}>{meeting.meeting_type}</span>}
                            </div>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                              {meeting.location && <span style={{ color: t.sub, fontSize: '11px' }}>📍 {meeting.location}</span>}
                              {meeting.participants && <span style={{ color: t.sub, fontSize: '11px' }}>👥 {meeting.participants} نفر</span>}
                            </div>
                          </div>
                          <div style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '600', background: (statusColor[meeting.status] || '#555') + '22', color: statusColor[meeting.status] || '#555', flexShrink: 0 }}>
                            {statusLabel[meeting.status]}
                          </div>
                          {!isPastMeeting && (
                            <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                              <button onClick={() => setEditMeeting(meeting)} style={{ background: '#4a9eff22', border: '1px solid #4a9eff44', borderRadius: '6px', padding: '4px 8px', color: '#4a9eff', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>✏️</button>
                              {meeting.status === 'pending' && (
                                <button onClick={() => handleApprove(meeting.id)} style={{ background: '#3dbb8222', border: '1px solid #3dbb8244', borderRadius: '6px', padding: '4px 8px', color: '#3dbb82', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>✓</button>
                              )}
                              <button onClick={() => handleDelete(meeting.id)} style={{ background: '#e0555522', border: '1px solid #e0555544', borderRadius: '6px', padding: '4px 8px', color: '#e05555', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>🗑</button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* نمای لیست */}
      {view === 'list' && (
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {meetings.length === 0 ? (
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '40px', textAlign: 'center', color: t.muted, fontSize: '13px' }}>جلسه‌ای ثبت نشده</div>
          ) : meetings.map(meeting => {
            const timeStatus = getMeetingTimeStatus(meeting.date, meeting.time, meeting.end_time)
            const isPastMeeting = timeStatus === 'past'
            return (
              <div key={meeting.id} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'center', gap: '10px', opacity: isPastMeeting ? 0.5 : 1 }}>
                <div style={{ width: '4px', height: '40px', borderRadius: '2px', background: isPastMeeting ? t.border : (priorityColor[meeting.priority] || '#555'), flexShrink: 0 }}></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: t.text, fontSize: '13px', fontWeight: '600', marginBottom: '3px' }}>{meeting.title_fa}</div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#e8c96a', fontSize: '12px' }}>{meeting.day_of_week} {toJalaliSimple(meeting.date)}</span>
                    <span style={{ color: t.sub, fontSize: '11px' }}>⏰ {meeting.time}{meeting.end_time ? `—${meeting.end_time}` : ''}</span>
                    {meeting.location && <span style={{ color: t.sub, fontSize: '11px' }}>📍 {meeting.location}</span>}
                  </div>
                </div>
                <div style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '600', background: (statusColor[meeting.status] || '#555') + '22', color: statusColor[meeting.status] || '#555', flexShrink: 0 }}>
                  {statusLabel[meeting.status]}
                </div>
                {!isPastMeeting && (
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => setEditMeeting(meeting)} style={{ background: '#4a9eff22', border: '1px solid #4a9eff44', borderRadius: '6px', padding: '5px 8px', color: '#4a9eff', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>✏️</button>
                    <button onClick={() => handleDelete(meeting.id)} style={{ background: '#e0555522', border: '1px solid #e0555544', borderRadius: '6px', padding: '5px 8px', color: '#e05555', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>🗑</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* نمای تقویم */}
      {view === 'calendar' && (
        <PersianCalendar meetings={meetings} isMobile={isMobile} t={t} />
      )}

      {/* نمای گزارش */}
      {view === 'report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {([
              { key: 'month', label: 'یک ماه اخیر' },
              { key: '3months', label: 'سه ماه اخیر' },
              { key: '6months', label: 'شش ماه اخیر' },
              { key: 'year', label: 'یک سال اخیر' },
            ] as const).map(f => (
              <div key={f.key} onClick={() => setReportFilter(f.key)} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', background: reportFilter === f.key ? '#c9a84c22' : t.card, border: reportFilter === f.key ? '1px solid #c9a84c44' : `1px solid ${t.border}`, color: reportFilter === f.key ? '#e8c96a' : t.sub }}>
                {f.label}
              </div>
            ))}
            <button onClick={() => exportMeetingsToExcel(reportMeetings)} style={{ background: '#3dbb8222', border: '1px solid #3dbb8244', borderRadius: '8px', padding: '6px 14px', color: '#3dbb82', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', marginRight: 'auto' }}>
              📊 خروجی Excel
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '10px' }}>
            {[
              { label: 'کل جلسات', value: reportStats.total, color: '#c9a84c', icon: '📅' },
              { label: 'تأیید شده', value: reportStats.approved, color: '#3dbb82', icon: '✅' },
              { label: 'در انتظار', value: reportStats.pending, color: '#4a9eff', icon: '⏳' },
              { label: 'لغو شده', value: reportStats.cancelled, color: '#e05555', icon: '❌' },
            ].map((item, i) => (
              <div key={i} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
                <div style={{ color: item.color, fontSize: '32px', fontWeight: '800' }}>{item.value}</div>
                <div style={{ color: t.muted, fontSize: '11px', marginTop: '4px' }}>{item.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px' }}>
              <div style={{ color: t.text, fontSize: '13px', fontWeight: '600', marginBottom: '14px' }}>بر اساس نوع</div>
              {Object.entries(reportStats.byType).map(([type, count]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ color: t.text, fontSize: '12px', minWidth: '70px' }}>{type}</div>
                  <div style={{ flex: 1, background: t.inner, borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                    <div style={{ width: `${reportStats.total ? (count / reportStats.total) * 100 : 0}%`, height: '100%', background: '#c9a84c', borderRadius: '4px' }} />
                  </div>
                  <div style={{ color: t.muted, fontSize: '11px', minWidth: '24px', textAlign: 'left' }}>{count}</div>
                </div>
              ))}
            </div>
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px' }}>
              <div style={{ color: t.text, fontSize: '13px', fontWeight: '600', marginBottom: '14px' }}>بر اساس اولویت</div>
              {Object.entries(reportStats.byPriority).map(([priority, count]) => (
                <div key={priority} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ color: t.text, fontSize: '12px', minWidth: '70px' }}>{priorityLabel[priority] || priority}</div>
                  <div style={{ flex: 1, background: t.inner, borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                    <div style={{ width: `${reportStats.total ? (count / reportStats.total) * 100 : 0}%`, height: '100%', background: priorityColor[priority] || '#555', borderRadius: '4px' }} />
                  </div>
                  <div style={{ color: t.muted, fontSize: '11px', minWidth: '24px', textAlign: 'left' }}>{count}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px' }}>
            <div style={{ color: t.text, fontSize: '13px', fontWeight: '600', marginBottom: '14px' }}>لیست جلسات</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {reportMeetings.length === 0 ? (
                <div style={{ color: t.muted, fontSize: '12px', textAlign: 'center', padding: '20px' }}>جلسه‌ای در این بازه یافت نشد</div>
              ) : reportMeetings.map(meeting => (
                <div key={meeting.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: t.inner, borderRadius: '8px' }}>
                  <div style={{ color: '#e8c96a', fontSize: '11px', minWidth: '110px', flexShrink: 0 }}>{meeting.day_of_week} {toJalaliSimple(meeting.date)}</div>
                  <div style={{ color: t.text, fontSize: '12px', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meeting.title_fa}</div>
                  <div style={{ color: t.sub, fontSize: '11px', flexShrink: 0 }}>{meeting.time}</div>
                  <div style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', background: (statusColor[meeting.status] || '#555') + '22', color: statusColor[meeting.status] || '#555', flexShrink: 0 }}>
                    {statusLabel[meeting.status]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="حذف جلسه"
          message="آیا از حذف این جلسه مطمئن هستید؟"
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