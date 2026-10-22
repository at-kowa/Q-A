// URL の「#/〜」の部分で画面を切り替える。
// 例：#/home、#/my/12（12番の投稿の詳細）

const routes = [];
let currentCleanup = null;

/**
 * 画面を登録する。
 * path：「/my/:id」のように、: で始まる部分はパラメータとして view に渡す
 * roles：表示できる権限（省略時は登録済みの全員）
 */
export function addRoute(path, view, { roles = null, title = "" } = {}) {
  const keys = [];
  const pattern = new RegExp(
    "^" + path.replace(/:([a-zA-Z]+)/g, (_, key) => {
      keys.push(key);
      return "([^/]+)";
    }) + "$",
  );
  routes.push({ path, pattern, keys, view, roles, title });
}

export function currentPath() {
  return location.hash.replace(/^#/, "") || "/home";
}

export function navigate(path) {
  if (currentPath() === path) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    location.hash = path;
  }
}

/** 今の URL に合う画面を探す */
export function match(path) {
  for (const route of routes) {
    const m = route.pattern.exec(path);
    if (m) {
      const params = Object.fromEntries(route.keys.map((key, i) => [key, decodeURIComponent(m[i + 1])]));
      return { route, params };
    }
  }
  return null;
}

/** 前の画面の後片付け（自動更新のタイマー停止など）をしてから、次の画面を表示する */
export async function show(container, route, params, ctx) {
  if (typeof currentCleanup === "function") {
    try { currentCleanup(); } catch { /* 後片付けの失敗は無視する */ }
  }
  currentCleanup = null;
  container.replaceChildren();
  document.title = route.title ? `${route.title}｜情シス質問箱` : "情シス質問箱";
  const cleanup = await route.view(container, params, ctx);
  currentCleanup = cleanup ?? null;
}
