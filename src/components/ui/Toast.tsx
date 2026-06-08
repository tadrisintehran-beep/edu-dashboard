'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info'
  onClose: () => void
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const colors = {
    success: { bg: '#3dbb8222', border: '#3dbb8244', text: '#3dbb82', icon: '✓' },
    error:   { bg: '#e0555522', border: '#e0555544', text: '#e05555', icon: '✕' },
    info:    { bg: '#4a9eff22', border: '#4a9eff44', text: '#4a9eff', icon: 'ℹ' },
  }

  const c = colors[type]

  return (
    <div style={{
      position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: '10px',
      padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px',
      zIndex: 9999, animation: 'fadeInUp 0.3s ease',
      backdropFilter: 'blur(10px)', minWidth: '250px',
      boxShadow: '0 8px 24px #00000033',
    }}>
      <div style={{
        width: '24px', height: '24px', borderRadius: '50%',
        background: c.text + '22', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: c.text, fontSize: '13px', fontWeight: '700', flexShrink: 0,
      }}>{c.icon}</div>
      <div style={{ color: c.text, fontSize: '13px', fontWeight: '500', flex: 1 }}>{message}</div>
      <div onClick={onClose} style={{ color: c.text, cursor: 'pointer', fontSize: '16px', opacity: 0.7 }}>✕</div>
    </div>
  )
}

// Hook برای استفاده آسان
export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
  }

  const hideToast = () => setToast(null)

  const ToastComponent = toast ? (
    <Toast message={toast.message} type={toast.type} onClose={hideToast} />
  ) : null

  return { showToast, ToastComponent }
}