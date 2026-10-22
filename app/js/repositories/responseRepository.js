// コメント・回答・既読（未読バッジ）
import { db, unwrap } from "../supabase.js";

export const responseRepository = {
  async listComments(ticketId) {
    return unwrap(
      await db
        .from("qbox_comments")
        .select("id, ticket_id, author_id, body, is_internal, created_at, author:qbox_users!qbox_comments_author_id_fkey(id, name, role)")
        .eq("ticket_id", ticketId)
        .order("created_at"),
    );
  },

  async listAnswers(ticketId) {
    return unwrap(
      await db
        .from("qbox_answers")
        .select("id, ticket_id, author_id, body, created_at, author:qbox_users!qbox_answers_author_id_fkey(id, name)")
        .eq("ticket_id", ticketId)
        .order("created_at"),
    );
  },

  /** コメントを登録する。戻り値は登録したコメントの id */
  async addComment(ticketId, body, { internal = false } = {}) {
    const row = unwrap(
      await db.from("qbox_comments").insert({ ticket_id: ticketId, body, is_internal: internal }).select("id").single(),
    );
    return row.id;
  },

  async addAnswer(ticketId, body) {
    unwrap(await db.from("qbox_answers").insert({ ticket_id: ticketId, body }));
  },

  async markRead(ticketId) {
    unwrap(await db.rpc("qbox_mark_read", { p_ticket_id: ticketId }));
  },

  /** 未読の投稿IDの配列 */
  async unreadTicketIds() {
    const rows = unwrap(await db.rpc("qbox_unread_ticket_ids"));
    return rows.map((row) => (typeof row === "object" ? Object.values(row)[0] : row));
  },
};
