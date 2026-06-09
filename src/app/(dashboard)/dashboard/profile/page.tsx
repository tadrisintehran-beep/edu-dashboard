'use client'

import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/lib/ThemeContext'
import { useToast } from '@/components/ui/Toast'
import { useIsMobile } from '@/lib/useIsMobile'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
  const { user } = useAuthStore()
  const { t } = useTheme()
  const { showToast, ToastComponent } = useToast()
  const isMobile = useIsMobile()
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwords, setPasswords] = useState({ new: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  const handleChangePassword = async () => {
    if (!passwords.new || !passwords.confirm) {
      showToast('لطفاً همه فیلدها را پر کنید', 'error')
      return
    }
    if (passwords.new !== passwords.confirm) {
      showToast('رمز عبور و تکرار آن یکسان نیستند', 'error')
      return
    }
    if (passwords.new.length < 6) {
      showToast('رمز عبور باید حداقل ۶ کاراکتر باشد', 'error')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.new })
    if (!error) {
      showToast('رمز عبور با موفقیت تغییر کرد', 'success')
      setPasswords({ new: '', confirm: '' })
      setIsChangingPassword(false)
    } else {
      showToast('خطا در تغییر رمز عبور', 'error')
    }
    setLoading(false)
  }

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

  const inputStyle = {
    width: '100%', background: t.input, border: `1px solid ${t.border}`,
    borderRadius: '8px', padding: '10px 14px', color: t.text,
    fontSize: '13px', outline: 'none', direction: 'rtl' as const, fontFamily: 'inherit',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: isMobile ? '100%' : '600px' }}>

      <div>
        <h1 style={{ color: t.text, fontSize: isMobile ? '16px' : '18px', fontWeight: '700' }}>پروفایل کاربری</h1>
        <p style={{ color: t.muted, fontSize: '12px', marginTop: '4px' }}>اطلاعات حساب کاربری شما</p>
      </div>

      {/* کارت اصلی پروفایل */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '24px' }}>

        {/* آواتار و اطلاعات */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #c9a84c, #e8c96a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', fontWeight: '700', color: '#1a1200',
          }}>
            {user?.name?.charAt(0)}
          </div>
          <div>
            <div style={{ color: t.text, fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
              {user?.name}
            </div>
            <div style={{ color: t.sub, fontSize: '13px', marginBottom: '8px' }}>
              {user?.email}
            </div>
            <div style={{
              display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
              background: (roleColor[user?.role || ''] || '#555') + '22',
              color: roleColor[user?.role || ''] || t.sub,
              border: `1px solid ${(roleColor[user?.role || ''] || '#555')}44`,
            }}>
              {roleLabel[user?.role || ''] || user?.role}
            </div>
          </div>
        </div>

        {/* جداکننده */}
        <div style={{ borderTop: `1px solid ${t.border}`, marginBottom: '20px' }}></div>

        {/* اطلاعات حساب */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ color: t.text, fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>اطلاعات حساب</div>

          {[
            { label: 'نام کامل', value: user?.name, icon: '👤' },
            { label: 'ایمیل', value: user?.email, icon: '📧' },
            { label: 'نقش', value: roleLabel[user?.role || ''] || user?.role, icon: '🎖' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: t.inner, borderRadius: '8px' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: t.muted, fontSize: '11px', marginBottom: '2px' }}>{item.label}</div>
                <div style={{ color: t.text, fontSize: '13px', fontWeight: '500' }}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* تغییر رمز عبور */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isChangingPassword ? '16px' : '0' }}>
          <div>
            <div style={{ color: t.text, fontSize: '13px', fontWeight: '600' }}>رمز عبور</div>
            <div style={{ color: t.muted, fontSize: '11px', marginTop: '2px' }}>برای امنیت بیشتر رمز عبور خود را تغییر دهید</div>
          </div>
          <button
            onClick={() => setIsChangingPassword(!isChangingPassword)}
            style={{ background: isChangingPassword ? t.inner : '#c9a84c22', border: `1px solid ${isChangingPassword ? t.border : '#c9a84c44'}`, borderRadius: '8px', padding: '8px 16px', color: isChangingPassword ? t.sub : '#e8c96a', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {isChangingPassword ? 'انصراف' : 'تغییر رمز'}
          </button>
        </div>

        {isChangingPassword && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '6px' }}>رمز عبور جدید</label>
              <input
                type="password"
                placeholder="حداقل ۶ کاراکتر"
                style={inputStyle}
                value={passwords.new}
                onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ color: t.sub, fontSize: '11px', display: 'block', marginBottom: '6px' }}>تکرار رمز عبور جدید</label>
              <input
                type="password"
                placeholder="رمز عبور را مجدد وارد کنید"
                style={inputStyle}
                value={passwords.confirm}
                onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
              />
            </div>
            <button
              onClick={handleChangePassword}
              disabled={loading}
              className="btn-gold"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'در حال ذخیره...' : 'ذخیره رمز عبور جدید'}
            </button>
          </div>
        )}
      </div>

      {/* اطلاعات سیستم */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '20px' }}>
        <div style={{ color: t.text, fontSize: '13px', fontWeight: '600', marginBottom: '14px' }}>اطلاعات سیستم</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { label: 'نسخه سامانه', value: 'v1.0.0' },
            { label: 'توسعه‌دهنده', value: 'معاونت آموزش متوسطه' },
            { label: 'پشتیبانی', value: 'support@edu.ir' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 2 ? `1px solid ${t.border}` : 'none' }}>
              <span style={{ color: t.muted, fontSize: '12px' }}>{item.label}</span>
              <span style={{ color: t.text, fontSize: '12px' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {ToastComponent}
    </div>
  )
}