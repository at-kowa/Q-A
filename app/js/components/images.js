// 画像の選択（最大枚数・プレビューつき）と、サムネイル・拡大表示
import { h, render, toast } from "../lib/dom.js";
import { MAX_SOURCE_BYTES } from "../lib/image.js";

/**
 * 画像を選ぶ部品。picker.files で選ばれたファイルの配列を返す。
 * iPad ではカメラでの撮影も選べる。
 */
export function imagePicker({ id, max = 3 }) {
  let files = [];
  const previews = h("div", { class: "thumbs" });
  const input = h("input", {
    id, type: "file", accept: "image/jpeg,image/png,image/*", multiple: true, class: "visually-hidden-input",
    onchange: () => {
      const picked = Array.from(input.files ?? []);
      input.value = "";
      for (const file of picked) {
        if (files.length >= max) {
          toast(`画像は${max}枚までです。`, "error");
          break;
        }
        if (!file.type.startsWith("image/")) {
          toast(`「${file.name}」は画像ではありません。`, "error");
          continue;
        }
        if (file.size > MAX_SOURCE_BYTES) {
          toast(`「${file.name}」は 10MB を超えています。`, "error");
          continue;
        }
        files.push(file);
      }
      draw();
    },
  });
  const button = h("label", { for: id, class: "btn" }, "画像を選ぶ・撮影する");
  const counter = h("span", { class: "muted small" });

  function draw() {
    render(previews, files.map((file, index) => {
      const url = URL.createObjectURL(file);
      const img = h("img", { class: "thumb", src: url, alt: file.name, onload: () => URL.revokeObjectURL(url) });
      return h("div", { class: "thumb-item" },
        img,
        h("button", {
          type: "button", class: "thumb-remove", "aria-label": `${file.name} を外す`,
          onclick: () => { files.splice(index, 1); draw(); },
        }, "×"),
      );
    }));
    counter.textContent = `${files.length} / ${max} 枚`;
    button.hidden = files.length >= max;
  }
  draw();

  const el = h("div", { class: "stack", style: "gap:8px" }, h("div", { class: "row" }, button, counter), input, previews);
  return {
    el,
    get files() { return [...files]; },
    clear() { files = []; draw(); },
  };
}

/** サムネイルを並べる。押すと拡大表示する */
export function thumbnails(attachments) {
  if (!attachments?.length) return null;
  return h("div", { class: "thumbs" },
    attachments.map((a) => a.url
      ? h("img", {
          class: "thumb", src: a.url, alt: a.file_name || "添付画像", loading: "lazy", tabindex: "0",
          onclick: () => openLightbox(a.url, a.file_name),
          onkeydown: (e) => { if (e.key === "Enter") openLightbox(a.url, a.file_name); },
        })
      : h("span", { class: "muted small" }, "（表示できない画像）")),
  );
}

export function openLightbox(url, alt) {
  const close = () => { box.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  const box = h("div", { class: "lightbox", role: "dialog", "aria-modal": "true", onclick: (e) => { if (e.target === box) close(); } },
    h("img", { src: url, alt: alt || "添付画像" }),
    h("button", { type: "button", class: "btn", onclick: close }, "閉じる"),
  );
  document.addEventListener("keydown", onKey);
  document.body.append(box);
  box.querySelector("button").focus();
}
