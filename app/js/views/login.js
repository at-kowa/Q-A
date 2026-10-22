// S-01 ログイン
import { h, errorBox } from "../lib/dom.js";
import { authRepository } from "../repositories/authRepository.js";

export function loginView(container, { message, onLoggedIn }) {
  const employeeNo = h("input", {
    id: "login-employee-no", name: "employee_no", type: "text", inputmode: "numeric",
    autocomplete: "username", required: true, maxlength: "20",
  });
  const password = h("input", {
    id: "login-password", name: "password", type: "password", autocomplete: "current-password", required: true,
  });
  const errorArea = h("div");
  const submit = h("button", { type: "submit", class: "btn btn-primary btn-block" }, "ログイン");

  const form = h("form", {
    class: "card login-card",
    onsubmit: async (e) => {
      e.preventDefault();
      errorArea.replaceChildren();
      if (!/^[0-9A-Za-z]{1,20}$/.test(employeeNo.value.trim())) {
        errorArea.append(errorBox("社員番号は半角の英数字で入力してください。"));
        return;
      }
      submit.disabled = true;
      submit.textContent = "ログインしています…";
      try {
        await authRepository.signIn(employeeNo.value, password.value);
        await onLoggedIn();
      } catch (err) {
        errorArea.append(errorBox(err.message));
        submit.disabled = false;
        submit.textContent = "ログイン";
      }
    },
  },
    h("h1", { class: "login-title" }, "情シス質問箱"),
    h("p", { class: "muted" }, "社員番号とパスワードでログインしてください。"),
    message ? errorBox(message) : null,
    errorArea,
    h("div", { class: "field" }, h("label", { for: "login-employee-no" }, "社員番号"), employeeNo),
    h("div", { class: "field" }, h("label", { for: "login-password" }, "パスワード"), password),
    submit,
    h("p", { class: "muted small" }, "パスワードを忘れた場合は、情報システム部に初期化を依頼してください。"),
  );

  container.append(h("div", { class: "login-wrap" }, form));
  employeeNo.focus();
}
