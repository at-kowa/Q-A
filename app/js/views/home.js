// S-03 ホーム（情シス担当には件数を出し、開いている間は自動で更新する）
import { h, render } from "../lib/dom.js";
import { state, isStaff, setting } from "../state.js";
import { ticketRepository } from "../repositories/ticketRepository.js";
import { navigate } from "../router.js";

export function homeView(container, params, ctx) {
  const myStats = h("div", { class: "stat-row" });
  const staffStats = h("div", { class: "stat-row" });
  const keyword = h("input", { id: "home-faq-keyword", type: "search", placeholder: "例：プリンタ　印刷できない" });

  container.append(
    h("div", { class: "home-grid" },
      h("section", { class: "card" },
        h("h1", {}, "困ったときは"),
        h("p", { class: "muted" }, "まず FAQ で同じ内容がないか探してみてください。"),
        h("form", {
          class: "search-row",
          onsubmit: (e) => { e.preventDefault(); state.faqKeyword = keyword.value.trim(); navigate("/faq"); },
        }, h("label", { for: "home-faq-keyword", class: "visually-hidden-input" }, "FAQ を検索"), keyword,
          h("button", { type: "submit", class: "btn" }, "FAQ を探す")),
        h("div", { style: "margin-top:16px" },
          h("a", { class: "btn btn-primary btn-hero", href: "#/new" }, "質問・要望を送る")),
      ),
      h("section", { class: "card" },
        h("h2", {}, "自分の投稿"),
        myStats,
        isStaff() ? [h("h2", { style: "margin-top:16px" }, "情シスの対応状況"), staffStats] : null,
      ),
    ),
  );

  const stat = (href, num, label, emphasis) =>
    h("a", { class: "stat", href }, h("span", { class: "num", style: emphasis && num ? "color:var(--danger)" : "" }, String(num)), h("span", { class: "label" }, label));

  async function load() {
    try {
      const tasks = [
        ticketRepository.count({ authorId: state.me.id, status: "open" }),
        ctx.refreshUnread(),
      ];
      if (isStaff()) {
        tasks.push(
          ticketRepository.count({ status: "received", assignee: "none" }),
          ticketRepository.count({ status: "open", assignee: state.me.id }),
        );
      }
      const [myOpen, , unassigned, mine] = await Promise.all(tasks);
      render(myStats,
        stat("#/my", myOpen, "対応待ち・対応中"),
        stat("#/unread", state.unread.size, "未読の回答・コメント", true),
      );
      if (isStaff()) {
        render(staffStats,
          stat("#/staff", unassigned, "未対応（担当者なし）", true),
          stat("#/staff", mine, "自分の担当"),
        );
      }
    } catch {
      // 件数が出せなくてもホームは使えるので、表示はそのままにする
    }
  }

  load();
  const timer = isStaff() ? setInterval(load, setting("refresh_seconds", 60) * 1000) : null;
  return () => { if (timer) clearInterval(timer); };
}
