// アプリ全体で共有する状態（ログイン中の利用者・マスタ・設定値）

export const state = {
  /** ログイン中の利用者（qbox_users の行） */
  me: null,
  /** マスタと設定値 */
  masters: { sites: [], locations: [], categories: [], settings: {}, staff: [] },
  /** 未読の投稿IDの集合 */
  unread: new Set(),
};

export function isStaff() {
  return state.me?.role === "staff" || state.me?.role === "admin";
}

export function isAdmin() {
  return state.me?.role === "admin";
}

export function setting(key, fallback) {
  const value = Number(state.masters.settings[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function siteName(id) {
  return state.masters.sites.find((s) => s.id === id)?.name ?? "";
}

export function locationName(id) {
  return state.masters.locations.find((l) => l.id === id)?.name ?? "";
}

export function categoryName(id) {
  return state.masters.categories.find((c) => c.id === id)?.name ?? "";
}

export function staffName(id) {
  if (!id) return "";
  if (id === state.me?.id) return state.me.name;
  return state.masters.staff.find((u) => u.id === id)?.name ?? "";
}

/** 有効なものだけ（選択肢用）。今選ばれている値は無効でも残す */
export function activeOnly(items, keepId) {
  return items.filter((item) => item.is_active || item.id === keepId);
}
