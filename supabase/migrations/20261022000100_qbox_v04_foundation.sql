-- 情シス質問箱 v0.4（技術検証版）段階1：土台
-- 利用者・マスタ（拠点・場所・カテゴリ）・設定値のテーブルと、権限を判定する関数を作る。
--
-- 共有のテスト用プロジェクトに間借りするため、作るものはすべて qbox_ で始まる名前にし、
-- 他のテーブルやプロジェクト全体の設定には一切触れない。
-- 未ログイン（anon）には何も許可しない。ログインしていても qbox_users に登録され、
-- かつ有効な人だけがデータを読み書きできる。

-- ============================================================
-- マスタ
-- ============================================================

create table if not exists public.qbox_sites (
  id          bigint generated always as identity primary key,
  name        text    not null check (char_length(name) between 1 and 50),
  sort_order  integer not null default 0,
  is_active   boolean not null default true
);

create table if not exists public.qbox_locations (
  id          bigint generated always as identity primary key,
  site_id     bigint  not null references public.qbox_sites (id),
  name        text    not null check (char_length(name) between 1 and 50),
  sort_order  integer not null default 0,
  is_active   boolean not null default true
);

create table if not exists public.qbox_categories (
  id          bigint generated always as identity primary key,
  name        text    not null check (char_length(name) between 1 and 50),
  sort_order  integer not null default 0,
  is_active   boolean not null default true
);

-- ============================================================
-- 利用者
-- ============================================================
-- Auth のアカウント（<社員番号>@qbox.example.com）と auth_user_id で結び付ける。
-- 登録・変更は SQL Editor で行う（アプリの画面からは変更できない）。

create table if not exists public.qbox_users (
  id                    bigint generated always as identity primary key,
  auth_user_id          uuid unique references auth.users (id) on delete set null,
  employee_no           text not null unique check (employee_no ~ '^[0-9A-Za-z]{1,20}$'),
  name                  text not null check (char_length(name) between 1 and 50),
  department            text check (char_length(department) <= 50),
  site_id               bigint references public.qbox_sites (id),
  role                  text not null default 'general' check (role in ('general', 'staff', 'admin')),
  is_active             boolean not null default true,
  must_change_password  boolean not null default true,
  last_login_at         timestamptz,
  created_at            timestamptz not null default now()
);

comment on table public.qbox_users is '情シス質問箱 v0.4 の利用者。role: general=一般 / staff=情シス担当 / admin=管理者';

-- ============================================================
-- 設定値
-- ============================================================

create table if not exists public.qbox_settings (
  key    text primary key,
  value  text not null
);

insert into public.qbox_settings (key, value) values
  ('auto_logout_minutes', '60'),
  ('refresh_seconds', '60')
on conflict (key) do nothing;

-- ============================================================
-- 権限を判定する関数
-- ============================================================
-- security definer：RLS の判定の中から qbox_users を読むため、関数の所有者の権限で動かす。
-- search_path を空にして、別のスキーマの同名オブジェクトにすり替えられないようにする。

create or replace function public.qbox_my_user_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from public.qbox_users u
  where u.auth_user_id = auth.uid()
    and u.is_active
$$;

create or replace function public.qbox_my_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.role
  from public.qbox_users u
  where u.auth_user_id = auth.uid()
    and u.is_active
$$;

create or replace function public.qbox_is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.qbox_my_user_id() is not null
$$;

create or replace function public.qbox_is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.qbox_my_role() in ('staff', 'admin'), false)
$$;

create or replace function public.qbox_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.qbox_my_role() = 'admin', false)
$$;

-- パスワードを変更したあとに「変更が必要」フラグを外す（本人の行だけ）
create or replace function public.qbox_password_changed()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.qbox_users
  set must_change_password = false
  where auth_user_id = auth.uid()
    and is_active
$$;

-- ログインした日時を記録する（本人の行だけ）
create or replace function public.qbox_touch_login()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.qbox_users
  set last_login_at = now()
  where auth_user_id = auth.uid()
    and is_active
$$;

revoke all on function public.qbox_my_user_id()       from public, anon;
revoke all on function public.qbox_my_role()          from public, anon;
revoke all on function public.qbox_is_member()        from public, anon;
revoke all on function public.qbox_is_staff()         from public, anon;
revoke all on function public.qbox_is_admin()         from public, anon;
revoke all on function public.qbox_password_changed() from public, anon;
revoke all on function public.qbox_touch_login()      from public, anon;
grant execute on function public.qbox_my_user_id()       to authenticated;
grant execute on function public.qbox_my_role()          to authenticated;
grant execute on function public.qbox_is_member()        to authenticated;
grant execute on function public.qbox_is_staff()         to authenticated;
grant execute on function public.qbox_is_admin()         to authenticated;
grant execute on function public.qbox_password_changed() to authenticated;
grant execute on function public.qbox_touch_login()      to authenticated;

-- ============================================================
-- RLS（行レベルセキュリティ）
-- ============================================================

alter table public.qbox_sites      enable row level security;
alter table public.qbox_locations  enable row level security;
alter table public.qbox_categories enable row level security;
alter table public.qbox_users      enable row level security;
alter table public.qbox_settings   enable row level security;

-- 未ログイン（anon）には何も渡さない。ログイン済みでも、画面からは読み取りだけ。
revoke all on table public.qbox_sites, public.qbox_locations, public.qbox_categories,
                    public.qbox_users, public.qbox_settings from anon;
revoke insert, update, delete on table public.qbox_sites, public.qbox_locations, public.qbox_categories,
                    public.qbox_users, public.qbox_settings from authenticated;
grant select on table public.qbox_sites, public.qbox_locations, public.qbox_categories,
                    public.qbox_users, public.qbox_settings to authenticated;

-- マスタ：登録済みの利用者は読める（登録・変更は SQL Editor で行う）
drop policy if exists qbox_sites_select on public.qbox_sites;
create policy qbox_sites_select on public.qbox_sites
  for select to authenticated
  using (public.qbox_is_member());

drop policy if exists qbox_locations_select on public.qbox_locations;
create policy qbox_locations_select on public.qbox_locations
  for select to authenticated
  using (public.qbox_is_member());

drop policy if exists qbox_categories_select on public.qbox_categories;
create policy qbox_categories_select on public.qbox_categories
  for select to authenticated
  using (public.qbox_is_member());

drop policy if exists qbox_settings_select on public.qbox_settings;
create policy qbox_settings_select on public.qbox_settings
  for select to authenticated
  using (public.qbox_is_member());

-- 利用者：
--   自分の行は読める（無効になっていても、ログイン画面で理由を出すために読める）
--   情シス担当・管理者は全員を読める（担当者を選ぶため）
--   一般の利用者は、情シス担当・管理者の行だけ読める（担当者名やコメントした人の名前を出すため）
drop policy if exists qbox_users_select on public.qbox_users;
create policy qbox_users_select on public.qbox_users
  for select to authenticated
  using (
    auth_user_id = auth.uid()
    or public.qbox_is_staff()
    or (public.qbox_is_member() and role in ('staff', 'admin') and is_active)
  );
