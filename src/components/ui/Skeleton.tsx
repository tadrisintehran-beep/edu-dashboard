'use client'

import { useTheme } from '@/lib/ThemeContext'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string
  style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = '16px', borderRadius = '6px', style }: SkeletonProps) {
  const { t } = useTheme()
  return (
    <div style={{
      width, height, borderRadius,
      background: `linear-gradient(90deg, ${t.inner} 25%, ${t.border} 50%, ${t.inner} 75%)`,
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s ease infinite',
      ...style,
    }} />
  )
}

export function SkeletonCard({ height = '120px' }: { height?: string }) {
  const { t } = useTheme()
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', height }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton width="36px" height="36px" borderRadius="8px" />
        <Skeleton width="60px" height="28px" borderRadius="4px" />
      </div>
      <Skeleton width="60%" height="12px" />
      <Skeleton width="40%" height="28px" />
      <Skeleton width="50%" height="10px" />
    </div>
  )
}

interface SkeletonListProps {
  rows?: number
  avatar?: 'dot' | 'circle' | 'square' | 'none'
  lines?: number
  stripe?: boolean
}

export function SkeletonList({ rows = 5, avatar = 'dot', lines = 1, stripe = false }: SkeletonListProps) {
  const { t } = useTheme()
  const avatarSize = avatar === 'dot' ? '8px' : '44px'
  const avatarRadius = avatar === 'square' ? '10px' : '50%'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          background: t.card, border: `1px solid ${t.border}`,
          borderRight: stripe ? `4px solid ${t.border}` : undefined,
          borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          {avatar !== 'none' && <Skeleton width={avatarSize} height={avatarSize} borderRadius={avatarRadius} style={{ flexShrink: 0 }} />}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Skeleton width={`${60 + Math.random() * 30}%`} height="13px" />
            {Array.from({ length: lines - 1 }).map((_, li) => (
              <Skeleton key={li} width={`${45 + Math.random() * 30}%`} height="11px" />
            ))}
            <Skeleton width={`${30 + Math.random() * 20}%`} height="10px" />
          </div>
          <Skeleton width="70px" height="22px" borderRadius="10px" style={{ flexShrink: 0 }} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 6, columns = 5 }: { rows?: number, columns?: number }) {
  const { t } = useTheme()
  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', padding: '10px 14px', background: t.inner }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height="11px" style={{ flex: 1, maxWidth: '110px' }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} style={{
          display: 'flex', gap: '12px', padding: '10px 14px', alignItems: 'center',
          background: ri % 2 === 1 ? t.inner + '55' : 'transparent',
          borderBottom: `1px solid ${t.border}`,
        }}>
          {Array.from({ length: columns }).map((_, ci) => (
            <Skeleton key={ci} height="12px" style={{ flex: 1, width: `${40 + Math.random() * 40}%` }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonGrid({ cols = 4, rows = 1 }: { cols?: number, rows?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '10px' }}>
      {Array.from({ length: cols * rows }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}