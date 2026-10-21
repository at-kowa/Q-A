-- 質問箱をログインした許可済みアカウントだけが使えるようにする
-- 共有のテスト用プロジェクトに間借りしているため、qbox_ で始まるもの以外には触れない。
--
-- 実行後にやること（本人）:
--   1. Authentication → Users → Add user で、テスト用アカウントを作る
--      Email: <ID>@qbox.example.com / Password: 任意 / Auto Confirm User: オン
--   2. README の「許可リストへの登録」の SQL で、そのアカウントを qbox_members に登録する

-- 許可リスト
create table if not exists public.qbox_members (
  user_id     uuid        primary key references auth.users (id) on delete cascade,
  note        text        check (char_length(note) <= 100),
  created_at  timestamptz not null default now()
);

comment on table public.qbox_members is 'qbox-test の利用を許可するアカウント。登録・削除は管理画面の SQL Editor で行う。';

alter table public.qbox_members enable row level security;

-- ログインした本人が、自分が登録されているかだけを確認できる（追加・変更・削除は画面からはできない）
drop policy if exists qbox_members_select_self on public.qbox_members;
create policy qbox_members_select_self
  on public.qbox_members
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.qbox_members from anon;
grant select on table public.qbox_members to authenticated;

-- ログイン中の利用者が許可リストに入っているか
create or replace function public.qbox_is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.qbox_members m where m.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.qbox_is_member() from public, anon;
grant execute on function public.qbox_is_member() to authenticated;

-- 質問テーブル：ログインなし（anon）での読み書きをやめ、許可済みアカウントだけにする
drop policy if exists qbox_questions_anon_all on public.qbox_questions;
drop policy if exists qbox_questions_members_all on public.qbox_questions;
create policy qbox_questions_members_all
  on public.qbox_questions
  for all
  to authenticated
  using ((select public.qbox_is_member()))
  with check ((select public.qbox_is_member()));

revoke all on table public.qbox_questions from anon;
grant select, insert, update, delete on table public.qbox_questions to authenticated;
