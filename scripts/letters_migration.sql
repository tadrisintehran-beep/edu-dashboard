-- سامانه گردش نامه: جدول نامه‌ها و ارجاعات.
-- قانون ارجاع (گزینه ۱): هر نامه فقط داخل همان معاونتی که به آن تعلق دارد ارجاع داده می‌شود؛
-- یعنی گیرنده‌ی ارجاع باید هم‌معاونت با نامه باشد. ارجاع بین‌معاونتی مجاز نیست.
-- پیش‌نیاز: departments_migration.sql باید قبلاً اجرا شده باشد (برای current_user_department/current_user_is_super_admin).

-- ===== ۱. جدول نامه‌ها =====
create table if not exists letters (
  id uuid primary key default gen_random_uuid(),
  number text,
  subject text not null,
  type text not null check (type in ('incoming','outgoing')),
  correspondent text,
  letter_date date,
  priority text not null default 'low' check (priority in ('low','med','high','critical')),
  status text not null default 'open' check (status in ('open','referred','in_progress','done','archived')),
  attachment_path text,
  attachment_name text,
  department_id uuid references departments(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists letters_department_id_idx on letters(department_id);
create index if not exists letters_status_idx on letters(status);

alter table letters enable row level security;

-- department_id و created_by همیشه سمت سرور تعیین می‌شن، نه از کلاینت (مثل meetings)
create or replace function set_letter_department()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    new.department_id := current_user_department();
    new.created_by := auth.uid();
  elsif TG_OP = 'UPDATE' then
    new.department_id := old.department_id;
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists letters_set_department on letters;
create trigger letters_set_department
  before insert or update on letters
  for each row execute function set_letter_department();

drop policy if exists "letters visible to own department or admin" on letters;
create policy "letters visible to own department or admin" on letters
  for select to authenticated
  using (
    current_user_is_super_admin()
    or department_id = current_user_department()
  );

drop policy if exists "role can insert letters" on letters;
create policy "role can insert letters" on letters
  for insert to authenticated
  with check (exists (
    select 1 from profiles where profiles.id = auth.uid()
      and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
  ));

drop policy if exists "role can update letters" on letters;
create policy "role can update letters" on letters
  for update to authenticated
  using (
    exists (
      select 1 from profiles where profiles.id = auth.uid()
        and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
    )
    and (current_user_is_super_admin() or department_id = current_user_department())
  );

drop policy if exists "role can delete letters" on letters;
create policy "role can delete letters" on letters
  for delete to authenticated
  using (
    exists (
      select 1 from profiles where profiles.id = auth.uid()
        and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
    )
    and (current_user_is_super_admin() or department_id = current_user_department())
  );

-- ===== ۲. جدول ارجاعات =====
create table if not exists letter_referrals (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references letters(id) on delete cascade,
  from_user_id uuid references profiles(id),
  to_user_id uuid not null references profiles(id),
  note text,
  due_date date,
  status text not null default 'pending' check (status in ('pending','in_progress','done')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists letter_referrals_letter_id_idx on letter_referrals(letter_id);
create index if not exists letter_referrals_to_user_id_idx on letter_referrals(to_user_id);

alter table letter_referrals enable row level security;

-- گزینه ۱: گیرنده‌ی ارجاع باید هم‌معاونت نامه باشد؛ from_user_id هم سمت سرور از auth.uid() تعیین می‌شه
create or replace function enforce_referral_same_department()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  letter_dept uuid;
  target_dept uuid;
begin
  select department_id into letter_dept from letters where id = new.letter_id;
  select department_id into target_dept from profiles where id = new.to_user_id;

  if letter_dept is null or target_dept is null or letter_dept <> target_dept then
    raise exception 'ارجاع فقط در داخل همان معاونتِ نامه مجاز است';
  end if;

  new.from_user_id := auth.uid();
  return new;
end;
$$;

drop trigger if exists letter_referrals_enforce_department on letter_referrals;
create trigger letter_referrals_enforce_department
  before insert on letter_referrals
  for each row execute function enforce_referral_same_department();

-- با ثبت اولین ارجاع، وضعیت نامه به «ارجاع شده» تغییر می‌کند
create or replace function bump_letter_on_referral()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  update letters set status = 'referred', updated_at = now()
    where id = new.letter_id and status = 'open';
  return new;
end;
$$;

drop trigger if exists letter_referrals_bump_status on letter_referrals;
create trigger letter_referrals_bump_status
  after insert on letter_referrals
  for each row execute function bump_letter_on_referral();

drop policy if exists "referrals visible to own department or admin" on letter_referrals;
create policy "referrals visible to own department or admin" on letter_referrals
  for select to authenticated
  using (
    current_user_is_super_admin()
    or exists (
      select 1 from letters l where l.id = letter_referrals.letter_id
        and l.department_id = current_user_department()
    )
  );

drop policy if exists "role can insert referrals" on letter_referrals;
create policy "role can insert referrals" on letter_referrals
  for insert to authenticated
  with check (
    exists (
      select 1 from profiles where profiles.id = auth.uid()
        and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
    )
    and exists (
      select 1 from letters l where l.id = letter_referrals.letter_id
        and (current_user_is_super_admin() or l.department_id = current_user_department())
    )
  );

-- گیرنده‌ی ارجاع می‌تونه وضعیت انجام کار خودش رو تغییر بده؛ نقش‌های مدیریتی هم می‌تونن (در محدوده‌ی هم‌معاونتی)
drop policy if exists "assignee or role can update referrals" on letter_referrals;
create policy "assignee or role can update referrals" on letter_referrals
  for update to authenticated
  using (
    to_user_id = auth.uid()
    or (
      exists (
        select 1 from profiles where profiles.id = auth.uid()
          and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
      )
      and (
        current_user_is_super_admin()
        or exists (
          select 1 from letters l where l.id = letter_referrals.letter_id
            and l.department_id = current_user_department()
        )
      )
    )
  );

drop policy if exists "role can delete referrals" on letter_referrals;
create policy "role can delete referrals" on letter_referrals
  for delete to authenticated
  using (
    exists (
      select 1 from profiles where profiles.id = auth.uid()
        and profiles.role in ('SUPER_ADMIN','DEPUTY_MINISTER','SECRETARY')
    )
    and (
      current_user_is_super_admin()
      or exists (
        select 1 from letters l where l.id = letter_referrals.letter_id
          and l.department_id = current_user_department()
      )
    )
  );
