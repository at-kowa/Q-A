// 投稿の内容（詳細画面の上部）。投稿者用・対応用の両方で使う
import { h } from "../lib/dom.js";
import { formatDateTime, URGENCY_LABELS } from "../lib/format.js";
import { siteName, locationName, categoryName, staffName } from "../state.js";
import { statusPill, kindPill, urgencyPill } from "./ticketParts.js";
import { thumbnails } from "./images.js";

export function ticketSummary(ticket, attachments, { showAuthor = false } = {}) {
  const ticketImages = attachments.filter((a) => !a.comment_id);
  const place = [locationName(ticket.location_id), ticket.location_text].filter(Boolean).join("　");
  return h("section", { class: "card" },
    h("div", { class: "row", style: "margin-bottom:8px" },
      h("span", { class: "mono" }, ticket.ticket_no), kindPill(ticket.kind), statusPill(ticket), urgencyPill(ticket.urgency)),
    h("h1", {}, ticket.title),
    h("dl", { class: "kv", style: "margin-bottom:12px" },
      showAuthor ? [h("dt", {}, "投稿者"), h("dd", {}, [ticket.author?.name, ticket.author?.department].filter(Boolean).join("（") + (ticket.author?.department ? "）" : ""))] : null,
      h("dt", {}, "カテゴリ"), h("dd", {}, categoryName(ticket.category_id)),
      h("dt", {}, "工場・拠点"), h("dd", {}, siteName(ticket.site_id), place ? `／${place}` : ""),
      h("dt", {}, "緊急度"), h("dd", {}, URGENCY_LABELS[ticket.urgency]),
      ticket.occurred_at ? [h("dt", {}, "発生日時"), h("dd", {}, formatDateTime(ticket.occurred_at))] : null,
      h("dt", {}, "担当者"), h("dd", {}, staffName(ticket.assignee_id) || "（未定）"),
      ticket.due_date ? [h("dt", {}, "対応期限"), h("dd", {}, ticket.due_date)] : null,
      h("dt", {}, "投稿日時"), h("dd", {}, formatDateTime(ticket.created_at)),
      h("dt", {}, "FAQ公開"), h("dd", {}, ticket.allow_publish ? "公開されても構わない" : "希望しない"),
    ),
    h("div", { class: "body-text" }, ticket.body),
    ticketImages.length ? h("div", { style: "margin-top:12px" }, thumbnails(ticketImages)) : null,
  );
}
