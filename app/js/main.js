// アプリの入口：ログイン状態の確認、ヘッダー、画面の切り替え、自動ログアウト
import { h, render, errorBox, loading } from "./lib/dom.js";
import { configError } from "./supabase.js";
import { authRepository } from "./repositories/authRepository.js";
import { masterRepository } from "./repositories/masterRepository.js";
import { state, isStaff, setting } from "./state.js";
import { match, show, currentPath, navigate } from "./router.js";
import { registerRoutes, refreshUnread } from "./routes.js";
import { loginView } from "./views/login.js";

const header = document.getElementById("header");
const main = document.getElementById("main");

const ctx = { refreshUnread: () => refreshUnread().then(renderHeader) };

// ============================================================
// 起動
// ============================================================

async function boot() {
  if (configError) {
    render(main, errorBox(configError));
    return;
  }
  registerRoutes();
  window.addEventListener("hashchange", route);
  document.addEventListener("qbox:me-changed", renderHeader);
  document.addEventListener("qbox:unread-changed", renderHeader);
  authRepository.onChange((event) => {
    // 別のタブでログアウトした、ログインの期限が切れた、など
    if (event === "SIGNED_OUT" && state.me) {
      state.me = null;
      showLogin("ログアウトしました。");
    }
  });

  render(main, loading());
  try {
    if (await loadUser()) await route();
  } catch (err) {
    showLogin(err.message);
  }
}

/** ログイン中の利用者とマスタを読み込む。使えない状態ならログイン画面にする */
async function loadUser({ fromLogin = false } = {}) {
  const session = await authRepository.getSession();
  if (!session) {
    showLogin();
    return false;
  }
  const me = await authRepository.getMe();
  if (!me || !me.is_active) {
    state.me = null;
    await authRepository.signOut();
    showLogin(me
      ? "このアカウントは無効になっています。情報システム部に問い合わせてください。"
      : "この社員番号は質問箱に登録されていません。情報システム部に問い合わせてください。");
    return false;
  }
  state.me = me;
  state.masters = await masterRepository.loadAll();
  if (fromLogin) authRepository.touchLogin().catch(() => {});
  startIdleTimer();
  refreshUnread().then(renderHeader).catch(() => {});
  return true;
}

function showLogin(message) {
  stopIdleTimer();
  header.hidden = true;
  header.replaceChildren();
  render(main);
  document.title = "ログイン｜情シス質問箱";
  loginView(main, {
    message,
    onLoggedIn: async () => {
      if (!(await loadUser({ fromLogin: true }))) return;
      if (currentPath() === "/home") await route();
      else navigate("/home");
    },
  });
}

async function logout(message) {
  state.me = null;
  await authRepository.signOut();
  showLogin(message);
}

// ============================================================
// 画面の切り替え
// ============================================================

async function route() {
  if (!state.me) return;
  const path = currentPath();
  if (state.me.must_change_password && path !== "/password") {
    navigate("/password");
    return;
  }
  const found = match(path);
  if (!found) {
    navigate("/home");
    return;
  }
  header.hidden = false;
  renderHeader();
  if (found.route.roles && !found.route.roles.includes(state.me.role)) {
    render(main, errorBox("この画面を表示する権限がありません。"));
    return;
  }
  try {
    await show(main, found.route, found.params, ctx);
  } catch (err) {
    render(main, errorBox(err.message));
  }
  window.scrollTo(0, 0);
}

// ============================================================
// ヘッダー
// ============================================================

function renderHeader() {
  if (!state.me) return;
  const path = currentPath();
  const locked = state.me.must_change_password;
  const link = (href, label, prefix) =>
    h("a", { href: `#${href}`, class: path === href || (prefix && path.startsWith(prefix)) ? "nav-link active" : "nav-link" }, label);

  const unreadCount = state.unread.size;
  render(header,
    h("div", { class: "header-inner" },
      h("a", { class: "brand", href: "#/home" }, "情シス質問箱"),
      locked ? null : h("nav", { class: "nav", "aria-label": "メニュー" },
        link("/home", "ホーム"),
        link("/new", "質問・要望を送る"),
        link("/my", "自分の投稿", "/my/"),
        link("/faq", "FAQ", "/faq/"),
        isStaff() ? link("/staff", "受付一覧", "/staff/") : null,
      ),
      h("div", { class: "header-right" },
        locked ? null : h("a", {
          class: unreadCount ? "unread-link has-unread" : "unread-link",
          href: "#/unread",
          "aria-label": `未読 ${unreadCount}件`,
        }, "未読", h("span", { class: "badge" }, String(unreadCount))),
        h("details", { class: "user-menu" },
          h("summary", {}, state.me.name),
          h("div", { class: "user-menu-body" },
            h("p", { class: "muted small" }, `社員番号 ${state.me.employee_no}`),
            locked ? null : h("a", { href: "#/password" }, "パスワード変更"),
            h("button", { type: "button", class: "btn btn-small", onclick: () => logout("ログアウトしました。") }, "ログアウト"),
          ),
        ),
      ),
    ),
  );
}

// ============================================================
// 一定時間操作がなければ自動でログアウトする
// ============================================================

let lastActivity = Date.now();
let idleTimer = null;
const markActivity = () => { lastActivity = Date.now(); };
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"];

function startIdleTimer() {
  stopIdleTimer();
  lastActivity = Date.now();
  ACTIVITY_EVENTS.forEach((type) => window.addEventListener(type, markActivity, { passive: true }));
  idleTimer = setInterval(() => {
    const limitMs = setting("auto_logout_minutes", 60) * 60 * 1000;
    if (state.me && Date.now() - lastActivity > limitMs) {
      logout("一定時間操作がなかったため、ログアウトしました。");
    }
  }, 30 * 1000);
}

function stopIdleTimer() {
  if (idleTimer) clearInterval(idleTimer);
  idleTimer = null;
  ACTIVITY_EVENTS.forEach((type) => window.removeEventListener(type, markActivity));
}

boot();
