-- 情シス質問箱 v0.4（技術検証版）段階3：コメント・回答・既読（未読バッジ）
-- 段階2（20261022000200_qbox_v04_tickets.sql）を実行したあとに実行する。

-- ============================================================
-- 投稿に「最後に動きがあった日時」を持たせる（一覧の「最終更新」に使う）
-- ============================================================

alter table public.qbox_tickets add column if not exists last_activity_at timestamptz not null default now();
create index if not exists qbox_tickets_activity_idx on public.qbox_tickets (author_id, last_activity_at desc);

-- 更新時のトリガーを置き換える（段階2の内容に、次の2点を追加）
--   ・コメント・回答の登録に合わせて last_activity_at だけを更新するときは、権限の確認を通す
--     （qbox.touch という一時的な設定値が on のときだけ。アプリからは設定できない）
--   ・通常の更新でも last_activity_at を更新する
create or replace function public.qbox_tickets_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  me    bigint  := public.qbox_my_user_id();
  staff boolean := public.qbox_is_staff();
begin
  if current_setting('qbox.touch', true) = 'on' then
    new := old;
    new.last_activity_at := now();
    return new;
  end if;

  -- 変えてはいけない項目
  new.id         := old.id;
  new.ticket_no  := old.ticket_no;
  new.author_id  := old.author_id;
  new.created_at := old.created_at;

  if me is not null and not staff then
    if not (old.status = 'received' and new.status = 'done' and new.close_reason = 'withdrawn') then
      raise exception '投稿を変更できるのは「受付」状態での取り下げだけです。' using errcode = '42501';
    end if;
    new := old;
    new.status       := 'done';
    new.close_reason := 'withdrawn';
  else
    if new.assignee_id is distinct from old.assignee_id and new.assignee_id is not null then
      if not exists (
        select 1 from public.qbox_users u
        where u.id = new.assignee_id and u.role in ('staff', 'admin') and u.is_active
      ) then
        raise exception '担当者には、有効な情シス担当・管理者を選んでください。' using errcode = '22023';
      end if;
      if new.status = 'received' then
        new.status := 'in_progress';
      end if;
    end if;
    if new.status <> 'done' then
      new.close_reason := null;
    elsif new.close_reason is null then
      raise exception '「完了」にするときは完了区分を選んでください。' using errcode = '22023';
    end if;
  end if;

  if new.status is distinct from old.status then
    new.status_changed_at := now();
    new.status_changed_by := me;
    new.closed_at := case when new.status = 'done' then now() else null end;
  end if;
  new.updated_at := now();
  new.last_activity_at := now();
  return new;
end;
$$;

-- コメント・回答が登録されたら、投稿の last_activity_at を更新する
create or replace function public.qbox_touch_ticket()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('qbox.touch', 'on', true);
  update public.qbox_tickets set last_activity_at = now() where id = new.ticket_id;
  perform set_config('qbox.touch', 'off', true);
  return null;
end;
$$;

-- ============================================================
-- コメント（情シス内部メモを含む）
-- ============================================================

create table if not exists public.qbox_comments (
  id           bigint generated always as identity primary key,
  ticket_id    bigint  not null references public.qbox_tickets (id) on delete cascade,
  author_id    bigint  not null default public.qbox_my_user_id() references public.qbox_users (id),
  body         text    not null check (char_length(body) between 1 and 2000),
  is_internal  boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists qbox_comments_ticket_idx on public.qbox_comments (ticket_id, created_at);

comment on column public.qbox_comments.is_internal is 'true = 情シス内部メモ（投稿者には見せない）';

create or replace function public.qbox_set_author_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  me bigint := public.qbox_my_user_id();
begin
  if me is not null then
    new.author_id  := me;
    new.created_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists qbox_comments_before_insert on public.qbox_comments;
create trigger qbox_comments_before_insert
  before insert on public.qbox_comments
  for each row execute function public.qbox_set_author_before_insert();

drop trigger if exists qbox_comments_touch_ticket on public.qbox_comments;
create trigger qbox_comments_touch_ticket
  after insert on public.qbox_comments
  for each row when (not new.is_internal) execute function public.qbox_touch_ticket();

alter table public.qbox_comments enable row level security;
revoke all on table public.qbox_comments from anon;
revoke update, delete on table public.qbox_comments from authenticated;
grant select, insert on table public.qbox_comments to authenticated;

drop policy if exists qbox_comments_select on public.qbox_comments;
create policy qbox_comments_select on public.qbox_comments
  for select to authenticated
  using (public.qbox_is_staff() or (not is_internal and public.qbox_can_access_ticket(ticket_id)));

drop policy if exists qbox_comments_insert on public.qbox_comments;
create policy qbox_comments_insert on public.qbox_comments
  for insert to authenticated
  with check (
    author_id = public.qbox_my_user_id()
    and public.qbox_can_access_ticket(ticket_id)
    and (public.qbox_is_staff() or not is_internal)
  );

-- ============================================================
-- 回答
-- ============================================================

create table if not exists public.qbox_answers (
  id          bigint generated always as identity primary key,
  ticket_id   bigint not null references public.qbox_tickets (id) on delete cascade,
  author_id   bigint not null default public.qbox_my_user_id() references public.qbox_users (id),
  body        text   not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now()
);

create index if not exists qbox_answers_ticket_idx on public.qbox_answers (ticket_id, created_at);

drop trigger if exists qbox_answers_before_insert on public.qbox_answers;
create trigger qbox_answers_before_insert
  before insert on public.qbox_answers
  for each row execute function public.qbox_set_author_before_insert();

drop trigger if exists qbox_answers_touch_ticket on public.qbox_answers;
create trigger qbox_answers_touch_ticket
  after insert on public.qbox_answers
  for each row execute function public.qbox_touch_ticket();

alter table public.qbox_answers enable row level security;
revoke all on table public.qbox_answers from anon;
revoke update, delete on table public.qbox_answers from authenticated;
grant select, insert on table public.qbox_answers to authenticated;

drop policy if exists qbox_answers_select on public.qbox_answers;
create policy qbox_answers_select on public.qbox_answers
  for select to authenticated
  using (public.qbox_can_access_ticket(ticket_id));

drop policy if exists qbox_answers_insert on public.qbox_answers;
create policy qbox_answers_insert on public.qbox_answers
  for insert to authenticated
  with check (public.qbox_is_staff() and author_id = public.qbox_my_user_id());

-- ============================================================
-- 添付画像：コメントへの添付に対応する
-- ============================================================
-- 内部メモには画像を付けられない（投稿者が Storage から読めてしまうため）。

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'qbox_attachments_comment_id_fkey'
  ) then
    alter table public.qbox_attachments
      add constraint qbox_attachments_comment_id_fkey
      foreign key (comment_id) references public.qbox_comments (id) on delete cascade;
  end if;
end;
$$;

drop policy if exists qbox_attachments_insert on public.qbox_attachments;
create policy qbox_attachments_insert on public.qbox_attachments
  for insert to authenticated
  with check (
    created_by = public.qbox_my_user_id()
    and public.qbox_can_access_ticket(ticket_id)
    and (
      comment_id is null
      or exists (
        select 1 from public.qbox_comments c
        where c.id = comment_id
          and c.ticket_id = qbox_attachments.ticket_id
          and c.author_id = public.qbox_my_user_id()
          and not c.is_internal
      )
    )
  );

-- ============================================================
-- 既読
-- ============================================================

create table if not exists public.qbox_read_states (
  user_id       bigint not null references public.qbox_users (id) on delete cascade,
  ticket_id     bigint not null references public.qbox_tickets (id) on delete cascade,
  last_read_at  timestamptz not null default now(),
  primary key (user_id, ticket_id)
);

alter table public.qbox_read_states enable row level security;
revoke all on table public.qbox_read_states from anon;
revoke insert, update, delete on table public.qbox_read_states from authenticated;
grant select on table public.qbox_read_states to authenticated;

drop policy if exists qbox_read_states_select on public.qbox_read_states;
create policy qbox_read_states_select on public.qbox_read_states
  for select to authenticated
  using (user_id = public.qbox_my_user_id());

-- 投稿を開いたときに既読にする
create or replace function public.qbox_mark_read(p_ticket_id bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me bigint := public.qbox_my_user_id();
begin
  if me is null or not public.qbox_can_access_ticket(p_ticket_id) then
    return;
  end if;
  insert into public.qbox_read_states (user_id, ticket_id, last_read_at)
  values (me, p_ticket_id, now())
  on conflict (user_id, ticket_id) do update set last_read_at = excluded.last_read_at;
end;
$$;

-- 未読の投稿IDの一覧
--   投稿者：自分の投稿に、他の人の回答・コメント・状態の変更があった
--   情シス担当・管理者：まだ開いていない新しい投稿（受付・担当者なし）、
--                       自分が担当する投稿に投稿者がコメントした
-- security invoker：見てよい投稿・コメントだけが対象になる（RLS がそのまま効く）
create or replace function public.qbox_unread_ticket_ids()
returns setof bigint
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (
    select public.qbox_my_user_id() as id, public.qbox_is_staff() as staff
  ),
  rs as (
    select r.ticket_id, r.last_read_at
    from public.qbox_read_states r
    where r.user_id = (select id from me)
  )
  select t.id
  from public.qbox_tickets t
  cross join me
  left join rs on rs.ticket_id = t.id
  where me.id is not null
    and (
      (
        t.author_id = me.id
        and (
          exists (
            select 1 from public.qbox_comments c
            where c.ticket_id = t.id and c.author_id <> me.id and not c.is_internal
              and c.created_at > coalesce(rs.last_read_at, '-infinity')
          )
          or exists (
            select 1 from public.qbox_answers a
            where a.ticket_id = t.id and a.created_at > coalesce(rs.last_read_at, '-infinity')
          )
          or (
            t.status_changed_at > coalesce(rs.last_read_at, '-infinity')
            and t.status_changed_by is distinct from me.id
          )
        )
      )
      or (
        me.staff
        and t.author_id <> me.id
        and (
          (t.status = 'received' and t.assignee_id is null and rs.ticket_id is null)
          or (
            t.assignee_id = me.id
            and exists (
              select 1 from public.qbox_comments c
              where c.ticket_id = t.id and c.author_id = t.author_id
                and c.created_at > coalesce(rs.last_read_at, '-infinity')
            )
          )
        )
      )
    )
$$;

revoke all on function public.qbox_mark_read(bigint)    from public, anon;
revoke all on function public.qbox_unread_ticket_ids()  from public, anon;
revoke all on function public.qbox_touch_ticket()       from public, anon, authenticated;
revoke all on function public.qbox_set_author_before_insert() from public, anon, authenticated;
grant execute on function public.qbox_mark_read(bigint)   to authenticated;
grant execute on function public.qbox_unread_ticket_ids() to authenticated;
