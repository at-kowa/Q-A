# Q-A（情シスへの質問箱・テストアプリ）

GitHub: https://github.com/at-kowa/Q-A （ローカルのフォルダ名は qbox-test）

共通のルールは `~/.claude/CLAUDE.md` にある。ここにはこのアプリ固有のことだけを書く。

## 概要

- 社内システムについての質問を受け付け、回答を「よくある質問」として共有するテストアプリ。
- **テストアプリなので社内情報・個人情報は入れない。** 質問者の名前・部署は入力項目にしない。
- テスト中は権限を分けず、全員が管理者として振る舞う（質問・回答・状態変更・公開・削除のすべてができる）。
- ログインは全員共通の ID・パスワード1組。supabase Auth のアカウント（`<ID>@qbox.example.com`、実在しないドメイン）を本人が作り、許可リスト `qbox_members` に登録したものだけが使える。RLS は `qbox_is_member()` で判定し、anon には何も許可しない。
- ID・パスワードはコード・README・チャットに書かない。
- 将来、権限を分ける（送信と公開済みの閲覧だけ／管理者は全件）予定。そのときは RLS のポリシーを置き換える。

## 構成

- `app/index.html`：画面（質問する／よくある質問／管理 の3タブ）。1ファイルで、supabase-js を CDN から読み込む。
- `app/config.js`：接続先（本人が作成、Git に含めない）。見本は `app/config.example.js`。
- `supabase/migrations/`：テーブル定義。テーブル・関数・ポリシーはすべて `qbox_` で始める。
- `vercel.json`・`scripts/write-config.mjs`：Vercel 公開用（ビルド時に環境変数から config.js を作る）。

## supabase

- チームのテスト用プロジェクト（Organization: at-kowa / Project: at-kowa）に間借りする。`qbox_` 以外のテーブルや、プロジェクト全体の設定には触れない。
