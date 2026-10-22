// 画面の一覧（URL と画面の対応）
import { addRoute } from "./router.js";
import { state } from "./state.js";
import { responseRepository } from "./repositories/responseRepository.js";
import { passwordView } from "./views/password.js";
import { homeView } from "./views/home.js";
import { newTicketView } from "./views/newTicket.js";
import { doneView } from "./views/done.js";
import { myTicketsView } from "./views/myTickets.js";
import { ticketDetailView } from "./views/ticketDetail.js";
import { staffListView } from "./views/staffList.js";
import { staffDetailView } from "./views/staffDetail.js";
import { unreadView } from "./views/unread.js";
import { faqListView } from "./views/faqList.js";
import { faqDetailView } from "./views/faqDetail.js";
import { faqEditView } from "./views/faqEdit.js";

const STAFF = ["staff", "admin"];

export function registerRoutes() {
  addRoute("/password", passwordView, { title: "パスワード変更" });
  addRoute("/home", homeView, { title: "ホーム" });
  addRoute("/new", newTicketView, { title: "質問・要望を送る" });
  addRoute("/new/category/:categoryId", newTicketView, { title: "質問・要望を送る" });
  addRoute("/done/:id", doneView, { title: "送信しました" });
  addRoute("/my", myTicketsView, { title: "自分の投稿" });
  addRoute("/my/:id", ticketDetailView, { title: "投稿の詳細" });
  addRoute("/unread", unreadView, { title: "未読" });
  addRoute("/staff", staffListView, { roles: STAFF, title: "受付一覧" });
  addRoute("/staff/:id", staffDetailView, { roles: STAFF, title: "投稿の詳細（対応）" });
  addRoute("/faq", faqListView, { title: "FAQ" });
  addRoute("/faq/:id", faqDetailView, { title: "FAQ" });
  addRoute("/faq-edit/ticket/:ticketId", faqEditView, { roles: STAFF, title: "FAQ として公開" });
  addRoute("/faq-edit/:id", faqEditView, { roles: STAFF, title: "FAQ の編集" });
}

/** 未読の投稿を読み直して、ヘッダーのバッジに反映する */
export async function refreshUnread() {
  if (!state.me) return;
  const ids = await responseRepository.unreadTicketIds();
  state.unread = new Set(ids.map(Number));
  document.dispatchEvent(new CustomEvent("qbox:unread-changed"));
}
