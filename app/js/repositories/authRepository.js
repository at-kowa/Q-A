// ログイン・ログアウト・パスワード変更と、ログイン中の利用者情報の取得
import { db, unwrap, toAppError } from "../supabase.js";
import { employeeNoToEmail } from "../lib/format.js";

export const authRepository = {
  /** 今のログイン状態（なければ null） */
  async getSession() {
    const { data, error } = await db.auth.getSession();
    if (error) throw toAppError(error);
    return data.session;
  },

  async signIn(employeeNo, password) {
    const { error } = await db.auth.signInWithPassword({ email: employeeNoToEmail(employeeNo), password });
    if (error) throw toAppError(error);
  },

  async signOut() {
    await db.auth.signOut();
  },

  async changePassword(newPassword) {
    const { error } = await db.auth.updateUser({ password: newPassword });
    if (error) {
      if (/different from the old/i.test(error.message)) throw new Error("今と同じパスワードには変更できません。");
      if (/at least|weak|short/i.test(error.message)) throw new Error("パスワードが短すぎるか、簡単すぎます。");
      throw toAppError(error);
    }
    unwrap(await db.rpc("qbox_password_changed"));
  },

  /** ログイン中の利用者の qbox_users の行（登録されていなければ null） */
  async getMe() {
    const session = await this.getSession();
    if (!session) return null;
    return unwrap(
      await db
        .from("qbox_users")
        .select("id, employee_no, name, department, site_id, role, is_active, must_change_password")
        .eq("auth_user_id", session.user.id)
        .maybeSingle(),
    );
  },

  async touchLogin() {
    unwrap(await db.rpc("qbox_touch_login"));
  },

  /** ログイン状態が変わったとき（期限切れ・別タブでのログアウトなど）に呼ばれる */
  onChange(callback) {
    db.auth.onAuthStateChange((event) => callback(event));
  },
};
