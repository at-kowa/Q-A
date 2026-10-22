// S-07 投稿詳細（投稿者用）
import { h, render, loading, errorBox, toast } from "../lib/dom.js";
import { state } from "../state.js";
import { ticketRepository } from "../repositories/ticketRepository.js";
import { attachmentRepository } from "../repositories/attachmentRepository.js";
import { ticketSummary } from "../components/ticketSummary.js";

export async function ticketDetailView(container, params, ctx) {
  const id = Number(params.id);
  render(container, loading());
  await load();

  async function load() {
    try {
      const [ticket, attachments] = await Promise.all([
        ticketRepository.get(id),
        attachmentRepository.listForTicket(id),
      ]);
      if (!ticket || ticket.author_id !== state.me.id) {
        render(container, errorBox("投稿が見つからないか、表示する権限がありません。"));
        return;
      }
      render(container,
        h("p", {}, h("a", { href: "#/my" }, "← 自分の投稿一覧")),
        ticketSummary(ticket, attachments),
        withdrawSection(ticket),
      );
    } catch (err) {
      render(container, errorBox(err.message));
    }
  }

  function withdrawSection(ticket) {
    if (ticket.status !== "received") return null;
    const confirmArea = h("div");
    const start = h("button", {
      type: "button", class: "btn btn-danger",
      onclick: () => {
        start.hidden = true;
        render(confirmArea,
          h("p", { class: "notice" }, "この投稿を取り下げます。取り下げると元に戻せません。よろしいですか？"),
          h("div", { class: "actions" },
            h("button", { type: "button", class: "btn btn-danger", onclick: withdraw }, "取り下げる"),
            h("button", { type: "button", class: "btn", onclick: () => { confirmArea.replaceChildren(); start.hidden = false; } }, "やめる")),
        );
      },
    }, "この投稿を取り下げる");

    async function withdraw() {
      try {
        await ticketRepository.withdraw(ticket.id);
        toast("投稿を取り下げました。");
        await load();
        ctx.refreshUnread();
      } catch (err) {
        render(confirmArea, errorBox(err.message));
      }
    }

    return h("section", { class: "card" },
      h("h2", {}, "取り下げ"),
      h("p", { class: "muted" }, "担当者が決まる前（受付の状態）なら、投稿を取り下げられます。"),
      start, confirmArea);
  }
}
