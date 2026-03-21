-- Migration 079: Enable RLS on app_config table
-- app_config is a global key-value store (no workspace_id), previously unrestricted.
-- Contains only app-wide settings (OMI semestre, upload date, record count).
-- Write access restricted to service_role only; all authenticated users can read.

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read app config"
  ON public.app_config FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "service role full access app_config"
  ON public.app_config FOR ALL
  USING (auth.role() = 'service_role');
