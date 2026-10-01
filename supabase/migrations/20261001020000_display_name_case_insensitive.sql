-- Display names become searchable with the follow graph (MVP step 2), so "Alice" and
-- "alice" must not both exist: one could pass as the other in search results.
-- Uniqueness moves from the exact string to its lowercase form.

alter table public.profiles drop constraint profiles_display_name_key;

create unique index profiles_display_name_lower_key on public.profiles (lower(display_name));
