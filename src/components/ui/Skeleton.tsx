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

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  const { t } = useTheme()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Skeleton width="8px" height="8px" borderRadius="50%" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Skeleton width={`${60 + Math.random() * 30}%`} height="13px" />
            <Skeleton width={`${30 + Math.random() * 20}%`} height="10px" />
          </div>
          <Skeleton width="70px" height="22px" borderRadius="10px" />
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