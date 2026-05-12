-- Aggiunge i campi agli esercizi
alter table public.exercises
  add column if not exists description text,
  add column if not exists video_url text,
  add column if not exists video_path text,
  add column if not exists image_path text;

-- Bucket immagini esercizi (pubblico)
insert into storage.buckets (id, name, public)
values ('exercise-images', 'exercise-images', true)
on conflict (id) do nothing;

-- Bucket video esercizi (pubblico)
insert into storage.buckets (id, name, public)
values ('exercise-videos', 'exercise-videos', true)
on conflict (id) do nothing;

-- Lettura pubblica (per mostrare nei player)
create policy "Public read exercise images"
  on storage.objects for select
  using (bucket_id = 'exercise-images');

create policy "Public read exercise videos"
  on storage.objects for select
  using (bucket_id = 'exercise-videos');

-- Trainer può uploadare solo nella propria cartella (id utente)
create policy "Trainers upload own exercise images"
  on storage.objects for insert
  with check (
    bucket_id = 'exercise-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Trainers update own exercise images"
  on storage.objects for update
  using (
    bucket_id = 'exercise-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Trainers delete own exercise images"
  on storage.objects for delete
  using (
    bucket_id = 'exercise-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Trainers upload own exercise videos"
  on storage.objects for insert
  with check (
    bucket_id = 'exercise-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Trainers update own exercise videos"
  on storage.objects for update
  using (
    bucket_id = 'exercise-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Trainers delete own exercise videos"
  on storage.objects for delete
  using (
    bucket_id = 'exercise-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );