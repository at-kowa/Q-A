// S-04 新規投稿（入力 → 確認 → 送信）
import { h, render, options, errorBox, toast } from "../lib/dom.js";
import { KIND_LABELS, KIND_ICONS, URGENCY_LABELS, BODY_EXAMPLES, toLocalInputValue, formatDateTime } from "../lib/format.js";
import { state, activeOnly, siteName, locationName, categoryName } from "../state.js";
import { ticketRepository } from "../repositories/ticketRepository.js";
import { attachmentRepository } from "../repositories/attachmentRepository.js";
import { imagePicker } from "../components/images.js";
import { navigate } from "../router.js";

const TITLE_MAX = 40;
const BODY_MAX = 2000;

export function newTicketView(container, params) {
  const form = {
    kind: "question",
    category_id: params.categoryId ? Number(params.categoryId) : null,
    site_id: state.me.site_id ?? null,
    location_id: null,
    location_text: "",
    title: "",
    body: "",
    occurred_at: toLocalInputValue(),
    urgency: "low",
    allow_publish: false,
  };
  const picker = imagePicker({ id: "new-images", max: 3 });

  showInput();

  // ---------- 入力画面 ----------
  function showInput(errors = []) {
    const kindButtons = Object.keys(KIND_LABELS).map((kind) =>
      h("button", {
        type: "button", class: "choice", "aria-pressed": String(form.kind === kind),
        onclick: () => { form.kind = kind; readInputs(); showInput(); },
      }, h("span", { class: "icon", "aria-hidden": "true" }, KIND_ICONS[kind]), KIND_LABELS[kind]),
    );

    const category = h("select", { id: "new-category", required: true },
      options(activeOnly(state.masters.categories, form.category_id).map((c) => ({ value: c.id, label: c.name })), form.category_id, { placeholder: "選んでください" }));
    const site = h("select", {
      id: "new-site", required: true,
      onchange: () => { readInputs(); form.location_id = null; showInput(); },
    }, options(activeOnly(state.masters.sites, form.site_id).map((s) => ({ value: s.id, label: s.name })), form.site_id, { placeholder: "選んでください" }));
    const locationItems = activeOnly(state.masters.locations, form.location_id).filter((l) => l.site_id === form.site_id);
    const locationSelect = h("select", { id: "new-location" },
      options(locationItems.map((l) => ({ value: l.id, label: l.name })), form.location_id, { placeholder: "（選ばない）" }));
    const locationText = h("input", { id: "new-location-text", type: "text", maxlength: "50", placeholder: "一覧にない場合は入力（例：2階 休憩室）", value: form.location_text });

    const title = h("input", { id: "new-title", type: "text", required: true, value: form.title, maxlength: String(TITLE_MAX + 20) });
    const titleCounter = counter(title, TITLE_MAX);
    const body = h("textarea", { id: "new-body", required: true, placeholder: BODY_EXAMPLES[form.kind] }, form.body);
    body.value = form.body;
    const bodyCounter = counter(body, BODY_MAX);
    const occurred = h("input", { id: "new-occurred", type: "datetime-local", value: form.occurred_at });
    const urgency = h("select", { id: "new-urgency", required: true },
      options(Object.entries(URGENCY_LABELS).map(([value, label]) => ({ value, label })), form.urgency));
    const allowPublish = h("input", { id: "new-allow-publish", type: "checkbox", checked: form.allow_publish });

    function readInputs() {
      form.category_id = category.value ? Number(category.value) : null;
      form.site_id = site.value ? Number(site.value) : null;
      form.location_id = locationSelect.value ? Number(locationSelect.value) : null;
      form.location_text = locationText.value.trim();
      form.title = title.value.trim();
      form.body = body.value.trim();
      form.occurred_at = occurred.value;
      form.urgency = urgency.value;
      form.allow_publish = allowPublish.checked;
    }

    render(container,
      h("div", { class: "page-head" }, h("h1", {}, "質問・要望を送る")),
      h("p", { class: "notice" },
        "パスワード・口座番号・マイナンバーなどの個人情報や、図面・お客様からお預かりした資料は書かない・添付しないでください。"),
      h("p", { class: "info-box" }, "送る前に ", h("a", { href: "#/faq" }, "FAQ"), " で同じ内容がないか探してみてください。"),
      errors.length ? errorBox(errors.join("\n")) : null,
      h("form", {
        class: "card",
        novalidate: true,
        onsubmit: (e) => {
          e.preventDefault();
          readInputs();
          const problems = validate(form);
          if (problems.length) {
            showInput(problems);
            window.scrollTo(0, 0);
            return;
          }
          showConfirm();
        },
      },
        h("div", { class: "field" }, h("span", { class: "label" }, "種別", h("span", { class: "req" }, "必須")),
          h("div", { class: "choice-group", role: "group", "aria-label": "種別" }, kindButtons)),
        h("div", { class: "grid-2" },
          h("div", { class: "field" }, h("label", { for: "new-category" }, "カテゴリ", h("span", { class: "req" }, "必須")), category),
          h("div", { class: "field" }, h("label", { for: "new-urgency" }, "緊急度", h("span", { class: "req" }, "必須")), urgency),
        ),
        h("div", { class: "grid-2" },
          h("div", { class: "field" }, h("label", { for: "new-site" }, "工場・拠点", h("span", { class: "req" }, "必須")), site),
          h("div", { class: "field" }, h("label", { for: "new-location" }, "場所"), locationSelect, locationText),
        ),
        h("div", { class: "field" }, h("label", { for: "new-title" }, "件名", h("span", { class: "req" }, "必須")), title, titleCounter),
        h("div", { class: "field" },
          h("label", { for: "new-body" }, "内容", h("span", { class: "req" }, "必須")),
          h("p", { class: "hint" }, "いつから・どこで・何をしたら・どうなったか、を書くと早く対応できます。"),
          body, bodyCounter),
        h("div", { class: "field" },
          h("label", { for: "new-occurred" }, "発生日時", form.kind === "bug" ? h("span", { class: "req" }, "必須") : null),
          occurred),
        h("div", { class: "field" }, h("span", { class: "label" }, "画像（3枚まで）"), picker.el),
        h("div", { class: "field" },
          h("label", { class: "check", for: "new-allow-publish" }, allowPublish, "FAQとして公開されても構わない"),
          h("p", { class: "hint" }, "公開するときは、情シスが名前などを消してから公開します。最終的な判断は情シスが行います。")),
        h("div", { class: "actions" },
          h("button", { type: "submit", class: "btn btn-primary" }, "確認画面へ"),
          h("a", { href: "#/home", class: "btn" }, "やめる")),
      ),
    );
  }

  // ---------- 確認画面 ----------
  function showConfirm(errorMessage) {
    const files = picker.files;
    const submit = h("button", { type: "button", class: "btn btn-primary", onclick: send }, "この内容で送る");
    const back = h("button", { type: "button", class: "btn", onclick: () => showInput() }, "戻って直す");

    async function send() {
      submit.disabled = true;
      back.disabled = true;
      submit.textContent = "送信しています…";
      try {
        const created = await ticketRepository.create(form);
        let failed = 0;
        if (files.length) {
          submit.textContent = "画像を保存しています…";
          ({ failed } = await attachmentRepository.uploadAll(created.id, files));
        }
        state.lastSubmit = { id: created.id, failed };
        navigate(`/done/${created.id}`);
      } catch (err) {
        showConfirm(err.message);
      }
    }

    render(container,
      h("div", { class: "page-head" }, h("h1", {}, "送信内容の確認")),
      errorMessage ? errorBox(errorMessage) : null,
      h("div", { class: "card" },
        h("dl", { class: "confirm-list" },
          row("種別", KIND_LABELS[form.kind]),
          row("カテゴリ", categoryName(form.category_id)),
          row("緊急度", URGENCY_LABELS[form.urgency]),
          row("工場・拠点", siteName(form.site_id)),
          row("場所", [locationName(form.location_id), form.location_text].filter(Boolean).join("　") || "（なし）"),
          row("件名", form.title),
          row("内容", form.body),
          row("発生日時", form.occurred_at ? formatDateTime(form.occurred_at) : "（なし）"),
          row("画像", files.length ? `${files.length} 枚` : "（なし）"),
          row("FAQとしての公開", form.allow_publish ? "構わない" : "希望しない"),
        ),
        h("div", { class: "actions" }, submit, back),
      ),
    );
    window.scrollTo(0, 0);
  }
}

function row(label, value) {
  return [h("dt", {}, label), h("dd", {}, value)];
}

function counter(input, max) {
  const el = h("div", { class: "counter" });
  const update = () => {
    const length = input.value.length;
    el.textContent = `${length} / ${max} 文字`;
    el.classList.toggle("over", length > max);
  };
  input.addEventListener("input", update);
  update();
  return el;
}

function validate(form) {
  const problems = [];
  if (!form.category_id) problems.push("カテゴリを選んでください。");
  if (!form.site_id) problems.push("工場・拠点を選んでください。");
  if (!form.title) problems.push("件名を入力してください。");
  else if (form.title.length > TITLE_MAX) problems.push(`件名は${TITLE_MAX}文字以内にしてください。`);
  if (!form.body) problems.push("内容を入力してください。");
  else if (form.body.length > BODY_MAX) problems.push(`内容は${BODY_MAX}文字以内にしてください。`);
  if (form.kind === "bug" && !form.occurred_at) problems.push("不具合のときは発生日時を入力してください。");
  if (form.location_text.length > 50) problems.push("場所は50文字以内にしてください。");
  return problems;
}
