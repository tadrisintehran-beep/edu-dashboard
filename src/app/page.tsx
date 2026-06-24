'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { logAction } from '@/lib/logger'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { fetchProfile } = useAuthStore()
  const router = useRouter()

  const handleLogin = async () => {
    setError('')
    if (!email || !password) {
      setError('ایمیل و رمز عبور را وارد کنید')
      return
    }
    setLoading(true)
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError || !data.user) {
        setError('ایمیل یا رمز عبور اشتباه است')
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', data.user.id).single()

      if (profile?.is_active === false) {
        await supabase.auth.signOut()
        setError('حساب کاربری شما غیرفعال است. با مدیر سیستم تماس بگیرید.')
        setLoading(false)
        return
      }

      await logAction({
        action: 'login',
        userName: profile?.name_fa || email,
        userEmail: email,
        details: 'ورود به سیستم',
      })

      await fetchProfile()
      router.push('/dashboard')
    } catch {
      setError('خطایی رخ داد. دوباره تلاش کنید.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0c0e14', display: 'flex', direction: 'rtl', overflow: 'hidden', position: 'relative' }}>

      {/* پس‌زمینه */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, #c9a84c11, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, #4a9eff11, transparent 70%)' }} />
      </div>

      {/* سمت چپ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', position: 'relative' }} className="hide-mobile">
        <div style={{ maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🏛️</div>
          <h2 style={{ color: '#e8c96a', fontSize: '28px', fontWeight: '700', marginBottom: '16px', lineHeight: '1.4' }}>
            سامانه مدیریت<br />معاونت آموزش متوسطه
          </h2>
          <p style={{ color: '#555c78', fontSize: '14px', lineHeight: '1.8', marginBottom: '40px' }}>
            وزارت آموزش و پرورش جمهوری اسلامی ایران
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'right' }}>
            {[
              { icon: '📊', title: 'داشبورد اجرایی', desc: 'مشاهده آمار و گزارش‌های لحظه‌ای' },
              { icon: '📅', title: 'مدیریت جلسات', desc: 'برنامه‌ریزی و پیگیری جلسات' },
              { icon: '🔐', title: 'امنیت بالا', desc: 'احراز هویت و کنترل دسترسی' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#ffffff08', border: '1px solid #ffffff0a', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontSize: '24px', flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ color: '#e8eaf0', fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>{item.title}</div>
                  <div style={{ color: '#555c78', fontSize: '11px' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* خط جداکننده */}
      <div style={{ width: '1px', background: 'linear-gradient(to bottom, transparent, #ffffff0f, transparent)', flexShrink: 0 }} className="hide-mobile" />

      {/* فرم لاگین */}
      <div style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', position: 'relative' }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px', boxShadow: '0 8px 32px #c9a84c33' }}>🏛️</div>
            <h1 style={{ color: '#e8eaf0', fontSize: '20px', fontWeight: '700', marginBottom: '6px' }}>خوش آمدید</h1>
            <p style={{ color: '#555c78', fontSize: '13px' }}>برای ادامه وارد شوید</p>
          </div>

          {error && (
            <div style={{ background: '#e0555522', border: '1px solid #e0555544', borderRadius: '10px', padding: '12px 14px', color: '#e05555', fontSize: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ color: '#8b90a8', fontSize: '12px', display: 'block', marginBottom: '8px', fontWeight: '500' }}>ایمیل</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email" placeholder="email@edu.ir" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  style={{ width: '100%', background: '#131620', border: '1px solid #ffffff0f', borderRadius: '10px', padding: '12px 16px 12px 40px', color: '#e8eaf0', fontSize: '13px', outline: 'none', direction: 'rtl', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                  onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#c9a84c55'}
                  onBlur={e => (e.target as HTMLInputElement).style.borderColor = '#ffffff0f'}
                />
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>📧</span>
              </div>
            </div>

            <div>
              <label style={{ color: '#8b90a8', fontSize: '12px', display: 'block', marginBottom: '8px', fontWeight: '500' }}>رمز عبور</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'} placeholder="رمز عبور خود را وارد کنید"
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  style={{ width: '100%', background: '#131620', border: '1px solid #ffffff0f', borderRadius: '10px', padding: '12px 16px 12px 80px', color: '#e8eaf0', fontSize: '13px', outline: 'none', direction: 'rtl', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                  onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#c9a84c55'}
                  onBlur={e => (e.target as HTMLInputElement).style.borderColor = '#ffffff0f'}
                />
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>🔒</span>
                <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', left: '36px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#555c78', fontSize: '14px', padding: '4px' }}>
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin} disabled={loading}
              style={{ width: '100%', marginTop: '8px', background: loading ? '#a07830' : 'linear-gradient(135deg, #c9a84c, #e8c96a)', border: 'none', borderRadius: '10px', padding: '14px', color: '#1a1200', fontSize: '14px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', boxShadow: loading ? 'none' : '0 4px 20px #c9a84c44' }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)' }}
            >
              {loading ? '⏳ در حال ورود...' : 'ورود به سامانه ←'}
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <p style={{ color: '#555c78', fontSize: '11px', lineHeight: '1.6' }}>
              سامانه مدیریت داخلی — دسترسی محدود<br />
              © ۱۴۰۵ وزارت آموزش و پرورش
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}