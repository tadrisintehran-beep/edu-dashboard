import type { KeyboardEvent } from 'react'

// فعال‌سازی المان‌های شبه‌دکمه (div با onClick) با کیبورد — Enter یا Space
export function activateOnKey(e: KeyboardEvent, handler: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    handler()
  }
}
