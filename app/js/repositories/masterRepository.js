// マスタ（拠点・場所・カテゴリ）・設定値・情シス担当の一覧の取得
import { db, unwrap } from "../supabase.js";

export const masterRepository = {
  async loadAll() {
    const [sites, locations, categories, settings, staff] = await Promise.all([
      db.from("qbox_sites").select("id, name, sort_order, is_active").order("sort_order"),
      db.from("qbox_locations").select("id, site_id, name, sort_order, is_active").order("sort_order"),
      db.from("qbox_categories").select("id, name, sort_order, is_active").order("sort_order"),
      db.from("qbox_settings").select("key, value"),
      db.from("qbox_users").select("id, name, role, is_active").in("role", ["staff", "admin"]).order("employee_no"),
    ]);
    return {
      sites: unwrap(sites),
      locations: unwrap(locations),
      categories: unwrap(categories),
      settings: Object.fromEntries(unwrap(settings).map((row) => [row.key, row.value])),
      staff: unwrap(staff),
    };
  },
};
