// 投稿の状態などを表す小さな表示部品（色だけでなく文字でも伝える）
import { h } from "../lib/dom.js";
import { STATUS_LABELS, CLOSE_REASON_LABELS, URGENCY_LABELS, KIND_LABELS, KIND_ICONS } from "../lib/format.js";

export function statusPill(ticket) {
  const label = ticket.status === "done" && ticket.close_reason
    ? `${STATUS_LABELS.done}（${CLOSE_REASON_LABELS[ticket.close_reason]}）`
    : STATUS_LABELS[ticket.status];
  return h("span", { class: `pill pill-${ticket.status}` }, label);
}

export function urgencyPill(urgency) {
  return h("span", { class: `pill pill-${urgency}` }, urgency === "stopped" ? "⚠ " : "", URGENCY_LABELS[urgency]);
}

export function kindPill(kind) {
  return h("span", { class: "pill pill-kind" }, h("span", { "aria-hidden": "true" }, KIND_ICONS[kind]), KIND_LABELS[kind]);
}

export function unreadPill(isUnread) {
  return isUnread ? h("span", { class: "pill pill-unread" }, "未読") : null;
}
