-- Migration 078: Enable RLS on previously unrestricted tables
-- Tables omi_api_cache, omi_quotations, match_computation_log had RLS disabled

-- match_computation_log: workspace-scoped (contains business data)
ALTER TABLE public.match_computation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read own logs"
  ON public.match_computation_log FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "workspace members can insert own logs"
  ON public.match_computation_log FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "service role full access match_computation_log"
  ON public.match_computation_log FOR ALL
  USING (auth.role() = 'service_role');

-- omi_api_cache: shared public data cache, readable by all authenticated users
ALTER TABLE public.omi_api_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read omi cache"
  ON public.omi_api_cache FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "service role full access omi_api_cache"
  ON public.omi_api_cache FOR ALL
  USING (auth.role() = 'service_role');

-- omi_quotations: shared public data, readable by all authenticated users
ALTER TABLE public.omi_quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read omi quotations"
  ON public.omi_quotations FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "service role full access omi_quotations"
  ON public.omi_quotations FOR ALL
  USING (auth.role() = 'service_role');
