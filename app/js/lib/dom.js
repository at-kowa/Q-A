// 画面部品を作るための小さな関数群。
// 文字列は必ず textContent で入れる（innerHTML を使わない）ので、入力値がそのまま HTML として動くことはない（XSS 対策）。

/**
 * 要素を作る。
 * h("button", { class: "btn", onclick: fn }, "保存")
 * 属性の値が false / null / undefined のものは付けない。
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === false || value === null || value === undefined) continue;
    if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2), value);
    } else if (key === "class") {
      el.className = value;
    } else if (key === "dataset") {
      Object.assign(el.dataset, value);
    } else if (key === "value" && "value" in el) {
      el.value = value;
    } else if (key === "checked" || key === "disabled" || key === "selected" || key === "multiple" || key === "required") {
      el[key] = Boolean(value);
    } else {
      el.setAttribute(key, value === true ? "" : String(value));
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** 要素の中身を入れ替える */
export function render(el, ...children) {
  el.replaceChildren();
  append(el, children);
}

/** <select> の選択肢を作る */
export function options(items, selectedValue, { placeholder } = {}) {
  const list = [];
  if (placeholder !== undefined) list.push(h("option", { value: "" }, placeholder));
  for (const item of items) {
    list.push(h("option", { value: item.value, selected: String(item.value) === String(selectedValue ?? "") }, item.label));
  }
  return list;
}

/** 画面上部に一時的なお知らせを出す */
export function toast(message, kind = "info") {
  const area = document.getElementById("toast");
  if (!area) return;
  const item = h("div", { class: `toast toast-${kind}`, role: kind === "error" ? "alert" : "status" }, message);
  area.append(item);
  setTimeout(() => item.remove(), kind === "error" ? 8000 : 4000);
}

/** 読み込み中の表示 */
export function loading(text = "読み込み中…") {
  return h("p", { class: "loading", role: "status" }, text);
}

/** エラーの表示 */
export function errorBox(message) {
  return h("div", { class: "error-box", role: "alert" }, message);
}
