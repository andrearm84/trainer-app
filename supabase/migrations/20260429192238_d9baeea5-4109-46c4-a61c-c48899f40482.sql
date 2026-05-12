-- Rimuovo le policy "lettura pubblica" troppo permissive
drop policy if exists "Public read exercise images" on storage.objects;
drop policy if exists "Public read exercise videos" on storage.objects;

-- Lettura permessa solo agli utenti autenticati e SOLO sulla propria cartella per il listing.
-- I file restano accessibili tramite URL pubblico (i bucket sono public=true, quindi lo storage
-- li serve direttamente senza passare per le policy).
create policy "Trainers list own exercise images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'exercise-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Trainers list own exercise videos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'exercise-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );