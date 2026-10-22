// 添付画像（Storage の qbox-attachments バケットと、qbox_attachments テーブル）
import { db, unwrap, toAppError } from "../supabase.js";
import { resizeToJpeg } from "../lib/image.js";

const BUCKET = "qbox-attachments";
const SIGNED_URL_SECONDS = 60 * 10;

export const attachmentRepository = {
  /**
   * 画像を縮小して保存する。失敗した画像はスキップし、失敗した数を返す。
   * commentId を渡すとコメントに付けた画像になる。
   */
  async uploadAll(ticketId, files, { commentId = null } = {}) {
    let failed = 0;
    for (const file of files) {
      try {
        const blob = await resizeToJpeg(file);
        const path = `${ticketId}/${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await db.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (uploadError) throw toAppError(uploadError);
        unwrap(
          await db.from("qbox_attachments").insert({
            ticket_id: ticketId,
            comment_id: commentId,
            storage_path: path,
            file_name: file.name?.slice(0, 200) ?? null,
            mime_type: "image/jpeg",
            size_bytes: blob.size,
          }),
        );
      } catch (err) {
        console.error(err);
        failed += 1;
      }
    }
    return { failed };
  },

  /** 投稿に付いた画像の一覧（表示用の期限付き URL つき） */
  async listForTicket(ticketId) {
    const rows = unwrap(
      await db
        .from("qbox_attachments")
        .select("id, comment_id, storage_path, file_name, created_at")
        .eq("ticket_id", ticketId)
        .order("id"),
    );
    if (rows.length === 0) return [];
    const { data, error } = await db.storage.from(BUCKET).createSignedUrls(rows.map((r) => r.storage_path), SIGNED_URL_SECONDS);
    if (error) throw toAppError(error);
    const urls = new Map(data.map((d) => [d.path, d.signedUrl]));
    return rows.map((r) => ({ ...r, url: urls.get(r.storage_path) ?? null }));
  },
};
