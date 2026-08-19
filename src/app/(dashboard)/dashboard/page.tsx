'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'
import { todayJalaliFull, toJalali } from '@/lib/date'
import { useIsMobile } from '@/lib/useIsMobile'
import { activateOnKey } from '@/lib/a11y'
import { PRIORITY_COLORS, REPORT_STATUS_LABELS, REPORT_STATUS_COLORS } from '@/lib/constants'

function Sparkline({ data, color, width = 100, height = 28 }: { data: number[], color: string, width?: number, height?: number }) {
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const pts = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((val - min) / range) * (height - 4) - 2
    return `${x},${y}`
  })
  const gradId = `sg_${color.replace('#', '')}`
  const areaPath = `M ${pts[0]} L ${pts.slice(1).join(' L ')} L ${width},${height} L 0,${height} Z`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]} r="3" fill={color} />
    </svg>
  )
}

function TrendChart({ meetingData, reportData, months, isDark, t }: {
  meetingData: number[], reportData: number[], months: string[], isDark: boolean, t: any
}) {
  const [tooltip, setTooltip] = useState<{ x: number, y: number, month: string, meetings: number, reports: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const W = 600
  const H = 110
  const PAD = { top: 20, right: 20, bottom: 40, left: 40 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const maxVal = Math.max(...meetingData, ...reportData, 1)
  const steps = 4

  const getX = (i: number) => PAD.left + (i / (months.length - 1)) * chartW
  const getY = (val: number) => PAD.top + chartH - (val / maxVal) * chartH

  const meetingPoints = meetingData.map((v, i) => ({ x: getX(i), y: getY(v), v }))
  const reportPoints = reportData.map((v, i) => ({ x: getX(i), y: getY(v), v }))

  const linePath = (pts: { x: number, y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  const areaPath = (pts: { x: number, y: number }[]) =>
    `${linePath(pts)} L ${pts[pts.length - 1].x} ${PAD.top + chartH} L ${pts[0].x} ${PAD.top + chartH} Z`

  const gridLines = Array.from({ length: steps + 1 }, (_, i) => {
    const val = Math.round((maxVal / steps) * i)
    const y = getY(val)
    return { val, y }
  })

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible', direction: 'ltr' }}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="gradMeeting" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gradReport" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a9eff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#4a9eff" stopOpacity="0" />
          </linearGradient>
          <filter id="glow-gold">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-blue">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {gridLines.map(({ val, y }) => (
          <g key={val}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke={isDark ? '#ffffff10' : '#00000010'} strokeWidth="1" strokeDasharray="4,4" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10"
              fill={isDark ? '#555c78' : '#999'} fontFamily="inherit">{val}</text>
          </g>
        ))}

        <path d={areaPath(meetingPoints)} fill="url(#gradMeeting)" />
        <path d={areaPath(reportPoints)} fill="url(#gradReport)" />

        <path d={linePath(meetingPoints)} fill="none" stroke="#c9a84c" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-gold)" />
        <path d={linePath(reportPoints)} fill="none" stroke="#4a9eff" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-blue)" />

        {months.map((month, i) => (
          <g key={i}>
            <rect
              x={getX(i) - 20} y={PAD.top} width={40} height={chartH}
              fill="transparent" style={{ cursor: 'pointer' }}
              onMouseEnter={() => {
                setTooltip({
                  x: getX(i),
                  y: Math.min(meetingPoints[i].y, reportPoints[i].y) - 10,
                  month: month.split('\n')[0],
                  meetings: meetingData[i],
                  reports: reportData[i],
                })
              }}
            />
            <circle cx={meetingPoints[i].x} cy={meetingPoints[i].y} r="4"
              fill="#c9a84c" stroke={isDark ? '#1a1e2c' : '#fff'} strokeWidth="2" />
            <circle cx={reportPoints[i].x} cy={reportPoints[i].y} r="4"
              fill="#4a9eff" stroke={isDark ? '#1a1e2c' : '#fff'} strokeWidth="2" />
            <text x={getX(i)} y={H - 18} textAnchor="middle" fontSize="10"
              fill={isDark ? '#555c78' : '#999'} fontFamily="inherit">
              {month.split('\n')[0]}
            </text>
            <text x={getX(i)} y={H - 6} textAnchor="middle" fontSize="9"
              fill={isDark ? '#3a3f55' : '#bbb'} fontFamily="inherit">
              {month.split('\n')[1]}
            </text>
          </g>
        ))}

        {tooltip && (() => {
          const tx = Math.min(Math.max(tooltip.x, 60), W - 80)
          const ty = Math.max(tooltip.y - 60, PAD.top)
          return (
            <g>
              <rect x={tx - 55} y={ty} width="110" height="56" rx="8"
                fill={isDark ? '#1a1e2c' : '#fff'}
                stroke={isDark ? '#ffffff15' : '#e0e0e0'} strokeWidth="1"
                style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}
              />
              <text x={tx} y={ty + 16} textAnchor="middle" fontSize="11" fontWeight="700"
                fill={isDark ? '#e8eaf0' : '#1a1a2e'} fontFamily="inherit">
                {tooltip.month}
              </text>
              <circle cx={tx - 35} cy={ty + 32} r="4" fill="#c9a84c" />
              <text x={tx - 28} y={ty + 36} fontSize="10" fill={isDark ? '#c9a84c' : '#b8882c'} fontFamily="inherit">
                جلسات: {tooltip.meetings}
              </text>
              <circle cx={tx - 35} cy={ty + 48} r="4" fill="#4a9eff" />
              <text x={tx - 28} y={ty + 52} fontSize="10" fill={isDark ? '#4a9eff' : '#2a7edf'} fontFamily="inherit">
                گزارش: {tooltip.reports}
              </text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}

function CollapsibleSection({ title, expanded, onToggle, t, children }: {
  title: string, expanded: boolean, onToggle: () => void, t: any, children: React.ReactNode
}) {
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden' }}>
      <div
        onClick={onToggle}
        role="button" tabIndex={0} aria-expanded={expanded}
        onKeyDown={e => activateOnKey(e, onToggle)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px', cursor: 'pointer', userSelect: 'none',
        }}
      >
        <div style={{ color: t.text, fontSize: '12px', fontWeight: '600' }}>{title}</div>
        <div style={{ color: t.sub, fontSize: '11px', transition: 'transform 0.2s ease', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</div>
      </div>
      <div style={{ display: 'grid', gridTemplateRows: expanded ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s ease' }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ padding: '0 14px 14px' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { t, isDark } = useTheme()
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
  const [totalUpcoming, setTotalUpcoming] = useState(0)
  const [trendData, setTrendData] = useState<{ months: string[], meetings: number[], reports: number[], alerts: number[], contacts: number[] }>({
    months: [], meetings: [], reports: [], alerts: [], contacts: [],
  })
  const [actionStats, setActionStats] = useState({
    totalThisMonth: 0, doneThisMonth: 0, overdue: 0,
    topAssignees: [] as { name: string, count: number }[],
  })
  const [expandedSections, setExpandedSections] = useState({
    trend: false, actionStats: false, overallStats: false,
  })
  const toggleSection = (key: keyof typeof expandedSections) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  const allExpanded = expandedSections.trend && expandedSections.actionStats && expandedSections.overallStats
  const toggleAllSections = () =>
    setExpandedSections({ trend: !allExpanded, actionStats: !allExpanded, overallStats: !allExpanded })

  useEffect(() => {
    fetchData()
    fetchActionItemStats()
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_action_items' }, () => fetchActionItemStats())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // اگر کاربر اجازه‌ی ثبت هشدار داره (SUPER_ADMIN/DEPUTY_MINISTER)، یادآورهای سررسیده رو
  // یک‌بار در بارگذاری داشبورد بررسی کن، به alerts اضافه کن و sent=true بزن
  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'DEPUTY_MINISTER') return
    checkActionItemReminders()
  }, [user?.role])

  const checkActionItemReminders = async () => {
    const nowIso = new Date().toISOString()
    const { data: due } = await supabase
      .from('action_item_reminders')
      .select('*, meeting_action_items(title, assigned_to_name, due_date)')
      .eq('sent', false)
      .lte('remind_at', nowIso)
    if (!due || due.length === 0) return
    for (const rem of due) {
      const item = (rem as any).meeting_action_items
      await supabase.from('alerts').insert([{
        title: `یادآوری تکلیف: ${item?.title || ''}`,
        body: `${item?.assigned_to_name ? `مسئول: ${item.assigned_to_name} — ` : ''}مهلت انجام: ${item?.due_date ? toJalali(item.due_date) : '—'}`,
        level: 'warning', is_read: false, is_snoozed: false,
      }])
      await supabase.from('action_item_reminders').update({ sent: true, sent_at: nowIso }).eq('id', rem.id)
    }
  }

  const fetchActionItemStats = async () => {
    const today = new Date().toISOString().split('T')[0]
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const [totalRes, doneRes, overdueRes, pendingRes] = await Promise.all([
      supabase.from('meeting_action_items').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth),
      supabase.from('meeting_action_items').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth).eq('status', 'done'),
      supabase.from('meeting_action_items').select('id', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']).lt('due_date', today),
      supabase.from('meeting_action_items').select('assigned_to_name').in('status', ['pending', 'in_progress']).not('assigned_to_name', 'is', null),
    ])
    const counts: Record<string, number> = {}
    ;(pendingRes.data || []).forEach((r: any) => { if (r.assigned_to_name) counts[r.assigned_to_name] = (counts[r.assigned_to_name] || 0) + 1 })
    const topAssignees = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count }))
    setActionStats({
      totalThisMonth: totalRes.count || 0,
      doneThisMonth: doneRes.count || 0,
      overdue: overdueRes.count || 0,
      topAssignees,
    })
  }

  const fetchData = async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const sixMonthsAgoDate = sixMonthsAgo.toISOString().split('T')[0]

    const [
      totalMeetings, pendingMeetings, totalReports, unreadReports,
      totalAlerts, criticalAlerts, totalContacts,
      recentReportsRes, upcomingMeetingsRes, totalUpcomingRes,
      trendMeetings, trendReports, trendAlerts, trendContacts,
    ] = await Promise.all([
      supabase.from('meetings').select('id', { count: 'exact', head: true }),
      supabase.from('meetings').select('id', { count: 'exact', head: true }).eq('status', 'pending').gte('date', today),
      supabase.from('reports').select('id', { count: 'exact', head: true }),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('seen', false),
      supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('is_read', false),
      supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('level', 'critical').eq('is_read', false),
      supabase.from('contacts').select('id', { count: 'exact', head: true }),
      supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('meetings').select('*').gte('date', today).order('date', { ascending: true }).order('time', { ascending: true }).limit(7),
      supabase.from('meetings').select('id', { count: 'exact', head: true }).gte('date', today),
      supabase.from('meetings').select('date').gte('date', sixMonthsAgoDate),
      supabase.from('reports').select('created_at').gte('created_at', sixMonthsAgoDate),
      supabase.from('alerts').select('created_at').gte('created_at', sixMonthsAgoDate),
      supabase.from('contacts').select('created_at').gte('created_at', sixMonthsAgoDate),
    ])

    setKpis({
      pendingMeetings: pendingMeetings.count || 0,
      totalMeetings: totalMeetings.count || 0,
      unreadReports: unreadReports.count || 0,
      totalReports: totalReports.count || 0,
      criticalAlerts: criticalAlerts.count || 0,
      totalAlerts: totalAlerts.count || 0,
      totalContacts: totalContacts.count || 0,
    })

    setRecentReports(recentReportsRes.data || [])
    setUpcomingMeetings(upcomingMeetingsRes.data || [])
    setTotalUpcoming(totalUpcomingRes.count || 0)

    buildTrendData(trendMeetings.data || [], trendReports.data || [], trendAlerts.data || [], trendContacts.data || [])
    setLoading(false)
  }

  const buildTrendData = (meetings: any[], reports: any[], alerts: any[], contacts: any[]) => {
    try {
      const jalaali = require('jalaali-js')
      const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
      const today = new Date()
      const jToday = jalaali.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate())

      const countInMonth = (rows: any[], field: string, jy: number, jm: number) =>
        rows.filter(r => {
          if (!r[field]) return false
          const d = new Date(r[field])
          const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
          return j.jy === jy && j.jm === jm
        }).length

      const monthsData: { key: string, label: string, meetings: number, reports: number, alerts: number, contacts: number }[] = []

      for (let i = 5; i >= 0; i--) {
        let jm = jToday.jm - i
        let jy = jToday.jy
        while (jm <= 0) { jm += 12; jy-- }

        const label = `${monthNames[jm - 1]}\n${jy}`

        monthsData.push({
          key: label, label,
          meetings: countInMonth(meetings, 'date', jy, jm),
          reports: countInMonth(reports, 'created_at', jy, jm),
          alerts: countInMonth(alerts, 'created_at', jy, jm),
          contacts: countInMonth(contacts, 'created_at', jy, jm),
        })
      }

      setTrendData({
        months: monthsData.map(d => d.label),
        meetings: monthsData.map(d => d.meetings),
        reports: monthsData.map(d => d.reports),
        alerts: monthsData.map(d => d.alerts),
        contacts: monthsData.map(d => d.contacts),
      })
    } catch (e) {
      console.error(e)
    }
  }

  const priorityColor = PRIORITY_COLORS
  const statusColor = REPORT_STATUS_COLORS
  const statusLabel = REPORT_STATUS_LABELS

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

  // spark از داده‌ی واقعی ۶ ماه اخیر ساخته می‌شه (همون trendData که در نمودار روند استفاده می‌شه)
  const kpiData = [
    { label: 'جلسات در انتظار', value: kpis.pendingMeetings, sub: `از ${kpis.totalMeetings} جلسه`, icon: '📅', color: '#c9a84c', trend: kpis.pendingMeetings > 0 ? 'down' : 'up', spark: trendData.meetings.length ? trendData.meetings : [0, 0] },
    { label: 'گزارش نخوانده', value: kpis.unreadReports, sub: `از ${kpis.totalReports} گزارش`, icon: '📋', color: '#4a9eff', trend: kpis.unreadReports > 0 ? 'down' : 'up', spark: trendData.reports.length ? trendData.reports : [0, 0] },
    { label: 'هشدار فعال', value: kpis.totalAlerts, sub: `${kpis.criticalAlerts} بحرانی`, icon: '🔔', color: '#e05555', trend: kpis.criticalAlerts > 0 ? 'down' : 'up', spark: trendData.alerts.length ? trendData.alerts : [0, 0] },
    { label: 'مخاطبین', value: kpis.totalContacts, sub: 'دفترچه تلفن', icon: '👥', color: '#3dbb82', trend: 'up', spark: trendData.contacts.length ? trendData.contacts : [0, 0] },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', direction: 'rtl' }}>

      {/* سلام */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ color: t.text, fontSize: isMobile ? '16px' : '20px', fontWeight: '700' }}>
            سلام 👋
          </h1>
          <p style={{ color: t.muted, fontSize: isMobile ? '12px' : '13px', marginTop: '3px' }}>
            {todayJalaliFull()} — دفتر تهران
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={toggleAllSections} style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '6px 12px', color: t.sub, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {allExpanded ? '▲ جمع کردن همه' : '▼ نمایش همه'}
          </button>
          <button onClick={fetchData} style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '6px 12px', color: t.sub, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px' }}>
            🔄 بروزرسانی
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '8px' }}>
        {kpiData.map((kpi, i) => (
          <div key={i} style={{
            background: t.card, border: `1px solid ${t.border}`,
            borderRadius: '12px', padding: isMobile ? '12px' : '14px',
            cursor: 'pointer', transition: 'all 0.2s',
            position: 'relative', overflow: 'hidden',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = kpi.color + '66'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 20px ${kpi.color}18` }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = t.border; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `linear-gradient(135deg, ${kpi.color}08, transparent)`, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: kpi.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>{kpi.icon}</div>
              <div style={{ fontSize: '10px', color: kpi.trend === 'up' ? t.greenText : t.redText }}>{kpi.trend === 'up' ? '↑' : '↓'}</div>
            </div>
            <div style={{ color: t.text, fontSize: isMobile ? '22px' : '26px', fontWeight: '800', lineHeight: 1, marginBottom: '4px' }}>{kpi.value}</div>
            <div style={{ color: t.sub, fontSize: '10px', marginBottom: '8px' }}>{kpi.label}</div>
            <Sparkline data={kpi.spark} color={kpi.color} width={isMobile ? 90 : 110} height={24} />
            <div style={{ color: t.muted, fontSize: '10px', borderTop: `1px solid ${t.border}`, paddingTop: '6px', marginTop: '6px' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ردیف دوم */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '300px 1fr', gap: '10px' }}>

        {/* جلسات پیش رو */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '14px', minHeight: isMobile ? '360px' : '480px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ color: t.text, fontSize: '12px', fontWeight: '600' }}>📅 جلسات پیش رو</div>
            <a href="/dashboard/meetings" style={{ color: t.goldText, fontSize: '11px', textDecoration: 'none' }}>
              همه ({totalUpcoming}) →
            </a>
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
                    <span style={{ padding: '1px 6px', borderRadius: '6px', fontSize: '9px', background: '#c9a84c22', color: t.goldText, border: '1px solid #c9a84c33' }}>{meeting.day_of_week}</span>
                  )}
                  <span style={{ color: t.goldText, fontSize: '11px', fontWeight: '700' }}>{meeting.time}</span>
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
            <a href="/dashboard/reports" style={{ color: t.goldText, fontSize: '11px', textDecoration: 'none' }}>همه →</a>
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

      {/* نمودار روند */}
      <CollapsibleSection title="📊 روند ۶ ماه اخیر" expanded={expandedSections.trend} onToggle={() => toggleSection('trend')} t={t}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div style={{ color: t.muted, fontSize: '11px' }}>جلسات و گزارش‌های دریافتی</div>
          <div style={{ display: 'flex', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '24px', height: '3px', background: '#c9a84c', borderRadius: '2px' }} />
              <span style={{ color: t.muted, fontSize: '11px' }}>جلسات</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '24px', height: '3px', background: '#4a9eff', borderRadius: '2px' }} />
              <span style={{ color: t.muted, fontSize: '11px' }}>گزارش‌ها</span>
            </div>
          </div>
        </div>
        {trendData.months.length > 0 ? (
          <TrendChart
            meetingData={trendData.meetings}
            reportData={trendData.reports}
            months={trendData.months}
            isDark={isDark}
            t={t}
          />
        ) : (
          <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.muted, fontSize: '12px' }}>
            داده‌ای برای نمایش وجود ندارد
          </div>
        )}
      </CollapsibleSection>

      {/* آمار کلی */}
      <CollapsibleSection title="📈 آمار کلی سامانه" expanded={expandedSections.overallStats} onToggle={() => toggleSection('overallStats')} t={t}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '8px' }}>
          {[
            { value: kpis.totalMeetings, label: 'کل جلسات', color: t.goldText, icon: '📅' },
            { value: kpis.totalReports, label: 'کل گزارش‌ها', color: t.blueText, icon: '📋' },
            { value: kpis.totalAlerts, label: 'هشدار فعال', color: t.redText, icon: '🔔' },
            { value: kpis.totalContacts, label: 'مخاطبین', color: t.greenText, icon: '👥' },
          ].map((item, i) => (
            <div key={i} style={{ background: t.inner, borderRadius: '10px', padding: '12px', textAlign: 'center', border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: '18px', marginBottom: '5px' }}>{item.icon}</div>
              <div style={{ color: item.color, fontSize: isMobile ? '22px' : '28px', fontWeight: '800' }}>{item.value}</div>
              <div style={{ color: t.muted, fontSize: '10px', marginTop: '3px' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* آمار تکالیف جلسات */}
      <CollapsibleSection title="🎯 تکالیف جلسات" expanded={expandedSections.actionStats} onToggle={() => toggleSection('actionStats')} t={t}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <a href="/dashboard/action-items" onClick={e => e.stopPropagation()} style={{ color: t.goldText, fontSize: '11px', textDecoration: 'none' }}>پیگیری تکالیف →</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 3fr', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <div style={{ background: t.inner, borderRadius: '10px', padding: '10px', textAlign: 'center', border: `1px solid ${t.border}` }}>
              <div style={{ color: t.text, fontSize: '20px', fontWeight: '800' }}>{actionStats.totalThisMonth}</div>
              <div style={{ color: t.muted, fontSize: '9px', marginTop: '3px' }}>تکلیف این ماه</div>
            </div>
            <div style={{ background: t.inner, borderRadius: '10px', padding: '10px', textAlign: 'center', border: `1px solid ${t.border}` }}>
              <div style={{ color: t.greenText, fontSize: '20px', fontWeight: '800' }}>
                {actionStats.totalThisMonth ? Math.round((actionStats.doneThisMonth / actionStats.totalThisMonth) * 100) : 0}%
              </div>
              <div style={{ color: t.muted, fontSize: '9px', marginTop: '3px' }}>نرخ انجام</div>
            </div>
            <div style={{ background: actionStats.overdue > 0 ? '#e0555511' : t.inner, borderRadius: '10px', padding: '10px', textAlign: 'center', border: `1px solid ${actionStats.overdue > 0 ? '#e0555544' : t.border}` }}>
              <div style={{ color: t.redText, fontSize: '20px', fontWeight: '800' }}>{actionStats.overdue}</div>
              <div style={{ color: t.muted, fontSize: '9px', marginTop: '3px' }}>معوق</div>
            </div>
          </div>
          <div>
            <div style={{ color: t.muted, fontSize: '10px', marginBottom: '8px' }}>بیشترین تکالیف باز بر عهده</div>
            {actionStats.topAssignees.length === 0 ? (
              <div style={{ color: t.muted, fontSize: '11px', textAlign: 'center', padding: '10px' }}>موردی نیست</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {actionStats.topAssignees.map((a, i) => (
                  <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: t.muted, fontSize: '10px', width: '14px' }}>{i + 1}.</span>
                    <span style={{ color: t.text, fontSize: '11px', flex: 1 }}>{a.name}</span>
                    <span style={{ color: t.goldText, fontSize: '11px', fontWeight: '700' }}>{a.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

    </div>
  )
}