'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'
import { useIsMobile } from '@/lib/useIsMobile'

const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']

function toJalali(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const jalaali = require('jalaali-js')
    const d = new Date(dateStr)
    const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
    return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`
  } catch { return dateStr }
}

function toJalaliWithDay(dateStr: string): { jy: number, jm: number, jd: number } {
  try {
    const jalaali = require('jalaali-js')
    const d = new Date(dateStr)
    return jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  } catch { return { jy: 0, jm: 0, jd: 0 } }
}

function getCurrentJalali() {
  try {
    const jalaali = require('jalaali-js')
    const d = new Date()
    return jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  } catch { return { jy: 1404, jm: 4, jd: 1 } }
}

function getWeekRange(weekOffset = 0): { start: Date, end: Date, label: string } {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 6 ? 0 : -(day + 1)
  const sat = new Date(today)
  sat.setDate(today.getDate() + diff + weekOffset * 7)
  const fri = new Date(sat)
  fri.setDate(sat.getDate() + 6)
  const startJ = toJalaliWithDay(sat.toISOString().split('T')[0])
  const endJ = toJalaliWithDay(fri.toISOString().split('T')[0])
  const label = `${startJ.jd} تا ${endJ.jd} ${JALALI_MONTHS[endJ.jm - 1]} ${endJ.jy}`
  return { start: sat, end: fri, label }
}

function getMonthRange(monthOffset = 0): { start: Date, end: Date, label: string, jy: number, jm: number } {
  try {
    const jalaali = require('jalaali-js')
    const today = new Date()
    const jToday = jalaali.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate())
    let jm = jToday.jm + monthOffset
    let jy = jToday.jy
    while (jm <= 0) { jm += 12; jy-- }
    while (jm > 12) { jm -= 12; jy++ }
    const daysInMonth = jalaali.jalaaliMonthLength(jy, jm)
    const gStart = jalaali.toGregorian(jy, jm, 1)
    const gEnd = jalaali.toGregorian(jy, jm, daysInMonth)
    return {
      start: new Date(gStart.gy, gStart.gm - 1, gStart.gd),
      end: new Date(gEnd.gy, gEnd.gm - 1, gEnd.gd),
      label: `${JALALI_MONTHS[jm - 1]} ${jy}`,
      jy, jm,
    }
  } catch {
    return { start: new Date(), end: new Date(), label: '', jy: 0, jm: 0 }
  }
}

const priorityLabel: Record<string, string> = { low: 'عادی', med: 'متوسط', high: 'مهم', critical: 'فوری' }
const statusLabelM: Record<string, string> = { pending: 'در انتظار', approved: 'تأیید شده', cancelled: 'لغو شده' }
const statusLabelR: Record<string, string> = { submitted: 'ارسال شده', reviewing: 'در بررسی', approved: 'تأیید شده', rejected: 'رد شده' }
const statusLabelT: Record<string, string> = { pending: 'در انتظار', in_progress: 'در حال انجام', done: 'انجام شد', cancelled: 'لغو شد' }

export default function ExecutiveReportPage() {
  const { t, isDark } = useTheme()
  const isMobile = useIsMobile()
  const printRef = useRef<HTMLDivElement>(null)

  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly')
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [meetings, setMeetings] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const weekRange = getWeekRange(weekOffset)
  const monthRange = getMonthRange(monthOffset)

  const dateStart = reportType === 'weekly'
    ? weekRange.start.toISOString().split('T')[0]
    : monthRange.start.toISOString().split('T')[0]
  const dateEnd = reportType === 'weekly'
    ? weekRange.end.toISOString().split('T')[0]
    : monthRange.end.toISOString().split('T')[0]
  const periodLabel = reportType === 'weekly' ? weekRange.label : monthRange.label

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [m, r, tk] = await Promise.all([
      supabase.from('meetings').select('*').gte('date', dateStart).lte('date', dateEnd).order('date').order('time'),
      supabase.from('reports').select('*').gte('created_at', dateStart).lte('created_at', dateEnd + 'T23:59:59').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*, meetings(title_fa)').gte('created_at', dateStart).lte('created_at', dateEnd + 'T23:59:59').order('created_at', { ascending: false }),
    ])
    setMeetings(m.data || [])
    setReports(r.data || [])
    setTasks(tk.data || [])
    setLoading(false)
  }, [dateStart, dateEnd])

  useEffect(() => { fetchData() }, [fetchData])

  const stats = {
    meetings: { total: meetings.length, approved: meetings.filter(x => x.status === 'approved').length, pending: meetings.filter(x => x.status === 'pending').length, cancelled: meetings.filter(x => x.status === 'cancelled').length },
    reports: { total: reports.length, approved: reports.filter(x => x.status === 'approved').length, pending: reports.filter(x => x.status !== 'approved').length },
    tasks: { total: tasks.length, done: tasks.filter(x => x.status === 'done').length, pending: tasks.filter(x => x.status === 'pending').length, inProgress: tasks.filter(x => x.status === 'in_progress').length },
  }

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const pw = window.open('', '_blank', 'width=900,height=700')
    if (!pw) return
    pw.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="UTF-8">
<title>گزارش اجرایی — ${periodLabel}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; color: #1a1a2e; background: #fff; font-size: 11px; line-height: 1.6; }

/* هدر */
.print-header { padding: 24px 32px 16px; border-bottom: 3px solid #1a1a2e; display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.print-logo { display: flex; align-items: center; gap: 12px; }
.print-logo-icon { width: 48px; height: 48px; background: #1a1a2e; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.print-logo-text h1 { font-size: 16px; font-weight: 800; color: #1a1a2e; }
.print-logo-text p { font-size: 11px; color: #666; margin-top: 2px; }
.print-meta { text-align: left; }
.print-meta .period { font-size: 13px; font-weight: 700; color: #1a1a2e; }
.print-meta .date { font-size: 10px; color: #888; margin-top: 4px; }
.print-meta .type-badge { display: inline-block; background: #1a1a2e; color: #fff; font-size: 9px; padding: 2px 8px; border-radius: 10px; margin-top: 4px; }

/* بخش‌ها */
.section { padding: 0 32px; margin-bottom: 20px; }
.section-title { font-size: 13px; font-weight: 800; color: #1a1a2e; border-right: 4px solid #c9a84c; padding-right: 10px; margin-bottom: 12px; }

/* KPI باکس‌ها */
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
.kpi-box { border: 1.5px solid #e0e0e0; border-radius: 10px; padding: 12px; text-align: center; }
.kpi-box .val { font-size: 28px; font-weight: 800; color: #1a1a2e; line-height: 1; margin-bottom: 4px; }
.kpi-box .lbl { font-size: 10px; color: #888; }
.kpi-box.gold { border-color: #c9a84c; background: #fdf8e8; }
.kpi-box.gold .val { color: #b8882c; }
.kpi-box.green { border-color: #3dbb82; background: #f0fdf6; }
.kpi-box.green .val { color: #2a9a62; }
.kpi-box.blue { border-color: #4a9eff; background: #f0f7ff; }
.kpi-box.blue .val { color: #2a7edf; }
.kpi-box.red { border-color: #e05555; background: #fff5f5; }
.kpi-box.red .val { color: #c03535; }

/* جدول */
table { width: 100%; border-collapse: collapse; font-size: 10px; }
thead tr { background: #1a1a2e; color: #fff; }
thead th { padding: 8px 10px; text-align: right; font-weight: 600; font-size: 10px; }
tbody tr { border-bottom: 1px solid #f0f0f0; }
tbody tr:nth-child(even) { background: #f9f9f9; }
tbody td { padding: 7px 10px; vertical-align: top; }
.badge { display: inline-block; padding: 1px 7px; border-radius: 6px; font-size: 9px; font-weight: 600; border: 1px solid #ddd; }
.badge-gold { background: #fdf8e8; color: #b8882c; border-color: #c9a84c; }
.badge-green { background: #f0fdf6; color: #2a9a62; border-color: #3dbb82; }
.badge-blue { background: #f0f7ff; color: #2a7edf; border-color: #4a9eff; }
.badge-red { background: #fff5f5; color: #c03535; border-color: #e05555; }
.badge-gray { background: #f5f5f5; color: #888; border-color: #ddd; }

/* پیشرفت */
.progress-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.progress-label { min-width: 80px; font-size: 10px; color: #555; }
.progress-bar { flex: 1; height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 3px; }

/* جداکننده */
.divider { border: none; border-top: 1px solid #e8e8e8; margin: 16px 32px; }

/* فوتر */
.print-footer { padding: 12px 32px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
.print-footer span { font-size: 9px; color: #aaa; }

/* امضا */
.signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 0 32px; margin-top: 32px; }
.signature-box { border-top: 1px solid #ccc; padding-top: 8px; text-align: center; }
.signature-box p { font-size: 10px; color: #888; }

@media print {
  @page { size: A4; margin: 10mm; }
  body { font-size: 10px; }
}
</style>
</head>
<body>
${content.innerHTML}
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}</script>
</body>
</html>`)
    pw.document.close()
  }

  const todayJalali = (() => {
    const j = getCurrentJalali()
    return `${j.jd} ${JALALI_MONTHS[j.jm - 1]} ${j.jy}`
  })()

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
          <h1 style={{ color: t.text, fontSize: isMobile ? '16px' : '18px', fontWeight: '700' }}>گزارش اجرایی</h1>
          <p style={{ color: t.muted, fontSize: '12px', marginTop: '4px' }}>{periodLabel}</p>
        </div>
        <button onClick={handlePrint} style={{ background: '#1a1a2e', border: 'none', borderRadius: '10px', padding: '10px 20px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 16px #00000033' }}>
          🖨️ چاپ گزارش
        </button>
      </div>

      {/* انتخاب نوع و بازه */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {/* نوع گزارش */}
        <div style={{ display: 'flex', background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', overflow: 'hidden' }}>
          {(['weekly', 'monthly'] as const).map((v, i) => (
            <div key={v} onClick={() => { setReportType(v); setWeekOffset(0); setMonthOffset(0) }} style={{ padding: '7px 16px', background: reportType === v ? '#c9a84c22' : 'transparent', borderRight: i === 0 ? `1px solid ${t.border}` : 'none', color: reportType === v ? '#e8c96a' : t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', userSelect: 'none' as const }}>
              {v === 'weekly' ? '📅 هفتگی' : '📆 ماهانه'}
            </div>
          ))}
        </div>

        {/* ناوبری */}
        {reportType === 'weekly' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setWeekOffset(w => w - 1)} style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '5px 10px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>←</button>
            <span style={{ color: t.text, fontSize: '12px', fontWeight: '600', minWidth: '160px', textAlign: 'center' }}>{weekRange.label}</span>
            <button onClick={() => setWeekOffset(w => w + 1)} style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '5px 10px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>→</button>
            <button onClick={() => setWeekOffset(0)} style={{ background: '#c9a84c22', border: '1px solid #c9a84c44', borderRadius: '6px', padding: '5px 10px', color: '#e8c96a', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>این هفته</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setMonthOffset(m => m - 1)} style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '5px 10px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>←</button>
            <span style={{ color: t.text, fontSize: '12px', fontWeight: '600', minWidth: '120px', textAlign: 'center' }}>{monthRange.label}</span>
            <button onClick={() => setMonthOffset(m => m + 1)} style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '5px 10px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>→</button>
            <button onClick={() => setMonthOffset(0)} style={{ background: '#c9a84c22', border: '1px solid #c9a84c44', borderRadius: '6px', padding: '5px 10px', color: '#e8c96a', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>این ماه</button>
          </div>
        )}
      </div>

      {/* پیش‌نمایش گزارش */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '14px', overflow: 'hidden' }}>

        {/* هدر پیش‌نمایش */}
        <div style={{ background: isDark ? '#0f1117' : '#1a1a2e', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#e8c96a', fontSize: '12px', fontWeight: '600' }}>پیش‌نمایش گزارش</div>
          <div style={{ color: '#ffffff55', fontSize: '11px' }}>A4 — RTL — فارسی رسمی</div>
        </div>

        {/* محتوای قابل چاپ */}
        <div ref={printRef} style={{ background: '#fff', color: '#1a1a2e', direction: 'rtl', fontFamily: 'Segoe UI, Tahoma, Arial, sans-serif' }}>

          {/* هدر گزارش */}
          <div className="print-header" style={{ padding: '24px 32px 16px', borderBottom: '3px solid #1a1a2e', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', background: '#1a1a2e', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🏛️</div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#1a1a2e' }}>وزارت آموزش و پرورش</div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>معاونت آموزش متوسطه — دفتر معاون وزیر</div>
              </div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a2e' }}>{periodLabel}</div>
              <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>تاریخ تهیه: {todayJalali}</div>
              <div style={{ display: 'inline-block', background: '#1a1a2e', color: '#fff', fontSize: '9px', padding: '2px 8px', borderRadius: '10px', marginTop: '4px' }}>
                گزارش {reportType === 'weekly' ? 'هفتگی' : 'ماهانه'} اجرایی
              </div>
            </div>
          </div>

          {/* خلاصه آماری */}
          <div style={{ padding: '0 32px', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#1a1a2e', borderRight: '4px solid #c9a84c', paddingRight: '10px', marginBottom: '12px' }}>
              خلاصه اجرایی
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {[
                { val: stats.meetings.total, lbl: 'کل جلسات', cls: 'gold', color: '#b8882c', bg: '#fdf8e8', border: '#c9a84c' },
                { val: stats.meetings.approved, lbl: 'جلسات برگزار شده', cls: 'green', color: '#2a9a62', bg: '#f0fdf6', border: '#3dbb82' },
                { val: stats.reports.total, lbl: 'گزارش دریافتی', cls: 'blue', color: '#2a7edf', bg: '#f0f7ff', border: '#4a9eff' },
                { val: stats.tasks.done, lbl: 'درخواست انجام شده', cls: 'green', color: '#2a9a62', bg: '#f0fdf6', border: '#3dbb82' },
              ].map((item, i) => (
                <div key={i} style={{ border: `1.5px solid ${item.border}`, borderRadius: '10px', padding: '12px', textAlign: 'center', background: item.bg }}>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: item.color, lineHeight: 1, marginBottom: '4px' }}>{item.val}</div>
                  <div style={{ fontSize: '10px', color: '#888' }}>{item.lbl}</div>
                </div>
              ))}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e8e8e8', margin: '0 32px 20px' }} />

          {/* جلسات */}
          <div style={{ padding: '0 32px', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#1a1a2e', borderRight: '4px solid #c9a84c', paddingRight: '10px', marginBottom: '12px' }}>
              جلسات ({stats.meetings.total} جلسه)
            </div>

            {/* آمار جلسات */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {[
                { label: 'تأیید شده', val: stats.meetings.approved, color: '#2a9a62', border: '#3dbb82', bg: '#f0fdf6' },
                { label: 'در انتظار', val: stats.meetings.pending, color: '#b8882c', border: '#c9a84c', bg: '#fdf8e8' },
                { label: 'لغو شده', val: stats.meetings.cancelled, color: '#c03535', border: '#e05555', bg: '#fff5f5' },
              ].map((item, i) => (
                <div key={i} style={{ border: `1px solid ${item.border}`, borderRadius: '8px', padding: '8px 12px', background: item.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: '#666' }}>{item.label}</span>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: item.color }}>{item.val}</span>
                </div>
              ))}
            </div>

            {meetings.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ background: '#1a1a2e', color: '#fff' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>روز</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>تاریخ</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>ساعت</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>عنوان</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>مکان</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>نوع</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {meetings.map((m, i) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                      <td style={{ padding: '7px 10px' }}>{m.day_of_week || '—'}</td>
                      <td style={{ padding: '7px 10px' }}>{toJalali(m.date)}</td>
                      <td style={{ padding: '7px 10px' }}>{m.time}{m.end_time ? `—${m.end_time}` : ''}</td>
                      <td style={{ padding: '7px 10px', fontWeight: '600' }}>{m.title_fa}</td>
                      <td style={{ padding: '7px 10px' }}>{m.location || '—'}</td>
                      <td style={{ padding: '7px 10px' }}>{m.meeting_type || '—'}</td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{
                          display: 'inline-block', padding: '1px 7px', borderRadius: '6px', fontSize: '9px', fontWeight: '600',
                          background: m.status === 'approved' ? '#f0fdf6' : m.status === 'cancelled' ? '#fff5f5' : '#fdf8e8',
                          color: m.status === 'approved' ? '#2a9a62' : m.status === 'cancelled' ? '#c03535' : '#b8882c',
                          border: `1px solid ${m.status === 'approved' ? '#3dbb82' : m.status === 'cancelled' ? '#e05555' : '#c9a84c'}`,
                        }}>
                          {statusLabelM[m.status] || m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: '#aaa', fontSize: '11px', border: '1px solid #eee', borderRadius: '8px' }}>
                جلسه‌ای در این بازه ثبت نشده است
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e8e8e8', margin: '0 32px 20px' }} />

          {/* گزارش‌ها */}
          <div style={{ padding: '0 32px', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#1a1a2e', borderRight: '4px solid #4a9eff', paddingRight: '10px', marginBottom: '12px' }}>
              گزارش‌های دریافتی ({stats.reports.total} گزارش)
            </div>
            {reports.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ background: '#1a1a2e', color: '#fff' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>عنوان</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>ارسال‌کننده</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>استان/واحد</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>تاریخ</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                      <td style={{ padding: '7px 10px', fontWeight: '600' }}>{r.title_fa}</td>
                      <td style={{ padding: '7px 10px' }}>{r.author || '—'}</td>
                      <td style={{ padding: '7px 10px' }}>{r.province || r.department || '—'}</td>
                      <td style={{ padding: '7px 10px' }}>{toJalali(r.created_at)}</td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{
                          display: 'inline-block', padding: '1px 7px', borderRadius: '6px', fontSize: '9px', fontWeight: '600',
                          background: r.status === 'approved' ? '#f0fdf6' : r.status === 'rejected' ? '#fff5f5' : '#fdf8e8',
                          color: r.status === 'approved' ? '#2a9a62' : r.status === 'rejected' ? '#c03535' : '#b8882c',
                          border: `1px solid ${r.status === 'approved' ? '#3dbb82' : r.status === 'rejected' ? '#e05555' : '#c9a84c'}`,
                        }}>
                          {statusLabelR[r.status] || r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: '#aaa', fontSize: '11px', border: '1px solid #eee', borderRadius: '8px' }}>
                گزارشی در این بازه دریافت نشده است
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e8e8e8', margin: '0 32px 20px' }} />

          {/* درخواست‌ها */}
          <div style={{ padding: '0 32px', marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#1a1a2e', borderRight: '4px solid #3dbb82', paddingRight: '10px', marginBottom: '12px' }}>
              درخواست‌ها و تکالیف ({stats.tasks.total} مورد)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {[
                { label: 'انجام شده', val: stats.tasks.done, color: '#2a9a62', border: '#3dbb82', bg: '#f0fdf6' },
                { label: 'در حال انجام', val: stats.tasks.inProgress, color: '#2a7edf', border: '#4a9eff', bg: '#f0f7ff' },
                { label: 'در انتظار', val: stats.tasks.pending, color: '#b8882c', border: '#c9a84c', bg: '#fdf8e8' },
              ].map((item, i) => (
                <div key={i} style={{ border: `1px solid ${item.border}`, borderRadius: '8px', padding: '8px 12px', background: item.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: '#666' }}>{item.label}</span>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: item.color }}>{item.val}</span>
                </div>
              ))}
            </div>

            {tasks.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ background: '#1a1a2e', color: '#fff' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>عنوان درخواست</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>مسئول</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>مرتبط با جلسه</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>اولویت</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>مهلت</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((tk, i) => (
                    <tr key={tk.id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                      <td style={{ padding: '7px 10px', fontWeight: '600' }}>{tk.title}</td>
                      <td style={{ padding: '7px 10px' }}>{tk.assigned_to || '—'}</td>
                      <td style={{ padding: '7px 10px' }}>{tk.meetings?.title_fa || '—'}</td>
                      <td style={{ padding: '7px 10px' }}>{priorityLabel[tk.priority] || tk.priority}</td>
                      <td style={{ padding: '7px 10px' }}>{tk.due_date ? toJalali(tk.due_date) : '—'}</td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{
                          display: 'inline-block', padding: '1px 7px', borderRadius: '6px', fontSize: '9px', fontWeight: '600',
                          background: tk.status === 'done' ? '#f0fdf6' : tk.status === 'in_progress' ? '#f0f7ff' : tk.status === 'cancelled' ? '#fff5f5' : '#fdf8e8',
                          color: tk.status === 'done' ? '#2a9a62' : tk.status === 'in_progress' ? '#2a7edf' : tk.status === 'cancelled' ? '#c03535' : '#b8882c',
                          border: `1px solid ${tk.status === 'done' ? '#3dbb82' : tk.status === 'in_progress' ? '#4a9eff' : tk.status === 'cancelled' ? '#e05555' : '#c9a84c'}`,
                        }}>
                          {statusLabelT[tk.status] || tk.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: '#aaa', fontSize: '11px', border: '1px solid #eee', borderRadius: '8px' }}>
                درخواستی در این بازه ثبت نشده است
              </div>
            )}
          </div>

          {/* امضا */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '0 32px', marginTop: '32px', marginBottom: '24px' }}>
            {[
              { title: 'تهیه‌کننده گزارش', name: 'مسئول دفتر معاونت' },
              { title: 'تأییدکننده', name: 'معاون وزیر آموزش و پرورش' },
            ].map((s, i) => (
              <div key={i} style={{ borderTop: '1px solid #ccc', paddingTop: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '32px' }}>{s.title}</div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#1a1a2e' }}>{s.name}</div>
                <div style={{ fontSize: '9px', color: '#aaa', marginTop: '4px' }}>امضا و مهر</div>
              </div>
            ))}
          </div>

          {/* فوتر */}
          <div style={{ padding: '12px 32px', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: '#aaa' }}>سامانه مدیریت معاونت آموزش متوسطه</span>
            <span style={{ fontSize: '9px', color: '#aaa' }}>تاریخ چاپ: {todayJalali}</span>
          </div>

        </div>
      </div>
    </div>
  )
}