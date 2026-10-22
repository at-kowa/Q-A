// S-08 公開FAQ一覧・検索（投稿者名は表示しない）
import { h, render, options, loading, errorBox } from "../lib/dom.js";
import { KIND_LABELS, formatDate } from "../lib/format.js";
import { state, isStaff, activeOnly, categoryName } from "../state.js";
import { faqRepository } from "../repositories/faqRepository.js";
import { kindPill } from "../components/ticketParts.js";

export function faqListView(container) {
  const filters = { keyword: state.faqKeyword ?? "", category: "", kind: "", includeUnpublished: false };
  state.faqKeyword = "";

  const list = h("div");
  const keyword = h("input", { id: "faq-keyword", type: "search", value: filters.keyword, placeholder: "例：パスワード　期限" });
  const category = h("select", { id: "faq-category" },
    options([{ value: "", label: "すべて" }, ...activeOnly(state.masters.categories).map((c) => ({ value: String(c.id), label: c.name }))], ""));
  const kind = h("select", { id: "faq-kind" },
    options([{ value: "", label: "すべて" }, ...Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }))], ""));
  const unpublished = isStaff() ? h("input", { id: "faq-unpublished", type: "checkbox" }) : null;

  const readFilters = () => {
    filters.keyword = keyword.value.trim();
    filters.category = category.value;
    filters.kind = kind.value;
    filters.includeUnpublished = Boolean(unpublished?.checked);
  };
  [category, kind, unpublished].forEach((el) => el?.addEventListener("change", () => { readFilters(); load(); }));

  container.append(
    h("div", { class: "page-head" }, h("h1", {}, "FAQ（よくある質問）")),
    h("form", {
      class: "filters",
      onsubmit: (e) => { e.preventDefault(); readFilters(); load(); },
    },
      h("div", { class: "field", style: "grid-column:span 2" },
        h("label", { for: "faq-keyword" }, "キーワード（件名・質問・回答から探す）"),
        h("div", { class: "search-row" }, keyword, h("button", { type: "submit", class: "btn btn-primary" }, "探す"))),
      h("div", { class: "field" }, h("label", { for: "faq-category" }, "カテゴリ"), category),
      h("div", { class: "field" }, h("label", { for: "faq-kind" }, "種別"), kind),
      unpublished ? h("div", { class: "field" }, h("span", { class: "label small muted" }, "情シス用"),
        h("label", { class: "check", for: "faq-unpublished" }, unpublished, "非公開も表示")) : null,
    ),
    list,
    h("div", { class: "card", style: "margin-top:16px" },
      h("p", {}, "探している内容が見つからないときは、質問を送ってください。"),
      h("a", { class: "btn btn-primary", href: "#/new" }, "質問・要望を送る")),
  );

  load();

  async function load() {
    render(list, loading());
    try {
      const rows = await faqRepository.search({
        keyword: filters.keyword,
        categoryId: filters.category ? Number(filters.category) : null,
        kind: filters.kind || null,
        includeUnpublished: filters.includeUnpublished,
      });
      if (rows.length === 0) {
        render(list, h("p", { class: "empty" }, filters.keyword ? `「${filters.keyword}」に当てはまる FAQ はありませんでした。` : "FAQ はまだありません。"));
        return;
      }
      render(list,
        h("p", { class: "muted small" }, `${rows.length} 件（新しい順）`),
        h("div", { class: "cards" }, rows.map((f) =>
          h("a", { class: "faq-item", href: `#/faq/${f.id}` },
            h("div", { class: "row small muted" },
              kindPill(f.kind), h("span", {}, categoryName(f.category_id)),
              f.is_published ? h("span", {}, `公開日 ${formatDate(f.published_at)}`) : h("span", { class: "pill pill-received" }, "非公開")),
            h("div", { class: "title" }, f.title),
            h("div", { class: "muted small" }, f.question.length > 80 ? `${f.question.slice(0, 80)}…` : f.question),
          ))),
      );
    } catch (err) {
      render(list, errorBox(err.message));
    }
  }
}
