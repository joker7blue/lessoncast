-- A book can be renamed only from the device that uploaded it: it holds a key the server issued at
-- upload, and the server keeps only the key's SHA-256. Null for books from before, which can't be edited.

alter table public.books add column edit_key_hash text;
