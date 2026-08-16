'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useIsMobile } from '@/lib/useIsMobile'
import { supabase } from '@/lib/supabase'
import { toJalali } from '@/lib/date'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'

interface Department {
  id: string
  name_fa: string
  created_at: string
}

export default function DepartmentsPage() {
  const { t } = useTheme()
  const { showToast, ToastComponent } = useToast()
  const isMobile = useIsMobile()
  const { user: currentUser } = useAuthStore()
  const router = useRouter()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // فقط SUPER_ADMIN
  useEffect(() => {
    if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
      router.replace('/dashboard')
    }
  }, [currentUser, router])

  const fetchDepartments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setDepartments(data)
    setLoading(false)
  }

  useEffect(() => { fetchDepartments() }, [])

  const handleAdd = async () => {
    if (!newName.trim()) {
      showToast('نام معاونت را وارد کنید', 'error')
      return
    }
    setAdding(true)
    const { error } = await supabase.from('departments').insert([{ name_fa: newName.trim() }])
    setAdding(false)
    if (error) {
      showToast(error.code === '23505' ? 'معاونتی با این نام از قبل وجود دارد' : 'خطا در ثبت معاونت', 'error')
      return
    }
    showToast('معاونت با موفقیت اضافه شد', 'success')
    setNewName('')
    fetchDepartments()
  }

  const handleSaveEdit = async () => {
    if (!editId || !editName.trim()) return
    const { error } = await supabase.from('departments').update({ name_fa: editName.trim() }).eq('id', editId)
    if (error) {
      showToast(error.code === '23505' ? 'معاونتی با این نام از قبل وجود دارد' : 'خطا در ویرایش', 'error')
      return
    }
    showToast('نام معاونت ویرایش شد', 'success')
    setEditId(null)
    fetchDepartments()
  }

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return
    const { error } = await supabase.from('departments').delete().eq('id', confirmDelete)
    if (error) {
      showToast('این معاونت هنوز کاربر یا جلسه‌ای دارد؛ ابتدا آن‌ها را جابه‌جا کنید', 'error')
    } else {
      showToast('معاونت حذف شد', 'info')
      fetchDepartments()
    }
    setConfirmDelete(null)
  }

  const inputStyle = {
    width: '100%', background: t.input, border: `1px solid ${t.border}`,
    borderRadius: '8px', padding: '8px 12px', color: t.text,
    fontSize: '12px', outline: 'none', direction: 'rtl' as const, fontFamily: 'inherit',
  }

  if (currentUser?.role !== 'SUPER_ADMIN') return null

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: t.sub, fontSize: '13px' }}>
      ⏳ در حال بارگذاری...
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      <div>
        <h1 style={{ color: t.text, fontSize: isMobile ? '16px' : '18px', fontWeight: '700' }}>مدیریت معاونت‌ها</h1>
        <p style={{ color: t.muted, fontSize: '12px', marginTop: '4px' }}>{departments.length} معاونت ثبت شده</p>
      </div>

      {/* فرم افزودن */}
      <div style={{ background: t.card, border: '1px solid #c9a84c33', borderRadius: '12px', padding: '20px' }}>
        <div style={{ color: '#e8c96a', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>افزودن معاونت جدید</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <input style={inputStyle} placeholder="مثال: معاونت پرورشی" value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }} />
          <button onClick={handleAdd} disabled={adding} className="btn-gold"
            style={{ padding: '8px 20px', fontSize: '12px', flexShrink: 0, opacity: adding ? 0.6 : 1, cursor: adding ? 'default' : 'pointer' }}>
            {adding ? 'در حال ثبت...' : 'افزودن'}
          </button>
        </div>
      </div>

      {/* فهرست معاونت‌ها */}
      <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {departments.map(dep => (
          <div key={dep.id} className="hover-card" style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>

            <div style={{ flex: 1, minWidth: 0 }}>
              {editId === dep.id ? (
                <input style={inputStyle} value={editName} onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit() }} autoFocus />
              ) : (
                <>
                  <div style={{ color: t.text, fontSize: '14px', fontWeight: '600', marginBottom: '3px' }}>{dep.name_fa}</div>
                  <div style={{ color: t.muted, fontSize: '11px' }}>تاریخ ایجاد: {toJalali(dep.created_at)}</div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              {editId === dep.id ? (
                <>
                  <button onClick={handleSaveEdit} style={{ background: '#3dbb8222', border: '1px solid #3dbb8244', borderRadius: '6px', padding: '6px 12px', color: '#3dbb82', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>ذخیره</button>
                  <button onClick={() => setEditId(null)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 12px', color: t.sub, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>انصراف</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditId(dep.id); setEditName(dep.name_fa) }} style={{ background: '#4a9eff22', border: '1px solid #4a9eff44', borderRadius: '6px', padding: '6px 12px', color: '#4a9eff', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>ویرایش نام</button>
                  <button onClick={() => setConfirmDelete(dep.id)} style={{ background: '#e0555522', border: '1px solid #e0555544', borderRadius: '6px', padding: '6px 12px', color: '#e05555', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>حذف</button>
                </>
              )}
            </div>
          </div>
        ))}

        {departments.length === 0 && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '40px', textAlign: 'center', color: t.muted, fontSize: '13px' }}>
            معاونتی ثبت نشده
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="حذف معاونت"
          message="آیا از حذف این معاونت مطمئن هستید؟ اگر کاربر یا جلسه‌ای به آن وصل باشد، حذف انجام نمی‌شود."
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
