// 投稿（qbox_tickets）の読み書き
import { db, unwrap } from "../supabase.js";

const LIST_COLUMNS =
  "id, ticket_no, kind, category_id, site_id, title, urgency, urgency_rank, status, close_reason, " +
  "author_id, assignee_id, created_at, updated_at";
const DETAIL_COLUMNS =
  "id, ticket_no, kind, category_id, site_id, location_id, location_text, title, body, occurred_at, urgency, " +
  "allow_publish, author_id, assignee_id, status, close_reason, due_date, status_changed_at, " +
  "created_at, updated_at, closed_at, author:qbox_users!qbox_tickets_author_id_fkey(id, name, department)";

export const PAGE_SIZE = 30;

/** 検索語から、PostgREST の条件式を壊す記号を取り除く */
function sanitizeKeyword(keyword) {
  return (keyword ?? "").replace(/[,()*%\\:."']/g, " ").trim();
}

export const ticketRepository = {
  /** 新しく投稿する。戻り値は { id, ticket_no } */
  async create(input) {
    return unwrap(
      await db
        .from("qbox_tickets")
        .insert({
          kind: input.kind,
          category_id: input.category_id,
          site_id: input.site_id,
          location_id: input.location_id || null,
          location_text: input.location_text || null,
          title: input.title,
          body: input.body,
          // 画面の日時（日本時間）を、時差つきの形に変えて送る
          occurred_at: input.occurred_at ? new Date(input.occurred_at).toISOString() : null,
          urgency: input.urgency,
          allow_publish: Boolean(input.allow_publish),
        })
        .select("id, ticket_no, title")
        .single(),
    );
  },

  async get(id) {
    return unwrap(await db.from("qbox_tickets").select(DETAIL_COLUMNS).eq("id", id).maybeSingle());
  },

  /** 自分の投稿の一覧。status："open"（完了以外）／"all"／各ステータス */
  async listMine(authorId, { status = "open", page = 0 } = {}) {
    let query = db
      .from("qbox_tickets")
      .select(LIST_COLUMNS, { count: "exact" })
      .eq("author_id", authorId)
      .order("updated_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (status === "open") query = query.neq("status", "done");
    else if (status !== "all") query = query.eq("status", status);
    const { data, error, count } = await query;
    unwrap({ data, error });
    return { rows: data, count: count ?? 0 };
  },

  /** 受付一覧（情シス担当・管理者） */
  async listAll(filters = {}, { page = 0 } = {}) {
    let query = db
      .from("qbox_tickets")
      .select(LIST_COLUMNS, { count: "exact" })
      .order("urgency_rank", { ascending: true })
      .order("created_at", { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (filters.status === "open") query = query.neq("status", "done");
    else if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
    if (filters.assignee === "none") query = query.is("assignee_id", null);
    else if (filters.assignee) query = query.eq("assignee_id", filters.assignee);
    if (filters.kind) query = query.eq("kind", filters.kind);
    if (filters.category) query = query.eq("category_id", filters.category);
    if (filters.urgency) query = query.eq("urgency", filters.urgency);
    const keyword = sanitizeKeyword(filters.keyword);
    if (keyword) {
      const words = keyword.split(/\s+/).filter(Boolean).slice(0, 5);
      for (const word of words) {
        query = query.or(`title.ilike.*${word}*,body.ilike.*${word}*,ticket_no.ilike.*${word}*`);
      }
    }
    const { data, error, count } = await query;
    unwrap({ data, error });
    return { rows: data, count: count ?? 0 };
  },

  /** 自動更新用：指定した ID より新しい投稿の件数と ID */
  async newerThan(lastId) {
    return unwrap(
      await db.from("qbox_tickets").select("id").gt("id", lastId ?? 0).order("id", { ascending: false }).limit(100),
    );
  },

  async latestId() {
    const rows = unwrap(await db.from("qbox_tickets").select("id").order("id", { ascending: false }).limit(1));
    return rows[0]?.id ?? 0;
  },

  /** 件数だけを数える（ホームの表示用） */
  async count(filters = {}) {
    let query = db.from("qbox_tickets").select("id", { count: "exact", head: true });
    if (filters.authorId) query = query.eq("author_id", filters.authorId);
    if (filters.status === "open") query = query.neq("status", "done");
    else if (filters.status) query = query.eq("status", filters.status);
    if (filters.assignee === "none") query = query.is("assignee_id", null);
    else if (filters.assignee) query = query.eq("assignee_id", filters.assignee);
    const { error, count } = await query;
    unwrap({ data: null, error });
    return count ?? 0;
  },

  /** 投稿者による取り下げ */
  async withdraw(id) {
    return unwrap(
      await db
        .from("qbox_tickets")
        .update({ status: "done", close_reason: "withdrawn" })
        .eq("id", id)
        .select("id, status")
        .single(),
    );
  },

  /** 情シス担当による更新（担当者・状態・完了区分・期限） */
  async update(id, changes) {
    return unwrap(await db.from("qbox_tickets").update(changes).eq("id", id).select(DETAIL_COLUMNS).single());
  },
};
