'use client'

import { useState, useEffect, useRef } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { useToast } from '@/components/ui/Toast'
import { useIsMobile } from '@/lib/useIsMobile'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { toJalali } from '@/lib/date'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

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
  'default': '📁',
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function DocumentsPage() {
  const { t } = useTheme()
  const { showToast, ToastComponent } = useToast()
  const isMobile = useIsMobile()
  const { user } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const versionInputRef = useRef<HTMLInputElement>(null)

  const [documents, setDocuments] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [versions, setVersions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<'comments' | 'versions'>('comments')
  const [newComment, setNewComment] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', note: '' })
  const [showUpload, setShowUpload] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [versionFile, setVersionFile] = useState<File | null>(null)
  const [showVersionUpload, setShowVersionUpload] = useState(false)
  const [versionNote, setVersionNote] = useState('')

  // تابع کمکی برای بررسی دسترسی حذف
  const canDelete = (doc: any) =>
    user?.role === 'ADMIN' || doc.uploaded_by === user?.name

  useEffect(() => {
    fetchDocuments()

    const channel = supabase
      .channel('documents-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => fetchDocuments())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_comments' }, () => {
        if (selected) fetchComments(selected.id)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (selected) {
      fetchComments(selected.id)
      fetchVersions(selected.id)
    }
  }, [selected])

  const fetchDocuments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('updated_at', { ascending: false })
    if (!error && data) setDocuments(data)
    setLoading(false)
  }

  const fetchComments = async (docId: string) => {
    const { data } = await supabase
      .from('document_comments')
      .select('*')
      .eq('document_id', docId)
      .order('created_at', { ascending: true })
    if (data) setComments(data)
  }

  const fetchVersions = async (docId: string) => {
    const { data } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', docId)
      .order('version', { ascending: false })
    if (data) setVersions(data)
  }

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.title) {
      showToast('لطفاً فایل و عنوان را انتخاب کنید', 'error')
      return
    }
    setUploading(true)

    const filePath = `${Date.now()}_${selectedFile.name}`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, selectedFile)

    if (uploadError) {
      showToast('خطا در آپلود فایل', 'error')
      setUploading(false)
      return
    }

    const { data: doc, error: dbError } = await supabase.from('documents').insert([{
      title: uploadForm.title,
      description: uploadForm.description,
      file_path: filePath,
      file_name: selectedFile.name,
      file_size: selectedFile.size,
      file_type: selectedFile.type,
      version: 1,
      uploaded_by: user?.name || 'کاربر',
    }]).select().single()

    if (!dbError && doc) {
      await (supabase.from('document_versions') as any).insert([{
        document_id: doc.id,
        file_path: filePath,
        file_name: selectedFile.name,
        version: 1,
        uploaded_by: user?.name || 'کاربر',
        note: 'نسخه اول',
      }])
      showToast('سند با موفقیت آپلود شد', 'success')
      setShowUpload(false)
      setUploadForm({ title: '', description: '', note: '' })
      setSelectedFile(null)
      fetchDocuments()
    } else {
      console.error('DB Error:', dbError)
      showToast('خطا: ' + dbError?.message, 'error')
    }
    setUploading(false)
  }

  const handleNewVersion = async () => {
    if (!versionFile || !selected) {
      showToast('لطفاً فایل را انتخاب کنید', 'error')
      return
    }
    setUploading(true)

    const filePath = `${Date.now()}_${versionFile.name}`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, versionFile)

    if (uploadError) {
      showToast('خطا در آپلود فایل', 'error')
      setUploading(false)
      return
    }

    const newVersion = selected.version + 1

    await supabase.from('documents').update({
      file_path: filePath,
      file_name: versionFile.name,
      file_size: versionFile.size,
      file_type: versionFile.type,
      version: newVersion,
      updated_at: new Date().toISOString(),
    }).eq('id', selected.id)

    await (supabase.from('document_versions') as any).insert([{
      document_id: selected.id,
      file_path: filePath,
      file_name: versionFile.name,
      version: newVersion,
      uploaded_by: user?.name || 'کاربر',
      note: versionNote,
    }])

    showToast(`نسخه ${newVersion} آپلود شد`, 'success')
    setShowVersionUpload(false)
    setVersionFile(null)
    setVersionNote('')
    fetchDocuments()
    fetchVersions(selected.id)
    setSelected({ ...selected, version: newVersion, file_path: filePath, file_name: versionFile.name })
    setUploading(false)
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !selected) return
    await (supabase.from('document_comments') as any).insert([{
      document_id: selected.id,
      author: user?.name || 'کاربر',
      body: newComment,
    }])
    setNewComment('')
    fetchComments(selected.id)
  }

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage.from('documents').download(filePath)
    if (data) {
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleDelete = (id: string) => { setConfirmDelete(id) }

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return
    await supabase.from('documents').delete().eq('id', confirmDelete)
    showToast('سند حذف شد', 'info')
    if (selected?.id === confirmDelete) setSelected(null)
    setConfirmDelete(null)
    fetchDocuments()
  }

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

      {/* هدر */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: t.text, fontSize: isMobile ? '16px' : '18px', fontWeight: '700' }}>مدیریت اسناد</h1>
          <p style={{ color: t.muted, fontSize: '12px', marginTop: '4px' }}>{documents.length} سند ثبت شده</p>
        </div>
        <button onClick={() => setShowUpload(!showUpload)} className="btn-gold">+ آپلود سند</button>
      </div>

      {/* فرم آپلود */}
      {showUpload && (
        <div style={{ background: t.card, border: '1px solid #c9a84c33', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#e8c96a', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>آپلود سند جدید</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>عنوان سند</label>
              <input style={inputStyle} placeholder="عنوان سند را وارد کنید"
                value={uploadForm.title} onChange={e => setUploadForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>توضیحات</label>
              <input style={inputStyle} placeholder="توضیح کوتاه"
                value={uploadForm.description} onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>فایل</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{ border: `2px dashed ${selectedFile ? '#c9a84c' : t.border}`, borderRadius: '10px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: selectedFile ? '#c9a84c11' : t.inner, transition: 'all 0.2s' }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{selectedFile ? '✅' : '📁'}</div>
              <div style={{ color: selectedFile ? '#c9a84c' : t.muted, fontSize: '13px' }}>
                {selectedFile ? selectedFile.name : 'برای انتخاب فایل کلیک کنید'}
              </div>
              {selectedFile && <div style={{ color: t.muted, fontSize: '11px', marginTop: '4px' }}>{formatSize(selectedFile.size)}</div>}
            </div>
            <input ref={fileInputRef} type="file" style={{ display: 'none' }}
              onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowUpload(false); setSelectedFile(null) }}
              style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 16px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>انصراف</button>
            <button onClick={handleUpload} disabled={uploading} className="btn-gold" style={{ padding: '8px 20px', fontSize: '12px', opacity: uploading ? 0.7 : 1 }}>
              {uploading ? '⏳ در حال آپلود...' : 'آپلود'}
            </button>
          </div>
        </div>
      )}

      {/* لیست + جزئیات */}
      <div style={{ display: 'grid', gridTemplateColumns: selected && !isMobile ? '1fr 400px' : '1fr', gap: '12px' }}>

        {/* لیست اسناد */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {documents.length === 0 ? (
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '40px', textAlign: 'center', color: t.muted, fontSize: '13px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📁</div>
              هنوز سندی آپلود نشده
            </div>
          ) : documents.map(doc => (
            <div key={doc.id} className="hover-card"
              onClick={() => setSelected(doc)}
              style={{ background: selected?.id === doc.id ? t.inner : t.card, border: `1px solid ${selected?.id === doc.id ? '#c9a84c33' : t.border}`, borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>

              {/* آیکون */}
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#c9a84c22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                {fileTypeIcon[doc.file_type] || fileTypeIcon.default}
              </div>

              {/* اطلاعات */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: t.text, fontSize: '13px', fontWeight: '600', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ color: t.muted, fontSize: '11px' }}>👤 {doc.uploaded_by}</span>
                  <span style={{ color: t.muted, fontSize: '11px' }}>📅 {toJalali(doc.updated_at)}</span>
                  {doc.file_size && <span style={{ color: t.muted, fontSize: '11px' }}>💾 {formatSize(doc.file_size)}</span>}
                </div>
              </div>

              {/* نسخه */}
              <div style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: '#4a9eff22', color: '#4a9eff', flexShrink: 0 }}>
                v{doc.version}
              </div>

              {/* دکمه دانلود */}
              <button
                onClick={e => { e.stopPropagation(); handleDownload(doc.file_path, doc.file_name) }}
                style={{ background: '#3dbb8222', border: '1px solid #3dbb8244', borderRadius: '6px', padding: '5px 10px', color: '#3dbb82', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
              >⬇️ دانلود</button>

              {/* دکمه حذف — فقط برای آپلودکننده یا ادمین */}
              {canDelete(doc) && (
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(doc.id) }}
                  style={{ background: '#e0555522', border: '1px solid #e0555544', borderRadius: '6px', padding: '5px 10px', color: '#e05555', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                >حذف</button>
              )}
            </div>
          ))}
        </div>

        {/* پنل جزئیات */}
        {selected && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflow: 'hidden' }}>

            {/* هدر */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: t.text, fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>{selected.title}</div>
                {selected.description && <div style={{ color: t.muted, fontSize: '11px' }}>{selected.description}</div>}
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', color: t.muted, fontSize: '18px', cursor: 'pointer', flexShrink: 0 }}>✕</button>
            </div>

            {/* اطلاعات */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: 'آپلودکننده', value: selected.uploaded_by },
                { label: 'نسخه', value: `v${selected.version}` },
                { label: 'حجم', value: selected.file_size ? formatSize(selected.file_size) : '—' },
                { label: 'تاریخ', value: toJalali(selected.updated_at) },
              ].map((item, i) => (
                <div key={i} style={{ background: t.inner, borderRadius: '8px', padding: '8px 10px' }}>
                  <div style={{ color: t.muted, fontSize: '10px', marginBottom: '2px' }}>{item.label}</div>
                  <div style={{ color: t.text, fontSize: '12px', fontWeight: '500' }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* آپلود نسخه جدید */}
            <button
              onClick={() => setShowVersionUpload(!showVersionUpload)}
              style={{ background: '#4a9eff22', border: '1px solid #4a9eff44', borderRadius: '8px', padding: '8px', color: '#4a9eff', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
            >📤 آپلود نسخه جدید</button>

            {showVersionUpload && (
              <div style={{ background: t.inner, borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div onClick={() => versionInputRef.current?.click()}
                  style={{ border: `2px dashed ${versionFile ? '#4a9eff' : t.border}`, borderRadius: '8px', padding: '12px', textAlign: 'center', cursor: 'pointer', fontSize: '12px', color: versionFile ? '#4a9eff' : t.muted }}>
                  {versionFile ? versionFile.name : '📁 انتخاب فایل'}
                </div>
                <input ref={versionInputRef} type="file" style={{ display: 'none' }}
                  onChange={e => setVersionFile(e.target.files?.[0] || null)} />
                <input style={inputStyle} placeholder="توضیح تغییرات (اختیاری)"
                  value={versionNote} onChange={e => setVersionNote(e.target.value)} />
                <button onClick={handleNewVersion} disabled={uploading} className="btn-gold" style={{ padding: '8px', fontSize: '12px', opacity: uploading ? 0.7 : 1 }}>
                  {uploading ? '⏳ در حال آپلود...' : 'ثبت نسخه جدید'}
                </button>
              </div>
            )}

            {/* تب‌ها */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${t.border}`, paddingBottom: '8px' }}>
              {[
                { key: 'comments', label: `💬 کامنت‌ها (${comments.length})` },
                { key: 'versions', label: `📚 نسخه‌ها (${versions.length})` },
              ].map(tab => (
                <div key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                  style={{ padding: '5px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', background: activeTab === tab.key ? '#c9a84c22' : 'transparent', color: activeTab === tab.key ? '#e8c96a' : t.sub, border: activeTab === tab.key ? '1px solid #c9a84c44' : '1px solid transparent' }}>
                  {tab.label}
                </div>
              ))}
            </div>

            {/* کامنت‌ها */}
            {activeTab === 'comments' && (
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px' }}>
                  {comments.length === 0 ? (
                    <div style={{ color: t.muted, fontSize: '12px', textAlign: 'center', padding: '16px' }}>هنوز کامنتی نیست</div>
                  ) : comments.map(comment => (
                    <div key={comment.id} style={{ background: t.inner, borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#c9a84c', fontSize: '11px', fontWeight: '600' }}>{comment.author}</span>
                        <span style={{ color: t.muted, fontSize: '10px' }}>{toJalali(comment.created_at)}</span>
                      </div>
                      <div style={{ color: t.text, fontSize: '12px', lineHeight: '1.6' }}>{comment.body}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input style={{ ...inputStyle, flex: 1 }} placeholder="کامنت بنویسید..."
                    value={newComment} onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddComment()} />
                  <button onClick={handleAddComment}
                    style={{ background: '#c9a84c22', border: '1px solid #c9a84c44', borderRadius: '8px', padding: '8px 12px', color: '#e8c96a', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>ارسال</button>
                </div>
              </div>
            )}

            {/* نسخه‌ها */}
            {activeTab === 'versions' && (
              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px' }}>
                {versions.map(version => (
                  <div key={version.id} style={{ background: t.inner, borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#4a9eff22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#4a9eff', flexShrink: 0 }}>
                      v{version.version}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: t.text, fontSize: '12px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{version.file_name}</div>
                      <div style={{ color: t.muted, fontSize: '10px', marginTop: '2px' }}>
                        {version.uploaded_by} — {toJalali(version.created_at)}
                        {version.note && ` — ${version.note}`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(version.file_path, version.file_name)}
                      style={{ background: '#3dbb8222', border: '1px solid #3dbb8244', borderRadius: '6px', padding: '4px 8px', color: '#3dbb82', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                    >⬇️</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="حذف سند"
          message="آیا از حذف این سند مطمئن هستید؟ تمام نسخه‌ها و کامنت‌ها حذف می‌شوند."
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
