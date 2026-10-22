-- 情シス質問箱 v0.4：テスト用の利用者の登録
--
-- 【先にやること】supabase の管理画面「Authentication」→「Users」→「Add user」→「Create new user」で、
-- 下の5人分のアカウントを作る（「Auto Confirm User」にチェックを入れる）。
--   メールアドレス：<社員番号>@qbox.example.com （例：900001@qbox.example.com）
--   パスワード    ：仮のパスワード（初回ログイン時に変更してもらう）
--
-- そのあとで、この SQL を SQL Editor で実行する。
-- Auth のアカウントがまだない社員番号は、auth_user_id が空のまま登録される
-- （あとでアカウントを作ってから、もう一度この SQL を実行すれば結び付く）。
--
-- 社員番号・氏名は架空のもの。実在の人を登録するときは、このファイルは書き換えずに
-- SQL Editor 上で値を変えて実行する（実在の社員番号・氏名を GitHub に載せないため）。

insert into public.qbox_users (employee_no, name, department, site_id, role)
select v.employee_no, v.name, v.department, s.id, v.role
from (values
  ('900001', 'テスト 一般1',   '製造1課', 'A工場',  'general'),
  ('900002', 'テスト 一般2',   '組立',    'B工場',  'general'),
  ('900101', 'テスト 情シス1', '情報システム部', 'C事業所', 'staff'),
  ('900102', 'テスト 情シス2', '情報システム部', 'C事業所', 'staff'),
  ('900201', 'テスト 管理者',  '情報システム部', 'C事業所', 'admin')
) as v(employee_no, name, department, site_name, role)
left join public.qbox_sites s on s.name = v.site_name
on conflict (employee_no) do nothing;

-- Auth のアカウントと結び付ける
update public.qbox_users u
set auth_user_id = a.id
from auth.users a
where u.auth_user_id is null
  and lower(a.email) = lower(u.employee_no || '@qbox.example.com');

-- 確認用：auth_user_id が入っていれば結び付いている
select employee_no, name, role, is_active, must_change_password, auth_user_id is not null as linked
from public.qbox_users
order by employee_no;
