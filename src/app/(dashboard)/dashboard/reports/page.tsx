'use client'

import { useState, useEffect, useRef } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useIsMobile } from '@/lib/useIsMobile'
import { toJalali } from '@/lib/date'
import { exportReportsToExcel } from '@/lib/exportData'

const statusLabel: Record<string, string> = {
  submitted: 'ارسال شده', reviewing: 'در حال بررسی', approved: 'تأیید شده', rejected: 'رد شده',
}
const statusColor: Record<string, string> = {
  submitted: '#4a9eff', reviewing: '#c9a84c', approved: '#3dbb82', rejected: '#e05555',
}

const fileTypeIcon: Record<string, string> = {
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'application/vnd.ms-powerpoint': '📋',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📋',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/gif': '🖼️',
  'image/webp': '🖼️',
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function ReportsPage() {
  const { t } = useTheme()
  const { showToast, ToastComponent } = useToast()
  const isMobile = useIsMobile()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [newReport, setNewReport] = useState({
    title: '', province: '', department: '', summary: '',
  })

  useEffect(() => {
    fetchReports()
    const channel = supabase
      .channel('reports-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => fetchReports())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchReports = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('reports').select('*').order('created_at', { ascending: false })
    if (!error && data) setReports(data)
    setLoading(false)
  }

  const handleFileSelect = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      showToast('حجم فایل نباید بیشتر از ۱۰ مگابایت باشد', 'error')
      return
    }
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    ]
    if (!allowedTypes.includes(file.type)) {
      showToast('فرمت فایل مجاز نیست. فقط PDF، Office و تصاویر مجازند', 'error')
      return
    }
    setSelectedFile(file)
  }

  const handleAdd = async () => {
    if (!newReport.title || !newReport.summary) {
      showToast('لطفاً عنوان و خلاصه گزارش را وارد کنید', 'error')
      return
    }
    setUploading(true)

    let filePath = null
    let fileName = null
    let fileSize = null
    let fileType = null

    if (selectedFile) {
      const path = `${Date.now()}_${selectedFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(path, selectedFile)

      if (uploadError) {
        showToast('خطا در آپلود فایل', 'error')
        setUploading(false)
        return
      }
      filePath = path
      fileName = selectedFile.name
      fileSize = selectedFile.size
      fileType = selectedFile.type
    }

    const { error } = await (supabase.from('reports') as any).insert([{
      title_fa: newReport.title,
      author: 'رضا کیاهی',
      province: newReport.province,
      department: newReport.department,
      summary: newReport.summary,
      status: 'submitted',
      seen: false,
      file_path: filePath,
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
    }])

    if (!error) {
      showToast('گزارش با موفقیت ارسال شد', 'success')
      fetchReports()
      setNewReport({ title: '', province: '', department: '', summary: '' })
      setSelectedFile(null)
      setShowForm(false)
    } else {
      showToast('خطا در ارسال گزارش', 'error')
    }
    setUploading(false)
  }

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage.from('reports').download(filePath)
    if (data) {
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleApprove = async (id: string) => {
    await supabase.from('reports').update({ status: 'approved' }).eq('id', id)
    showToast('گزارش تأیید شد', 'success')
    fetchReports()
    setSelected(null)
  }

  const handleReject = async (id: string) => {
    await supabase.from('reports').update({ status: 'rejected' }).eq('id', id)
    showToast('گزارش رد شد', 'info')
    fetchReports()
    setSelected(null)
  }

  const handleSeen = async (id: string) => {
    await supabase.from('reports').update({ seen: true }).eq('id', id)
    fetchReports()
  }

  const handleDelete = (id: string) => { setConfirmDelete(id) }

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return
    const report = reports.find(r => r.id === confirmDelete)
    if (report?.file_path) {
      await supabase.storage.from('reports').remove([report.file_path])
    }
    await supabase.from('reports').delete().eq('id', confirmDelete)
    showToast('گزارش حذف شد', 'info')
    if (selected?.id === confirmDelete) setSelected(null)
    setConfirmDelete(null)
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
          <h1 style={{ color: t.text, fontSize: isMobile ? '16px' : '18px', fontWeight: '700' }}>سیستم گزارش‌ها</h1>
          <p style={{ color: t.muted, fontSize: '12px', marginTop: '4px' }}>{reports.filter(r => !r.seen).length} گزارش خوانده نشده</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => exportReportsToExcel(filtered)} style={{ background: '#3dbb8222', border: '1px solid #3dbb8244', borderRadius: '8px', padding: '10px 16px', color: '#3dbb82', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
            📊 Excel
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-gold">+ گزارش جدید</button>
        </div>
      </div>

      {showForm && (
        <div style={{ background: t.card, border: '1px solid #c9a84c33', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#e8c96a', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>ارسال گزارش جدید</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
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

          {/* آپلود فایل */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>
              پیوست فایل <span style={{ color: t.muted }}>(اختیاری — حداکثر ۱۰ مگابایت)</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleFileSelect(file) }}
              style={{ border: `2px dashed ${selectedFile ? '#c9a84c' : t.border}`, borderRadius: '10px', padding: '20px', textAlign: 'center', cursor: 'pointer', background: selectedFile ? '#c9a84c11' : t.inner, transition: 'all 0.2s' }}
            >
              {selectedFile ? (
                <div>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>{fileTypeIcon[selectedFile.type] || '📁'}</div>
                  <div style={{ color: '#c9a84c', fontSize: '13px', fontWeight: '600' }}>{selectedFile.name}</div>
                  <div style={{ color: t.muted, fontSize: '11px', marginTop: '4px' }}>{formatSize(selectedFile.size)}</div>
                  <button
                    onClick={e => { e.stopPropagation(); setSelectedFile(null) }}
                    style={{ marginTop: '8px', background: '#e0555522', border: '1px solid #e0555544', borderRadius: '6px', padding: '4px 12px', color: '#e05555', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >حذف فایل</button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📎</div>
                  <div style={{ color: t.sub, fontSize: '13px', marginBottom: '4px' }}>فایل را اینجا بکشید یا کلیک کنید</div>
                  <div style={{ color: t.muted, fontSize: '11px' }}>PDF، Word، Excel، PowerPoint، تصاویر — حداکثر ۱۰ MB</div>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp"
              onChange={e => { const file = e.target.files?.[0]; if (file) handleFileSelect(file) }} />
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setSelectedFile(null) }}
              style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 16px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>انصراف</button>
            <button onClick={handleAdd} disabled={uploading} className="btn-gold" style={{ padding: '8px 16px', fontSize: '12px', opacity: uploading ? 0.7 : 1 }}>
              {uploading ? '⏳ در حال ارسال...' : 'ارسال گزارش'}
            </button>
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

      <div style={{ display: 'grid', gridTemplateColumns: selected && !isMobile ? '1fr 380px' : '1fr', gap: '12px' }}>
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(report => (
            <div key={report.id} className="hover-card" onClick={() => { setSelected(report); handleSeen(report.id) }}
              style={{ background: selected?.id === report.id ? t.inner : t.card, border: `1px solid ${selected?.id === report.id ? '#c9a84c33' : t.border}`, borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: report.seen ? 'transparent' : '#4a9eff', flexShrink: 0, border: report.seen ? `1px solid ${t.border}` : 'none' }}></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: t.text, fontSize: '13px', fontWeight: report.seen ? '400' : '600', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.title_fa}</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ color: t.sub, fontSize: '11px' }}>👤 {report.author}</span>
                  {!isMobile && <span style={{ color: t.sub, fontSize: '11px' }}>📍 {report.province}</span>}
                  <span style={{ color: t.sub, fontSize: '11px' }}>🗓 {toJalali(report.created_at)}</span>
                  {report.file_name && <span style={{ color: '#c9a84c', fontSize: '11px' }}>{fileTypeIcon[report.file_type] || '📁'} {report.file_name}</span>}
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
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', position: isMobile ? 'fixed' : 'relative', inset: isMobile ? '0' : 'auto', zIndex: isMobile ? 100 : 'auto', overflowY: isMobile ? 'auto' : 'visible' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ color: t.text, fontSize: '14px', fontWeight: '700', flex: 1 }}>{selected.title_fa}</div>
              <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', color: t.muted, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'نویسنده', value: selected.author },
                { label: 'استان', value: selected.province },
                { label: 'واحد', value: selected.department },
                { label: 'تاریخ', value: toJalali(selected.created_at) },
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

            {/* فایل پیوست */}
            {selected.file_name && (
              <div style={{ background: '#c9a84c11', border: '1px solid #c9a84c33', borderRadius: '10px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>{fileTypeIcon[selected.file_type] || '📁'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: t.text, fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.file_name}</div>
                  {selected.file_size && <div style={{ color: t.muted, fontSize: '10px', marginTop: '2px' }}>{formatSize(selected.file_size)}</div>}
                </div>
                <button
                  onClick={() => handleDownload(selected.file_path, selected.file_name)}
                  style={{ background: '#3dbb8222', border: '1px solid #3dbb8244', borderRadius: '6px', padding: '6px 12px', color: '#3dbb82', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                >⬇️ دانلود</button>
              </div>
            )}

            <div style={{ padding: '8px 12px', borderRadius: '8px', background: statusColor[selected.status] + '22', border: `1px solid ${statusColor[selected.status]}44`, color: statusColor[selected.status], fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>
              وضعیت: {statusLabel[selected.status]}
            </div>

            {(selected.status === 'submitted' || selected.status === 'reviewing') && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleApprove(selected.id)} style={{ flex: 1, background: '#3dbb8222', border: '1px solid #3dbb8244', borderRadius: '8px', padding: '10px', color: '#3dbb82', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>✓ تأیید</button>
                <button onClick={() => handleReject(selected.id)} style={{ flex: 1, background: '#e0555522', border: '1px solid #e0555544', borderRadius: '8px', padding: '10px', color: '#e05555', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>✕ رد</button>
                <button
  onClick={() => handleDelete(selected.id)}
  style={{ background: '#e0555511', border: '1px solid #e0555533', borderRadius: '8px', padding: '10px', color: '#e05555', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
>
  🗑 حذف گزارش
</button>
              </div>
            )}

            <button onClick={() => handleDelete(selected.id)} style={{ background: '#e0555511', border: '1px solid #e0555533', borderRadius: '8px', padding: '10px', color: '#e05555', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              🗑 حذف گزارش
            </button>
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="حذف گزارش"
          message="آیا از حذف این گزارش مطمئن هستید؟ فایل پیوست هم حذف می‌شود."
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