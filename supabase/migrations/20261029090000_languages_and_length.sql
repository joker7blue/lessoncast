-- Eight narration languages (each with an MMS-TTS voice), the video's length the teacher picks, and the
-- language a book is written in, which its videos are in by default.

alter table public.lessons drop constraint lessons_language_check;
alter table public.lessons add constraint lessons_language_check
  check (language in ('fr', 'en', 'pcm', 'hau', 'ful', 'yor', 'fon', 'swh'));

-- Null for lessons from before the choice, which last about three minutes.
alter table public.lessons add column target_seconds int check (target_seconds in (15, 30, 60, 120, 180));

alter table public.books add column language text check (language in ('fr', 'en', 'other'));
