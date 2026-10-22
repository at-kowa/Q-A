// S-09 FAQ詳細
import { h, render, loading, errorBox } from "../lib/dom.js";
import { formatDate } from "../lib/format.js";
import { isStaff, categoryName } from "../state.js";
import { faqRepository } from "../repositories/faqRepository.js";
import { kindPill } from "../components/ticketParts.js";

export async function faqDetailView(container, params) {
  render(container, loading());
  try {
    const faq = await faqRepository.get(Number(params.id));
    if (!faq) {
      render(container, errorBox("FAQ が見つからないか、公開が終了しています。"));
      return;
    }
    render(container,
      h("p", {}, h("a", { href: "#/faq" }, "← FAQ 一覧")),
      faqArticle(faq),
      h("section", { class: "card" },
        h("h2", {}, "解決しませんでしたか？"),
        h("p", { class: "muted" }, "同じカテゴリで質問を送れます。"),
        h("div", { class: "actions" },
          h("a", { class: "btn btn-primary", href: `#/new/category/${faq.category_id}` }, "この内容で質問する"),
          isStaff() ? h("a", { class: "btn", href: `#/faq-edit/${faq.id}` }, "この FAQ を編集する（情シス）") : null)),
    );
  } catch (err) {
    render(container, errorBox(err.message));
  }
}

/** FAQ の本文（詳細画面と、公開前のプレビューで使う） */
export function faqArticle(faq) {
  return h("article", { class: "card" },
    h("div", { class: "row small muted", style: "margin-bottom:8px" },
      kindPill(faq.kind), h("span", {}, categoryName(faq.category_id)),
      faq.is_published && faq.published_at ? h("span", {}, `公開日 ${formatDate(faq.published_at)}`) : h("span", { class: "pill pill-received" }, "非公開")),
    h("h1", {}, faq.title),
    h("h2", {}, "質問"),
    h("div", { class: "body-text", style: "margin-bottom:16px" }, faq.question),
    h("h2", {}, "回答"),
    h("div", { class: "body-text" }, faq.answer),
  );
}
