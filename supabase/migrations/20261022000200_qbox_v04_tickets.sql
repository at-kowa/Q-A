-- 情シス質問箱 v0.4（技術検証版）段階2：投稿と添付画像
-- 段階1（20261022000100_qbox_v04_foundation.sql）を実行したあとに実行する。

-- ============================================================
-- 投稿
-- ============================================================

create sequence if not exists public.qbox_ticket_no_seq;

create table if not exists public.qbox_tickets (
  id                 bigint generated always as identity primary key,
  ticket_no          text unique,
  kind               text   not null check (kind in ('question', 'request', 'bug')),
  category_id        bigint not null references public.qbox_categories (id),
  site_id            bigint not null references public.qbox_sites (id),
  location_id        bigint references public.qbox_locations (id),
  location_text      text   check (char_length(location_text) <= 50),
  title              text   not null check (char_length(title) between 1 and 40),
  body               text   not null check (char_length(body) between 1 and 2000),
  occurred_at        timestamptz,
  urgency            text   not null default 'low' check (urgency in ('stopped', 'workaround', 'low')),
  -- 並べ替え用（業務が止まっている＝1 が一番上）
  urgency_rank       smallint generated always as (
                       case urgency when 'stopped' then 1 when 'workaround' then 2 else 3 end
                     ) stored,
  allow_publish      boolean not null default false,
  author_id          bigint not null default public.qbox_my_user_id() references public.qbox_users (id),
  assignee_id        bigint references public.qbox_users (id),
  status             text   not null default 'received' check (status in ('received', 'in_progress', 'done')),
  close_reason       text   check (close_reason in ('answered', 'handled', 'declined', 'withdrawn')),
  due_date           date,
  status_changed_at  timestamptz,
  status_changed_by  bigint references public.qbox_users (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  closed_at          timestamptz,
  constraint qbox_tickets_bug_needs_occurred_at check (kind <> 'bug' or occurred_at is not null),
  constraint qbox_tickets_close_reason_only_when_done check ((status = 'done') = (close_reason is not null))
);

create index if not exists qbox_tickets_author_idx   on public.qbox_tickets (author_id);
create index if not exists qbox_tickets_assignee_idx on public.qbox_tickets (assignee_id);
create index if not exists qbox_tickets_list_idx     on public.qbox_tickets (status, urgency_rank, created_at);

comment on table public.qbox_tickets is '情シス質問箱 v0.4 の投稿。status: received=受付 / in_progress=対応中 / done=完了';

-- 登録時：投稿者・状態をアプリ側から変えられないようにし、受付番号を採番する。
-- SQL Editor から登録したとき（テストデータ）は、指定された値をそのまま使う。
create or replace function public.qbox_tickets_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  me bigint := public.qbox_my_user_id();
begin
  if me is not null then
    new.author_id    := me;
    new.status       := 'received';
    new.close_reason := null;
    new.assignee_id  := null;
    new.due_date     := null;
    new.closed_at    := null;
    new.created_at   := now();
  end if;
  if new.ticket_no is null then
    new.ticket_no := 'Q-' || to_char(new.created_at at time zone 'Asia/Tokyo', 'YYYY') || '-'
                     || lpad(nextval('public.qbox_ticket_no_seq')::text, 5, '0');
  end if;
  new.updated_at := new.created_at;
  return new;
end;
$$;

drop trigger if exists qbox_tickets_before_insert on public.qbox_tickets;
create trigger qbox_tickets_before_insert
  before insert on public.qbox_tickets
  for each row execute function public.qbox_tickets_before_insert();

-- 更新時：
--   一般の利用者は「受付」状態の自分の投稿を取り下げることだけができる
--   担当者を割り当てると自動で「対応中」にする
--   状態が変わったら、変わった日時と変えた人を記録する
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
  -- 変えてはいけない項目
  new.id         := old.id;
  new.ticket_no  := old.ticket_no;
  new.author_id  := old.author_id;
  new.created_at := old.created_at;

  if me is not null and not staff then
    if not (old.status = 'received' and new.status = 'done' and new.close_reason = 'withdrawn') then
      raise exception '投稿を変更できるのは「受付」状態での取り下げだけです。' using errcode = '42501';
    end if;
    -- 取り下げ以外の項目は元のまま
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
  return new;
end;
$$;

drop trigger if exists qbox_tickets_before_update on public.qbox_tickets;
create trigger qbox_tickets_before_update
  before update on public.qbox_tickets
  for each row execute function public.qbox_tickets_before_update();

-- 投稿を見てよいか（自分の投稿、または情シス担当・管理者）
create or replace function public.qbox_can_access_ticket(p_ticket_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.qbox_is_staff()
      or exists (
           select 1 from public.qbox_tickets t
           where t.id = p_ticket_id
             and t.author_id = public.qbox_my_user_id()
         )
$$;

revoke all on function public.qbox_can_access_ticket(bigint) from public, anon;
grant execute on function public.qbox_can_access_ticket(bigint) to authenticated;

alter table public.qbox_tickets enable row level security;
revoke all on table public.qbox_tickets from anon;
revoke delete on table public.qbox_tickets from authenticated;
grant select, insert, update on table public.qbox_tickets to authenticated;

drop policy if exists qbox_tickets_select on public.qbox_tickets;
create policy qbox_tickets_select on public.qbox_tickets
  for select to authenticated
  using (author_id = public.qbox_my_user_id() or public.qbox_is_staff());

drop policy if exists qbox_tickets_insert on public.qbox_tickets;
create policy qbox_tickets_insert on public.qbox_tickets
  for insert to authenticated
  with check (public.qbox_is_member() and author_id = public.qbox_my_user_id());

drop policy if exists qbox_tickets_update on public.qbox_tickets;
create policy qbox_tickets_update on public.qbox_tickets
  for update to authenticated
  using (public.qbox_is_staff() or (author_id = public.qbox_my_user_id() and status = 'received'))
  with check (public.qbox_is_staff() or author_id = public.qbox_my_user_id());

-- ============================================================
-- 添付画像（ファイル本体は Storage の qbox-attachments バケット、ここには情報だけを持つ）
-- ============================================================
-- Storage 上の置き場所は「<投稿ID>/<ランダムな名前>.jpg」とする。

create table if not exists public.qbox_attachments (
  id            bigint generated always as identity primary key,
  ticket_id     bigint not null references public.qbox_tickets (id) on delete cascade,
  comment_id    bigint,  -- コメントに付けた画像のとき（段階3で参照先を設定する）
  storage_path  text   not null unique,
  file_name     text   check (char_length(file_name) <= 200),
  mime_type     text   not null check (mime_type in ('image/jpeg', 'image/png')),
  size_bytes    integer not null check (size_bytes between 1 and 10485760),
  created_by    bigint not null default public.qbox_my_user_id() references public.qbox_users (id),
  created_at    timestamptz not null default now(),
  constraint qbox_attachments_path_in_ticket_folder check (storage_path like ticket_id::text || '/%')
);

create index if not exists qbox_attachments_ticket_idx on public.qbox_attachments (ticket_id);

create or replace function public.qbox_attachments_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  me bigint := public.qbox_my_user_id();
begin
  if me is not null then
    new.created_by := me;
    new.created_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists qbox_attachments_before_insert on public.qbox_attachments;
create trigger qbox_attachments_before_insert
  before insert on public.qbox_attachments
  for each row execute function public.qbox_attachments_before_insert();

alter table public.qbox_attachments enable row level security;
revoke all on table public.qbox_attachments from anon;
revoke update, delete on table public.qbox_attachments from authenticated;
grant select, insert on table public.qbox_attachments to authenticated;

drop policy if exists qbox_attachments_select on public.qbox_attachments;
create policy qbox_attachments_select on public.qbox_attachments
  for select to authenticated
  using (public.qbox_can_access_ticket(ticket_id));

drop policy if exists qbox_attachments_insert on public.qbox_attachments;
create policy qbox_attachments_insert on public.qbox_attachments
  for insert to authenticated
  with check (created_by = public.qbox_my_user_id() and public.qbox_can_access_ticket(ticket_id));

-- ============================================================
-- Storage（画像ファイルの置き場所）
-- ============================================================
-- 非公開のバケット。読み書きできるのは、その投稿を見てよい人だけ。
-- 他のバケットには影響しない（すべてのポリシーで bucket_id を qbox-attachments に限定している）。

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('qbox-attachments', 'qbox-attachments', false, 10485760, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- 「<投稿ID>/…」の形の名前から投稿IDを取り出す（形が違えば null）
create or replace function public.qbox_ticket_id_from_path(p_name text)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case when p_name ~ '^[0-9]{1,18}/' then split_part(p_name, '/', 1)::bigint end
$$;

revoke all on function public.qbox_ticket_id_from_path(text) from public, anon;
grant execute on function public.qbox_ticket_id_from_path(text) to authenticated;

drop policy if exists qbox_attachments_storage_select on storage.objects;
create policy qbox_attachments_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'qbox-attachments'
    and public.qbox_can_access_ticket(public.qbox_ticket_id_from_path(name))
  );

drop policy if exists qbox_attachments_storage_insert on storage.objects;
create policy qbox_attachments_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'qbox-attachments'
    and public.qbox_can_access_ticket(public.qbox_ticket_id_from_path(name))
  );
