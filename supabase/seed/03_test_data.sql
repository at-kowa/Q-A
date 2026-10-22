-- 情シス質問箱 v0.4：動作確認用のテストデータ（投稿・回答・コメント・FAQ）
-- 段階1〜4のマイグレーションと、01_masters.sql・02_users.sql を実行したあとに、SQL Editor で1回だけ実行する。
-- 内容はすべて架空のもの。2回実行すると同じ内容が二重に入るので注意する。

do $$
declare
  g1 bigint := (select id from public.qbox_users where employee_no = '900001');
  g2 bigint := (select id from public.qbox_users where employee_no = '900002');
  s1 bigint := (select id from public.qbox_users where employee_no = '900101');
  s2 bigint := (select id from public.qbox_users where employee_no = '900102');
  site_a bigint := (select id from public.qbox_sites where name = 'A工場');
  site_b bigint := (select id from public.qbox_sites where name = 'B工場');
  cat_pc  bigint := (select id from public.qbox_categories where name = 'PC・周辺機器');
  cat_sys bigint := (select id from public.qbox_categories where name = '業務システム');
  cat_acc bigint := (select id from public.qbox_categories where name = 'アカウント・権限');
  cat_rule bigint := (select id from public.qbox_categories where name = 'ルール・使い方・AI利用');
  t bigint;
begin
  if g1 is null or g2 is null or s1 is null or s2 is null then
    raise exception '先に 02_users.sql を実行して、テスト用の利用者を登録してください。';
  end if;

  -- 受付（担当者なし）
  insert into public.qbox_tickets (kind, category_id, site_id, title, body, occurred_at, urgency, allow_publish, author_id, status, created_at)
  values ('bug', cat_pc, site_a, '事務所のプリンタで白紙が出る', '今朝8時ごろから、事務所のプリンタで印刷すると白紙で出てきます。ほかのPCからも同じです。', now() - interval '3 hours', 'stopped', true, g1, 'received', now() - interval '2 hours');

  insert into public.qbox_tickets (kind, category_id, site_id, title, body, urgency, allow_publish, author_id, status, created_at)
  values ('question', cat_acc, site_a, '共有フォルダに入れない', '製造1課の共有フォルダを開くと「アクセス権がありません」と出ます。どこに申請すればよいですか？', 'workaround', true, g1, 'received', now() - interval '1 day');

  insert into public.qbox_tickets (kind, category_id, site_id, title, body, urgency, allow_publish, author_id, status, created_at)
  values ('request', cat_sys, site_b, '在庫一覧に保管場所の列がほしい', '棚卸しのときに毎回別の画面で保管場所を確認しています。一覧に列を追加してほしいです。', 'low', false, g2, 'received', now() - interval '3 days');

  -- 対応中
  insert into public.qbox_tickets (kind, category_id, site_id, title, body, occurred_at, urgency, allow_publish, author_id, assignee_id, status, status_changed_at, status_changed_by, created_at)
  values ('bug', cat_sys, site_b, '検査記録が保存できない', '検査記録の画面で保存を押すとエラーになります。昼から発生しています。', now() - interval '1 day', 'stopped', false, g2, s1, 'in_progress', now() - interval '20 hours', s1, now() - interval '1 day')
  returning id into t;
  insert into public.qbox_comments (ticket_id, author_id, body, created_at)
  values (t, s1, 'エラーの画面を写真で送っていただけますか？', now() - interval '19 hours');
  insert into public.qbox_comments (ticket_id, author_id, body, created_at)
  values (t, g2, '「保存先に接続できません」と表示されます。', now() - interval '18 hours');
  insert into public.qbox_comments (ticket_id, author_id, body, is_internal, created_at)
  values (t, s1, 'サーバ側のログを確認中。ベンダーに問い合わせ済み。', true, now() - interval '17 hours');

  insert into public.qbox_tickets (kind, category_id, site_id, title, body, urgency, allow_publish, author_id, assignee_id, status, status_changed_at, status_changed_by, created_at)
  values ('question', cat_rule, site_a, '生成AIに社内の資料を入れてよいか', '業務で生成AIを使いたいのですが、社内の資料を入力してよいか教えてください。', 'low', true, g1, s2, 'in_progress', now() - interval '2 days', s2, now() - interval '4 days');

  -- 完了（回答済み）
  insert into public.qbox_tickets (kind, category_id, site_id, title, body, urgency, allow_publish, author_id, assignee_id, status, close_reason, status_changed_at, status_changed_by, created_at, closed_at)
  values ('question', cat_acc, site_a, 'パスワードの有効期限が切れた', 'ログインしようとしたら「パスワードの有効期限が切れています」と出ました。', 'workaround', true, g1, s1, 'done', 'answered', now() - interval '5 days', s1, now() - interval '6 days', now() - interval '5 days')
  returning id into t;
  insert into public.qbox_answers (ticket_id, author_id, body, created_at)
  values (t, s1, 'ログイン画面の「パスワードを変更」から、新しいパスワードを設定してください。うまくいかない場合は情報システム部に連絡してください。', now() - interval '5 days');

  insert into public.qbox_tickets (kind, category_id, site_id, title, body, urgency, allow_publish, author_id, assignee_id, status, close_reason, status_changed_at, status_changed_by, created_at, closed_at)
  values ('request', cat_pc, site_b, 'マウスの電池がすぐ切れる', '無線マウスの電池が1週間ほどで切れます。有線に替えられますか？', 'low', true, g2, s2, 'done', 'handled', now() - interval '8 days', s2, now() - interval '10 days', now() - interval '8 days')
  returning id into t;
  insert into public.qbox_answers (ticket_id, author_id, body, created_at)
  values (t, s2, '有線マウスに交換しました。古いマウスは回収しています。', now() - interval '8 days');

  -- FAQ
  insert into public.qbox_faqs (title, question, answer, category_id, kind, is_published, created_by, created_at, updated_at) values
    ('パスワードの有効期限が切れたときは', 'ログイン時に「パスワードの有効期限が切れています」と表示された。', 'ログイン画面の「パスワードを変更」から新しいパスワードを設定してください。変更できない場合は情報システム部に連絡してください。', cat_acc, 'question', true, s1, now() - interval '5 days', now() - interval '5 days'),
    ('プリンタで白紙が出るときに確かめること', 'プリンタで印刷すると白紙で出てくる。', '1. トナーの残量を確認する　2. プリンタの電源を入れ直す　3. ほかのPCからも同じか確かめる。直らない場合は質問箱から連絡してください。', cat_pc, 'bug', true, s1, now() - interval '20 days', now() - interval '20 days'),
    ('共有フォルダのアクセス権の申請方法', '共有フォルダを開くと「アクセス権がありません」と表示される。', '所属長の承認を得たうえで、質問箱から「アカウント・権限」のカテゴリで申請してください。フォルダの場所（パス）を書いてください。', cat_acc, 'question', true, s2, now() - interval '15 days', now() - interval '15 days'),
    ('生成AIの業務利用について', '業務で生成AIを使ってよいか。', '会社が承認したサービスと会社のアカウントで利用してください。個人情報や取引先から預かった資料を入力する前に、社内ルールを確認してください。', cat_rule, 'question', true, s2, now() - interval '30 days', now() - interval '30 days'),
    ('PCの動作が遅いときは', 'PCの動作が遅く、アプリの起動に時間がかかる。', 'まず再起動してください。改善しない場合は、遅くなった時期と使っているアプリを書いて質問箱から連絡してください。', cat_pc, 'question', true, s1, now() - interval '40 days', now() - interval '40 days'),
    ('（下書き）在庫システムの画面追加の依頼方法', '業務システムの画面の変更を依頼したい。', '変更したい画面と理由を書いて、質問箱から「要望」で送ってください。', cat_sys, 'request', false, s1, now() - interval '1 day', now() - interval '1 day');
end;
$$;
