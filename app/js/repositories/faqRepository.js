// FAQ（qbox_faqs）の読み書き
import { db, unwrap } from "../supabase.js";

const COLUMNS = "id, source_ticket_id, title, question, answer, category_id, kind, is_published, published_at, updated_at";

export const faqRepository = {
  async search({ keyword = "", categoryId = null, kind = null, includeUnpublished = false } = {}) {
    return unwrap(
      await db.rpc("qbox_search_faqs", {
        p_keyword: keyword || null,
        p_category_id: categoryId || null,
        p_kind: kind || null,
        p_include_unpublished: includeUnpublished,
      }),
    );
  },

  async get(id) {
    return unwrap(await db.from("qbox_faqs").select(COLUMNS).eq("id", id).maybeSingle());
  },

  /** 元の投稿から作った FAQ（なければ null） */
  async getBySourceTicket(ticketId) {
    return unwrap(await db.from("qbox_faqs").select(COLUMNS).eq("source_ticket_id", ticketId).maybeSingle());
  },

  async create(input) {
    return unwrap(await db.from("qbox_faqs").insert(input).select(COLUMNS).single());
  },

  async update(id, changes) {
    return unwrap(await db.from("qbox_faqs").update(changes).eq("id", id).select(COLUMNS).single());
  },

  async remove(id) {
    unwrap(await db.from("qbox_faqs").delete().eq("id", id));
  },
};
