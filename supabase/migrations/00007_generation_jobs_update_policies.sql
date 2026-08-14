-- Pet Echo — Slice 17: Allow owners to update generation jobs and record AI generations from client mock worker

CREATE POLICY generation_jobs_update ON public.generation_jobs
FOR UPDATE
USING (
  public.is_companion_owner(companion_id)
  AND profile_id = auth.uid()
);

CREATE POLICY ai_generations_insert ON public.ai_generations
FOR INSERT
WITH CHECK (profile_id = auth.uid());

CREATE POLICY ai_generations_update ON public.ai_generations
FOR UPDATE
USING (profile_id = auth.uid());
