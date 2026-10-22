// S-12 FAQ公開編集（情シス担当・管理者）
// 元の投稿から、個人名や固有の情報を取り除いた公開用の文章を作って公開する。
import { h, render, options, loading, errorBox, toast } from "../lib/dom.js";
import { KIND_LABELS } from "../lib/format.js";
import { state, isAdmin, activeOnly } from "../state.js";
import { faqRepository } from "../repositories/faqRepository.js";
import { ticketRepository } from "../repositories/ticketRepository.js";
import { responseRepository } from "../repositories/responseRepository.js";
import { faqArticle } from "./faqDetail.js";
import { navigate } from "../router.js";

const LIMITS = { title: 100, question: 4000, answer: 4000 };

export async function faqEditView(container, params) {
  render(container, loading());
  let faq = null;
  let ticket = null;
  try {
    if (params.ticketId) {
      ticket = await ticketRepository.get(Number(params.ticketId));
      if (!ticket) throw new Error("元の投稿が見つかりません。");
      faq = await faqRepository.getBySourceTicket(ticket.id);
    } else {
      faq = await faqRepository.get(Number(params.id));
      if (!faq) throw new Error("FAQ が見つかりません。");
      if (faq.source_ticket_id) ticket = await ticketRepository.get(faq.source_ticket_id);
    }
  } catch (err) {
    render(container, errorBox(err.message));
    return;
  }

  // 新しく作るときは、元の投稿と最新の回答を下書きにする
  const draft = faq
    ? { ...faq }
    : {
        title: ticket.title,
        question: ticket.body,
        answer: (await responseRepository.listAnswers(ticket.id)).at(-1)?.body ?? "",
        category_id: ticket.category_id,
        kind: ticket.kind,
        is_published: false,
      };

  showForm();

  function showForm(errorMessage) {
    const title = h("input", { id: "faq-title", type: "text", value: draft.title, maxlength: String(LIMITS.title) });
    const question = h("textarea", { id: "faq-question", maxlength: String(LIMITS.question) });
    question.value = draft.question;
    const answer = h("textarea", { id: "faq-answer", maxlength: String(LIMITS.answer) });
    answer.value = draft.answer;
    const category = h("select", { id: "faq-category-edit" },
      options(activeOnly(state.masters.categories, draft.category_id).map((c) => ({ value: c.id, label: c.name })), draft.category_id));
    const kind = h("select", { id: "faq-kind-edit" },
      options(Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label })), draft.kind));

    const read = () => {
      draft.title = title.value.trim();
      draft.question = question.value.trim();
      draft.answer = answer.value.trim();
      draft.category_id = Number(category.value);
      draft.kind = kind.value;
    };
    const check = () => {
      read();
      const problems = [];
      if (!draft.title) problems.push("公開タイトルを入力してください。");
      if (!draft.question) problems.push("質問文を入力してください。");
      if (!draft.answer) problems.push("回答文を入力してください。");
      return problems;
    };

    render(container,
      h("p", {}, ticket ? h("a", { href: `#/staff/${ticket.id}` }, `← 元の投稿（${ticket.ticket_no}）`) : h("a", { href: `#/faq/${faq.id}` }, "← FAQ")),
      h("div", { class: "page-head" },
        h("h1", {}, faq ? "FAQ の編集" : "FAQ として公開"),
        faq ? h("span", { class: faq.is_published ? "pill pill-done" : "pill pill-received" }, faq.is_published ? "公開中" : "非公開") : null),
      ticket && !ticket.allow_publish
        ? h("p", { class: "notice" }, "投稿者は「FAQとして公開されても構わない」にチェックしていません。公開する場合は、投稿者が特定されない内容になっているか、特に注意してください。")
        : null,
      h("p", { class: "info-box" }, "公開すると、ログインした全員が読めます。個人名・社員番号・固有の機器番号などは消してください。投稿者の名前は表示されません。"),
      errorMessage ? errorBox(errorMessage) : null,
      h("form", { class: "card", onsubmit: (e) => e.preventDefault() },
        h("div", { class: "field" }, h("label", { for: "faq-title" }, "公開タイトル", h("span", { class: "req" }, "必須")), title),
        h("div", { class: "grid-2" },
          h("div", { class: "field" }, h("label", { for: "faq-category-edit" }, "カテゴリ"), category),
          h("div", { class: "field" }, h("label", { for: "faq-kind-edit" }, "種別"), kind)),
        h("div", { class: "field" }, h("label", { for: "faq-question" }, "質問文", h("span", { class: "req" }, "必須")), question),
        h("div", { class: "field" }, h("label", { for: "faq-answer" }, "回答文", h("span", { class: "req" }, "必須")), answer),
        h("div", { class: "actions" },
          h("button", {
            type: "button", class: "btn btn-primary",
            onclick: () => { const p = check(); if (p.length) showForm(p.join("\n")); else showPreview(); },
          }, "プレビューして公開する"),
          h("button", {
            type: "button", class: "btn",
            onclick: () => { const p = check(); if (p.length) showForm(p.join("\n")); else save(false); },
          }, faq?.is_published ? "非公開に戻して保存" : "非公開のまま保存"),
          faq && isAdmin() ? h("button", { type: "button", class: "btn btn-danger", onclick: () => confirmDelete() }, "削除する") : null,
        ),
      ),
    );
  }

  function showPreview() {
    render(container,
      h("div", { class: "page-head" }, h("h1", {}, "公開前の確認")),
      h("p", { class: "info-box" }, "利用者にはこのように表示されます。内容に問題がなければ「公開する」を押してください。"),
      h("div", { class: "preview" }, faqArticle({ ...draft, is_published: false })),
      h("div", { class: "actions", style: "margin-top:16px" },
        h("button", { type: "button", class: "btn btn-primary", onclick: () => save(true) }, "公開する"),
        h("button", { type: "button", class: "btn", onclick: () => showForm() }, "戻って直す")),
    );
    window.scrollTo(0, 0);
  }

  async function save(publish) {
    const values = {
      title: draft.title,
      question: draft.question,
      answer: draft.answer,
      category_id: draft.category_id,
      kind: draft.kind,
      is_published: publish,
    };
    try {
      faq = faq
        ? await faqRepository.update(faq.id, values)
        : await faqRepository.create({ ...values, source_ticket_id: ticket?.id ?? null });
      toast(publish ? "FAQ を公開しました。" : "FAQ を非公開で保存しました。");
      navigate(`/faq/${faq.id}`);
    } catch (err) {
      showForm(err.message);
    }
  }

  function confirmDelete() {
    render(container,
      h("div", { class: "card narrow" },
        h("h1", {}, "FAQ の削除"),
        h("p", { class: "notice" }, `「${faq.title}」を削除します。削除すると元に戻せません。非公開にするだけなら「非公開に戻して保存」を使ってください。`),
        h("div", { class: "actions" },
          h("button", {
            type: "button", class: "btn btn-danger",
            onclick: async () => {
              try {
                await faqRepository.remove(faq.id);
                toast("FAQ を削除しました。");
                navigate("/faq");
              } catch (err) {
                showForm(err.message);
              }
            },
          }, "削除する"),
          h("button", { type: "button", class: "btn", onclick: () => showForm() }, "やめる"))),
    );
  }
}
