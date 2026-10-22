// 未読の一覧（ヘッダーの「未読」から開く）
import { h, render, loading, errorBox } from "../lib/dom.js";
import { formatDateTime } from "../lib/format.js";
import { state } from "../state.js";
import { ticketRepository } from "../repositories/ticketRepository.js";
import { statusPill, kindPill } from "../components/ticketParts.js";

export async function unreadView(container, params, ctx) {
  render(container, loading());
  try {
    await ctx.refreshUnread();
    const rows = await ticketRepository.listByIds([...state.unread]);
    render(container,
      h("div", { class: "page-head" }, h("h1", {}, "未読")),
      rows.length === 0
        ? h("p", { class: "empty" }, "未読はありません。")
        : h("div", { class: "cards" }, rows.map((t) => {
            const href = t.author_id === state.me.id ? `#/my/${t.id}` : `#/staff/${t.id}`;
            return h("a", { class: "ticket-card", href },
              h("div", { class: "meta" }, h("span", { class: "mono" }, t.ticket_no), statusPill(t), kindPill(t.kind),
                t.author_id === state.me.id ? h("span", {}, "自分の投稿") : h("span", {}, "対応する投稿")),
              h("div", { class: "title" }, t.title),
              h("div", { class: "meta" }, `最終更新 ${formatDateTime(t.last_activity_at)}`));
          })),
    );
  } catch (err) {
    render(container, errorBox(err.message));
  }
}
