-- 情シス質問箱 v0.4（技術検証版）段階4：FAQ
-- 段階3（20261022000300_qbox_v04_responses.sql）を実行したあとに実行する。

create table if not exists public.qbox_faqs (
  id                bigint generated always as identity primary key,
  source_ticket_id  bigint unique references public.qbox_tickets (id) on delete set null,
  title             text   not null check (char_length(title) between 1 and 100),
  question          text   not null check (char_length(question) between 1 and 4000),
  answer            text   not null check (char_length(answer) between 1 and 4000),
  category_id       bigint not null references public.qbox_categories (id),
  kind              text   not null default 'question' check (kind in ('question', 'request', 'bug')),
  is_published      boolean not null default false,
  published_at      timestamptz,
  created_by        bigint not null default public.qbox_my_user_id() references public.qbox_users (id),
  created_at        timestamptz not null default now(),
  updated_by        bigint references public.qbox_users (id),
  updated_at        timestamptz not null default now()
);

create index if not exists qbox_faqs_published_idx on public.qbox_faqs (is_published, published_at desc);

comment on table public.qbox_faqs is '情シス質問箱 v0.4 の FAQ。公開中（is_published）のものだけが一般の利用者に見える。投稿者の情報は持たない。';

-- 登録・更新したとき：作成者・更新者・日時を記録し、公開したときに公開日時を入れる
create or replace function public.qbox_faqs_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  me bigint := public.qbox_my_user_id();
begin
  if tg_op = 'INSERT' then
    if me is not null then
      new.created_by := me;
      new.created_at := now();
    end if;
  else
    new.id         := old.id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  if me is not null then
    new.updated_by := me;
  end if;
  new.updated_at := now();
  if new.is_published and (tg_op = 'INSERT' or not old.is_published) then
    new.published_at := now();
  elsif not new.is_published then
    new.published_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists qbox_faqs_before_write on public.qbox_faqs;
create trigger qbox_faqs_before_write
  before insert or update on public.qbox_faqs
  for each row execute function public.qbox_faqs_before_write();

alter table public.qbox_faqs enable row level security;
revoke all on table public.qbox_faqs from anon;
grant select, insert, update, delete on table public.qbox_faqs to authenticated;

-- 一般の利用者は公開中のものだけ。情シス担当・管理者はすべて
drop policy if exists qbox_faqs_select on public.qbox_faqs;
create policy qbox_faqs_select on public.qbox_faqs
  for select to authenticated
  using ((is_published and public.qbox_is_member()) or public.qbox_is_staff());

drop policy if exists qbox_faqs_insert on public.qbox_faqs;
create policy qbox_faqs_insert on public.qbox_faqs
  for insert to authenticated
  with check (public.qbox_is_staff());

drop policy if exists qbox_faqs_update on public.qbox_faqs;
create policy qbox_faqs_update on public.qbox_faqs
  for update to authenticated
  using (public.qbox_is_staff())
  with check (public.qbox_is_staff());

-- 削除は管理者だけ
drop policy if exists qbox_faqs_delete on public.qbox_faqs;
create policy qbox_faqs_delete on public.qbox_faqs
  for delete to authenticated
  using (public.qbox_is_admin());

-- FAQ の検索（タイトル・質問文・回答文。空白で区切った語をすべて含むもの）
-- security invoker：RLS がそのまま効くので、一般の利用者には公開中のものだけが返る
create or replace function public.qbox_search_faqs(
  p_keyword             text    default null,
  p_category_id         bigint  default null,
  p_kind                text    default null,
  p_include_unpublished boolean default false
)
returns setof public.qbox_faqs
language sql
stable
security invoker
set search_path = ''
as $$
  select f.*
  from public.qbox_faqs f
  where (p_include_unpublished or f.is_published)
    and (p_category_id is null or f.category_id = p_category_id)
    and (p_kind is null or f.kind = p_kind)
    and not exists (
      select 1
      from regexp_split_to_table(trim(coalesce(p_keyword, '')), '[\s　]+') as w(word)
      where w.word <> ''
        and not (
          f.title    ilike '%' || replace(replace(replace(w.word, '\', '\\'), '%', '\%'), '_', '\_') || '%'
          or f.question ilike '%' || replace(replace(replace(w.word, '\', '\\'), '%', '\%'), '_', '\_') || '%'
          or f.answer   ilike '%' || replace(replace(replace(w.word, '\', '\\'), '%', '\%'), '_', '\_') || '%'
        )
    )
  order by coalesce(f.published_at, f.updated_at) desc
  limit 200
$$;

revoke all on function public.qbox_search_faqs(text, bigint, text, boolean) from public, anon;
grant execute on function public.qbox_search_faqs(text, bigint, text, boolean) to authenticated;
