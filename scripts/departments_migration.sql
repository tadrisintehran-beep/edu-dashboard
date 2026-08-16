-- افزودن مفهوم «معاونت» (department) و محدود کردن دیدن/ویرایش/حذف جلسات به هم‌معاونتی‌ها.
-- قبل از اجرا، rls_audit.sql را اجرا کن و مطمئن شو نام policyهای SELECT/UPDATE/DELETE روی meetings
-- همان‌هایی است که این اسکریپت drop می‌کند؛ اگر فرق داشت، بخش «drop» را با نام واقعی جایگزین کن.

-- ===== ۱. جدول معاونت‌ها =====
create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name_fa text not null unique,
  created_at timestamptz not null default now()
);

alter table departments enable row level security;

drop policy if exists "authenticated can read departments" on departments;
create policy "authenticated can read departments" on departments
  for select to authenticated
  using (true);

drop policy if exists "super admin can insert departments" on departments;
create policy "super admin can insert departments" on departments
  for insert to authenticated
  with check (exists (
    select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'SUPER_ADMIN'
  ));

drop policy if exists "super admin can update departments" on departments;
create policy "super admin can update departments" on departments
  for update to authenticated
  using (exists (
    select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'SUPER_ADMIN'
  ));

drop policy if exists "super admin can delete departments" on departments;
create policy "super admin can delete departments" on departments
  for delete to authenticated
  using (exists (
    select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'SUPER_ADMIN'
  ));

-- معاونت پیش‌فرض برای داده‌های موجود
insert into departments (name_fa) values ('دفتر مرکزی')
  on conflict (name_fa) do nothing;

-- ===== ۲. توابع کمکی (security definer تا RLS بازگشتی پیش نیاد) =====
create or replace function current_user_department()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select department_id from profiles where id = auth.uid()
$$;

create or replace function current_user_is_super_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'SUPER_ADMIN')
$$;

-- ===== ۳. ستون معاونت روی profiles =====
alter table profiles add column if not exists department_id uuid references departments(id);

update profiles set department_id = (select id from departments where name_fa = 'دفتر مرکزی')
  where department_id is null and role <> 'SUPER_ADMIN';

alter table profiles drop constraint if exists department_required_unless_admin;
alter table profiles add constraint department_required_unless_admin
  check (role = 'SUPER_ADMIN' or department_id is not null);

-- ===== ۴. ستون معاونت روی meetings =====
alter table meetings add column if not exists department_id uuid references departments(id);

update meetings set department_id = (select id from departments where name_fa = 'دفتر مرکزی')
  where department_id is null;

-- ===== ۵. تریگر: department_id همیشه از پروفایل کاربر جاری تعیین می‌شه، نه از کلاینت =====
create or replace function set_meeting_department()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    new.department_id := current_user_department();
  elsif TG_OP = 'UPDATE' then
    new.department_id := old.department_id;
  end if;
  return new;
end;
$$;

drop trigger if exists meetings_set_department on meetings;
create trigger meetings_set_department
  before insert or update on meetings
  for each row execute function set_meeting_department();

-- ===== ۶. Policyهای meetings: دید و ویرایش/حذف محدود به هم‌معاونتی یا SUPER_ADMIN =====
-- نام‌های احتمالی policy فعلی SELECT رو drop می‌کنیم (اگر معلوم نبود، اول rls_audit.sql رو اجرا کن)
drop policy if exists "authenticated can read meetings" on meetings;
drop policy if exists "authenticated can select meetings" on meetings;
drop policy if exists "authenticated can view meetings" on meetings;
drop policy if exists "authenticated can all meetings" on meetings;
drop policy if exists "meetings visible to own department or admin" on meetings;

create policy "meetings visible to own department or admin" on meetings
  for select to authenticated
  using (
    current_user_is_super_admin()
    or department_id = current_user_department()
  );

drop policy if exists "role can update meetings" on meetings;
create policy "role can update meetings" on meetings
  for update to authenticated
  using (
    exists (
      select 1 from profiles where profiles.id = auth.uid()
        and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
    )
    and (current_user_is_super_admin() or department_id = current_user_department())
  );

drop policy if exists "role can delete meetings" on meetings;
create policy "role can delete meetings" on meetings
  for delete to authenticated
  using (
    exists (
      select 1 from profiles where profiles.id = auth.uid()
        and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
    )
    and (current_user_is_super_admin() or department_id = current_user_department())
  );

-- توجه: policy مربوط به INSERT (از rls_fix.sql: "role can insert meetings") دست‌نخورده می‌مونه؛
-- چون تعیین department_id به‌عهده‌ی تریگر بالاست، نه کلاینت، نیازی به تغییرش نیست.
