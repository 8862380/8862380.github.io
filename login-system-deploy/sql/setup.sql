-- ============================================================
--  开物 AI 资源站 · 登录/注册 + 后台审核 数据库脚本
--  使用方法：登录 Supabase 控制台 -> SQL Editor -> 新建查询
--  把本文件内容全部粘贴进去 -> 点 Run 执行一次即可。
--
--  执行前请先把下面【第 4 步】中的管理员邮箱改成你自己的邮箱！
-- ============================================================

-- 1) 用户档案表：每个注册用户自动生成一行，默认状态为 pending（待审核）
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  note text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz
);

-- 2) 新用户注册后，自动在 profiles 表里插入一行“待审核”记录
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, status)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) 管理员表：只有这里列出的邮箱才能进入后台审核页
create table if not exists public.admins (
  email text primary key
);

-- 4) ★★★ 把你自己的管理员邮箱填到下面（可添加多行） ★★★
insert into public.admins (email) values
  ('youradmin@example.com')   -- TODO: 改成你的邮箱
on conflict (email) do nothing;

-- 5) 判断当前登录用户是否为管理员（供前端与函数调用）
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admins a
    where lower(a.email) = lower(auth.jwt() ->> 'email')
  );
$$;

-- 6) 管理员：列出所有注册用户（按注册时间倒序）
create or replace function public.list_profiles()
returns table (
  id uuid,
  email text,
  display_name text,
  status text,
  note text,
  created_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz
)
language sql
security definer set search_path = public
stable
as $$
  select
    p.id,
    p.email,
    p.display_name,
    p.status,
    p.note,
    p.created_at,
    p.approved_at,
    p.rejected_at
  from public.profiles p
  where public.is_admin()
  order by p.created_at desc;
$$;

-- 7) 管理员：通过 / 拒绝某个注册申请
create or replace function public.set_profile_status(
  target_id uuid,
  new_status text,
  new_note text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '无权限执行此操作';
  end if;
  if new_status not in ('approved', 'rejected') then
    raise exception '无效的审核状态';
  end if;

  update public.profiles
  set
    status = new_status,
    note = coalesce(new_note, note),
    approved_at = case when new_status = 'approved' then now() else approved_at end,
    rejected_at = case when new_status = 'rejected' then now() else rejected_at end
  where id = target_id;
end;
$$;

-- 8) 当前登录用户查询自己的档案（登录页用于判断是否已通过审核）
create or replace function public.my_profile()
returns table (
  id uuid,
  email text,
  display_name text,
  status text,
  created_at timestamptz
)
language sql
security definer set search_path = public
stable
as $$
  select p.id, p.email, p.display_name, p.status, p.created_at
  from public.profiles p
  where p.id = auth.uid();
$$;

-- 9) 开启行级安全（RLS）
alter table public.profiles enable row level security;
alter table public.admins enable row level security;

-- 所有读写都通过上面的 security definer 函数进行，
-- 函数内部已做管理员校验，因此不额外开放直接读写权限。

-- 10) 授权调用函数
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.my_profile() to anon, authenticated;
grant execute on function public.list_profiles() to anon, authenticated;
grant execute on function public.set_profile_status(uuid, text, text) to anon, authenticated;
