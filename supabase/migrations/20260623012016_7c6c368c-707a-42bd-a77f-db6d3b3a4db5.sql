ALTER TABLE public.school_configs ADD COLUMN IF NOT EXISTS settlement_account text;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS full_name text;
