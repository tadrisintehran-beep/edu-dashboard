-- ۱. کدوم جدول‌ها RLS فعال دارن و کدوم ندارن
select
  schemaname,
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
order by tablename;

-- ۲. لیست کامل policyهای موجود روی هر جدول
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
