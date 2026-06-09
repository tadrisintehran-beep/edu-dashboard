'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'
import { todayJalaliFull, toJalali } from '@/lib/date'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { t } = useTheme()
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [kpis, setKpis] = useState({
    pendingMeetings: 0, totalMeetings: 0,
    unreadReports: 0, totalReports: 0,
    criticalAlerts: 0, totalAlerts: 0,
    totalContacts: 0,
  })
  const [recentReports, setRecentReports] = useState<any[]>([])
  const [todayMeetings, setTodayMeetings] = useState<any[]>([])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { fetchData() }, [])

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: t.sub, fontSize: '13px' }}>
      ⏳ در حال بارگذاری...
    </div>
  )

  const kpiData = [
    { label: 'جلسات در انتظار', value: kpis.pendingMeetings, delta: `از ${kpis.totalMeetings} جلسه`, icon: '📅', color: '#c9a84c', deltaType: kpis.pendingMeetings > 0 ? 'down' : 'up' },
    { label: 'گزارش‌های خوانده نشده', value: kpis.unreadReports, delta: `از ${kpis.totalReports} گزارش`, icon: '📋', color: '#4a9eff', deltaType: kpis.unreadReports > 0 ? 'down' : 'up' },
    { label: 'هشدارهای فعال', value: kpis.totalAlerts, delta: `${kpis.criticalAlerts} بحرانی`, icon: '🔔', color: '#e05555', deltaType: kpis.criticalAlerts > 0 ? 'down' : 'up' },
    { label: 'مخاطبین', value: kpis.totalContacts, delta: 'دفترچه تلفن', icon: '👥', color: '#3dbb82', deltaType: 'up' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* سلام */}
      <div>
        <h1 style={{ color: t.text, fontSize: isMobile ? '16px' : '18px', fontWeight: '700' }}>
          سلام، {user?.name} 👋
        </h1>
        <p style={{ color: t.muted, fontSize: '12px', marginTop: '4px' }}>
          {todayJalaliFull()} — دفتر تهران
        </p>
      </div>

      {/* KPI Cards — روی موبایل ۲ تا ۲ تا */}
      <div className="stagger" style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: '10px',
      }}>
        {kpiData.map((kpi, i) => (
          <div key={i} className="hover-card" style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: isMobile ? '12px' : '16px', cursor: 'pointer' }}>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: kpi.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                {kpi.icon}
              </div>
            </div>
            <div style={{ color: t.sub, fontSize: '10px', marginBottom: '4px' }}>{kpi.label}</div>
            <div style={{ color: t.text, fontSize: isMobile ? '22px' : '28px', fontWeight: '700', marginBottom: '4px' }}>{kpi.value}</div>
            <div style={{ fontSize: '10px', color: kpi.deltaType === 'up' ? '#3dbb82' : '#e05555' }}>{kpi.delta}</div>
          </div>
        ))}
      </div>

      {/* ردیف دوم — روی موبایل یه ستونه */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 300px',
        gap: '12px',
      }}>

        {/* گزارش‌های اخیر */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ color: t.text, fontSize: '13px', fontWeight: '600' }}>آخرین گزارش‌ها</div>
            <a href="/dashboard/reports" style={{ color: '#c9a84c', fontSize: '11px', textDecoration: 'none' }}>همه →</a>
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
                <div style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600', background: (statusColor[report.status] || '#555') + '22', color: statusColor[report.status] || '#555', flexShrink: 0 }}>
                  {statusLabel[report.status] || report.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* جلسات اخیر */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ color: t.text, fontSize: '13px', fontWeight: '600' }}>آخرین جلسات</div>
            <a href="/dashboard/meetings" style={{ color: '#c9a84c', fontSize: '11px', textDecoration: 'none' }}>همه →</a>
          </div>
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {todayMeetings.length === 0 ? (
              <div style={{ color: t.muted, fontSize: '12px', textAlign: 'center', padding: '20px' }}>جلسه‌ای ثبت نشده</div>
            ) : todayMeetings.map(meeting => (
              <div key={meeting.id} className="hover-card" style={{ padding: '10px 12px', borderRadius: '8px', borderRight: `3px solid ${priorityColor[meeting.priority] || '#555'}`, background: t.inner, cursor: 'pointer' }}>
                <div style={{ color: t.muted, fontSize: '10px', marginBottom: '3px' }}>{meeting.time} — {meeting.date}</div>
                <div style={{ color: t.text, fontSize: '12px', fontWeight: '600' }}>{meeting.title_fa}</div>
                <div style={{ color: t.sub, fontSize: '10px', marginTop: '2px' }}>📍 {meeting.location} — 👥 {meeting.participants} نفر</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* آمار کلی */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px' }}>
        <div style={{ color: t.text, fontSize: '13px', fontWeight: '600', marginBottom: '14px' }}>آمار کلی سامانه</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: '10px',
        }}>
          {[
            { value: kpis.totalMeetings, label: 'کل جلسات', color: '#c9a84c' },
            { value: kpis.totalReports, label: 'کل گزارش‌ها', color: '#4a9eff' },
            { value: kpis.totalAlerts, label: 'هشدار فعال', color: '#e05555' },
            { value: kpis.totalContacts, label: 'مخاطبین', color: '#3dbb82' },
          ].map((item, i) => (
            <div key={i} style={{ background: t.inner, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <div style={{ color: item.color, fontSize: isMobile ? '24px' : '32px', fontWeight: '700' }}>{item.value}</div>
              <div style={{ color: t.muted, fontSize: '11px', marginTop: '4px' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}