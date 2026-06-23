CREATE TYPE public.app_role AS ENUM ('admin', 'bursar');
CREATE TYPE public.application_status AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE public.fee_structure AS ENUM ('UNIFORM', 'SEGMENTED');
CREATE TYPE public.transaction_type AS ENUM ('REGISTRATION', 'TUITION');
CREATE TYPE public.transaction_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
CREATE TYPE public.print_job_status AS ENUM ('PENDING', 'PRINTED', 'FAILED');

CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.schools TO anon, authenticated;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read schools" ON public.schools FOR SELECT USING (true);

CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  segmented_registration_fee NUMERIC(12,2),
  segmented_tuition_fee NUMERIC(12,2),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.classes TO anon, authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read classes" ON public.classes FOR SELECT USING (true);

CREATE TABLE public.school_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL UNIQUE REFERENCES public.schools(id) ON DELETE CASCADE,
  fee_structure public.fee_structure NOT NULL DEFAULT 'UNIFORM',
  uniform_registration_fee NUMERIC(12,2) NOT NULL DEFAULT 25000,
  uniform_tuition_fee NUMERIC(12,2) NOT NULL DEFAULT 150000,
  currency TEXT NOT NULL DEFAULT 'XAF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.school_configs TO anon, authenticated;
GRANT ALL ON public.school_configs TO service_role;
ALTER TABLE public.school_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read school_configs" ON public.school_configs FOR SELECT USING (true);

CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  place_of_birth TEXT,
  parent_phone TEXT NOT NULL,
  matricule TEXT UNIQUE,
  application_status public.application_status NOT NULL DEFAULT 'PENDING_REVIEW',
  is_registered BOOLEAN NOT NULL DEFAULT false,
  tuition_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX students_parent_phone_idx ON public.students(parent_phone);
CREATE INDEX students_matricule_idx ON public.students(matricule);
GRANT SELECT, INSERT ON public.students TO anon;
GRANT SELECT, INSERT, UPDATE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Anyone can create students" ON public.students FOR INSERT WITH CHECK (true);

CREATE TABLE public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  type public.transaction_type NOT NULL,
  payment_method TEXT NOT NULL,
  payment_phone TEXT,
  status public.transaction_status NOT NULL DEFAULT 'SUCCESS',
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.financial_transactions TO anon, authenticated;
GRANT ALL ON public.financial_transactions TO service_role;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read transactions" ON public.financial_transactions FOR SELECT USING (true);
CREATE POLICY "Anyone can create transactions" ON public.financial_transactions FOR INSERT WITH CHECK (true);

CREATE TABLE public.print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
  status public.print_job_status NOT NULL DEFAULT 'PENDING',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.print_jobs TO anon, authenticated;
GRANT ALL ON public.print_jobs TO service_role;
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read print_jobs" ON public.print_jobs FOR SELECT USING (true);
CREATE POLICY "Anyone can create print_jobs" ON public.print_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update print_jobs" ON public.print_jobs FOR UPDATE USING (true);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER students_set_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.generate_matricule(_school_slug TEXT)
RETURNS TEXT LANGUAGE plpgsql SET search_path = public AS $$
DECLARE yr TEXT := to_char(now(), 'YY'); seq INT;
BEGIN
  SELECT COUNT(*) + 1 INTO seq FROM public.students
    WHERE matricule IS NOT NULL AND to_char(created_at, 'YY') = yr;
  RETURN upper(_school_slug) || '-' || yr || '-' || lpad(seq::TEXT, 4, '0');
END; $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.students;

INSERT INTO public.schools (id, name, slug)
VALUES ('11111111-1111-1111-1111-111111111111', 'Demo Academy', 'DEMO');

INSERT INTO public.school_configs (school_id, fee_structure, uniform_registration_fee, uniform_tuition_fee, currency)
VALUES ('11111111-1111-1111-1111-111111111111', 'UNIFORM', 25000, 150000, 'XAF');

INSERT INTO public.classes (school_id, name, sort_order, segmented_registration_fee, segmented_tuition_fee) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Form 1', 1, 25000, 120000),
  ('11111111-1111-1111-1111-111111111111', 'Form 2', 2, 25000, 130000),
  ('11111111-1111-1111-1111-111111111111', 'Form 3', 3, 25000, 140000),
  ('11111111-1111-1111-1111-111111111111', 'Form 4', 4, 30000, 160000),
  ('11111111-1111-1111-1111-111111111111', 'Lower Sixth', 5, 35000, 180000),
  ('11111111-1111-1111-1111-111111111111', 'Upper Sixth', 6, 35000, 200000);
