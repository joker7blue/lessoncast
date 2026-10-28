-- The objects SAM 3.1 found in each scene live in <id>/highlights.json, out of the row the lesson page
-- polls: a mask outline weighs several kilobytes. Null until find-highlights has run.

alter table public.lessons add column highlights_path text;
