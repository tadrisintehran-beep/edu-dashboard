'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'

const statusLabel: Record<string, string> = {
  submitted: 'ارسال شده', reviewing: 'در حال بررسی', approved: 'تأیید شده', rejected: 'رد شده',
}
const statusColor: Record<string, string> = {
  submitted: '#4a9eff', reviewing: '#c9a84c', approved: '#3dbb82', rejected: '#e05555',
}

export default function ReportsPage() {
  const { t } = useTheme()
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)
  const [newReport, setNewReport] = useState({ title: '', province: '', department: '', summary: '' })

  useEffect(() => { fetchReports() }, [])

  const fetchReports = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setReports(data)
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newReport.title || !newReport.summary) return
    const { error } = await supabase.from('reports').insert([{
      title_fa: newReport.title,
      author: 'محمد رضایی',
      province: newReport.province,
      department: newReport.department,
      summary: newReport.summary,
      status: 'submitted',
      seen: false,
    }])
    if (!error) {
      fetchReports()
      setNewReport({ title: '', province: '', department: '', summary: '' })
      setShowForm(false)
    }
  }

  const handleApprove = async (id: string) => {
    await supabase.from('reports').update({ status: 'approved' }).eq('id', id)
    fetchReports()
    setSelected(null)
  }

  const handleReject = async (id: string) => {
    await supabase.from('reports').update({ status: 'rejected' }).eq('id', id)
    fetchReports()
    setSelected(null)
  }

  const handleSeen = async (id: string) => {
    await supabase.from('reports').update({ seen: true }).eq('id', id)
    fetchReports()
  }

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter)

  const filters = [
    { key: 'all', label: 'همه' },
    { key: 'submitted', label: 'ارسال شده' },
    { key: 'reviewing', label: 'در بررسی' },
    { key: 'approved', label: 'تأیید شده' },
    { key: 'rejected', label: 'رد شده' },
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
          <h1 style={{ color: t.text, fontSize: '18px', fontWeight: '700' }}>سیستم گزارش ها</h1>
          <p style={{ color: t.muted, fontSize: '12px', marginTop: '4px' }}>{reports.filter(r => !r.seen).length} گزارش خوانده نشده</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold">+ گزارش جدید</button>
      </div>

      {showForm && (
        <div style={{ background: t.card, border: '1px solid #c9a84c33', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#e8c96a', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>ارسال گزارش جدید</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            {[
              { label: 'عنوان گزارش', key: 'title', placeholder: 'عنوان گزارش' },
              { label: 'استان', key: 'province', placeholder: 'نام استان' },
              { label: 'واحد سازمانی', key: 'department', placeholder: 'اداره / معاونت' },
            ].map(field => (
              <div key={field.key}>
                <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>{field.label}</label>
                <input style={inputStyle} placeholder={field.placeholder}
                  value={newReport[field.key as keyof typeof newReport]}
                  onChange={e => setNewReport(p => ({ ...p, [field.key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>خلاصه گزارش</label>
            <textarea style={{ ...inputStyle, height: '80px', resize: 'none' }} placeholder="خلاصه گزارش..."
              value={newReport.summary} onChange={e => setNewReport(p => ({ ...p, summary: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 16px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>انصراف</button>
            <button onClick={handleAdd} className="btn-gold" style={{ padding: '8px 16px', fontSize: '12px' }}>ارسال</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        {filters.map(f => (
          <div key={f.key} onClick={() => setFilter(f.key)} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', background: filter === f.key ? '#c9a84c22' : t.card, border: filter === f.key ? '1px solid #c9a84c44' : `1px solid ${t.border}`, color: filter === f.key ? '#e8c96a' : t.sub, transition: 'all 0.2s' }}>
            {f.label}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: '12px' }}>
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(report => (
            <div key={report.id} className="hover-card" onClick={() => { setSelected(report); handleSeen(report.id) }}
              style={{ background: selected?.id === report.id ? t.inner : t.card, border: `1px solid ${selected?.id === report.id ? '#c9a84c33' : t.border}`, borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: report.seen ? 'transparent' : '#4a9eff', flexShrink: 0, border: report.seen ? `1px solid ${t.border}` : 'none' }}></div>
              <div style={{ flex: 1 }}>
                <div style={{ color: t.text, fontSize: '13px', fontWeight: report.seen ? '400' : '600', marginBottom: '4px' }}>{report.title_fa}</div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ color: t.sub, fontSize: '11px' }}>👤 {report.author}</span>
                  <span style={{ color: t.sub, fontSize: '11px' }}>📍 {report.province}</span>
                  <span style={{ color: t.sub, fontSize: '11px' }}>🗓 {new Date(report.created_at).toLocaleDateString('fa-IR')}</span>
                </div>
              </div>
              <div style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', background: statusColor[report.status] + '22', color: statusColor[report.status], flexShrink: 0 }}>
                {statusLabel[report.status]}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '40px', textAlign: 'center', color: t.muted, fontSize: '13px' }}>گزارشی یافت نشد</div>
          )}
        </div>

        {selected && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ color: t.text, fontSize: '14px', fontWeight: '700', flex: 1 }}>{selected.title_fa}</div>
              <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', color: t.muted, fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'نویسنده', value: selected.author },
                { label: 'استان', value: selected.province },
                { label: 'واحد', value: selected.department },
                { label: 'تاریخ', value: new Date(selected.created_at).toLocaleDateString('fa-IR') },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${t.border}` }}>
                  <span style={{ color: t.muted, fontSize: '12px' }}>{item.label}</span>
                  <span style={{ color: t.text, fontSize: '12px' }}>{item.value}</span>
                </div>
              ))}
            </div>
            <div style={{ background: t.inner, borderRadius: '8px', padding: '12px' }}>
              <div style={{ color: t.sub, fontSize: '11px', marginBottom: '6px' }}>خلاصه گزارش</div>
              <div style={{ color: t.text, fontSize: '12px', lineHeight: '1.8' }}>{selected.summary}</div>
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: statusColor[selected.status] + '22', border: `1px solid ${statusColor[selected.status]}44`, color: statusColor[selected.status], fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>
              وضعیت: {statusLabel[selected.status]}
            </div>
            {(selected.status === 'submitted' || selected.status === 'reviewing') && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleApprove(selected.id)} style={{ flex: 1, background: '#3dbb8222', border: '1px solid #3dbb8244', borderRadius: '8px', padding: '10px', color: '#3dbb82', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>✓ تأیید</button>
                <button onClick={() => handleReject(selected.id)} style={{ flex: 1, background: '#e0555522', border: '1px solid #e0555544', borderRadius: '8px', padding: '10px', color: '#e05555', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>✕ رد</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}