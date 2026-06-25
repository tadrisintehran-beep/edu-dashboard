'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useIsMobile } from '@/lib/useIsMobile'
import { useAuthStore } from '@/stores/authStore'

function toJalali(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const jalaali = require('jalaali-js')
    const d = new Date(dateStr)
    const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
    return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`
  } catch { return dateStr }
}

const priorityColor: Record<string, string> = {
  low: '#4a9eff', med: '#c9a84c', high: '#e09444', critical: '#e05555',
}
const priorityLabel: Record<string, string> = {
  low: 'عادی', med: 'متوسط', high: 'مهم', critical: 'فوری',
}
const statusColor: Record<string, string> = {
  pending: '#c9a84c', in_progress: '#4a9eff', done: '#3dbb82', cancelled: '#e05555',
}
const statusLabel: Record<string, string> = {
  pending: 'در انتظار', in_progress: 'در حال انجام', done: 'انجام شد', cancelled: 'لغو شد',
}

export default function TasksPage() {
  const { t } = useTheme()
  const { user } = useAuthStore()
  const { showToast, ToastComponent } = useToast()
  const isMobile = useIsMobile()
  const [tasks, setTasks] = useState<any[]>([])
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [newTask, setNewTask] = useState({
    title: '', description: '', assigned_to: '',
    priority: 'med', due_date: '', meeting_id: '',
  })

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*, meetings(title_fa, date, day_of_week)')
      .order('created_at', { ascending: false })
    if (data) setTasks(data)
    setLoading(false)
  }, [])

  const fetchMeetings = useCallback(async () => {
    const { data } = await supabase
      .from('meetings')
      .select('id, title_fa, date, day_of_week')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(20)
    if (data) setMeetings(data)
  }, [])

  useEffect(() => {
    fetchTasks()
    fetchMeetings()
    const channel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchTasks, fetchMeetings])

  const handleAdd = async () => {
    if (!newTask.title) {
      showToast('لطفاً عنوان را وارد کنید', 'error')
      return
    }
    const { error } = await supabase.from('tasks').insert([{
      title: newTask.title,
      description: newTask.description,
      assigned_to: newTask.assigned_to,
      priority: newTask.priority,
      due_date: newTask.due_date || null,
      meeting_id: newTask.meeting_id || null,
      created_by: user?.name || '',
      status: 'pending',
    }])
    if (!error) {
      showToast('درخواست ثبت شد ✅', 'success')
      fetchTasks()
      setNewTask({ title: '', description: '', assigned_to: '', priority: 'med', due_date: '', meeting_id: '' })
      setShowForm(false)
    } else {
      showToast('خطا در ثبت درخواست', 'error')
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    showToast('وضعیت بروزرسانی شد', 'success')
    fetchTasks()
  }

  const handleDelete = (id: string) => { setConfirmDelete(id) }

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return
    await supabase.from('tasks').delete().eq('id', confirmDelete)
    showToast('درخواست حذف شد', 'info')
    setConfirmDelete(null)
    fetchTasks()
  }

  const filtered = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus)
  const pendingCount = tasks.filter(t => t.status === 'pending').length

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', direction: 'rtl' }}>

      {/* هدر */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ color: t.text, fontSize: isMobile ? '16px' : '18px', fontWeight: '700' }}>
            درخواست‌ها و تکالیف
          </h1>
          <p style={{ color: t.muted, fontSize: '12px', marginTop: '4px' }}>
            {tasks.length} درخواست — {pendingCount} در انتظار
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold">+ درخواست جدید</button>
      </div>

      {/* فیلتر وضعیت */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {([
          { key: 'all', label: 'همه' },
          { key: 'pending', label: 'در انتظار' },
          { key: 'in_progress', label: 'در حال انجام' },
          { key: 'done', label: 'انجام شده' },
          { key: 'cancelled', label: 'لغو شده' },
        ]).map(f => (
          <div key={f.key} onClick={() => setFilterStatus(f.key)} style={{
            padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
            background: filterStatus === f.key ? '#c9a84c22' : t.card,
            border: filterStatus === f.key ? '1px solid #c9a84c44' : `1px solid ${t.border}`,
            color: filterStatus === f.key ? '#e8c96a' : t.sub,
          }}>
            {f.label}
            {f.key === 'pending' && pendingCount > 0 && (
              <span style={{ marginRight: '6px', background: '#e05555', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '10px' }}>
                {pendingCount}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* فرم درخواست جدید */}
      {showForm && (
        <div style={{ background: t.card, border: '1px solid #c9a84c33', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#e8c96a', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
            📋 ثبت درخواست جدید
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>عنوان درخواست *</label>
              <input style={inputStyle} placeholder="مثال: تهیه گزارش عملکرد از مدیرکل استان تهران"
                value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>توضیحات</label>
              <textarea style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' as const }}
                placeholder="جزئیات بیشتر..."
                value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>مسئول انجام</label>
              <input style={inputStyle} placeholder="نام مسئول دفتر یا کارشناس"
                value={newTask.assigned_to} onChange={e => setNewTask(p => ({ ...p, assigned_to: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>مرتبط با جلسه</label>
              <select style={inputStyle} value={newTask.meeting_id} onChange={e => setNewTask(p => ({ ...p, meeting_id: e.target.value }))}>
                <option value="">— بدون جلسه —</option>
                {meetings.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.day_of_week} {toJalali(m.date)} — {m.title_fa}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>اولویت</label>
              <select style={inputStyle} value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))}>
                <option value="low">عادی</option>
                <option value="med">متوسط</option>
                <option value="high">مهم</option>
                <option value="critical">فوری</option>
              </select>
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>مهلت انجام</label>
              <input style={inputStyle} type="date"
                value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 16px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>انصراف</button>
            <button onClick={handleAdd} className="btn-gold" style={{ padding: '8px 20px', fontSize: '12px' }}>ثبت درخواست</button>
          </div>
        </div>
      )}

      {/* لیست درخواست‌ها */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.length === 0 ? (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '40px', textAlign: 'center', color: t.muted, fontSize: '13px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
            درخواستی یافت نشد
          </div>
        ) : filtered.map(task => (
          <div key={task.id} style={{
            background: t.card, border: `1px solid ${t.border}`,
            borderRadius: '12px', padding: '14px 16px',
            borderRight: `4px solid ${priorityColor[task.priority] || '#555'}`,
            opacity: task.status === 'cancelled' ? 0.6 : 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>

              {/* اطلاعات اصلی */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <span style={{ color: t.text, fontSize: '13px', fontWeight: '600' }}>{task.title}</span>
                  <span style={{ padding: '1px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '600', background: (priorityColor[task.priority] || '#555') + '22', color: priorityColor[task.priority] || '#555' }}>
                    {priorityLabel[task.priority]}
                  </span>
                </div>

                {task.description && (
                  <div style={{ color: t.sub, fontSize: '12px', marginBottom: '8px', lineHeight: '1.6' }}>
                    {task.description}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {task.assigned_to && (
                    <span style={{ color: t.muted, fontSize: '11px' }}>👤 {task.assigned_to}</span>
                  )}
                  {task.due_date && (
                    <span style={{ color: new Date(task.due_date) < new Date() && task.status !== 'done' ? '#e05555' : t.muted, fontSize: '11px' }}>
                      📅 مهلت: {toJalali(task.due_date)}
                    </span>
                  )}
                  {task.meetings && (
                    <span style={{ color: '#c9a84c', fontSize: '11px' }}>
                      🗓 {task.meetings.day_of_week} {toJalali(task.meetings.date)} — {task.meetings.title_fa}
                    </span>
                  )}
                  <span style={{ color: t.muted, fontSize: '11px' }}>
                    ثبت: {task.created_by}
                  </span>
                </div>
              </div>

              {/* وضعیت و دکمه‌ها */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', flexShrink: 0 }}>
                <select
                  value={task.status}
                  onChange={e => handleStatusChange(task.id, e.target.value)}
                  style={{
                    background: (statusColor[task.status] || '#555') + '22',
                    border: `1px solid ${(statusColor[task.status] || '#555')}44`,
                    borderRadius: '8px', padding: '4px 10px',
                    color: statusColor[task.status] || '#555',
                    fontSize: '11px', fontWeight: '600',
                    cursor: 'pointer', fontFamily: 'inherit',
                    outline: 'none', direction: 'rtl',
                  }}
                >
                  <option value="pending">در انتظار</option>
                  <option value="in_progress">در حال انجام</option>
                  <option value="done">انجام شد</option>
                  <option value="cancelled">لغو شد</option>
                </select>

                <button onClick={() => handleDelete(task.id)} style={{ background: '#e0555511', border: '1px solid #e0555533', borderRadius: '6px', padding: '4px 10px', color: '#e05555', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  🗑 حذف
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="حذف درخواست"
          message="آیا از حذف این درخواست مطمئن هستید؟"
          confirmLabel="بله، حذف کن"
          type="danger"
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {ToastComponent}
    </div>
  )
}