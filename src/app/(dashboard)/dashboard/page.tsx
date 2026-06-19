'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'
import { todayJalaliFull, toJalali } from '@/lib/date'
import { useIsMobile } from '@/lib/useIsMobile'

function Sparkline({ data, color }: { data: number[], color: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 80
  const height = 32
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((val - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
  const [todayMeetings, setTodayMeetings] = useState<any[]>([])

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
      supabase.from('meetings').select('*').order('created_at', { ascending: false }),
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
    setTodayMeetings(m.slice(0, 4))
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
      {/* Skeleton */}
      <div style={{ height: '28px', width: '200px', background: t.inner, borderRadius: '8px', animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px' }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ height: '130px', background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', background: t.inner, borderRadius: '8px' }} />
            <div style={{ width: '60%', height: '12px', background: t.inner, borderRadius: '4px' }} />
            <div style={{ width: '40%', height: '24px', background: t.inner, borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    </div>
  )

  const kpiData = [
    {
      label: 'جلسات در انتظار',
      value: kpis.pendingMeetings,
      delta: `از ${kpis.totalMeetings} جلسه`,
      deltaType: kpis.pendingMeetings > 0 ? 'down' : 'up',
      icon: '📅', color: '#c9a84c',
      spark: [2, 4, 3, 5, 4, 6, kpis.pendingMeetings || 1],
    },
    {
      label: 'گزارش خوانده نشده',
      value: kpis.unreadReports,
      delta: `از ${kpis.totalReports} گزارش`,
      deltaType: kpis.unreadReports > 0 ? 'down' : 'up',
      icon: '📋', color: '#4a9eff',
      spark: [5, 3, 7, 4, 6, 3, kpis.unreadReports || 1],
    },
    {
      label: 'هشدارهای فعال',
      value: kpis.totalAlerts,
      delta: `${kpis.criticalAlerts} بحرانی`,
      deltaType: kpis.criticalAlerts > 0 ? 'down' : 'up',
      icon: '🔔', color: '#e05555',
      spark: [1, 2, 1, 3, 2, 4, kpis.totalAlerts || 1],
    },
    {
      label: 'مخاطبین',
      value: kpis.totalContacts,
      delta: 'دفترچه تلفن',
      deltaType: 'up',
      icon: '👥', color: '#3dbb82',
      spark: [1, 2, 3, 2, 4, 3, kpis.totalContacts || 1],
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* سلام */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ color: t.text, fontSize: isMobile ? '16px' : '20px', fontWeight: '700' }}>
            سلام، {user?.name} 👋
          </h1>
          <p style={{ color: t.muted, fontSize: '12px', marginTop: '4px' }}>
            {todayJalaliFull()} — دفتر تهران
          </p>
        </div>
        <button
          onClick={fetchData}
          style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 14px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          🔄 بروزرسانی
        </button>
      </div>

      {/* KPI Cards */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px' }}>
        {kpiData.map((kpi, i) => (
          <div key={i} style={{
            background: t.card, border: `1px solid ${t.border}`,
            borderRadius: '14px', padding: '16px', cursor: 'pointer',
            transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = kpi.color + '55'
              ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${kpi.color}22`
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = t.border
              ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
            }}
          >
            {/* گرادیان پس‌زمینه */}
            <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', background: `radial-gradient(circle, ${kpi.color}18, transparent 70%)`, pointerEvents: 'none' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: kpi.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                {kpi.icon}
              </div>
              <Sparkline data={kpi.spark} color={kpi.color} />
            </div>

            <div style={{ color: t.sub, fontSize: '11px', marginBottom: '6px' }}>{kpi.label}</div>
            <div style={{ color: t.text, fontSize: isMobile ? '24px' : '30px', fontWeight: '800', marginBottom: '6px', lineHeight: 1 }}>
              {kpi.value}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: kpi.deltaType === 'up' ? '#3dbb82' : '#e05555' }}>
              <span>{kpi.deltaType === 'up' ? '↑' : '↓'}</span>
              <span>{kpi.delta}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ردیف دوم */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 300px', gap: '12px' }}>

        {/* گزارش‌های اخیر */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ color: t.text, fontSize: '13px', fontWeight: '600' }}>آخرین گزارش‌ها</div>
            <a href="/dashboard/reports" style={{ color: '#c9a84c', fontSize: '11px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>همه <span>→</span></a>
          </div>
          <div className="stagger">
            {recentReports.length === 0 ? (
              <div style={{ color: t.muted, fontSize: '12px', textAlign: 'center', padding: '20px' }}>گزارشی ثبت نشده</div>
            ) : recentReports.map((report, i) => (
              <div key={report.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: i < recentReports.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: report.seen ? 'transparent' : '#4a9eff', flexShrink: 0, border: report.seen ? `1px solid ${t.border}` : 'none' }}></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: t.text, fontSize: '12px', fontWeight: report.seen ? '400' : '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.title_fa}</div>
                  <div style={{ color: t.muted, fontSize: '10px', marginTop: '2px' }}>{report.author} — {toJalali(report.created_at)}</div>
                </div>
                <div style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600', background: (statusColor[report.status] || '#555') + '22', color: statusColor[report.status] || '#555', flexShrink: 0 }}>
                  {statusLabel[report.status] || report.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* جلسات اخیر */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ color: t.text, fontSize: '13px', fontWeight: '600' }}>آخرین جلسات</div>
            <a href="/dashboard/meetings" style={{ color: '#c9a84c', fontSize: '11px', textDecoration: 'none' }}>همه →</a>
          </div>
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {todayMeetings.length === 0 ? (
              <div style={{ color: t.muted, fontSize: '12px', textAlign: 'center', padding: '20px' }}>جلسه‌ای ثبت نشده</div>
            ) : todayMeetings.map(meeting => (
              <div key={meeting.id} style={{ padding: '10px 12px', borderRadius: '10px', borderRight: `3px solid ${priorityColor[meeting.priority] || '#555'}`, background: t.inner, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = t.border}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = t.inner}
              >
                <div style={{ color: t.muted, fontSize: '10px', marginBottom: '3px' }}>{meeting.time} — {meeting.date}</div>
                <div style={{ color: t.text, fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>{meeting.title_fa}</div>
                <div style={{ color: t.sub, fontSize: '10px' }}>📍 {meeting.location} — 👥 {meeting.participants} نفر</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* آمار کلی */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '16px' }}>
        <div style={{ color: t.text, fontSize: '13px', fontWeight: '600', marginBottom: '14px' }}>آمار کلی سامانه</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px' }}>
          {[
            { value: kpis.totalMeetings, label: 'کل جلسات', color: '#c9a84c', icon: '📅' },
            { value: kpis.totalReports, label: 'کل گزارش‌ها', color: '#4a9eff', icon: '📋' },
            { value: kpis.totalAlerts, label: 'هشدار فعال', color: '#e05555', icon: '🔔' },
            { value: kpis.totalContacts, label: 'مخاطبین', color: '#3dbb82', icon: '👥' },
          ].map((item, i) => (
            <div key={i} style={{ background: t.inner, borderRadius: '10px', padding: '14px', textAlign: 'center', border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: '20px', marginBottom: '6px' }}>{item.icon}</div>
              <div style={{ color: item.color, fontSize: isMobile ? '24px' : '32px', fontWeight: '800' }}>{item.value}</div>
              <div style={{ color: t.muted, fontSize: '11px', marginTop: '4px' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}