'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { toJalali } from '@/lib/date'

type AlertLevel = 'critical' | 'important' | 'warning' | 'info'

const levelConfig: Record<AlertLevel, { label: string; color: string; bg: string; icon: string }> = {
  critical:  { label: 'بحرانی', color: '#e05555', bg: '#e0555522', icon: '🚨' },
  important: { label: 'مهم',    color: '#e09444', bg: '#e0944422', icon: '⚠️' },
  warning:   { label: 'هشدار', color: '#c9a84c', bg: '#c9a84c22', icon: '🔔' },
  info:      { label: 'اطلاع', color: '#4a9eff', bg: '#4a9eff22', icon: 'ℹ️' },
}

export default function AlertsPage() {
  const { t } = useTheme()
  const { showToast, ToastComponent } = useToast()
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [newAlert, setNewAlert] = useState({ title: '', body: '', level: 'warning' as AlertLevel })

  useEffect(() => { fetchAlerts() }, [])

  const fetchAlerts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setAlerts(data)
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newAlert.title || !newAlert.body) {
      showToast('لطفاً عنوان و متن هشدار را وارد کنید', 'error')
      return
    }
    const { error } = await supabase.from('alerts').insert([{
      title: newAlert.title, body: newAlert.body,
      level: newAlert.level, is_read: false, is_snoozed: false,
    }])
    if (!error) {
      showToast('هشدار با موفقیت ثبت شد', 'success')
      fetchAlerts()
      setNewAlert({ title: '', body: '', level: 'warning' })
      setShowForm(false)
    } else {
      showToast('خطا در ثبت هشدار', 'error')
    }
  }

  const markRead = async (id: string) => {
    await supabase.from('alerts').update({ is_read: true }).eq('id', id)
    fetchAlerts()
  }

  const dismiss = (id: string) => {
    setConfirmDelete(id)
  }

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return
    await supabase.from('alerts').delete().eq('id', confirmDelete)
    showToast('هشدار بسته شد', 'info')
    setConfirmDelete(null)
    fetchAlerts()
  }

  const snooze = async (id: string, current: boolean) => {
    await supabase.from('alerts').update({ is_snoozed: !current }).eq('id', id)
    showToast(current ? 'هشدار بازگردانی شد' : 'هشدار به تعویق افتاد', 'info')
    fetchAlerts()
  }

  const markAllRead = async () => {
    await supabase.from('alerts').update({ is_read: true }).eq('is_read', false)
    showToast('همه هشدارها خوانده شد', 'success')
    fetchAlerts()
  }

  const filtered = alerts.filter(a => {
    if (filter === 'all') return true
    if (filter === 'unread') return !a.is_read
    return a.level === filter
  })

  const unreadCount = alerts.filter(a => !a.is_read).length

  const filters = [
    { key: 'all', label: 'همه' },
    { key: 'unread', label: `خوانده نشده (${unreadCount})` },
    { key: 'critical', label: '🚨 بحرانی' },
    { key: 'important', label: '⚠️ مهم' },
    { key: 'warning', label: '🔔 هشدار' },
    { key: 'info', label: 'ℹ️ اطلاع' },
  ]

  const inputStyle = {
    width: '100%', background: t.input, border: `1px solid ${t.border}`,
    borderRadius: '8px', padding: '8px 12px', color: t.text,
    fontSize: '12px', outline: 'none', direction: 'rtl' as const, fontFamily: 'inherit',
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: t.sub, fontSize: '13px' }}>
      ⏳ در حال بارگذاری...
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: t.text, fontSize: '18px', fontWeight: '700' }}>سیستم هشدارها</h1>
          <p style={{ color: t.muted, fontSize: '12px', marginTop: '4px' }}>{unreadCount} هشدار خوانده نشده</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '10px 16px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              همه را خواندم
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)} className="btn-gold">+ هشدار جدید</button>
        </div>
      </div>

      {showForm && (
        <div style={{ background: t.card, border: '1px solid #c9a84c33', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#e8c96a', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>ایجاد هشدار جدید</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>عنوان هشدار</label>
              <input style={inputStyle} placeholder="عنوان هشدار" value={newAlert.title} onChange={e => setNewAlert(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>متن هشدار</label>
              <textarea style={{ ...inputStyle, height: '80px', resize: 'none' }} placeholder="توضیحات..." value={newAlert.body} onChange={e => setNewAlert(p => ({ ...p, body: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '8px' }}>سطح هشدار</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(Object.keys(levelConfig) as AlertLevel[]).map(level => (
                  <div key={level} onClick={() => setNewAlert(p => ({ ...p, level }))} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', background: newAlert.level === level ? levelConfig[level].bg : t.inner, border: `1px solid ${newAlert.level === level ? levelConfig[level].color + '55' : t.border}`, color: newAlert.level === level ? levelConfig[level].color : t.sub }}>
                    {levelConfig[level].icon} {levelConfig[level].label}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 16px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>انصراف</button>
            <button onClick={handleAdd} className="btn-gold" style={{ padding: '8px 16px', fontSize: '12px' }}>ثبت هشدار</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {filters.map(f => (
          <div key={f.key} onClick={() => setFilter(f.key)} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', background: filter === f.key ? '#c9a84c22' : t.card, border: filter === f.key ? '1px solid #c9a84c44' : `1px solid ${t.border}`, color: filter === f.key ? '#e8c96a' : t.sub, transition: 'all 0.2s' }}>
            {f.label}
          </div>
        ))}
      </div>

      <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map(alert => {
          const cfg = levelConfig[alert.level as AlertLevel] || levelConfig.info
          return (
            <div key={alert.id} style={{ background: t.card, border: `1px solid ${alert.is_read ? t.border : cfg.color + '33'}`, borderRadius: '12px', padding: '16px', opacity: alert.is_snoozed ? 0.5 : 1, transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    {!alert.is_read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cfg.color, flexShrink: 0 }}></div>}
                    <span style={{ color: t.text, fontSize: '13px', fontWeight: alert.is_read ? '400' : '600' }}>{alert.title}</span>
                    <div style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600', background: cfg.bg, color: cfg.color }}>{cfg.label}</div>
                    {alert.is_snoozed && <div style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', background: t.inner, color: t.muted }}>به تعویق افتاده</div>}
                  </div>
                  <div style={{ color: t.sub, fontSize: '12px', lineHeight: '1.6', marginBottom: '6px' }}>{alert.body}</div>
                  <div style={{ color: t.muted, fontSize: '11px' }}>{toJalali(alert.created_at)}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexShrink: 0 }}>
                  {!alert.is_read && (
                    <button onClick={() => markRead(alert.id)} style={{ background: '#3dbb8222', border: '1px solid #3dbb8244', borderRadius: '6px', padding: '5px 10px', color: '#3dbb82', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>خواندم</button>
                  )}
                  <button onClick={() => snooze(alert.id, alert.is_snoozed)} style={{ background: t.inner, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '5px 10px', color: t.sub, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {alert.is_snoozed ? 'بازگردانی' : 'تعویق'}
                  </button>
                  <button onClick={() => dismiss(alert.id)} style={{ background: '#e0555522', border: '1px solid #e0555544', borderRadius: '6px', padding: '5px 10px', color: '#e05555', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>بستن</button>
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '40px', textAlign: 'center', color: t.muted, fontSize: '13px' }}>هشداری یافت نشد ✓</div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="بستن هشدار"
          message="آیا از بستن این هشدار مطمئن هستید؟"
          confirmLabel="بله، ببند"
          type="warning"
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {ToastComponent}
    </div>
  )
}