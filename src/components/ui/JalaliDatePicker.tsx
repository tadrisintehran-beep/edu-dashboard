'use client'

import { useState } from 'react'

const MONTH_NAMES = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
const DAY_NAMES = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

interface JalaliDatePickerProps {
  value: string // میلادی YYYY-MM-DD
  onChange: (gregorian: string, jalali: string) => void
  placeholder?: string
  style?: React.CSSProperties
}

export function JalaliDatePicker({ value, onChange, placeholder = 'انتخاب تاریخ', style }: JalaliDatePickerProps) {
  const jalaali = require('jalaali-js')
  const today = new Date()
  const jToday = jalaali.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate())

  // تبدیل مقدار فعلی به جلالی
  const getInitialJalali = () => {
    if (!value) return { jy: jToday.jy, jm: jToday.jm }
    try {
      const d = new Date(value)
      const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
      return { jy: j.jy, jm: j.jm }
    } catch { return { jy: jToday.jy, jm: jToday.jm } }
  }

  const getSelectedJd = () => {
    if (!value) return null
    try {
      const d = new Date(value)
      const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
      if (j.jy === jYear && j.jm === jMonth) return j.jd
    } catch {}
    return null
  }

  const init = getInitialJalali()
  const [open, setOpen] = useState(false)
  const [jYear, setJYear] = useState(init.jy)
  const [jMonth, setJMonth] = useState(init.jm)

  const daysInMonth = jalaali.jalaaliMonthLength(jYear, jMonth)
  const firstGregorian = jalaali.toGregorian(jYear, jMonth, 1)
  const firstDate = new Date(firstGregorian.gy, firstGregorian.gm - 1, firstGregorian.gd)
  const firstDayOfWeek = (firstDate.getDay() + 1) % 7

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const selectedJd = getSelectedJd()

  const handleSelect = (jd: number) => {
    const g = jalaali.toGregorian(jYear, jMonth, jd)
    const gregorian = `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`
    const jalali = `${jYear}/${String(jMonth).padStart(2, '0')}/${String(jd).padStart(2, '0')}`
    onChange(gregorian, jalali)
    setOpen(false)
  }

  const prevMonth = () => {
    if (jMonth === 1) { setJMonth(12); setJYear(y => y - 1) }
    else setJMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (jMonth === 12) { setJMonth(1); setJYear(y => y + 1) }
    else setJMonth(m => m + 1)
  }

  // نمایش مقدار انتخاب شده
  const displayValue = () => {
    if (!value) return ''
    try {
      const d = new Date(value)
      const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
      return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`
    } catch { return value }
  }

  return (
    <div style={{ position: 'relative', direction: 'rtl' }}>
      {/* input نمایش */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          ...style,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
        }}
      >
        <span style={{ color: displayValue() ? 'inherit' : '#888' }}>
          {displayValue() || placeholder}
        </span>
        <span style={{ fontSize: '14px', opacity: 0.6 }}>📅</span>
      </div>

      {/* تقویم */}
      {open && (
        <>
          {/* overlay */}
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />

          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: '4px',
            background: '#fff', border: '1px solid #e0e0e0',
            borderRadius: '12px', padding: '12px',
            zIndex: 100, boxShadow: '0 8px 32px #00000022',
            width: '280px', direction: 'rtl',
          }}>

            {/* هدر */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <button onClick={prevMonth} style={{ background: '#f5f5f5', border: 'none', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px' }}>←</button>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a2e' }}>{MONTH_NAMES[jMonth - 1]}</span>
                <span style={{ fontSize: '12px', color: '#c9a84c', marginRight: '6px', fontWeight: '600' }}>{jYear}</span>
              </div>
              <button onClick={nextMonth} style={{ background: '#f5f5f5', border: 'none', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px' }}>→</button>
            </div>

            {/* روزهای هفته */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '6px' }}>
              {DAY_NAMES.map((d, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: i === 6 ? '#e05555' : '#999', padding: '4px 0' }}>{d}</div>
              ))}
            </div>

            {/* روزها */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {cells.map((jd, i) => {
                if (!jd) return <div key={i} />
                const isToday = jYear === jToday.jy && jMonth === jToday.jm && jd === jToday.jd
                const isSelected = jd === selectedJd
                const isJumua = (firstDayOfWeek + jd - 1) % 7 === 6

                return (
                  <div
                    key={i}
                    onClick={() => handleSelect(jd)}
                    style={{
                      textAlign: 'center', padding: '5px 2px',
                      borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
                      background: isSelected ? '#c9a84c' : isToday ? '#c9a84c22' : 'transparent',
                      color: isSelected ? '#fff' : isToday ? '#c9a84c' : isJumua ? '#e05555' : '#1a1a2e',
                      fontWeight: isSelected || isToday ? '700' : '400',
                      transition: 'all 0.1s',
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#f5f5f5' }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = isToday ? '#c9a84c22' : 'transparent' }}
                  >
                    {jd}
                  </div>
                )
              })}
            </div>

            {/* دکمه امروز */}
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
              <button
                onClick={() => handleSelect(jToday.jd)}
                style={{ background: '#c9a84c22', border: '1px solid #c9a84c44', borderRadius: '6px', padding: '4px 16px', color: '#c9a84c', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}
              >
                امروز
              </button>
              {value && (
                <button
                  onClick={() => { onChange('', ''); setOpen(false) }}
                  style={{ background: 'transparent', border: 'none', color: '#e05555', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', marginRight: '8px' }}
                >
                  پاک کردن
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}