// コメントの入力欄（画像添付つき。情シス担当には「内部メモ」の切り替えも出す）
import { h, errorBox, toast } from "../lib/dom.js";
import { responseRepository } from "../repositories/responseRepository.js";
import { attachmentRepository } from "../repositories/attachmentRepository.js";
import { imagePicker } from "./images.js";

const BODY_MAX = 2000;

export function commentForm({ ticketId, allowInternal = false, heading = "コメントする", onSaved }) {
  const body = h("textarea", { id: `comment-body-${ticketId}`, maxlength: String(BODY_MAX), style: "min-height:110px" });
  const internal = allowInternal ? h("input", { id: `comment-internal-${ticketId}`, type: "checkbox" }) : null;
  const picker = imagePicker({ id: `comment-images-${ticketId}`, max: 3 });
  const pickerField = h("div", { class: "field" }, h("span", { class: "label" }, "画像（3枚まで）"), picker.el);
  const errorArea = h("div");
  const submit = h("button", { type: "submit", class: "btn btn-primary" }, "送信する");

  if (internal) {
    // 内部メモには画像を付けない（投稿者に見えないようにするため）
    internal.addEventListener("change", () => { pickerField.hidden = internal.checked; });
  }

  return h("form", {
    class: "card",
    onsubmit: async (e) => {
      e.preventDefault();
      errorArea.replaceChildren();
      const text = body.value.trim();
      if (!text) {
        errorArea.append(errorBox("コメントを入力してください。"));
        return;
      }
      submit.disabled = true;
      try {
        const isInternal = Boolean(internal?.checked);
        const commentId = await responseRepository.addComment(ticketId, text, { internal: isInternal });
        const files = isInternal ? [] : picker.files;
        if (files.length) {
          const { failed } = await attachmentRepository.uploadAll(ticketId, files, { commentId });
          if (failed) toast(`画像 ${failed} 枚を保存できませんでした。`, "error");
        }
        body.value = "";
        picker.clear();
        toast(isInternal ? "内部メモを登録しました。" : "コメントを送信しました。");
        await onSaved?.();
      } catch (err) {
        errorArea.append(errorBox(err.message));
      } finally {
        submit.disabled = false;
      }
    },
  },
    h("h2", {}, heading),
    errorArea,
    h("div", { class: "field" }, h("label", { for: body.id }, "内容"), body),
    internal ? h("div", { class: "field" }, h("label", { class: "check", for: internal.id }, internal, "情シス内部メモにする（投稿者には表示しない）")) : null,
    pickerField,
    h("div", { class: "actions" }, submit),
  );
}
