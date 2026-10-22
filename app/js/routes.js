// 画面の一覧（URL と画面の対応）
import { addRoute } from "./router.js";
import { passwordView } from "./views/password.js";
import { homeView } from "./views/home.js";

export function registerRoutes() {
  addRoute("/password", passwordView, { title: "パスワード変更" });
  addRoute("/home", homeView, { title: "ホーム" });
}

/** 未読の投稿を読み直す（段階3で実装） */
export async function refreshUnread() {}
