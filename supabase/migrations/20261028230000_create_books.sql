-- Books: a textbook or ebook PDF that Muse Spark splits into lessons. A lesson's video is made only when
-- the teacher asks for it, as a lessons row linked to the book. Server only, like lessons.

create table public.books (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'uploading' check (status in ('uploading', 'reading', 'ready', 'failed')),
  error text,
  file_name text not null,
  file_bytes bigint not null check (file_bytes > 0),
  page_count int,
  title text,
  subject text,
  level text,
  -- [{ title, firstPage, lastPage, summary }], in page order; lesson n is index n - 1.
  lessons jsonb not null default '[]',
  -- [{ firstPage, lastPage, path }]: the 30-page PDFs Muse Spark read, kept to cut lessons from.
  slices jsonb not null default '[]',
  slices_read int not null default 0,
  metrics jsonb not null default '{}',
  ip_hash text,
  trigger_run_id text
);

alter table public.books enable row level security;

-- Slices are read 4 at a time: each one counts itself without overwriting the others.
create or replace function public.count_slice_read(book_id uuid)
returns void language sql set search_path = '' as $$
  update public.books set slices_read = slices_read + 1 where id = book_id;
$$;
revoke execute on function public.count_slice_read(uuid) from public, anon, authenticated;
grant execute on function public.count_slice_read(uuid) to service_role;

-- A lesson made from a book points to it, and to its lesson number there. Its pages come from the PDF,
-- so it can have more than the four pages a teacher photographs.
alter table public.lessons
  add column book_id uuid references public.books (id) on delete set null,
  add column book_lesson int check (book_lesson >= 1);
alter table public.lessons drop constraint lessons_page_count_check;
alter table public.lessons add constraint lessons_page_count_check
  check (page_count between 1 and 4 or (book_id is not null and page_count between 1 and 20));
create index lessons_book_id on public.lessons (book_id);
