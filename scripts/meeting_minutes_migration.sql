-- شرکت‌کنندگان و صورت‌جلسه: RLS برای جداولی که از قبل در Supabase ساخته شده‌اند:
-- meeting_attendees, meeting_minutes, meeting_action_items, minutes_send_log.
-- این اسکریپت ستون یا تایپ جدولی رو تغییر نمی‌ده — فقط RLS/ایندکس/تریگرهای لازم رو اضافه می‌کنه.
-- پیش‌نیاز: departments_migration.sql (برای current_user_department/current_user_is_super_admin
-- و ستون meetings.department_id) باید قبلاً اجرا شده باشد.

-- ===== Realtime: جدول‌های جدید رو به publication اضافه کن تا بج‌های زنده (تعداد شرکت‌کننده،
-- وضعیت صورت‌جلسه) در صفحه‌ی جلسات آپدیت زنده بگیرن. اگر از قبل عضو بودن، خطا رو نادیده می‌گیریم =====
do $$ begin
  alter publication supabase_realtime add table meeting_attendees;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table meeting_minutes;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table meeting_action_items;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table minutes_send_log;
exception when duplicate_object then null;
end $$;

-- ===== ایندکس‌ها =====
create index if not exists meeting_attendees_meeting_id_idx on meeting_attendees(meeting_id);
create index if not exists meeting_minutes_meeting_id_idx on meeting_minutes(meeting_id);
create index if not exists meeting_action_items_meeting_id_idx on meeting_action_items(meeting_id);
create index if not exists meeting_action_items_minutes_id_idx on meeting_action_items(minutes_id);
create index if not exists minutes_send_log_minutes_id_idx on minutes_send_log(minutes_id);

-- ===== ۱. meeting_attendees =====
alter table meeting_attendees enable row level security;

drop policy if exists "attendees visible to own department or admin" on meeting_attendees;
create policy "attendees visible to own department or admin" on meeting_attendees
  for select to authenticated
  using (
    current_user_is_super_admin()
    or exists (
      select 1 from meetings m where m.id = meeting_attendees.meeting_id
        and m.department_id = current_user_department()
    )
  );

drop policy if exists "role can insert attendees" on meeting_attendees;
create policy "role can insert attendees" on meeting_attendees
  for insert to authenticated
  with check (
    exists (
      select 1 from profiles where profiles.id = auth.uid()
        and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
    )
    and exists (
      select 1 from meetings m where m.id = meeting_attendees.meeting_id
        and (current_user_is_super_admin() or m.department_id = current_user_department())
    )
  );

drop policy if exists "role can update attendees" on meeting_attendees;
create policy "role can update attendees" on meeting_attendees
  for update to authenticated
  using (
    exists (
      select 1 from profiles where profiles.id = auth.uid()
        and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
    )
    and exists (
      select 1 from meetings m where m.id = meeting_attendees.meeting_id
        and (current_user_is_super_admin() or m.department_id = current_user_department())
    )
  );

drop policy if exists "role can delete attendees" on meeting_attendees;
create policy "role can delete attendees" on meeting_attendees
  for delete to authenticated
  using (
    exists (
      select 1 from profiles where profiles.id = auth.uid()
        and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
    )
    and exists (
      select 1 from meetings m where m.id = meeting_attendees.meeting_id
        and (current_user_is_super_admin() or m.department_id = current_user_department())
    )
  );

-- ===== ۲. meeting_minutes =====
alter table meeting_minutes enable row level security;

-- created_by همیشه سمت سرور از auth.uid() تعیین می‌شه، نه از کلاینت
create or replace function set_minutes_created_by()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    new.created_by := auth.uid();
  elsif TG_OP = 'UPDATE' then
    new.created_by := old.created_by;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists meeting_minutes_set_created_by on meeting_minutes;
create trigger meeting_minutes_set_created_by
  before insert or update on meeting_minutes
  for each row execute function set_minutes_created_by();

drop policy if exists "minutes visible to own department or admin" on meeting_minutes;
create policy "minutes visible to own department or admin" on meeting_minutes
  for select to authenticated
  using (
    current_user_is_super_admin()
    or exists (
      select 1 from meetings m where m.id = meeting_minutes.meeting_id
        and m.department_id = current_user_department()
    )
  );

drop policy if exists "role can insert minutes" on meeting_minutes;
create policy "role can insert minutes" on meeting_minutes
  for insert to authenticated
  with check (
    exists (
      select 1 from profiles where profiles.id = auth.uid()
        and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
    )
    and exists (
      select 1 from meetings m where m.id = meeting_minutes.meeting_id
        and (current_user_is_super_admin() or m.department_id = current_user_department())
    )
  );

drop policy if exists "role can update minutes" on meeting_minutes;
create policy "role can update minutes" on meeting_minutes
  for update to authenticated
  using (
    exists (
      select 1 from profiles where profiles.id = auth.uid()
        and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
    )
    and exists (
      select 1 from meetings m where m.id = meeting_minutes.meeting_id
        and (current_user_is_super_admin() or m.department_id = current_user_department())
    )
  );

drop policy if exists "role can delete minutes" on meeting_minutes;
create policy "role can delete minutes" on meeting_minutes
  for delete to authenticated
  using (
    exists (
      select 1 from profiles where profiles.id = auth.uid()
        and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
    )
    and exists (
      select 1 from meetings m where m.id = meeting_minutes.meeting_id
        and (current_user_is_super_admin() or m.department_id = current_user_department())
    )
  );

-- ===== ۳. meeting_action_items =====
alter table meeting_action_items enable row level security;

create or replace function touch_action_item_updated_at()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists meeting_action_items_touch_updated_at on meeting_action_items;
create trigger meeting_action_items_touch_updated_at
  before update on meeting_action_items
  for each row execute function touch_action_item_updated_at();

drop policy if exists "action items visible to own department or admin" on meeting_action_items;
create policy "action items visible to own department or admin" on meeting_action_items
  for select to authenticated
  using (
    current_user_is_super_admin()
    or exists (
      select 1 from meetings m where m.id = meeting_action_items.meeting_id
        and m.department_id = current_user_department()
    )
  );

drop policy if exists "role can insert action items" on meeting_action_items;
create policy "role can insert action items" on meeting_action_items
  for insert to authenticated
  with check (
    exists (
      select 1 from profiles where profiles.id = auth.uid()
        and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
    )
    and exists (
      select 1 from meetings m where m.id = meeting_action_items.meeting_id
        and (current_user_is_super_admin() or m.department_id = current_user_department())
    )
  );

-- کسی که تکلیف به او محول شده هم می‌تونه وضعیت انجام کار خودش رو تغییر بده (مثل ارجاعات نامه)
drop policy if exists "assignee or role can update action items" on meeting_action_items;
create policy "assignee or role can update action items" on meeting_action_items
  for update to authenticated
  using (
    assigned_to_user_id = auth.uid()
    or (
      exists (
        select 1 from profiles where profiles.id = auth.uid()
          and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
      )
      and exists (
        select 1 from meetings m where m.id = meeting_action_items.meeting_id
          and (current_user_is_super_admin() or m.department_id = current_user_department())
      )
    )
  );

drop policy if exists "role can delete action items" on meeting_action_items;
create policy "role can delete action items" on meeting_action_items
  for delete to authenticated
  using (
    exists (
      select 1 from profiles where profiles.id = auth.uid()
        and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
    )
    and exists (
      select 1 from meetings m where m.id = meeting_action_items.meeting_id
        and (current_user_is_super_admin() or m.department_id = current_user_department())
    )
  );

-- ===== ۴. minutes_send_log (append-only؛ ارسال واقعی از طریق API روت با service role انجام می‌شه) =====
alter table minutes_send_log enable row level security;

drop policy if exists "send log visible to own department or admin" on minutes_send_log;
create policy "send log visible to own department or admin" on minutes_send_log
  for select to authenticated
  using (
    current_user_is_super_admin()
    or exists (
      select 1 from meeting_minutes mm
        join meetings m on m.id = mm.meeting_id
      where mm.id = minutes_send_log.minutes_id
        and m.department_id = current_user_department()
    )
  );

drop policy if exists "role can insert send log" on minutes_send_log;
create policy "role can insert send log" on minutes_send_log
  for insert to authenticated
  with check (
    exists (
      select 1 from profiles where profiles.id = auth.uid()
        and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
    )
    and exists (
      select 1 from meeting_minutes mm
        join meetings m on m.id = mm.meeting_id
      where mm.id = minutes_send_log.minutes_id
        and (current_user_is_super_admin() or m.department_id = current_user_department())
    )
  );
