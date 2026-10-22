// S-10 受付一覧（情シス担当・管理者）。開いている間は一定間隔で新着を確認する
import { h, render, options, loading, errorBox } from "../lib/dom.js";
import { KIND_LABELS, URGENCY_LABELS, formatDateTime, elapsedDays } from "../lib/format.js";
import { state, setting, activeOnly, categoryName, siteName, staffName } from "../state.js";
import { ticketRepository, PAGE_SIZE } from "../repositories/ticketRepository.js";
import { statusPill, kindPill, urgencyPill, unreadPill } from "../components/ticketParts.js";
import { navigate } from "../router.js";

const TITLE = "受付一覧｜情シス質問箱";

export function staffListView(container, params, ctx) {
  const filters = state.staffFilters ?? { status: "open", assignee: "", kind: "", category: "", urgency: "", keyword: "" };
  let page = 0;
  let knownMaxId = null;
  const newIds = new Set();

  const list = h("div");
  const banner = h("div", { class: "new-arrivals", "aria-live": "polite" });
  const checkedAt = h("span", { class: "muted small" });

  const field = (id, label, control) => h("div", { class: "field" }, h("label", { for: id }, label), control);
  const select = (id, key, items) => h("select", {
    id, onchange: (e) => { filters[key] = e.target.value; page = 0; load(); },
  }, options(items, filters[key]));
  const keyword = h("input", { id: "staff-keyword", type: "search", value: filters.keyword, placeholder: "件名・内容・受付番号" });

  container.append(
    h("div", { class: "page-head" }, h("h1", {}, "受付一覧"), checkedAt),
    banner,
    h("form", {
      class: "filters",
      onsubmit: (e) => { e.preventDefault(); filters.keyword = keyword.value; page = 0; load(); },
    },
      field("staff-status", "ステータス", select("staff-status", "status", [
        { value: "open", label: "完了以外" }, { value: "received", label: "受付" }, { value: "in_progress", label: "対応中" },
        { value: "done", label: "完了" }, { value: "all", label: "すべて" }])),
      field("staff-assignee", "担当者", select("staff-assignee", "assignee", [
        { value: "", label: "すべて" }, { value: "me", label: "自分" }, { value: "none", label: "未割り当て" },
        ...state.masters.staff.filter((u) => u.is_active).map((u) => ({ value: String(u.id), label: u.name }))])),
      field("staff-kind", "種別", select("staff-kind", "kind", [
        { value: "", label: "すべて" }, ...Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }))])),
      field("staff-category", "カテゴリ", select("staff-category", "category", [
        { value: "", label: "すべて" }, ...activeOnly(state.masters.categories).map((c) => ({ value: String(c.id), label: c.name }))])),
      field("staff-urgency", "緊急度", select("staff-urgency", "urgency", [
        { value: "", label: "すべて" }, ...Object.entries(URGENCY_LABELS).map(([value, label]) => ({ value, label }))])),
      h("div", { class: "field" },
        h("label", { for: "staff-keyword" }, "キーワード"),
        h("div", { class: "search-row" }, keyword, h("button", { type: "submit", class: "btn" }, "検索"))),
    ),
    list,
  );

  load();
  const timer = setInterval(checkNew, setting("refresh_seconds", 60) * 1000);

  async function load() {
    if (!list.hasChildNodes()) render(list, loading());
    try {
      const query = { ...filters, assignee: filters.assignee === "me" ? state.me.id : filters.assignee };
      const { rows, count } = await ticketRepository.listAll(query, { page });
      if (knownMaxId === null) knownMaxId = await ticketRepository.latestId();
      checkedAt.textContent = `最終確認 ${new Date().toLocaleTimeString("ja-JP")}（${setting("refresh_seconds", 60)}秒ごとに自動で確認）`;
      render(list, rows.length ? [table(rows), pager(count)] : h("p", { class: "empty" }, "該当する投稿はありません。"));
    } catch (err) {
      render(list, errorBox(err.message));
    }
  }

  /** 一定間隔で、前回より新しい投稿が届いていないか確認する */
  async function checkNew() {
    if (knownMaxId === null) return;
    try {
      const rows = await ticketRepository.newerThan(knownMaxId);
      if (rows.length) {
        rows.forEach((r) => newIds.add(r.id));
        knownMaxId = Math.max(knownMaxId, ...rows.map((r) => r.id));
      }
      drawBanner();
      await load();
      ctx.refreshUnread();
    } catch {
      // 一時的な通信エラーは次の確認で回復させる
    }
  }

  function drawBanner() {
    document.title = newIds.size ? `(${newIds.size}) ${TITLE}` : TITLE;
    if (!newIds.size) {
      banner.replaceChildren();
      return;
    }
    render(banner,
      h("div", { class: "info-box row" },
        h("strong", {}, `新しい投稿が ${newIds.size} 件届きました。`),
        h("span", { class: "muted small" }, "一覧で「新着」の印が付いています。"),
        h("button", { type: "button", class: "btn btn-small", onclick: () => { newIds.clear(); drawBanner(); load(); } }, "確認済みにする")),
    );
  }

  function table(rows) {
    const open = (id) => navigate(`/staff/${id}`);
    return h("div", { class: "table-wrap" },
      h("table", {},
        h("thead", {}, h("tr", {}, ["受付番号", "件名", "種別", "カテゴリ", "拠点", "緊急度", "ステータス", "担当者", "投稿日時", "経過", ""].map((t) => h("th", {}, t)))),
        h("tbody", {}, rows.map((t) => {
          const classes = ["clickable"];
          if (t.urgency === "stopped" && t.status !== "done") classes.push("row-stopped");
          if (newIds.has(t.id)) classes.push("row-new");
          return h("tr", { class: classes.join(" "), tabindex: "0", onclick: () => open(t.id), onkeydown: (e) => { if (e.key === "Enter") open(t.id); } },
            h("td", { class: "mono nowrap" }, t.ticket_no),
            h("td", {}, newIds.has(t.id) ? h("span", { class: "pill pill-in_progress" }, "新着") : null, " ", h("a", { href: `#/staff/${t.id}` }, t.title)),
            h("td", {}, kindPill(t.kind)),
            h("td", {}, categoryName(t.category_id)),
            h("td", { class: "nowrap" }, siteName(t.site_id)),
            h("td", {}, urgencyPill(t.urgency)),
            h("td", {}, statusPill(t)),
            h("td", { class: "nowrap" }, staffName(t.assignee_id) || h("span", { class: "muted" }, "未割り当て")),
            h("td", { class: "nowrap" }, formatDateTime(t.created_at)),
            h("td", { class: "nowrap" }, t.status === "done" ? "－" : elapsedDays(t.created_at)),
            h("td", {}, unreadPill(state.unread.has(t.id))),
          );
        })),
      ),
    );
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

  return () => {
    clearInterval(timer);
    state.staffFilters = filters;
  };
}
