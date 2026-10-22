// S-06 自分の投稿一覧（PC は表、iPad など狭い画面ではカード）
import { h, render, options, loading, errorBox } from "../lib/dom.js";
import { formatDateTime } from "../lib/format.js";
import { state } from "../state.js";
import { ticketRepository, PAGE_SIZE } from "../repositories/ticketRepository.js";
import { statusPill, kindPill, unreadPill } from "../components/ticketParts.js";
import { navigate } from "../router.js";

const NARROW = window.matchMedia("(max-width: 1024px)");

export function myTicketsView(container) {
  let status = "open";
  let page = 0;
  const list = h("div");
  const statusSelect = h("select", {
    id: "my-status",
    onchange: () => { status = statusSelect.value; page = 0; load(); },
  }, options([
    { value: "open", label: "完了以外" },
    { value: "received", label: "受付" },
    { value: "in_progress", label: "対応中" },
    { value: "done", label: "完了" },
    { value: "all", label: "すべて" },
  ], status));

  container.append(
    h("div", { class: "page-head" },
      h("h1", {}, "自分の投稿"),
      h("a", { class: "btn btn-primary", href: "#/new" }, "質問・要望を送る")),
    h("div", { class: "filters" }, h("div", { class: "field" }, h("label", { for: "my-status" }, "ステータス"), statusSelect)),
    list,
  );

  const onResize = () => load();
  NARROW.addEventListener("change", onResize);
  load();

  async function load() {
    render(list, loading());
    try {
      const { rows, count } = await ticketRepository.listMine(state.me.id, { status, page });
      if (rows.length === 0) {
        render(list, h("p", { class: "empty" }, "該当する投稿はありません。"));
        return;
      }
      render(list, NARROW.matches ? cards(rows) : table(rows), pager(count));
    } catch (err) {
      render(list, errorBox(err.message));
    }
  }

  function table(rows) {
    return h("div", { class: "table-wrap" },
      h("table", {},
        h("thead", {}, h("tr", {}, ["受付番号", "件名", "種別", "ステータス", "最終更新", ""].map((t) => h("th", {}, t)))),
        h("tbody", {}, rows.map((t) =>
          h("tr", { class: "clickable", tabindex: "0", onclick: () => navigate(`/my/${t.id}`), onkeydown: (e) => { if (e.key === "Enter") navigate(`/my/${t.id}`); } },
            h("td", { class: "mono nowrap" }, t.ticket_no),
            h("td", {}, h("a", { href: `#/my/${t.id}` }, t.title)),
            h("td", {}, kindPill(t.kind)),
            h("td", {}, statusPill(t)),
            h("td", { class: "nowrap" }, formatDateTime(t.updated_at)),
            h("td", {}, unreadPill(state.unread.has(t.id))),
          ))),
      ),
    );
  }

  function cards(rows) {
    return h("div", { class: "cards" }, rows.map((t) =>
      h("a", { class: "ticket-card", href: `#/my/${t.id}` },
        h("div", { class: "meta" }, h("span", { class: "mono" }, t.ticket_no), statusPill(t), unreadPill(state.unread.has(t.id))),
        h("div", { class: "title" }, t.title),
        h("div", { class: "meta" }, kindPill(t.kind), h("span", {}, `最終更新 ${formatDateTime(t.updated_at)}`)),
      )));
  }

  function pager(count) {
    const pages = Math.ceil(count / PAGE_SIZE);
    if (pages <= 1) return h("p", { class: "muted small" }, `${count} 件`);
    return h("div", { class: "pager" },
      h("button", { type: "button", class: "btn", disabled: page === 0, onclick: () => { page -= 1; load(); } }, "前へ"),
      h("span", {}, `${page + 1} / ${pages} ページ（${count} 件）`),
      h("button", { type: "button", class: "btn", disabled: page >= pages - 1, onclick: () => { page += 1; load(); } }, "次へ"),
    );
  }

  return () => NARROW.removeEventListener("change", onResize);
}
