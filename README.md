# Q-A（情シス質問箱・テストアプリ）

情シスへの質問箱のテストアプリです。社内システムについての質問を受け付け、回答を「よくある質問」として共有します。

> テストアプリのため、社内情報・個人情報は入力しないでください。テスト中は、共通の ID・パスワードでログインした全員が管理者として、質問・回答・公開・削除のすべてを行えます。

## ログイン

- 画面を開くと ID とパスワードの入力欄が出ます。テスト用の共通アカウント（1組）でログインします。
- ID とパスワードは supabase の管理画面で本人が作ります（下の「ログイン用アカウントを作る」）。**ID・パスワードは GitHub やチャットに書かないでください。**
- アカウントは「許可リスト」（`qbox_members` テーブル）に登録されたものだけが使えます。

## 画面

| タブ | できること |
|---|---|
| 質問する | カテゴリ・件名・質問内容を送信する（名前は入力しない） |
| よくある質問 | 公開された質問と回答を、キーワードやカテゴリで探す |
| 管理 | 届いた質問に回答を書く、状態（新着・対応中・回答済み）を変える、公開する、削除する |

## はじめての準備（1回だけ）

### 1. テーブルを作る

1. supabase の管理画面でプロジェクト「at-kowa」を開き、「SQL Editor」→「+ New query」を開きます。
2. `supabase/migrations/20261021000000_create_qbox_questions.sql` の中身を貼り付けて「Run」を押します。
3. 「Success. No rows returned」と出れば完了です。

2026-10-21 以降にはじめて準備する場合は、`supabase/migrations/` のファイルを**日付の古い順にすべて**実行してください。

### ログイン用アカウントを作る

1. SQL Editor で `supabase/migrations/20261021010000_restrict_qbox_to_members.sql` を実行します（ログインした許可済みアカウントだけが使えるようになります）。
2. 管理画面の「Authentication」→「Users」→「Add user」→「Create new user」で、次のように入力します。
   - Email：`<ID>@qbox.example.com`（`<ID>` は好きな英数字。画面ではこの `<ID>` の部分だけを入力します）
   - Password：任意（ご自身で控える）
   - 「Auto Confirm User」にチェック
3. SQL Editor で次を実行し、そのアカウントを許可リストに登録します（`<ID>` は 2 と同じもの）。

   ```sql
   insert into public.qbox_members (user_id, note)
   select id, '共通テストアカウント' from auth.users
   where email = '<ID>@qbox.example.com'
   on conflict (user_id) do nothing;
   ```

   「Success. 1 rows affected」と出れば完了です（0 rows の場合は ID の打ち間違いです）。

### 2. 接続先を書く

1. `app/config.example.js` をコピーして、同じフォルダに `app/config.js` を作ります。
2. supabase の管理画面の「Connect」ボタンなどから、**Project URL**（`https://〜.supabase.co` まで。`/rest/v1` は付けない）と **anon / publishable キー**を書き込みます。
   - `service_role` や `sb_secret_` のキーは絶対に書かないでください。

### 3. 画面を開く

`app/index.html` を Edge で開きます。

## Vercel で公開する（準備済み・未公開）

Vercel に取り込み、環境変数 `SUPABASE_URL` と `SUPABASE_ANON_KEY` を登録すると公開できます（ビルドで `config.js` を自動で作ります）。

> ログインした許可済みアカウントだけが読み書きできる設定になっています。公開する前に、ログインなしでは何も見えないこと・ID とパスワードが GitHub に書かれていないことを確認してください。
