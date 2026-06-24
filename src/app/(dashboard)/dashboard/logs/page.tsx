'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useIsMobile } from '@/lib/useIsMobile'
import { useRouter } from 'next/navigation'

const ACTION_LABELS: Record<string, string> = {
  login: 'ورود', logout: 'خروج', view: 'مشاهده',
  create: 'ایجاد', update: 'ویرایش', delete: 'حذف',
}
const ACTION_COLORS: Record<string, string> = {
  login: '#3dbb82', logout: '#e05555', view: '#4a9eff',
  create: '#3dbb82', update: '#c9a84c', delete: '#e05555',
}
const RESOURCE_LABELS: Record<string, string> = {
  meetings: 'جلسات', reports: 'گزارش‌ها', documents: 'اسناد',
  contacts: 'دفترچه تلفن', alerts: 'هشدارها', users: 'کاربران',
  settings: 'تنظیمات', profile: 'پروفایل',
}

function toJalali(dateStr: string): string {
  try {
    const jalaali = require('jalaali-js')
    const d = new Date(dateStr)
    const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
    const time = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')} — ${time}`
  } catch { return dateStr }
}

export default function LogsPage() {
  const { t } = useTheme()
  const { user, can } = useAuthStore()
  const isMobile = useIsMobile()
  const router = useRouter()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState('all')
  const [filterUser, setFilterUser] = useState('all')
  const [users, setUsers] = useState<string[]>([])

  // فقط SUPER_ADMIN
  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') {
      router.replace('/dashboard')
    }
  }, [user])

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('access_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (data) {
      setLogs(data)
      const uniqueUsers = [...new Set(data.map(l => l.user_name).filter(Boolean))]
      setUsers(uniqueUsers as string[])
    }
    setLoading(false)
  }

  const filtered = logs.filter(l => {
    if (filterAction !== 'all' && l.action !== filterAction) return false
    if (filterUser !== 'all' && l.user_name !== filterUser) return false
    return true
  })

  if (user?.role !== 'SUPER_ADMIN') return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', direction: 'rtl' }}>

      {/* هدر */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ color: t.text, fontSize: isMobile ? '16px' : '18px', fontWeight: '700' }}>لاگ دسترسی</h1>
          <p style={{ color: t.muted, fontSize: '12px', marginTop: '4px' }}>{filtered.length} رویداد</p>
        </div>
        <button onClick={fetchLogs} style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 14px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
          🔄 بروزرسانی
        </button>
      </div>

      {/* فیلترها */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '7px 12px', color: t.text, fontSize: '12px', fontFamily: 'inherit', direction: 'rtl', outline: 'none' }}
        >
          <option value="all">همه اقدامات</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={filterUser}
          onChange={e => setFilterUser(e.target.value)}
          style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '7px 12px', color: t.text, fontSize: '12px', fontFamily: 'inherit', direction: 'rtl', outline: 'none' }}
        >
          <option value="all">همه کاربران</option>
          {users.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      {/* آمار سریع */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3,1fr)' : 'repeat(6,1fr)', gap: '8px' }}>
        {Object.entries(ACTION_LABELS).map(([key, label]) => (
          <div key={key} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '10px', textAlign: 'center', cursor: 'pointer', opacity: filterAction !== 'all' && filterAction !== key ? 0.5 : 1 }}
            onClick={() => setFilterAction(filterAction === key ? 'all' : key)}>
            <div style={{ color: ACTION_COLORS[key], fontSize: '18px', fontWeight: '800' }}>
              {logs.filter(l => l.action === key).length}
            </div>
            <div style={{ color: t.muted, fontSize: '10px', marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* لیست لاگ‌ها */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: t.muted, fontSize: '13px' }}>⏳ در حال بارگذاری...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: t.muted, fontSize: '13px' }}>رویداد یافت نشد</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: t.inner, borderBottom: `2px solid ${t.border}` }}>
                  {['زمان', 'کاربر', 'اقدام', 'بخش', 'جزئیات'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'right', color: t.sub, fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${t.border}`, background: i % 2 === 0 ? 'transparent' : t.inner + '55' }}>
                    <td style={{ padding: '10px 14px', color: t.muted, fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {toJalali(log.created_at)}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ color: t.text, fontWeight: '600', fontSize: '12px' }}>{log.user_name || '—'}</div>
                      <div style={{ color: t.muted, fontSize: '10px' }}>{log.user_email || ''}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', background: (ACTION_COLORS[log.action] || '#555') + '22', color: ACTION_COLORS[log.action] || '#555' }}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: t.sub, fontSize: '11px' }}>
                      {RESOURCE_LABELS[log.resource] || log.resource || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: t.muted, fontSize: '11px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}