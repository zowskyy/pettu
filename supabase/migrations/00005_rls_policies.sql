-- Pet Echo — Slice 06: RLS policies

-- profiles
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (id = auth.uid());

-- companions
CREATE POLICY companions_select ON public.companions FOR SELECT USING (public.can_access_companion(id));
CREATE POLICY companions_insert ON public.companions FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY companions_update ON public.companions FOR UPDATE USING (public.is_companion_owner(id));
CREATE POLICY companions_delete ON public.companions FOR DELETE USING (public.is_companion_owner(id));

-- companion_photos
CREATE POLICY companion_photos_select ON public.companion_photos FOR SELECT USING (public.can_access_companion(companion_id));
CREATE POLICY companion_photos_insert ON public.companion_photos FOR INSERT WITH CHECK (public.can_access_companion(companion_id));
CREATE POLICY companion_photos_delete ON public.companion_photos FOR DELETE USING (public.is_companion_owner(companion_id));

-- memories
CREATE POLICY memories_select ON public.memories FOR SELECT USING (public.can_access_companion(companion_id));
CREATE POLICY memories_insert ON public.memories FOR INSERT WITH CHECK (public.can_access_companion(companion_id) AND created_by = auth.uid());
CREATE POLICY memories_update ON public.memories FOR UPDATE USING (public.can_access_companion(companion_id));
CREATE POLICY memories_delete ON public.memories FOR DELETE USING (public.is_companion_owner(companion_id));

-- care_actions
CREATE POLICY care_actions_select ON public.care_actions FOR SELECT USING (public.can_access_companion(companion_id));
CREATE POLICY care_actions_insert ON public.care_actions FOR INSERT WITH CHECK (public.can_care_for_companion(companion_id) AND performed_by = auth.uid());

-- inventory_items
CREATE POLICY inventory_select ON public.inventory_items FOR SELECT USING (
  profile_id = auth.uid() OR (companion_id IS NOT NULL AND public.can_access_companion(companion_id))
);
CREATE POLICY inventory_insert ON public.inventory_items FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY inventory_update ON public.inventory_items FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY inventory_delete ON public.inventory_items FOR DELETE USING (profile_id = auth.uid());

-- companion_members
CREATE POLICY members_select ON public.companion_members FOR SELECT USING (
  public.is_companion_owner(companion_id) OR user_id = auth.uid()
);
CREATE POLICY members_insert ON public.companion_members FOR INSERT WITH CHECK (public.is_companion_owner(companion_id));
CREATE POLICY members_update ON public.companion_members FOR UPDATE USING (public.is_companion_owner(companion_id));
CREATE POLICY members_delete ON public.companion_members FOR DELETE USING (public.is_companion_owner(companion_id));

-- subscriptions
CREATE POLICY subscriptions_select ON public.subscriptions FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY subscriptions_insert ON public.subscriptions FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY subscriptions_update ON public.subscriptions FOR UPDATE USING (profile_id = auth.uid());

-- generation_jobs
CREATE POLICY generation_jobs_select ON public.generation_jobs FOR SELECT USING (public.can_access_companion(companion_id));
CREATE POLICY generation_jobs_insert ON public.generation_jobs FOR INSERT WITH CHECK (
  public.can_access_companion(companion_id) AND profile_id = auth.uid()
);

-- ai_generations
CREATE POLICY ai_generations_select ON public.ai_generations FOR SELECT USING (
  profile_id = auth.uid() OR (companion_id IS NOT NULL AND public.can_access_companion(companion_id))
);

-- entitlements
CREATE POLICY entitlements_select ON public.entitlements FOR SELECT USING (profile_id = auth.uid());

-- purchase_events
CREATE POLICY purchase_events_select ON public.purchase_events FOR SELECT USING (profile_id = auth.uid());

-- notification_preferences
CREATE POLICY notif_prefs_all ON public.notification_preferences FOR ALL USING (profile_id = auth.uid());

-- notification_delivery_log
CREATE POLICY notif_log_select ON public.notification_delivery_log FOR SELECT USING (profile_id = auth.uid());

-- recap_records
CREATE POLICY recap_select ON public.recap_records FOR SELECT USING (public.can_access_companion(companion_id));

-- audit_events
CREATE POLICY audit_select ON public.audit_events FOR SELECT USING (profile_id = auth.uid() OR actor_id = auth.uid());

-- idempotency_keys
CREATE POLICY idempotency_select ON public.idempotency_keys FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY idempotency_insert ON public.idempotency_keys FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY idempotency_update ON public.idempotency_keys FOR UPDATE USING (profile_id = auth.uid());
