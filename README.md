# Q-A（情シス質問箱 v0.4・技術検証版）

supabase・GitHub・Vercel の構成で、Claude Code を使ってアプリを開発し、公開まで行えるかを確かめるための技術検証アプリです。題材は「情シスへの質問箱」です。

> 技術検証用です。投稿はテスト投稿のみとし、個人情報（パスワード・口座番号・マイナンバー等）、図面、取引先・顧客から預かった資料は入力・添付しないでください。
> 各部署（情報システム部）で維持・保守する前提です。

要件は [docs/要件定義書_v0.4.md](docs/要件定義書_v0.4.md)、準備と動作確認の手順は [docs/検証手順.md](docs/検証手順.md) にあります。

## できること

| 権限 | できること |
|---|---|
| 一般 | 質問・要望・不具合の投稿（画像3枚まで）、自分の投稿の確認・コメント・取り下げ、FAQ の検索・閲覧 |
| 情シス担当 | 一般の操作＋受付一覧（自動で新着を確認）、担当の割り当て、ステータス変更、回答、コメント・内部メモ、FAQ の公開・編集 |
| 管理者 | 情シス担当の操作＋FAQ の削除 |

利用者・拠点・場所・カテゴリの登録は、画面ではなく SQL で行います（`supabase/seed/`）。

## 構成

```
app/                       … 公開する画面（ビルド不要の静的ファイル）
├─ index.html
├─ css/app.css
├─ js/
│   ├─ main.js             … 入口（ログイン確認・ヘッダー・画面切り替え・自動ログアウト）
│   ├─ routes.js           … URL と画面の対応
│   ├─ views/              … 画面ごとの処理
│   ├─ components/         … 画面の部品
│   ├─ repositories/       … supabase を呼ぶ処理（DB の読み書きはここだけ）
│   └─ lib/                … 共通の小さな関数
├─ config.js               … 接続先（本人が作成。Git に含めない）
└─ config.example.js       … config.js の見本
supabase/
├─ migrations/             … DB の構成（番号順に SQL Editor で実行する）
├─ seed/                   … マスタ・テスト用利用者・テストデータ
└─ admin/                  … 運用で使う SQL（パスワード初期化のあと など）
scripts/
├─ serve.mjs               … 手元で画面を確認する簡易サーバ（npm 不要）
└─ write-config.mjs        … Vercel のビルドで環境変数から config.js を作る
docs/                      … 要件定義書・検証手順
```

- supabase はチームのテスト用プロジェクトに間借りしています。作るものはすべて `qbox_`（Storage は `qbox-attachments`）で始まり、他のテーブルやプロジェクト全体の設定には触れません。
- すべてのテーブルと Storage に RLS を設定しています。ログインしていない人や、`qbox_users` に登録されていない人は何も読めません。
- 画面では anon（公開用）キーだけを使います。

## 手元で動かす

```
node scripts/serve.mjs
```

Edge で http://localhost:5173 を開きます（止めるときは Ctrl + C）。
画面が複数のファイルに分かれているため、`index.html` をダブルクリックで開いても動きません。

## ログイン

社員番号とパスワードでログインします。内部では `<社員番号>@qbox.example.com` というメール形式に変換して supabase Auth にログインしています（このアドレスにメールは届きません）。

## パスワードの初期化

[supabase/admin/relink_after_reset.sql](supabase/admin/relink_after_reset.sql) の先頭に手順を書いています。

## 旧テストアプリについて

`supabase/migrations/20261021000000_create_qbox_questions.sql`（`qbox_questions` テーブル）は以前の簡易版のものです。v0.4 では使いません。
