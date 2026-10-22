// S-11 投稿詳細（対応用：情シス担当・管理者）
import { h, render, options, loading, errorBox, toast } from "../lib/dom.js";
import { STATUS_LABELS, CLOSE_REASON_LABELS } from "../lib/format.js";
import { state } from "../state.js";
import { ticketRepository } from "../repositories/ticketRepository.js";
import { attachmentRepository } from "../repositories/attachmentRepository.js";
import { responseRepository } from "../repositories/responseRepository.js";
import { ticketSummary } from "../components/ticketSummary.js";
import { timeline } from "../components/timeline.js";
import { commentForm } from "../components/commentForm.js";

export async function staffDetailView(container, params, ctx) {
  const id = Number(params.id);
  render(container, loading());
  await load();

  async function load() {
    try {
      const [ticket, attachments, answers, comments] = await Promise.all([
        ticketRepository.get(id),
        attachmentRepository.listForTicket(id),
        responseRepository.listAnswers(id),
        responseRepository.listComments(id),
      ]);
      if (!ticket) {
        render(container, errorBox("投稿が見つかりません。"));
        return;
      }
      render(container,
        h("p", {}, h("a", { href: "#/staff" }, "← 受付一覧")),
        h("div", { class: "detail-grid" },
          h("div", { class: "stack" },
            ticketSummary(ticket, attachments, { showAuthor: true }),
            h("section", { class: "card" }, h("h2", {}, "回答・やり取り"), timeline({ answers, comments, attachments })),
            answerForm(ticket),
            commentForm({ ticketId: id, allowInternal: true, heading: "コメント・内部メモ", onSaved: load }),
          ),
          h("div", { class: "stack" },
            operationPanel(ticket),
            publishPanel(ticket),
          ),
        ),
      );
      await responseRepository.markRead(id);
      ctx.refreshUnread();
    } catch (err) {
      render(container, errorBox(err.message));
    }
  }

  // ---------- 担当者・ステータス・期限 ----------
  function operationPanel(ticket) {
    const staffItems = state.masters.staff
      .filter((u) => u.is_active || u.id === ticket.assignee_id)
      .map((u) => ({ value: String(u.id), label: u.name }));
    const assignee = h("select", { id: "op-assignee" }, options(staffItems, ticket.assignee_id, { placeholder: "（未割り当て）" }));
    const status = h("select", { id: "op-status" },
      options(Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })), ticket.status));
    const reason = h("select", { id: "op-reason" },
      options(Object.entries(CLOSE_REASON_LABELS).map(([value, label]) => ({ value, label })), ticket.close_reason, { placeholder: "選んでください" }));
    const reasonField = h("div", { class: "field" }, h("label", { for: "op-reason" }, "完了区分", h("span", { class: "req" }, "必須")), reason);
    const due = h("input", { id: "op-due", type: "date", value: ticket.due_date ?? "" });
    const errorArea = h("div");
    const save = h("button", { type: "submit", class: "btn btn-primary" }, "保存する");

    const syncReason = () => { reasonField.hidden = status.value !== "done"; };
    status.addEventListener("change", syncReason);
    syncReason();

    async function apply(changes, message) {
      errorArea.replaceChildren();
      save.disabled = true;
      try {
        await ticketRepository.update(ticket.id, changes);
        toast(message);
        await load();
      } catch (err) {
        errorArea.append(errorBox(err.message));
        save.disabled = false;
      }
    }

    return h("form", {
      class: "card",
      onsubmit: (e) => {
        e.preventDefault();
        if (status.value === "done" && !reason.value) {
          errorArea.replaceChildren(errorBox("「完了」にするときは完了区分を選んでください。"));
          return;
        }
        apply({
          assignee_id: assignee.value ? Number(assignee.value) : null,
          status: status.value,
          close_reason: status.value === "done" ? reason.value : null,
          due_date: due.value || null,
        }, "保存しました。");
      },
    },
      h("h2", {}, "対応"),
      errorArea,
      ticket.assignee_id !== state.me.id
        ? h("button", {
            type: "button", class: "btn btn-block", style: "margin-bottom:12px",
            onclick: () => apply({ assignee_id: state.me.id }, "自分を担当者にしました。"),
          }, "自分が担当する")
        : null,
      h("div", { class: "field" }, h("label", { for: "op-assignee" }, "担当者"), assignee,
        h("p", { class: "hint" }, "「受付」の投稿に担当者を決めると、自動で「対応中」になります。")),
      h("div", { class: "field" }, h("label", { for: "op-status" }, "ステータス"), status),
      reasonField,
      h("div", { class: "field" }, h("label", { for: "op-due" }, "対応期限（任意）"), due),
      save,
    );
  }

  // ---------- 回答 ----------
  function answerForm(ticket) {
    const body = h("textarea", { id: "answer-body", maxlength: "4000" });
    const area = h("div");
    const submit = h("button", { type: "submit", class: "btn btn-primary" }, "回答を登録する");

    const form = h("form", {
      class: "card",
      onsubmit: async (e) => {
        e.preventDefault();
        area.replaceChildren();
        const text = body.value.trim();
        if (!text) {
          area.append(errorBox("回答を入力してください。"));
          return;
        }
        submit.disabled = true;
        try {
          await responseRepository.addAnswer(ticket.id, text);
          body.value = "";
          if (ticket.status === "done") {
            toast("回答を登録しました。");
            await load();
            return;
          }
          // 回答を登録したら「完了」にするかを確認する
          render(area,
            h("div", { class: "info-box" },
              h("p", {}, "回答を登録しました。この投稿を「完了（回答済み）」にしますか？"),
              h("div", { class: "actions" },
                h("button", {
                  type: "button", class: "btn btn-primary",
                  onclick: async () => {
                    try {
                      await ticketRepository.update(ticket.id, {
                        status: "done", close_reason: "answered", assignee_id: ticket.assignee_id ?? state.me.id,
                      });
                      toast("「完了（回答済み）」にしました。");
                    } catch (err) {
                      toast(err.message, "error");
                    }
                    await load();
                  },
                }, "完了にする"),
                h("button", { type: "button", class: "btn", onclick: load }, "対応中のままにする"))),
          );
        } catch (err) {
          area.append(errorBox(err.message));
        } finally {
          submit.disabled = false;
        }
      },
    },
      h("h2", {}, "回答"),
      h("div", { class: "field" }, h("label", { for: "answer-body" }, "回答の内容（投稿者に表示されます）"), body),
      area,
      h("div", { class: "actions" }, submit),
    );
    return form;
  }

  // ---------- FAQ として公開（段階4で追加） ----------
  function publishPanel() {
    return null;
  }
}
