// 画面の一覧（URL と画面の対応）
import { addRoute } from "./router.js";
import { passwordView } from "./views/password.js";
import { homeView } from "./views/home.js";
import { newTicketView } from "./views/newTicket.js";
import { doneView } from "./views/done.js";
import { myTicketsView } from "./views/myTickets.js";
import { ticketDetailView } from "./views/ticketDetail.js";

export function registerRoutes() {
  addRoute("/password", passwordView, { title: "パスワード変更" });
  addRoute("/home", homeView, { title: "ホーム" });
  addRoute("/new", newTicketView, { title: "質問・要望を送る" });
  addRoute("/new/category/:categoryId", newTicketView, { title: "質問・要望を送る" });
  addRoute("/done/:id", doneView, { title: "送信しました" });
  addRoute("/my", myTicketsView, { title: "自分の投稿" });
  addRoute("/my/:id", ticketDetailView, { title: "投稿の詳細" });
}

/** 未読の投稿を読み直す（段階3で実装） */
export async function refreshUnread() {}
