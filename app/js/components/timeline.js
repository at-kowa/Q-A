// 回答・コメントのやり取りを時系列で並べる
import { h } from "../lib/dom.js";
import { formatDateTime } from "../lib/format.js";
import { state } from "../state.js";
import { thumbnails } from "./images.js";

export function timeline({ answers, comments, attachments }) {
  const imagesByComment = new Map();
  for (const a of attachments) {
    if (!a.comment_id) continue;
    if (!imagesByComment.has(a.comment_id)) imagesByComment.set(a.comment_id, []);
    imagesByComment.get(a.comment_id).push(a);
  }

  const entries = [
    ...answers.map((a) => ({ type: "answer", at: a.created_at, item: a })),
    ...comments.map((c) => ({ type: c.is_internal ? "internal" : "comment", at: c.created_at, item: c })),
  ].sort((x, y) => new Date(x.at) - new Date(y.at));

  if (entries.length === 0) {
    return h("p", { class: "muted" }, "まだ回答・コメントはありません。");
  }

  return h("div", { class: "timeline" }, entries.map(({ type, item }) => {
    const mine = item.author_id === state.me.id;
    const label = type === "answer" ? "回答" : type === "internal" ? "情シス内部メモ（投稿者には表示されません）" : "コメント";
    const cls = type === "answer" ? "entry entry-answer" : type === "internal" ? "entry entry-internal" : mine ? "entry entry-mine" : "entry";
    return h("article", { class: cls },
      h("div", { class: "entry-head" },
        h("strong", {}, label),
        h("span", {}, item.author?.name ?? ""),
        h("span", {}, formatDateTime(item.created_at))),
      h("div", { class: "body-text" }, item.body),
      type === "comment" ? thumbnails(imagesByComment.get(item.id)) : null,
    );
  }));
}
