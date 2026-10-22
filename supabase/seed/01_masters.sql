-- 情シス質問箱 v0.4：マスタ（拠点・場所・カテゴリ）の登録
-- 段階1のマイグレーションを実行したあとに、SQL Editor で1回だけ実行する。
-- リポジトリが公開されているため、拠点名などは架空の名前にしている。
-- 実際の名前にしたい場合は、このファイルは書き換えずに SQL Editor 上で値を変えて実行する。

insert into public.qbox_sites (name, sort_order)
select v.name, v.sort_order
from (values ('A工場', 1), ('B工場', 2), ('C事業所', 3)) as v(name, sort_order)
where not exists (select 1 from public.qbox_sites s where s.name = v.name);

insert into public.qbox_locations (site_id, name, sort_order)
select s.id, v.name, v.sort_order
from (values
  ('A工場', '事務所', 1), ('A工場', '製造1課', 2), ('A工場', '製造2課', 3), ('A工場', '倉庫', 4),
  ('B工場', '事務所', 1), ('B工場', '組立ライン', 2), ('B工場', '検査室', 3),
  ('C事業所', '事務所', 1), ('C事業所', '会議室', 2)
) as v(site_name, name, sort_order)
join public.qbox_sites s on s.name = v.site_name
where not exists (
  select 1 from public.qbox_locations l where l.site_id = s.id and l.name = v.name
);

insert into public.qbox_categories (name, sort_order)
select v.name, v.sort_order
from (values
  ('PC・周辺機器', 1),
  ('業務システム', 2),
  ('アカウント・権限', 3),
  ('ルール・使い方・AI利用', 4),
  ('その他', 5)
) as v(name, sort_order)
where not exists (select 1 from public.qbox_categories c where c.name = v.name);
