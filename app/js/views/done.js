// S-05 投稿完了
import { h, errorBox } from "../lib/dom.js";
import { state } from "../state.js";
import { ticketRepository } from "../repositories/ticketRepository.js";

export async function doneView(container, params) {
  const ticket = await ticketRepository.get(Number(params.id));
  if (!ticket) {
    container.append(errorBox("投稿が見つかりません。"));
    return;
  }
  const failed = state.lastSubmit?.id === ticket.id ? state.lastSubmit.failed : 0;
  state.lastSubmit = null;

  container.append(
    h("section", { class: "card narrow" },
      h("h1", {}, "送信しました"),
      h("p", {}, "受付番号"),
      h("p", { class: "mono", style: "font-size:1.6rem;font-weight:700" }, ticket.ticket_no),
      h("p", {}, "件名：", ticket.title),
      failed ? errorBox(`画像 ${failed} 枚を保存できませんでした。投稿の詳細画面のコメントから、もう一度添付してください。`) : null,
      h("p", { class: "muted" }, "対応の状況や回答は「自分の投稿」で確認できます。"),
      h("div", { class: "actions" },
        h("a", { class: "btn btn-primary", href: `#/my/${ticket.id}` }, "この投稿を見る"),
        h("a", { class: "btn", href: "#/my" }, "自分の投稿一覧へ"),
        h("a", { class: "btn", href: "#/home" }, "ホームへ")),
    ),
  );
}
