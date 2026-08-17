'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { useIsMobile } from '@/lib/useIsMobile'
import { useAuthStore } from '@/stores/authStore'
import { toJalali } from '@/lib/date'
import { activateOnKey } from '@/lib/a11y'
import {
  PRIORITY_LABELS as priorityLabel, PRIORITY_COLORS as priorityColor,
  TASK_STATUS_LABELS as statusLabel, TASK_STATUS_COLORS as statusColor,
} from '@/lib/constants'

function daysDiff(dueDate: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

interface ItemCardProps {
  item: any
  t: any
  isMobile: boolean
  canEdit: boolean
  currentUserId?: string
  onStatusChange: (id: string, status: string) => void
  onCarryOver: (id: string) => void
}

function ItemCard({ item, t, isMobile, canEdit, currentUserId, onStatusChange, onCarryOver }: ItemCardProps) {
  const diff = item.due_date ? daysDiff(item.due_date) : null
  const canUpdate = canEdit || item.assigned_to_user_id === currentUserId
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '14px 16px', borderRight: `4px solid ${priorityColor[item.priority] || '#555'}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span style={{ color: t.text, fontSize: '13px', fontWeight: '600' }}>{item.title}</span>
            <span style={{ padding: '1px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '600', background: (priorityColor[item.priority] || '#555') + '22', color: priorityColor[item.priority] || '#555' }}>
              {priorityLabel[item.priority]}
            </span>
            {item.is_carried_over && (
              <span style={{ padding: '1px 8px', borderRadius: '8px', fontSize: '10px', background: '#8b90a822', color: '#8b90a8', border: '1px solid #8b90a844' }}>↻ منتقل‌شده</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {item.assigned_to_name && <span style={{ color: t.sub, fontSize: '11px' }}>👤 {item.assigned_to_name}</span>}
            {item.meetings && (
              <a href="/dashboard/meetings" style={{ color: '#c9a84c', fontSize: '11px', textDecoration: 'none' }}>
                🗓 {item.meetings.day_of_week} {toJalali(item.meetings.date)} — {item.meetings.title_fa}
              </a>
            )}
            {item.due_date && (
              <span style={{ color: diff !== null && diff < 0 ? '#e05555' : diff !== null && diff <= 2 ? '#e09444' : t.muted, fontSize: '11px', fontWeight: diff !== null && diff < 0 ? '700' : '400' }}>
                📅 {toJalali(item.due_date)}
                {diff !== null && (diff < 0 ? ` — ${Math.abs(diff)} روز گذشته` : diff === 0 ? ' — امروز' : ` — ${diff} روز مانده`)}
              </span>
            )}
            {!item.due_date && <span style={{ color: t.muted, fontSize: '11px' }}>بدون مهلت</span>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', flexShrink: 0 }}>
          {canUpdate ? (
            <select value={item.status} onChange={e => onStatusChange(item.id, e.target.value)}
              style={{ background: (statusColor[item.status] || '#555') + '22', border: `1px solid ${(statusColor[item.status] || '#555')}44`, borderRadius: '8px', padding: '4px 10px', color: statusColor[item.status] || '#555', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', outline: 'none', direction: 'rtl' }}>
              <option value="pending">در انتظار</option>
              <option value="in_progress">در حال انجام</option>
              <option value="done">انجام شد</option>
              <option value="cancelled">لغو شد</option>
            </select>
          ) : (
            <span style={{ background: (statusColor[item.status] || '#555') + '22', border: `1px solid ${(statusColor[item.status] || '#555')}44`, borderRadius: '8px', padding: '4px 10px', color: statusColor[item.status] || '#555', fontSize: '11px', fontWeight: '600' }}>
              {statusLabel[item.status]}
            </span>
          )}
          {canEdit && !item.is_carried_over && (
            <button onClick={() => onCarryOver(item.id)} style={{ background: '#8b90a822', border: '1px solid #8b90a844', borderRadius: '6px', padding: '4px 10px', color: '#8b90a8', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>
              ↻ انتقال به جلسه بعد
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface SectionProps {
  title: string
  color: string
  list: any[]
  t: any
  isMobile: boolean
  canEdit: boolean
  currentUserId?: string
  onStatusChange: (id: string, status: string) => void
  onCarryOver: (id: string) => void
}

function Section({ title, color, list, t, ...itemProps }: SectionProps) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
        <div style={{ color: t.text, fontSize: '13px', fontWeight: '700' }}>{title}</div>
        <div style={{ color: t.muted, fontSize: '11px' }}>({list.length})</div>
      </div>
      {list.length === 0 ? (
        <div style={{ color: t.muted, fontSize: '12px', textAlign: 'center', padding: '16px', background: t.inner, borderRadius: '10px' }}>موردی نیست</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {list.map(item => <ItemCard key={item.id} item={item} t={t} {...itemProps} />)}
        </div>
      )}
    </div>
  )
}

export default function ActionItemsPage() {
  const { t } = useTheme()
  const { user, can } = useAuthStore()
  const { showToast, ToastComponent } = useToast()
  const isMobile = useIsMobile()
  const canEdit = can('meetings', 'update')

  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'active' | 'pending' | 'in_progress'>('active')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('meeting_action_items')
      .select('*, meetings(title_fa, date, day_of_week)')
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true, nullsFirst: false })
    if (data) setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchItems()
    const channel = supabase
      .channel('action-items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_action_items' }, fetchItems)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchItems])

  const handleStatus = async (id: string, status: string) => {
    await supabase.from('meeting_action_items').update({ status }).eq('id', id)
    showToast('وضعیت بروزرسانی شد', 'success')
    fetchItems()
  }

  const handleCarryOver = async (id: string) => {
    await supabase.from('meeting_action_items').update({ is_carried_over: true }).eq('id', id)
    showToast('تکلیف به جلسه بعد منتقل شد', 'success')
    fetchItems()
  }

  const assigneeOptions = Array.from(new Set(items.map(i => i.assigned_to_name).filter(Boolean))) as string[]

  const filtered = items.filter(i =>
    (statusFilter === 'active' || i.status === statusFilter) &&
    (priorityFilter === 'all' || i.priority === priorityFilter) &&
    (assigneeFilter === 'all' || i.assigned_to_name === assigneeFilter)
  )

  const overdue = filtered.filter(i => i.due_date && daysDiff(i.due_date) < 0)
  const dueThisWeek = filtered.filter(i => i.due_date && daysDiff(i.due_date) >= 0 && daysDiff(i.due_date) <= 7)
  const upcoming = filtered.filter(i => !i.due_date || daysDiff(i.due_date) > 7)

  const inputStyle = {
    width: '100%', background: t.input, border: `1px solid ${t.border}`,
    borderRadius: '8px', padding: '8px 12px', color: t.text,
    fontSize: '12px', outline: 'none', direction: 'rtl' as const, fontFamily: 'inherit',
  }

  const sectionProps = { t, isMobile, canEdit, currentUserId: user?.id, onStatusChange: handleStatus, onCarryOver: handleCarryOver }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: t.sub, fontSize: '13px' }}>
      ⏳ در حال بارگذاری...
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', direction: 'rtl' }}>
      <div>
        <h1 style={{ color: t.text, fontSize: isMobile ? '16px' : '18px', fontWeight: '700' }}>پیگیری تکالیف</h1>
        <p style={{ color: t.muted, fontSize: '12px', marginTop: '4px' }}>
          {items.length} تکلیف باز — {overdue.length} معوق
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {([
          { key: 'active', label: 'همه باز' },
          { key: 'pending', label: 'در انتظار' },
          { key: 'in_progress', label: 'در حال انجام' },
        ] as const).map(f => (
          <div key={f.key} onClick={() => setStatusFilter(f.key)}
            role="button" tabIndex={0} aria-pressed={statusFilter === f.key}
            onKeyDown={e => activateOnKey(e, () => setStatusFilter(f.key))}
            style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', background: statusFilter === f.key ? '#c9a84c22' : t.card, border: statusFilter === f.key ? '1px solid #c9a84c44' : `1px solid ${t.border}`, color: statusFilter === f.key ? '#e8c96a' : t.sub }}>
            {f.label}
          </div>
        ))}
        <select style={{ ...inputStyle, width: 'auto', minWidth: '110px' }} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
          <option value="all">همه اولویت‌ها</option>
          <option value="low">عادی</option>
          <option value="med">متوسط</option>
          <option value="high">مهم</option>
          <option value="critical">فوری</option>
        </select>
        <select style={{ ...inputStyle, width: 'auto', minWidth: '130px' }} value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}>
          <option value="all">همه مسئولین</option>
          {assigneeOptions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Section title="معوق" color="#e05555" list={overdue} {...sectionProps} />
        <Section title="مهلت این هفته" color="#e09444" list={dueThisWeek} {...sectionProps} />
        <Section title="آینده" color="#4a9eff" list={upcoming} {...sectionProps} />
      </div>

      {ToastComponent}
    </div>
  )
}
