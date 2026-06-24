'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'
import { todayJalaliFull, toJalali } from '@/lib/date'
import { useIsMobile } from '@/lib/useIsMobile'

// نمودار خطی پیشرفته با گرادیان
function Sparkline({ data, color, width = 100, height = 28 }: { data: number[], color: string, width?: number, height?: number }) {
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const pts = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((val - min) / range) * (height - 4) - 2
    return `${x},${y}`
  })
  const pointsStr = pts.join(' ')
  const gradId = `grad_${color.replace('#', '')}`

  // مسیر بسته برای gradient fill
  const areaPath = `M ${pts[0]} L ${pts.slice(1).join(' L ')} L ${width},${height} L 0,${height} Z`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* ناحیه پر شده */}
      <path d={areaPath} fill={`url(#${gradId})`} />
      {/* خط اصلی */}
      <polyline points={pointsStr} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* نقطه آخر */}
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]} r="3" fill={color} />
    </svg>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { t } = useTheme()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState({
    pendingMeetings: 0, totalMeetings: 0,
    unreadReports: 0, totalReports: 0,
    criticalAlerts: 0, totalAlerts: 0,
    totalContacts: 0,
  })
  const [recentReports, setRecentReports] = useState<any[]>([])
  const [upcomingMeetings, setUpcomingMeetings] = useState<any[]>([])

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => fetchData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [meetings, reports, alerts, contacts] = await Promise.all([
      supabase.from('meetings').select('*').order('date', { ascending: true }).order('time', { ascending: true }),
      supabase.from('reports').select('*').order('created_at', { ascending: false }),
      supabase.from('alerts').select('*').order('created_at', { ascending: false }),
      supabase.from('contacts').select('id'),
    ])
    const m = meetings.data || []
    const r = reports.data || []
    const a = alerts.data || []

    setKpis({
      pendingMeetings: m.filter(x => x.status === 'pending').length,
      totalMeetings: m.length,
      unreadReports: r.filter(x => !x.seen).length,
      totalReports: r.length,
      criticalAlerts: a.filter(x => x.level === 'critical' && !x.is_read).length,
      totalAlerts: a.filter(x => !x.is_read).length,
      totalContacts: contacts.data?.length || 0,
    })

    setRecentReports(r.slice(0, 5))

    const today = new Date().toISOString().split('T')[0]
    const upcoming = m
      .filter(x => x.date >= today)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return (a.time || '').localeCompare(b.time || '')
      })
      .slice(0, 5)
    setUpcomingMeetings(upcoming)
    setLoading(false)
  }

  const priorityColor: Record<string, string> = {
    high: '#e05555', med: '#c9a84c', low: '#4a9eff', critical: '#e05555',
  }
  const statusColor: Record<string, string> = {
    submitted: '#4a9eff', reviewing: '#c9a84c', approved: '#3dbb82', rejected: '#e05555',
  }
  const statusLabel: Record<string, string> = {
    submitted: 'ارسال شده', reviewing: 'در بررسی', approved: 'تأیید شده', rejected: 'رد شده',
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ height: '24px', width: '180px', background: t.inner, borderRadius: '8px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '8px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: '100px', background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px' }} />
        ))}
      </div>
    </div>
  )

  const kpiData = [
    {
      label: 'جلسات در انتظار',
      value: kpis.pendingMeetings,
      sub: `از ${kpis.totalMeetings} جلسه`,
      icon: '📅',
      color: '#c9a84c',
      trend: kpis.pendingMeetings > 0 ? 'down' : 'up',
      spark: [2, 3, 2, 4, 3, 5, kpis.pendingMeetings || 1],
    },
    {
      label: 'گزارش نخوانده',
      value: kpis.unreadReports,
      sub: `از ${kpis.totalReports} گزارش`,
      icon: '📋',
      color: '#4a9eff',
      trend: kpis.unreadReports > 0 ? 'down' : 'up',
      spark: [4, 3, 5, 2, 4, 3, kpis.unreadReports || 1],
    },
    {
      label: 'هشدار فعال',
      value: kpis.totalAlerts,
      sub: `${kpis.criticalAlerts} بحرانی`,
      icon: '🔔',
      color: '#e05555',
      trend: kpis.criticalAlerts > 0 ? 'down' : 'up',
      spark: [1, 2, 1, 3, 2, 3, kpis.totalAlerts || 1],
    },
    {
      label: 'مخاطبین',
      value: kpis.totalContacts,
      sub: 'دفترچه تلفن',
      icon: '👥',
      color: '#3dbb82',
      trend: 'up',
      spark: [1, 2, 2, 3, 3, 3, kpis.totalContacts || 1],
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', direction: 'rtl' }}>

      {/* سلام */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: t.text, fontSize: isMobile ? '15px' : '18px', fontWeight: '700' }}>
            سلام، {user?.name} 👋
          </h1>
          <p style={{ color: t.muted, fontSize: '11px', marginTop: '3px' }}>
            {todayJalaliFull()} — دفتر تهران
          </p>
        </div>
        <button onClick={fetchData} style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '6px 12px', color: t.sub, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px' }}>
          🔄 بروزرسانی
        </button>
      </div>

      {/* KPI Cards — کوچک‌تر و شیک‌تر */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '8px' }}>
        {kpiData.map((kpi, i) => (
          <div key={i}
            style={{
              background: t.card, border: `1px solid ${t.border}`,
              borderRadius: '12px', padding: '12px 14px',
              cursor: 'pointer', transition: 'all 0.2s',
              position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = kpi.color + '66'
              ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 20px ${kpi.color}18`
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = t.border
              ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
            }}
          >
            {/* گرادیان پس‌زمینه */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `linear-gradient(135deg, ${kpi.color}08, transparent)`, pointerEvents: 'none' }} />

            {/* هدر */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: kpi.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                  {kpi.icon}
                </div>
              </div>
              <div style={{ fontSize: '10px', color: kpi.trend === 'up' ? '#3dbb82' : '#e05555', display: 'flex', alignItems: 'center', gap: '2px' }}>
                {kpi.trend === 'up' ? '↑' : '↓'}
              </div>
            </div>

            {/* عدد */}
            <div style={{ color: t.text, fontSize: isMobile ? '22px' : '26px', fontWeight: '800', lineHeight: 1, marginBottom: '4px' }}>
              {kpi.value}
            </div>

            {/* لیبل */}
            <div style={{ color: t.sub, fontSize: '10px', marginBottom: '8px' }}>{kpi.label}</div>

            {/* نمودار */}
            <div style={{ marginBottom: '6px' }}>
              <Sparkline data={kpi.spark} color={kpi.color} width={isMobile ? 90 : 110} height={24} />
            </div>

            {/* زیرمتن */}
            <div style={{ color: t.muted, fontSize: '10px', borderTop: `1px solid ${t.border}`, paddingTop: '6px' }}>
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ردیف دوم */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '300px 1fr', gap: '10px' }}>

        {/* جلسات پیش رو */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ color: t.text, fontSize: '12px', fontWeight: '600' }}>📅 جلسات پیش رو</div>
            <a href="/dashboard/meetings" style={{ color: '#c9a84c', fontSize: '11px', textDecoration: 'none' }}>همه →</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {upcomingMeetings.length === 0 ? (
              <div style={{ color: t.muted, fontSize: '12px', textAlign: 'center', padding: '16px' }}>جلسه‌ای ثبت نشده</div>
            ) : upcomingMeetings.map(meeting => (
              <div key={meeting.id} style={{ padding: '8px 10px', borderRadius: '8px', borderRight: `3px solid ${priorityColor[meeting.priority] || '#555'}`, background: t.inner, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.8'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px', flexWrap: 'wrap' }}>
                  {meeting.day_of_week && (
                    <span style={{ padding: '1px 6px', borderRadius: '6px', fontSize: '9px', background: '#c9a84c22', color: '#e8c96a', border: '1px solid #c9a84c33' }}>
                      {meeting.day_of_week}
                    </span>
                  )}
                  <span style={{ color: '#e8c96a', fontSize: '11px', fontWeight: '700' }}>{meeting.time}</span>
                  {meeting.end_time && <span style={{ color: t.muted, fontSize: '10px' }}>— {meeting.end_time}</span>}
                  <span style={{ color: t.muted, fontSize: '10px', marginRight: 'auto' }}>{toJalali(meeting.date)}</span>
                </div>
                <div style={{ color: t.text, fontSize: '11px', fontWeight: '600', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meeting.title_fa}</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {meeting.location && <span style={{ color: t.sub, fontSize: '10px' }}>📍 {meeting.location}</span>}
                  {meeting.meeting_type && <span style={{ color: t.sub, fontSize: '10px' }}>🏷 {meeting.meeting_type}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* گزارش‌های اخیر */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ color: t.text, fontSize: '12px', fontWeight: '600' }}>📋 آخرین گزارش‌ها</div>
            <a href="/dashboard/reports" style={{ color: '#c9a84c', fontSize: '11px', textDecoration: 'none' }}>همه →</a>
          </div>
          <div>
            {recentReports.length === 0 ? (
              <div style={{ color: t.muted, fontSize: '12px', textAlign: 'center', padding: '16px' }}>گزارشی ثبت نشده</div>
            ) : recentReports.map((report, i) => (
              <div key={report.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 0', borderBottom: i < recentReports.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: report.seen ? 'transparent' : '#4a9eff', flexShrink: 0, border: report.seen ? `1px solid ${t.border}` : 'none' }}></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: t.text, fontSize: '12px', fontWeight: report.seen ? '400' : '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.title_fa}</div>
                  <div style={{ color: t.muted, fontSize: '10px', marginTop: '2px' }}>{report.author} — {toJalali(report.created_at)}</div>
                </div>
                <div style={{ padding: '2px 7px', borderRadius: '8px', fontSize: '10px', fontWeight: '600', background: (statusColor[report.status] || '#555') + '22', color: statusColor[report.status] || '#555', flexShrink: 0 }}>
                  {statusLabel[report.status] || report.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* آمار کلی */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '14px' }}>
        <div style={{ color: t.text, fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>آمار کلی سامانه</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '8px' }}>
          {[
            { value: kpis.totalMeetings, label: 'کل جلسات', color: '#c9a84c', icon: '📅' },
            { value: kpis.totalReports, label: 'کل گزارش‌ها', color: '#4a9eff', icon: '📋' },
            { value: kpis.totalAlerts, label: 'هشدار فعال', color: '#e05555', icon: '🔔' },
            { value: kpis.totalContacts, label: 'مخاطبین', color: '#3dbb82', icon: '👥' },
          ].map((item, i) => (
            <div key={i} style={{ background: t.inner, borderRadius: '10px', padding: '12px', textAlign: 'center', border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: '18px', marginBottom: '5px' }}>{item.icon}</div>
              <div style={{ color: item.color, fontSize: isMobile ? '22px' : '28px', fontWeight: '800' }}>{item.value}</div>
              <div style={{ color: t.muted, fontSize: '10px', marginTop: '3px' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}