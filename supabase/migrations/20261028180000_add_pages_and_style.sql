-- A lesson is made from one to four page photos, drawn in the style the teacher picks.
-- 'auto' lets Muse Spark choose; the style actually used is stored in the script.

alter table public.lessons
  add column page_count int not null default 1 check (page_count between 1 and 4),
  add column style text not null default 'auto'
    check (style in ('auto', 'illustrated', 'realistic', 'diagram', 'comic'));
