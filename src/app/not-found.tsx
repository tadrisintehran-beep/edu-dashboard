'use client'

import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()

  return (
    <div style={{
      minHeight: '100vh', background: '#0c0e14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '20px', direction: 'rtl',
    }}>
      <img src="/logo.png" alt="لوگو" style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '8px' }} />
      <div style={{
        background: '#131620', border: '1px solid #ffffff0f',
        borderRadius: '16px', padding: '40px', textAlign: 'center', maxWidth: '400px',
      }}>
        <div style={{ color: '#c9a84c', fontSize: '64px', fontWeight: '700', marginBottom: '8px' }}>۴۰۴</div>
        <div style={{ color: '#e8eaf0', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>صفحه پیدا نشد</div>
        <div style={{ color: '#8b90a8', fontSize: '13px', marginBottom: '24px', lineHeight: '1.8' }}>
          صفحه‌ای که دنبالش می‌گردید وجود ندارد یا منتقل شده است.
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={() => router.back()}
            style={{ background: 'transparent', border: '1px solid #ffffff1a', borderRadius: '8px', padding: '10px 20px', color: '#8b90a8', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
          >← برگشت</button>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', border: 'none', borderRadius: '8px', padding: '10px 20px', color: '#1a1200', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
          >🏠 داشبورد</button>
        </div>
      </div>
    </div>
  )
}