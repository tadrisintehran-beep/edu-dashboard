import jalaali from 'jalaali-js'

const months = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
]

const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه']

export function toJalali(date: Date | string): string {
  const d = new Date(date)
  const { jy, jm, jd } = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`
}

export function toJalaliFull(date: Date | string): string {
  const d = new Date(date)
  const { jy, jm, jd } = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  const dayName = days[d.getDay()]
  return `${dayName}، ${jd} ${months[jm - 1]} ${jy}`
}

export function todayJalali(): string {
  return toJalali(new Date())
}

export function todayJalaliFull(): string {
  return toJalaliFull(new Date())
}