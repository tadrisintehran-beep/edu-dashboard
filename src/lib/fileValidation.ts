// همون سقف/فهرست مجاز فایل که documents/page.tsx استفاده می‌کنه — برای هر آپلود پیوستی
// در سامانه (نامه‌ها و جاهای بعدی) باید یکسان باشه تا محدودیت نوع فایل دور زده نشه.
export const MAX_UPLOAD_SIZE = 20 * 1024 * 1024 // 20MB

export const ALLOWED_UPLOAD_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
]

export const ALLOWED_UPLOAD_EXT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp'

// null یعنی فایل معتبره؛ در غیر این صورت پیام خطای فارسی برای نمایش با toast برمی‌گردونه
export function validateUploadFile(file: File): string | null {
  if (file.size > MAX_UPLOAD_SIZE) return 'حجم فایل نباید بیشتر از ۲۰ مگابایت باشد'
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) return 'فرمت فایل مجاز نیست. فقط PDF، Office و تصاویر مجازند'
  return null
}
