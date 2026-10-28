-- Lessons: one row per textbook photo, read and written only by the server with the secret key.

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  language text not null check (language in ('fr', 'pcm')),
  status text not null default 'queued'
    check (status in ('queued', 'reading', 'drawing', 'voicing', 'highlighting', 'rendering', 'done', 'failed')),
  error text,
  script jsonb,
  scene_paths text[] not null default '{}',
  audio_path text,
  video_path text,
  words jsonb,
  metrics jsonb not null default '{}',
  ip_hash text,
  trigger_run_id text
);

-- RLS on and no policies: the anon and authenticated roles can neither read nor write a row.
alter table public.lessons enable row level security;

-- The rate limit counts recent lessons per IP.
create index lessons_ip_hash_created_at on public.lessons (ip_hash, created_at);

-- Scene images and step metrics arrive from tasks running in parallel. Each function changes one
-- array slot or one metrics key in place, so two writers never overwrite each other.
create or replace function public.set_scene_path(lesson_id uuid, n int, path text)
returns void language sql set search_path = '' as $$
  -- Assigning slot n of an empty array would make n its first index: start the array at 1 instead.
  update public.lessons set scene_paths = '{NULL}' where id = lesson_id and cardinality(scene_paths) = 0;
  update public.lessons set scene_paths[n] = path where id = lesson_id;
$$;

create or replace function public.record_metrics(lesson_id uuid, step text, m jsonb)
returns void language sql set search_path = '' as $$
  update public.lessons set metrics = metrics || jsonb_build_object(step, m) where id = lesson_id;
$$;

-- Functions in the public schema are callable through the API with the public key: keep them server-only.
revoke execute on function public.set_scene_path(uuid, int, text) from public, anon, authenticated;
revoke execute on function public.record_metrics(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.set_scene_path(uuid, int, text) to service_role;
grant execute on function public.record_metrics(uuid, text, jsonb) to service_role;

-- Public read: every path starts with the lesson's uuid, so the URLs can't be guessed.
insert into storage.buckets (id, name, public) values ('lessons', 'lessons', true) on conflict do nothing;
