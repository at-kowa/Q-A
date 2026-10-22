# Q-A（情シス質問箱 v0.4・技術検証版）

GitHub: https://github.com/at-kowa/Q-A （ローカルのフォルダ名は qbox-test）

共通のルールは `~/.claude/CLAUDE.md` にある。ここにはこのアプリ固有のことだけを書く。

## 概要

- 目的は技術検証：supabase・GitHub・Vercel の構成で、Claude Code を使ってアプリを開発し、公開まで行えるか。業務での効果は検証しない。
- 要件は `docs/要件定義書_v0.4.md`。成功の判定は17章の受け入れ基準（`docs/検証手順.md` にチェック表）。
- **リポジトリは Public。** 実在の拠点名・社員番号・氏名・社内 URL をコードやテストデータに書かない（テストデータは架空のもの）。

## 構成

- `app/`：ビルド不要の静的ファイル。`index.html` から `js/main.js` を ES モジュールで読み込む。
  - `js/views/`（画面）、`js/components/`（部品）、`js/repositories/`（supabase を呼ぶ処理はここだけ）、`js/lib/`（共通関数）
  - 画面の文字は `textContent` で入れる（`innerHTML` は使わない）。部品は `js/lib/dom.js` の `h()` で作る。
- supabase-js は CDN（jsdelivr）から `@2.45.4` を固定で読み込む。認証の排他制御は `js/supabase.js` の `inTabLock` を使う（標準の navigator.locks ではログイン状態の確認が止まることがあったため）。
- `app/config.js`：接続先（本人が作成、Git に含めない）。Vercel ではビルド時に `scripts/write-config.mjs` が環境変数から作る。
- 手元の確認は `node scripts/serve.mjs`（http://localhost:5173）。

## supabase

- チームのテスト用プロジェクト（Organization: at-kowa / Project: at-kowa）に間借りする。`qbox_` 以外のテーブルや、プロジェクト全体の設定（Auth の設定を含む）には触れない。
- テーブル・関数・ポリシーはすべて `qbox_` で始める。Storage のバケットは `qbox-attachments`（非公開）。
- 権限の判定は DB 関数（`qbox_my_user_id` / `qbox_is_staff` / `qbox_is_admin` / `qbox_can_access_ticket`）で行う。画面の制御だけに頼らない。
- 投稿・コメント・回答の登録者や状態の変更ルールは、トリガーで DB 側でも強制している（一般の利用者は「受付」の自分の投稿の取り下げだけ）。
- マイグレーションは `supabase/migrations/20261022000100〜000400` の4本（番号順に適用）。`20261021000000_create_qbox_questions.sql` は旧テストアプリのもので v0.4 では使わない。
- ログインは `<社員番号>@qbox.example.com` に変換して supabase Auth を使う。利用者は `qbox_users`（`auth_user_id` で Auth と結び付け）。登録・権限変更は SQL Editor で行う。
