// S-03 ホーム
import { h } from "../lib/dom.js";
import { state } from "../state.js";

export function homeView(container) {
  container.append(
    h("section", { class: "card" },
      h("h1", {}, `${state.me.name} さん、こんにちは`),
      h("p", { class: "muted" }, "投稿・FAQ の機能は、このあと順に追加します。"),
    ),
  );
}
