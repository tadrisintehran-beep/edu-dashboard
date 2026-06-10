'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useIsMobile } from '@/lib/useIsMobile'
import { supabase } from '@/lib/supabase'
import { toJalali } from '@/lib/date'

const roleLabel: Record<string, string> = {
  DEPUTY_MINISTER: 'معاون وزیر',
  SUPER_ADMIN: 'مدیر سیستم',
  OFFICE_MANAGER: 'مدیر دفتر',
  DATA_ENTRY: 'اپراتور',
  VIEWER: 'مشاهده‌گر',
}

const roleColor: Record<string, string> = {
  DEPUTY_MINISTER: '#c9a84c',
  SUPER_ADMIN: '#e05555',
  OFFICE_MANAGER: '#4a9eff',
  DATA_ENTRY: '#3dbb82',
  VIEWER: '#8b90a8',
}

export default function UsersPage() {
  const { t } = useTheme()
  const { showToast, ToastComponent } = useToast()
  const isMobile = useIsMobile()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [editUser, setEditUser] = useState<any | null>(null)
  const [newUser, setNewUser] = useState({
    email: '', name_fa: '', password: '', role: 'VIEWER',
  })

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setUsers(data)
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newUser.email || !newUser.name_fa || !newUser.password) {
      showToast('لطفاً همه فیلدها را پر کنید', 'error')
      return
    }
    if (newUser.password.length < 6) {
      showToast('رمز عبور باید حداقل ۶ کاراکتر باشد', 'error')
      return
    }

    // ساخت کاربر در Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: newUser.email,
      password: newUser.password,
      email_confirm: true,
    })

    if (error || !data.user) {
      showToast('خطا در ساخت کاربر: ' + error?.message, 'error')
      return
    }

    // اضافه کردن پروفایل
    const { error: profileError } = await supabase.from('profiles').insert([{
      id: data.user.id,
      name_fa: newUser.name_fa,
      role: newUser.role,
    }])

    if (profileError) {
      showToast('خطا در ذخیره پروفایل', 'error')
      return
    }

    showToast('کاربر با موفقیت اضافه شد', 'success')
    setNewUser({ email: '', name_fa: '', password: '', role: 'VIEWER' })
    setShowForm(false)
    fetchUsers()
  }

  const handleUpdateRole = async (id: string, role: string) => {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (!error) {
      showToast('نقش کاربر بروزرسانی شد', 'success')
      fetchUsers()
      setEditUser(null)
    } else {
      showToast('خطا در بروزرسانی', 'error')
    }
  }

  const handleDelete = (id: string) => { setConfirmDelete(id) }

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return
    const { error } = await supabase.from('profiles').delete().eq('id', confirmDelete)
    if (!error) {
      showToast('کاربر حذف شد', 'info')
      fetchUsers()
    } else {
      showToast('خطا در حذف کاربر', 'error')
    }
    setConfirmDelete(null)
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: t.text, fontSize: isMobile ? '16px' : '18px', fontWeight: '700' }}>مدیریت کاربران</h1>
          <p style={{ color: t.muted, fontSize: '12px', marginTop: '4px' }}>{users.length} کاربر ثبت شده</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold">+ کاربر جدید</button>
      </div>

      {/* فرم کاربر جدید */}
      {showForm && (
        <div style={{ background: t.card, border: '1px solid #c9a84c33', borderRadius: '12px', padding: '20px' }}>
          <div style={{ color: '#e8c96a', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>افزودن کاربر جدید</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>نام فارسی</label>
              <input style={inputStyle} placeholder="نام و نام خانوادگی"
                value={newUser.name_fa} onChange={e => setNewUser(p => ({ ...p, name_fa: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>ایمیل</label>
              <input style={inputStyle} placeholder="email@edu.ir" type="email"
                value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>رمز عبور اولیه</label>
              <input style={inputStyle} placeholder="حداقل ۶ کاراکتر" type="password"
                value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '5px' }}>نقش</label>
              <select style={inputStyle} value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                {Object.entries(roleLabel).map(([key, val]) => (
                  <option key={key} value={key}>{val}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 16px', color: t.sub, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>انصراف</button>
            <button onClick={handleAdd} className="btn-gold" style={{ padding: '8px 16px', fontSize: '12px' }}>ثبت کاربر</button>
          </div>
        </div>
      )}

      {/* لیست کاربران */}
      <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {users.map(user => (
          <div key={user.id} className="hover-card" style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>

            {/* آواتار */}
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: (roleColor[user.role] || '#555') + '33', border: `2px solid ${(roleColor[user.role] || '#555')}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: roleColor[user.role] || t.sub, flexShrink: 0 }}>
              {user.name_fa?.charAt(0)}
            </div>

            {/* اطلاعات */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: t.text, fontSize: '14px', fontWeight: '600', marginBottom: '3px' }}>{user.name_fa}</div>
              <div style={{ color: t.muted, fontSize: '11px' }}>تاریخ عضویت: {toJalali(user.created_at)}</div>
            </div>

            {/* نقش */}
            {editUser?.id === user.id ? (
              <select
                style={{ ...inputStyle, width: 'auto', padding: '6px 10px' }}
                value={editUser.role}
                onChange={e => setEditUser({ ...editUser, role: e.target.value })}
              >
                {Object.entries(roleLabel).map(([key, val]) => (
                  <option key={key} value={key}>{val}</option>
                ))}
              </select>
            ) : (
              <div style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: (roleColor[user.role] || '#555') + '22', color: roleColor[user.role] || t.sub, border: `1px solid ${(roleColor[user.role] || '#555')}44`, flexShrink: 0 }}>
                {roleLabel[user.role] || user.role}
              </div>
            )}

            {/* دکمه‌ها */}
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              {editUser?.id === user.id ? (
                <>
                  <button onClick={() => handleUpdateRole(user.id, editUser.role)} style={{ background: '#3dbb8222', border: '1px solid #3dbb8244', borderRadius: '6px', padding: '6px 12px', color: '#3dbb82', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>ذخیره</button>
                  <button onClick={() => setEditUser(null)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 12px', color: t.sub, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>انصراف</button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditUser(user)} style={{ background: '#4a9eff22', border: '1px solid #4a9eff44', borderRadius: '6px', padding: '6px 12px', color: '#4a9eff', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>ویرایش نقش</button>
                  <button onClick={() => handleDelete(user.id)} style={{ background: '#e0555522', border: '1px solid #e0555544', borderRadius: '6px', padding: '6px 12px', color: '#e05555', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>حذف</button>
                </>
              )}
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '40px', textAlign: 'center', color: t.muted, fontSize: '13px' }}>
            کاربری ثبت نشده
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="حذف کاربر"
          message="آیا از حذف این کاربر مطمئن هستید؟ این عمل قابل بازگشت نیست."
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