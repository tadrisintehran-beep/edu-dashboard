'use client'

import { useTheme } from '@/lib/ThemeContext'

interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  variant?: 'empty' | 'no-results'
}

export function EmptyState({ icon, title, description, actionLabel, onAction, variant = 'empty' }: EmptyStateProps) {
  const { t } = useTheme()
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '32px 20px', gap: '4px',
    }}>
      <div style={{ fontSize: '30px', marginBottom: '6px', opacity: variant === 'no-results' ? 0.6 : 0.9 }}>{icon}</div>
      <div style={{ color: t.text, fontSize: '13px', fontWeight: '600' }}>{title}</div>
      {description && (
        <div style={{ color: t.muted, fontSize: '11px', maxWidth: '280px', lineHeight: '1.7', marginTop: '2px' }}>
          {description}
        </div>
      )}
      {actionLabel && onAction && (
        variant === 'empty' ? (
          <button onClick={onAction} className="btn-gold" style={{ marginTop: '14px', padding: '8px 20px', fontSize: '12px' }}>
            {actionLabel}
          </button>
        ) : (
          <button
            onClick={onAction}
            style={{
              marginTop: '14px', background: t.inner, border: `1px solid ${t.border}`,
              borderRadius: '8px', padding: '8px 18px', color: t.sub, fontSize: '12px',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {actionLabel}
          </button>
        )
      )}
    </div>
  )
}
