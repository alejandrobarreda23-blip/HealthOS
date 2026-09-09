-- Match the existing administrator read policy on parent sleep_sessions.
-- Owner access remains governed by own_sleep_stages; writes are unchanged.
create policy healthos_admin_read on public.sleep_stages for select to authenticated using ((select public.is_admin()));
