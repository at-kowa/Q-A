-- パスワードを初期化したあとに実行する SQL（情シス質問箱 v0.4）
--
-- 【パスワード初期化の手順】
-- 1. supabase の管理画面「Authentication」→「Users」で、対象の利用者（<社員番号>@qbox.example.com）を削除する
--    （質問箱の投稿・コメントは消えない。qbox_users との結び付きだけが外れる）
-- 2. 「Add user」→「Create new user」で、同じメールアドレス・仮のパスワードでアカウントを作り直す
--    （「Auto Confirm User」にチェックを入れる）
-- 3. 下の '900001' を対象の社員番号に書き換えて、SQL Editor で実行する
-- 4. 仮のパスワードを本人に対面で伝える。次回ログイン時にパスワードの変更を求められる

update public.qbox_users u
set auth_user_id = a.id,
    must_change_password = true
from auth.users a
where u.employee_no = '900001'
  and lower(a.email) = lower(u.employee_no || '@qbox.example.com');

select employee_no, name, must_change_password, auth_user_id is not null as linked
from public.qbox_users
where employee_no = '900001';
