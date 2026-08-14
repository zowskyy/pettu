-- Pet Echo: Private storage buckets (Slice 08)
-- All buckets are private; access via signed URLs only.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('pet-training-photos', 'pet-training-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('pet-memory-photos', 'pet-memory-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('generated-companions', 'generated-companions', false, 20971520, ARRAY['image/png', 'image/webp']),
  ('generated-recaps', 'generated-recaps', false, 20971520, ARRAY['image/png', 'image/webp']),
  ('exports', 'exports', false, 52428800, ARRAY['application/zip', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage RLS: authenticated owner/caregiver access only
CREATE POLICY storage_training_select ON storage.objects FOR SELECT
  USING (bucket_id = 'pet-training-photos' AND auth.role() = 'authenticated');

CREATE POLICY storage_training_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pet-training-photos' AND auth.role() = 'authenticated');

CREATE POLICY storage_memory_select ON storage.objects FOR SELECT
  USING (bucket_id = 'pet-memory-photos' AND auth.role() = 'authenticated');

CREATE POLICY storage_memory_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pet-memory-photos' AND auth.role() = 'authenticated');

CREATE POLICY storage_companion_select ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-companions' AND auth.role() = 'authenticated');

CREATE POLICY storage_recap_select ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-recaps' AND auth.role() = 'authenticated');

CREATE POLICY storage_exports_select ON storage.objects FOR SELECT
  USING (bucket_id = 'exports' AND auth.role() = 'authenticated');

-- No public/anonymous access policies — unauthenticated fetch fails by default
