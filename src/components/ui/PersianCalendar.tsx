'use client'

import { useState } from 'react'

// تعطیلات رسمی ۱۴۰۵ (ماه/روز جلالی)
const HOLIDAYS_1405: Record<string, string> = {
  // فروردین
  '1/1': 'نوروز — عید سعید فطر',
  '1/2': 'عید نوروز — تعطیل عید فطر',
  '1/3': 'عید نوروز',
  '1/4': 'عید نوروز',
  '1/12': 'روز جمهوری اسلامی ایران',
  '1/13': 'روز طبیعت',
  '1/25': 'شهادت امام جعفر صادق (ع)',
  // خرداد
  '3/3': 'شهادت امام محمد باقر (ع)',
  '3/6': 'عید سعید قربان',
  '3/14': 'عید سعید غدیر — رحلت امام خمینی (ره)',
  '3/15': 'قیام ۱۵ خرداد',
  // مرداد
  '5/13': 'اربعین حسینی',
  '5/20': 'تاسوعای حسینی',
  '5/21': 'عاشورای حسینی',
  '5/30': 'اربعین حسینی',
  // شهریور
  '6/18': 'شهادت امام رضا (ع)',
  // دی
  '10/2': 'ولادت امام علی (ع) — روز پدر',
  '10/16': 'مبعث پیامبر اکرم (ص)',
  // بهمن
  '11/4': 'ولادت حضرت مهدی (عج)',
  '11/22': 'پیروزی انقلاب اسلامی',
  // اسفند
  '12/9': 'شهادت حضرت علی (ع)',
  '12/19': 'عید سعید فطر',
  '12/20': 'تعطیل عید فطر',
  '12/29': 'ملی شدن صنعت نفت ایران',
}

const MONTH_NAMES = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
const DAY_NAMES_FULL = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه']
const DAY_NAMES_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

const PRIORITY_COLORS: Record<string, string> = {
  low: '#4a9eff', med: '#c9a84c', high: '#e09444', critical: '#e05555',
}
const PRIORITY_LABELS: Record<string, string> = {
  low: 'عادی', med: 'متوسط', high: 'مهم', critical: 'فوری',
}
const STATUS_COLORS: Record<string, string> = {
  pending: '#c9a84c', approved: '#3dbb82', cancelled: '#e05555',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار', approved: 'تأیید شده', cancelled: 'لغو شده',
}

interface PersianCalendarProps {
  meetings: any[]
  isMobile: boolean
  t: any
}

export function PersianCalendar({ meetings, isMobile, t }: PersianCalendarProps) {
  const jalaali = require('jalaali-js')
  const today = new Date()
  const jToday = jalaali.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate())

  const [jYear, setJYear] = useState(jToday.jy)
  const [jMonth, setJMonth] = useState(jToday.jm)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const daysInMonth = jalaali.jalaaliMonthLength(jYear, jMonth)
  const firstGregorian = jalaali.toGregorian(jYear, jMonth, 1)
  const firstDate = new Date(firstGregorian.gy, firstGregorian.gm - 1, firstGregorian.gd)
  const firstDayOfWeek = (firstDate.getDay() + 1) % 7 // شنبه=0

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const getMeetingsForDay = (jd: number) => {
    const g = jalaali.toGregorian(jYear, jMonth, jd)
    const dateStr = `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`
    return meetings.filter(m => m.date && m.date.split('T')[0] === dateStr)
  }

  const getHoliday = (jd: number) => HOLIDAYS_1405[`${jMonth}/${jd}`]

  const isPastDay = (jd: number) => {
    const g = jalaali.toGregorian(jYear, jMonth, jd)
    const d = new Date(g.gy, g.gm - 1, g.gd)
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return d < t
  }

  const getDayOfWeek = (jd: number) => {
    const g = jalaali.toGregorian(jYear, jMonth, jd)
    const d = new Date(g.gy, g.gm - 1, g.gd)
    return (d.getDay() + 1) % 7 // شنبه=0
  }

  const prevMonth = () => {
    if (jMonth === 1) { setJMonth(12); setJYear(y => y - 1) }
    else setJMonth(m => m - 1)
    setSelectedDay(null)
  }

  const nextMonth = () => {
    if (jMonth === 12) { setJMonth(1); setJYear(y => y + 1) }
    else setJMonth(m => m + 1)
    setSelectedDay(null)
  }

  const goToday = () => {
    setJYear(jToday.jy)
    setJMonth(jToday.jm)
    setSelectedDay(jToday.jd)
  }

  const selectedMeetings = selectedDay ? getMeetingsForDay(selectedDay) : []
  const selectedHoliday = selectedDay ? getHoliday(selectedDay) : null
  const selectedDayOfWeek = selectedDay ? getDayOfWeek(selectedDay) : 0

  // آمار ماه
  const monthMeetings = meetings.filter(m => {
    if (!m.date) return false
    const g = jalaali.toGregorian(jYear, jMonth, 1)
    const gLast = jalaali.toGregorian(jYear, jMonth, daysInMonth)
    const start = `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`
    const end = `${gLast.gy}-${String(gLast.gm).padStart(2, '0')}-${String(gLast.gd).padStart(2, '0')}`
    return m.date.split('T')[0] >= start && m.date.split('T')[0] <= end
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', direction: 'rtl' }}>

      {/* آمار ماه */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {[
          { label: 'کل جلسات', value: monthMeetings.length, color: '#c9a84c', icon: '📅' },
          { label: 'تأیید شده', value: monthMeetings.filter(m => m.status === 'approved').length, color: '#3dbb82', icon: '✅' },
          { label: 'در انتظار', value: monthMeetings.filter(m => m.status === 'pending').length, color: '#4a9eff', icon: '⏳' },
        ].map((item, i) => (
          <div key={i} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>{item.icon}</span>
            <div>
              <div style={{ color: item.color, fontSize: '20px', fontWeight: '800', lineHeight: 1 }}>{item.value}</div>
              <div style={{ color: t.muted, fontSize: '10px', marginTop: '2px' }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* تقویم */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: isMobile ? '12px' : '20px' }}>

        {/* هدر */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button onClick={prevMonth} style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '10px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.sub, fontSize: '16px', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#c9a84c'; (e.currentTarget as HTMLButtonElement).style.color = '#c9a84c' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = t.border; (e.currentTarget as HTMLButtonElement).style.color = t.sub }}
          >←</button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', justifyContent: 'center' }}>
              <span style={{ color: t.text, fontSize: isMobile ? '18px' : '22px', fontWeight: '800' }}>{MONTH_NAMES[jMonth - 1]}</span>
              <span style={{ color: '#c9a84c', fontSize: isMobile ? '15px' : '18px', fontWeight: '700' }}>{jYear}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '6px' }}>
              <button onClick={goToday} style={{ background: '#c9a84c22', border: '1px solid #c9a84c44', borderRadius: '6px', padding: '3px 10px', color: '#e8c96a', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>
                امروز
              </button>
              <span style={{ color: t.muted, fontSize: '11px', lineHeight: '22px' }}>{monthMeetings.length} جلسه این ماه</span>
            </div>
          </div>

          <button onClick={nextMonth} style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '10px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.sub, fontSize: '16px', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#c9a84c'; (e.currentTarget as HTMLButtonElement).style.color = '#c9a84c' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = t.border; (e.currentTarget as HTMLButtonElement).style.color = t.sub }}
          >→</button>
        </div>

        {/* روزهای هفته */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
          {DAY_NAMES_SHORT.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '6px 0', color: i === 6 ? '#e05555' : t.muted, fontSize: '12px', fontWeight: '700', borderBottom: `2px solid ${i === 6 ? '#e0555533' : t.border}` }}>{d}</div>
          ))}
        </div>

        {/* روزها */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? '3px' : '4px' }}>
          {cells.map((jd, i) => {
            if (!jd) return <div key={i} style={{ minHeight: isMobile ? '54px' : '76px' }} />

            const dayMeetings = getMeetingsForDay(jd)
            const holiday = getHoliday(jd)
            const isToday = jYear === jToday.jy && jMonth === jToday.jm && jd === jToday.jd
            const isSelected = selectedDay === jd
            const dow = getDayOfWeek(jd)
            const isJumua = dow === 6
            const isPast = isPastDay(jd)
            const hasMeeting = dayMeetings.length > 0

            return (
              <div
                key={i}
                onClick={() => setSelectedDay(isSelected ? null : jd)}
                style={{
                  minHeight: isMobile ? '54px' : '76px',
                  padding: isMobile ? '4px 3px' : '6px',
                  borderRadius: '10px',
                  background: isSelected ? '#c9a84c33' : isToday ? '#c9a84c11' : holiday ? '#e0555508' : hasMeeting ? t.inner + '88' : 'transparent',
                  border: isSelected ? '2px solid #c9a84c' : isToday ? '2px solid #c9a84c66' : hasMeeting ? `1px solid ${t.border}` : '1px solid transparent',
                  cursor: 'pointer',
                  opacity: isPast && !isToday && !isSelected ? 0.55 : 1,
                  transition: 'all 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  if (!isSelected && !isToday)
                    (e.currentTarget as HTMLDivElement).style.background = t.inner
                }}
                onMouseLeave={e => {
                  if (!isSelected && !isToday)
                    (e.currentTarget as HTMLDivElement).style.background = holiday ? '#e0555508' : hasMeeting ? t.inner + '88' : 'transparent'
                }}
              >
                {/* شماره روز */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: holiday ? '2px' : '4px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: isMobile ? '22px' : '26px', height: isMobile ? '22px' : '26px',
                    borderRadius: '50%',
                    background: isToday ? '#c9a84c' : 'transparent',
                    color: isToday ? '#1a1200' : holiday || isJumua ? '#e05555' : t.text,
                    fontSize: isMobile ? '11px' : '13px',
                    fontWeight: isToday ? '800' : isPast ? '400' : '600',
                  }}>{jd}</span>
                </div>

                {/* نشانه تعطیل */}
                {holiday && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#e05555' }} />
                  </div>
                )}

                {/* جلسات */}
                {dayMeetings.slice(0, isMobile ? 1 : 2).map((m, mi) => (
                  <div key={mi} style={{
                    background: (PRIORITY_COLORS[m.priority] || '#555') + '28',
                    borderRight: `2px solid ${PRIORITY_COLORS[m.priority] || '#555'}`,
                    borderRadius: '4px',
                    padding: '1px 3px',
                    marginBottom: '2px',
                    overflow: 'hidden',
                  }}>
                    <div style={{ color: PRIORITY_COLORS[m.priority] || t.text, fontSize: '9px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {!isMobile && m.time ? m.time + ' ' : ''}{m.title_fa}
                    </div>
                  </div>
                ))}

                {dayMeetings.length > (isMobile ? 1 : 2) && (
                  <div style={{ color: '#c9a84c', fontSize: '9px', textAlign: 'center', fontWeight: '600' }}>
                    +{dayMeetings.length - (isMobile ? 1 : 2)}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* راهنما */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '14px', paddingTop: '12px', borderTop: `1px solid ${t.border}`, flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e05555' }} />
            <span style={{ color: t.muted, fontSize: '10px' }}>تعطیل رسمی</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#1a1200', fontSize: '8px', fontWeight: '800' }}>۱</span>
            </div>
            <span style={{ color: t.muted, fontSize: '10px' }}>امروز</span>
          </div>
          {Object.entries(PRIORITY_COLORS).map(([key, color]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: color + '44', borderRight: `2px solid ${color}` }} />
              <span style={{ color: t.muted, fontSize: '10px' }}>{PRIORITY_LABELS[key]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* پنل جزئیات روز انتخابی */}
      {selectedDay && (
        <div style={{ background: t.card, border: `1px solid ${selectedHoliday ? '#e0555533' : t.border}`, borderRadius: '14px', padding: '16px', animation: 'fadeInUp 0.2s ease' }}>

          {/* هدر روز */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ color: t.text, fontSize: '16px', fontWeight: '700' }}>
                {DAY_NAMES_FULL[selectedDayOfWeek]} {selectedDay} {MONTH_NAMES[jMonth - 1]} {jYear}
              </div>
              {(() => {
                const g = jalaali.toGregorian(jYear, jMonth, selectedDay)
                return <div style={{ color: t.muted, fontSize: '11px', marginTop: '3px' }}>
                  {g.gd}/{g.gm}/{g.gy}
                </div>
              })()}
            </div>
            <button onClick={() => setSelectedDay(null)} style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.muted, fontSize: '16px' }}>✕</button>
          </div>

          {/* تعطیلی */}
          {selectedHoliday && (
            <div style={{ background: '#e0555511', border: '1px solid #e0555533', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e0555522', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🔴</div>
              <div>
                <div style={{ color: '#e05555', fontSize: '11px', fontWeight: '700', marginBottom: '2px' }}>روز تعطیل رسمی</div>
                <div style={{ color: t.text, fontSize: '13px', fontWeight: '500' }}>{selectedHoliday}</div>
              </div>
            </div>
          )}

          {/* جلسات */}
          {selectedMeetings.length === 0 ? (
            <div style={{ color: t.muted, fontSize: '12px', textAlign: 'center', padding: '20px', background: t.inner, borderRadius: '10px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📭</div>
              جلسه‌ای برای این روز ثبت نشده
            </div>
          ) : (
            <div>
              <div style={{ color: t.sub, fontSize: '11px', fontWeight: '600', marginBottom: '8px' }}>
                {selectedMeetings.length} جلسه
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedMeetings
                  .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                  .map(meeting => (
                    <div key={meeting.id} style={{ padding: '12px', borderRadius: '10px', borderRight: `4px solid ${PRIORITY_COLORS[meeting.priority] || '#555'}`, background: t.inner, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ textAlign: 'center', minWidth: '56px', flexShrink: 0 }}>
                        <div style={{ color: '#e8c96a', fontSize: '14px', fontWeight: '700' }}>{meeting.time}</div>
                        {meeting.end_time && <div style={{ color: t.muted, fontSize: '10px' }}>{meeting.end_time}</div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: t.text, fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>{meeting.title_fa}</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {meeting.location && <span style={{ color: t.sub, fontSize: '11px' }}>📍 {meeting.location}</span>}
                          {meeting.participants && <span style={{ color: t.sub, fontSize: '11px' }}>👥 {meeting.participants} نفر</span>}
                          {meeting.meeting_type && <span style={{ color: '#4a9eff', fontSize: '11px' }}>🏷 {meeting.meeting_type}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', flexShrink: 0 }}>
                        <div style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '600', background: (PRIORITY_COLORS[meeting.priority] || '#555') + '22', color: PRIORITY_COLORS[meeting.priority] || '#555' }}>
                          {PRIORITY_LABELS[meeting.priority] || meeting.priority}
                        </div>
                        <div style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '600', background: (STATUS_COLORS[meeting.status] || '#555') + '22', color: STATUS_COLORS[meeting.status] || '#555' }}>
                          {STATUS_LABELS[meeting.status] || meeting.status}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}