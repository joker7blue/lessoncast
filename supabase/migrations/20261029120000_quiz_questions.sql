-- How many quiz questions end the video, as the teacher chose: none to five. Null for lessons from
-- before the choice, whose quiz follows their length.

alter table public.lessons add column quiz_questions int check (quiz_questions between 0 and 5);
