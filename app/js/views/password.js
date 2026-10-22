// S-02 パスワード変更（初回ログイン時と初期化後は必須）
import { h, errorBox, toast } from "../lib/dom.js";
import { authRepository } from "../repositories/authRepository.js";
import { state } from "../state.js";
import { navigate } from "../router.js";

const MIN_LENGTH = 8;

export function passwordView(container) {
  const required = state.me?.must_change_password;
  const newPassword = h("input", { id: "pw-new", type: "password", autocomplete: "new-password", required: true, minlength: String(MIN_LENGTH) });
  const confirm = h("input", { id: "pw-confirm", type: "password", autocomplete: "new-password", required: true });
  const errorArea = h("div");
  const submit = h("button", { type: "submit", class: "btn btn-primary" }, "変更する");

  const form = h("form", {
    class: "card narrow",
    onsubmit: async (e) => {
      e.preventDefault();
      errorArea.replaceChildren();
      if (newPassword.value.length < MIN_LENGTH) {
        errorArea.append(errorBox(`パスワードは${MIN_LENGTH}文字以上にしてください。`));
        return;
      }
      if (newPassword.value !== confirm.value) {
        errorArea.append(errorBox("確認用のパスワードが一致しません。"));
        return;
      }
      submit.disabled = true;
      try {
        await authRepository.changePassword(newPassword.value);
        state.me.must_change_password = false;
        toast("パスワードを変更しました。");
        document.dispatchEvent(new CustomEvent("qbox:me-changed"));
        navigate("/home");
      } catch (err) {
        errorArea.append(errorBox(err.message));
        submit.disabled = false;
      }
    },
  },
    h("h1", {}, "パスワード変更"),
    required
      ? h("p", { class: "notice" }, "初回ログイン、またはパスワードの初期化のあとです。続けるには、新しいパスワードを設定してください。")
      : null,
    errorArea,
    h("div", { class: "field" },
      h("label", { for: "pw-new" }, "新しいパスワード"),
      newPassword,
      h("p", { class: "hint" }, `${MIN_LENGTH}文字以上。ほかのサービスと同じものは使わないでください。`)),
    h("div", { class: "field" }, h("label", { for: "pw-confirm" }, "新しいパスワード（確認）"), confirm),
    h("div", { class: "actions" },
      submit,
      required ? null : h("a", { class: "btn", href: "#/home" }, "やめる")),
  );
  container.append(form);
  newPassword.focus();
}
