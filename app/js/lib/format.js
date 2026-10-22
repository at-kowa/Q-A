// 表示用の変換（日時・区分の日本語名など）

export const KIND_LABELS = { question: "質問", request: "要望", bug: "不具合" };
export const KIND_ICONS = { question: "？", request: "＋", bug: "！" };

export const URGENCY_LABELS = {
  stopped: "業務が止まっている",
  workaround: "困っているが回避できる",
  low: "急がない",
};

export const STATUS_LABELS = { received: "受付", in_progress: "対応中", done: "完了" };

export const CLOSE_REASON_LABELS = {
  answered: "回答済み",
  handled: "対応済み",
  declined: "見送り",
  withdrawn: "取り下げ",
};

export const ROLE_LABELS = { general: "一般", staff: "情シス担当", admin: "管理者" };

/** 種別ごとの「書き方の例」 */
export const BODY_EXAMPLES = {
  question: "例）共有フォルダにあるファイルを開くと「アクセス権がありません」と出ます。どこに申請すればよいですか？",
  request: "例）在庫管理システムの一覧画面に「保管場所」の列を追加してほしいです。棚卸しのときに毎回別の画面で確認しているためです。",
  bug: "例）今朝8時ごろから、事務所のプリンタで印刷すると白紙で出てきます。ほかのPCからも同じです。エラーの表示はありません。",
};

const dateTimeFormat = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
});
const dateFormat = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });

export function formatDateTime(value) {
  return value ? dateTimeFormat.format(new Date(value)) : "";
}

export function formatDate(value) {
  return value ? dateFormat.format(new Date(value)) : "";
}

/** 投稿からの経過日数 */
export function elapsedDays(from, to = new Date()) {
  if (!from) return "";
  const days = Math.floor((new Date(to) - new Date(from)) / 86400000);
  return days <= 0 ? "今日" : `${days}日`;
}

/** <input type="datetime-local"> 用の値（ローカル時刻） */
export function toLocalInputValue(date = new Date()) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** 社員番号から、ログインに使う内部用のメール形式を作る */
export function employeeNoToEmail(employeeNo) {
  return `${employeeNo.trim()}@qbox.example.com`;
}
