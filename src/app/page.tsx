'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, isLoading } = useAuthStore()
  const router = useRouter()

  const handleLogin = async () => {
    setError('')
    if (!email || !password) {
      setError('ایمیل و رمز عبور را وارد کنید')
      return
    }
    const success = await login(email, password)
    if (success) {
      router.push('/dashboard')
    } else {
      setError('ایمیل یا رمز عبور اشتباه است')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0c0e14' }}>
      <div style={{
        background: '#131620', border: '1px solid #ffffff0f', borderRadius: '16px',
        padding: '40px', width: '100%', maxWidth: '400px', textAlign: 'center'
      }}>
        <div style={{
          width: '56px', height: '56px', background: 'linear-gradient(135deg, #c9a84c, #e8c96a)',
          borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: '24px'
        }}>🏛️</div>

        <h1 style={{ color: '#e8eaf0', fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>
          سامانه مدیریت معاونت
        </h1>
        <p style={{ color: '#8b90a8', fontSize: '13px', marginBottom: '32px' }}>
          آموزش متوسطه — وزارت آموزش و پرورش
        </p>

        {error && (
          <div style={{ background: '#e0555522', border: '1px solid #e0555544', borderRadius: '8px', padding: '10px', color: '#e05555', fontSize: '12px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <label style={{ color: '#8b90a8', fontSize: '12px', display: 'block', marginBottom: '6px' }}>ایمیل</label>
            <input
              type="email"
              placeholder="admin@edu.ir"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', background: '#1a1e2c', border: '1px solid #ffffff0f', borderRadius: '8px', padding: '10px 14px', color: '#e8eaf0', fontSize: '13px', outline: 'none', direction: 'rtl' }}
            />
          </div>

          <div style={{ textAlign: 'right' }}>
            <label style={{ color: '#8b90a8', fontSize: '12px', display: 'block', marginBottom: '6px' }}>رمز عبور</label>
            <input
              type="password"
              placeholder="رمز عبور"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', background: '#1a1e2c', border: '1px solid #ffffff0f', borderRadius: '8px', padding: '10px 14px', color: '#e8eaf0', fontSize: '13px', outline: 'none', direction: 'rtl' }}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={isLoading}
            style={{ width: '100%', background: isLoading ? '#a07830' : 'linear-gradient(135deg, #c9a84c, #e8c96a)', border: 'none', borderRadius: '8px', padding: '12px', color: '#1a1200', fontSize: '14px', fontWeight: '700', cursor: isLoading ? 'not-allowed' : 'pointer', marginTop: '8px', fontFamily: 'inherit', transition: 'all 0.2s' }}
          >
            {isLoading ? 'در حال ورود...' : 'ورود به سامانه'}
          </button>
        </div>

        <p style={{ color: '#555c78', fontSize: '11px', marginTop: '24px' }}>
          سامانه مدیریت داخلی — دسترسی محدود
        </p>
      </div>
    </div>
  )
}