'use client'

interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  type?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  title, message, confirmLabel = 'تأیید', cancelLabel = 'انصراف',
  type = 'danger', onConfirm, onCancel,
}: ConfirmModalProps) {
  const colors = {
    danger:  { color: '#e05555', bg: '#e0555522', icon: '🗑' },
    warning: { color: '#e09444', bg: '#e0944422', icon: '⚠️' },
    info:    { color: '#4a9eff', bg: '#4a9eff22', icon: 'ℹ️' },
  }
  const c = colors[type]

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#00000077',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, direction: 'rtl', backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        background: '#131620', border: '1px solid #ffffff0f',
        borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '380px',
        animation: 'fadeInUp 0.2s ease', boxShadow: '0 20px 60px #00000055',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: c.bg, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '24px', margin: '0 auto 14px',
          }}>{c.icon}</div>
          <div style={{ color: '#e8eaf0', fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>{title}</div>
          <div style={{ color: '#8b90a8', fontSize: '13px', lineHeight: '1.7' }}>{message}</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, background: 'transparent', border: '1px solid #ffffff1a', borderRadius: '8px', padding: '11px', color: '#8b90a8', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
          >{cancelLabel}</button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, background: c.bg, border: `1px solid ${c.color}44`, borderRadius: '8px', padding: '11px', color: c.color, fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}