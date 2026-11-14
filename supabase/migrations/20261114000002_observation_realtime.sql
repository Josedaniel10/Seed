BEGIN;
-- Changes are delivered only to authenticated subscribers allowed by the
-- existing observations SELECT policies. This does not grant new access.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime'
    AND schemaname='public' AND tablename='observations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.observations;
  END IF;
END $$;
COMMIT;
