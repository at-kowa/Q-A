-- 情シスへの質問箱（テストアプリ）のテーブル
-- 共有のテスト用プロジェクトに間借りするため、作るものはすべて qbox_ で始まる名前にし、
-- 他のテーブルや設定には一切触れない。
-- テスト中は権限を分けず、誰でも質問・回答・管理ができる。

create table if not exists public.qbox_questions (
  id            bigint generated always as identity primary key,
  category      text        not null default 'other'
                            check (category in ('pc', 'mail', 'account', 'software', 'printer', 'other')),
  title         text        not null check (char_length(title) between 1 and 100),
  body          text        not null check (char_length(body) between 1 and 2000),
  status        text        not null default 'new' check (status in ('new', 'in_progress', 'answered')),
  answer        text        check (char_length(answer) <= 4000),
  is_published  boolean     not null default false,
  answered_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.qbox_questions is 'qbox-test（情シスへの質問箱のテストアプリ）用。社内情報・個人情報は入れない。';

-- 更新日時と回答日時を自動で記録する
create or replace function public.qbox_set_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  if new.status = 'answered' and old.status is distinct from 'answered' then
    new.answered_at = now();
  elsif new.status <> 'answered' then
    new.answered_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists qbox_questions_set_timestamps on public.qbox_questions;
create trigger qbox_questions_set_timestamps
  before update on public.qbox_questions
  for each row execute function public.qbox_set_timestamps();

-- RLS（行レベルセキュリティ）
-- テスト中は全員が管理者として振る舞うため、anon キーからの読み書きをこのテーブルに限って許可する。
-- 権限を分けるときは、このポリシーを「送信と公開済みの閲覧だけ」と「管理者は全件」に分けて置き換える。
alter table public.qbox_questions enable row level security;

drop policy if exists qbox_questions_anon_all on public.qbox_questions;
create policy qbox_questions_anon_all
  on public.qbox_questions
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on table public.qbox_questions to anon, authenticated;
