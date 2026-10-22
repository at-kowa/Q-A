// supabase への接続。接続先は config.js（Git に含めない）から読む。
// supabase-js は index.html で CDN から読み込み、window.supabase に入っている。

const config = window.APP_CONFIG;

export const configError = !config?.SUPABASE_URL || !config?.SUPABASE_ANON_KEY || config.SUPABASE_URL.includes("xxxxxxxx")
  ? "接続先が設定されていません。app/config.example.js をコピーして app/config.js を作り、supabase の URL と anon キーを書いてください。"
  : null;

// ログイン情報の更新が同時に走らないようにする順番待ち。
// supabase-js の標準（ブラウザの navigator.locks）は、環境によってログイン状態の確認が終わらなくなることがあったため、
// このタブの中だけで順番に処理する方式にしている。
let lockChain = Promise.resolve();
function inTabLock(_name, _acquireTimeout, fn) {
  const run = lockChain.then(() => fn());
  lockChain = run.catch(() => {});
  return run;
}

export const db = configError
  ? null
  : window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "qbox-v04-auth", lock: inTabLock },
    });

/** supabase の結果からエラーを取り出して投げる（呼び出し側は try/catch で受ける） */
export function unwrap({ data, error }) {
  if (error) throw toAppError(error);
  return data;
}

/** 利用者に見せるエラーメッセージに変える */
export function toAppError(error) {
  const raw = error?.message ?? String(error);
  let message = raw;
  if (/Invalid login credentials/i.test(raw)) message = "社員番号またはパスワードが違います。";
  else if (/row-level security|permission denied/i.test(raw)) message = "この操作を行う権限がありません。";
  else if (/Failed to fetch|NetworkError/i.test(raw)) message = "サーバーに接続できませんでした。通信状態を確かめて、もう一度お試しください。";
  else if (/JWT expired|session/i.test(raw)) message = "ログインの有効期限が切れました。もう一度ログインしてください。";
  const appError = new Error(message);
  appError.cause = error;
  return appError;
}
