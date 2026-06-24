// تعریف نقش‌ها
export type UserRole = 'SUPER_ADMIN' | 'DEPUTY_MINISTER' | 'SECRETARY' | 'VIEWER'

// تعریف منابع
export type Resource = 
  | 'meetings' | 'reports' | 'documents' 
  | 'contacts' | 'alerts' | 'users' 
  | 'settings' | 'logs' | 'profile'

// تعریف اقدامات
export type Action = 'view' | 'create' | 'update' | 'delete'

// ماتریس دسترسی
const PERMISSIONS: Record<UserRole, Record<Resource, Action[]>> = {
  SUPER_ADMIN: {
    meetings:  ['view', 'create', 'update', 'delete'],
    reports:   ['view', 'create', 'update', 'delete'],
    documents: ['view', 'create', 'update', 'delete'],
    contacts:  ['view', 'create', 'update', 'delete'],
    alerts:    ['view', 'create', 'update', 'delete'],
    users:     ['view', 'create', 'update', 'delete'],
    settings:  ['view', 'update'],
    logs:      ['view'],
    profile:   ['view', 'update'],
  },
  DEPUTY_MINISTER: {
    meetings:  ['view', 'create', 'update', 'delete'],
    reports:   ['view', 'create', 'update', 'delete'],
    documents: ['view', 'create', 'update', 'delete'],
    contacts:  ['view', 'create', 'update', 'delete'],
    alerts:    ['view', 'create', 'update', 'delete'],
    users:     [],
    settings:  ['view', 'update'],
    logs:      [],
    profile:   ['view', 'update'],
  },
  SECRETARY: {
    meetings:  ['view', 'create', 'update', 'delete'],
    reports:   ['view'],
    documents: ['view'],
    contacts:  ['view', 'create', 'update'],
    alerts:    ['view'],
    users:     [],
    settings:  [],
    logs:      [],
    profile:   ['view', 'update'],
  },
  VIEWER: {
    meetings:  ['view'],
    reports:   ['view'],
    documents: ['view'],
    contacts:  ['view'],
    alerts:    [],
    users:     [],
    settings:  [],
    logs:      [],
    profile:   ['view', 'update'],
  },
}

// بررسی دسترسی
export function hasPermission(
  role: UserRole | string | undefined,
  resource: Resource,
  action: Action
): boolean {
  if (!role) return false
  const rolePerms = PERMISSIONS[role as UserRole]
  if (!rolePerms) return false
  return rolePerms[resource]?.includes(action) ?? false
}

// نام فارسی نقش‌ها
export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'مدیر سیستم',
  DEPUTY_MINISTER: 'معاون وزیر',
  SECRETARY: 'منشی',
  VIEWER: 'بیننده',
}

// رنگ نقش‌ها
export const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: '#e05555',
  DEPUTY_MINISTER: '#c9a84c',
  SECRETARY: '#4a9eff',
  VIEWER: '#3dbb82',
}