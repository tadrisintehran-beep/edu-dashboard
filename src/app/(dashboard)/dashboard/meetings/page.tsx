'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useIsMobile } from '@/lib/useIsMobile'
import { exportMeetingsToExcel } from '@/lib/exportData'

const DAYS = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه']

const TIME_SLOTS = [
  '۶-۸', '۸-۱۰', '۱۰-۱۲', '۱۲-۱۴', '۱۴-۱۶', '۱۶-۱۸', '۱۸-۲۰'
]

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

// تبدیل تاریخ میلادی به جلالی ساده
function toJalaliSimple(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const jalaali = require('jalaali-js')
    const d = new Date(dateStr)
    const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
    return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

// گرفتن تاریخ شنبه هفته جاری
function getCurrentWeekSaturday(): Date {
  const today = new Date()
  const day = today.getDay() // 0=Sun, 6=Sat
  const diff = day === 6 ? 0 : -(day + 1)
  const sat = new Date(today)
  sat.setDate(today.getDate() + diff)
  return sat
}

// گرفتن تاریخ شنبه هفته آینده
function getNextWeekSaturday(): Date {
  const sat = getCurrentWeekSaturday()
  sat.setDate(sat.getDate() + 7)
  return sat
}

// تاریخ روز هفته
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

export default function MeetingsPage() {
  const { t } = useTheme()
  const { showToast, ToastComponent } = useToast()
  const isMobile = useIsMobile()
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'weekly' | 'list'>('weekly')
  const [showForm, setShowForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState<Date>(getNextWeekSaturday())
  const [newMeeting, setNewMeeting] = useState({
    title: '', day: 'شنبه', time: '', end_time: '', location: '',
    participants: '', priority: 'med', meeting_type: 'جلسه',
  })

  const weekDates = getWeekDates(weekStart)

  useEffect(() => {
    fetchMeetings()
    const channel = supabase
      .channel('meetings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => fetchMeetings())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchMeetings = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('meetings').select('*').order('date', { ascending: true })
    if (!error && data) setMeetings(data)
    setLoading(false)
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

  // فیلتر جلسات هفته انتخاب شده
  const weekMeetings = meetings.filter(m => {
    if (!m.date) return false
    const mDate = new Date(m.date)
    const endDate = new Date(weekStart)
    endDate.setDate(weekStart.getDate() + 6)
    return mDate >= weekStart && mDate <= endDate
  })

  // گروه‌بندی جلسات بر اساس روز
  const meetingsByDay: Record<string, any[]> = {}
  DAYS.forEach(day => { meetingsByDay[day] = [] })
  weekMeetings.forEach(m => {
    const day = m.day_of_week || DAYS[new Date(m.date).getDay() === 0 ? 1 : new Date(m.date).getDay()]
    if (meetingsByDay[day]) meetingsByDay[day].push(m)
  })

  const inputStyle = {
    width: '100%', background: t.input, border: `1px solid ${t.border}`,
    borderRadius: '8px', padding: '8px 12px', color: t.text,
    fontSize: '12px', outline: 'none', direction: 'rtl' as const, fontFamily: 'inherit',
  }

  const prevWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }

  const nextWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }

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
          <button onClick={() => exportMeetingsToExcel(meetings)} style={{ background: '#3dbb8222', border: '1px solid #3dbb8244', borderRadius: '8px', padding: '8px 14px', color: '#3dbb82', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
            📊 Excel
          </button>
          <div style={{ display: 'flex', background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', overflow: 'hidden' }}>
            {(['weekly', 'list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '8px 14px', background: view === v ? '#c9a84c22' : 'transparent', border: 'none', color: view === v ? '#e8c96a' : t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', borderLeft: v === 'list' ? `1px solid ${t.border}` : 'none' }}>
                {v === 'weekly' ? '📅 هفتگی' : '📋 لیست'}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-gold">+ جلسه جدید</button>
        </div>
      </div>

      {/* ناوبری هفته */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={prevWeek} style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '6px 14px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>← هفته قبل</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: t.text, fontSize: '14px', fontWeight: '700' }}>
            هفته {toJalaliSimple(dateToString(weekStart))} تا {toJalaliSimple(dateToString(weekDates[6]))}
          </div>
          <div style={{ color: t.muted, fontSize: '11px', marginTop: '3px' }}>{weekMeetings.length} جلسه در این هفته</div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setWeekStart(getNextWeekSaturday())} style={{ background: '#c9a84c22', border: '1px solid #c9a84c44', borderRadius: '8px', padding: '6px 10px', color: '#e8c96a', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>هفته آینده</button>
          <button onClick={nextWeek} style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '6px 14px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>هفته بعد ←</button>
        </div>
      </div>

      {/* فرم جلسه جدید */}
      {showForm && (
        <div style={{ background: t.card, border: '1px solid #c9a84c33', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#e8c96a', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
            ثبت جلسه جدید — هفته {toJalaliSimple(dateToString(weekStart))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>عنوان جلسه</label>
              <input style={inputStyle} placeholder="عنوان جلسه"
                value={newMeeting.title} onChange={e => setNewMeeting(p => ({ ...p, title: e.target.value }))} />
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
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>نوع جلسه</label>
              <select style={inputStyle} value={newMeeting.meeting_type} onChange={e => setNewMeeting(p => ({ ...p, meeting_type: e.target.value }))}>
                {['جلسه', 'ملاقات', 'شورا', 'کنفرانس', 'بازدید', 'سفر', 'سایر'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>ساعت شروع</label>
              <input style={inputStyle} placeholder="۰۸:۰۰" type="time"
                value={newMeeting.time} onChange={e => setNewMeeting(p => ({ ...p, time: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>ساعت پایان</label>
              <input style={inputStyle} placeholder="۱۰:۰۰" type="time"
                value={newMeeting.end_time} onChange={e => setNewMeeting(p => ({ ...p, end_time: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>مکان</label>
              <input style={inputStyle} placeholder="اتاق کنفرانس"
                value={newMeeting.location} onChange={e => setNewMeeting(p => ({ ...p, location: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>تعداد شرکت‌کننده</label>
              <input style={inputStyle} placeholder="۵" type="number"
                value={newMeeting.participants} onChange={e => setNewMeeting(p => ({ ...p, participants: e.target.value }))} />
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

      {/* نمای هفتگی */}
      {view === 'weekly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {DAYS.map((day, i) => {
            const dayMeetings = meetingsByDay[day] || []
            const isToday = dateToString(weekDates[i]) === dateToString(new Date())
            const isWeekend = day === 'جمعه'
            return (
              <div key={day} style={{ background: isWeekend ? t.inner : t.card, border: `1px solid ${isToday ? '#c9a84c55' : t.border}`, borderRadius: '12px', overflow: 'hidden', opacity: isWeekend ? 0.6 : 1 }}>
                {/* هدر روز */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: dayMeetings.length > 0 ? `1px solid ${t.border}` : 'none', background: isToday ? '#c9a84c11' : 'transparent' }}>
                  <div style={{ textAlign: 'center', minWidth: '80px' }}>
                    <div style={{ color: isToday ? '#e8c96a' : t.text, fontSize: '14px', fontWeight: '700' }}>{day}</div>
                    <div style={{ color: t.muted, fontSize: '11px', marginTop: '2px' }}>{toJalaliSimple(dateToString(weekDates[i]))}</div>
                  </div>
                  {isToday && <div style={{ padding: '2px 8px', borderRadius: '10px', background: '#c9a84c22', border: '1px solid #c9a84c44', color: '#e8c96a', fontSize: '10px', fontWeight: '600' }}>امروز</div>}
                  {dayMeetings.length === 0 && <div style={{ color: t.muted, fontSize: '12px' }}>جلسه‌ای ثبت نشده</div>}
                  <div style={{ flex: 1 }}></div>
                  {dayMeetings.length > 0 && (
                    <div style={{ color: t.muted, fontSize: '11px' }}>{dayMeetings.length} جلسه</div>
                  )}
                </div>

                {/* جلسات روز */}
                {dayMeetings.length > 0 && (
                  <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {dayMeetings.map(meeting => (
                      <div key={meeting.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: t.inner, borderRadius: '10px', borderRight: `4px solid ${priorityColor[meeting.priority] || '#555'}` }}>
                        {/* ساعت */}
                        <div style={{ textAlign: 'center', minWidth: '70px', flexShrink: 0 }}>
                          <div style={{ color: '#e8c96a', fontSize: '13px', fontWeight: '700' }}>{meeting.time}</div>
                          {meeting.end_time && <div style={{ color: t.muted, fontSize: '10px' }}>{meeting.end_time}</div>}
                        </div>

                        {/* جداکننده */}
                        <div style={{ width: '1px', height: '36px', background: t.border, flexShrink: 0 }}></div>

                        {/* اطلاعات */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <span style={{ color: t.text, fontSize: '13px', fontWeight: '600' }}>{meeting.title_fa}</span>
                            {meeting.meeting_type && (
                              <span style={{ padding: '1px 7px', borderRadius: '8px', fontSize: '10px', background: '#4a9eff22', color: '#4a9eff', border: '1px solid #4a9eff33' }}>{meeting.meeting_type}</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {meeting.location && <span style={{ color: t.sub, fontSize: '11px' }}>📍 {meeting.location}</span>}
                            {meeting.participants && <span style={{ color: t.sub, fontSize: '11px' }}>👥 {meeting.participants} نفر</span>}
                          </div>
                        </div>

                        {/* وضعیت */}
                        <div style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', background: (statusColor[meeting.status] || '#555') + '22', color: statusColor[meeting.status] || '#555', flexShrink: 0 }}>
                          {statusLabel[meeting.status] || meeting.status}
                        </div>

                        {/* دکمه‌ها */}
                        <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                          {meeting.status === 'pending' && (
                            <button onClick={() => handleApprove(meeting.id)} style={{ background: '#3dbb8222', border: '1px solid #3dbb8244', borderRadius: '6px', padding: '4px 10px', color: '#3dbb82', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>تأیید</button>
                          )}
                          <button onClick={() => handleDelete(meeting.id)} style={{ background: '#e0555522', border: '1px solid #e0555544', borderRadius: '6px', padding: '4px 10px', color: '#e05555', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>حذف</button>
                        </div>
                      </div>
                    ))}
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
          ) : meetings.map(meeting => (
            <div key={meeting.id} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '4px', height: '40px', borderRadius: '2px', background: priorityColor[meeting.priority] || '#555', flexShrink: 0 }}></div>
              <div style={{ flex: 1 }}>
                <div style={{ color: t.text, fontSize: '13px', fontWeight: '600', marginBottom: '3px' }}>{meeting.title_fa}</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ color: '#e8c96a', fontSize: '12px' }}>{meeting.day_of_week || ''} {toJalaliSimple(meeting.date)}</span>
                  <span style={{ color: t.sub, fontSize: '11px' }}>⏰ {meeting.time}{meeting.end_time ? `—${meeting.end_time}` : ''}</span>
                  {meeting.location && <span style={{ color: t.sub, fontSize: '11px' }}>📍 {meeting.location}</span>}
                </div>
              </div>
              <div style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', background: (statusColor[meeting.status] || '#555') + '22', color: statusColor[meeting.status] || '#555', flexShrink: 0 }}>
                {statusLabel[meeting.status]}
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                {meeting.status === 'pending' && (
                  <button onClick={() => handleApprove(meeting.id)} style={{ background: '#3dbb8222', border: '1px solid #3dbb8244', borderRadius: '6px', padding: '5px 10px', color: '#3dbb82', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>تأیید</button>
                )}
                <button onClick={() => handleDelete(meeting.id)} style={{ background: '#e0555522', border: '1px solid #e0555544', borderRadius: '6px', padding: '5px 10px', color: '#e05555', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>حذف</button>
              </div>
            </div>
          ))}
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