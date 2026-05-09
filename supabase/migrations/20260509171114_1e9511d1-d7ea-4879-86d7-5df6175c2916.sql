
-- Roles enum + table (separate from profiles for security)
CREATE TYPE public.app_role AS ENUM ('student', 'company', 'admin');
CREATE TYPE public.job_type AS ENUM ('job', 'internship');
CREATE TYPE public.work_mode AS ENUM ('remote', 'hybrid', 'onsite');
CREATE TYPE public.experience_level AS ENUM ('entry', 'mid', 'senior', 'lead');
CREATE TYPE public.application_status AS ENUM ('applied', 'shortlisted', 'interview', 'rejected', 'selected');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  headline TEXT,
  bio TEXT,
  location TEXT,
  skills TEXT[] DEFAULT '{}',
  education JSONB DEFAULT '[]'::jsonb,
  resume_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Companies
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  website TEXT,
  description TEXT,
  industry TEXT,
  size TEXT,
  location TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Jobs
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type public.job_type NOT NULL DEFAULT 'job',
  work_mode public.work_mode NOT NULL DEFAULT 'onsite',
  location TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  currency TEXT DEFAULT 'USD',
  description TEXT NOT NULL,
  requirements TEXT,
  skills TEXT[] DEFAULT '{}',
  experience_level public.experience_level NOT NULL DEFAULT 'entry',
  deadline DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX jobs_company_idx ON public.jobs(company_id);
CREATE INDEX jobs_active_idx ON public.jobs(is_active, created_at DESC);

-- Applications
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_url TEXT,
  cover_letter TEXT,
  status public.application_status NOT NULL DEFAULT 'applied',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, student_id)
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE INDEX applications_student_idx ON public.applications(student_id);
CREATE INDEX applications_job_idx ON public.applications(job_id);

-- Saved jobs
CREATE TABLE public.saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, job_id)
);
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER companies_touch BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER jobs_touch BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER applications_touch BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============

-- profiles: anyone can view, only owner can update
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- user_roles: users can view their own roles; admins can view all
CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_manage" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- companies: public read, owner write, admin verify
CREATE POLICY "companies_select_all" ON public.companies FOR SELECT USING (true);
CREATE POLICY "companies_insert_owner" ON public.companies FOR INSERT WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'company'));
CREATE POLICY "companies_update_owner" ON public.companies FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "companies_delete_owner" ON public.companies FOR DELETE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

-- jobs: public read active jobs; owner CRUD
CREATE POLICY "jobs_select_all" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "jobs_insert_owner" ON public.jobs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
);
CREATE POLICY "jobs_update_owner" ON public.jobs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "jobs_delete_owner" ON public.jobs FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- applications: student inserts/sees own; company sees apps to its jobs and updates status
CREATE POLICY "apps_student_insert" ON public.applications FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "apps_select_party" ON public.applications FOR SELECT USING (
  auth.uid() = student_id
  OR EXISTS (SELECT 1 FROM public.jobs j JOIN public.companies c ON c.id = j.company_id WHERE j.id = job_id AND c.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "apps_company_update" ON public.applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.jobs j JOIN public.companies c ON c.id = j.company_id WHERE j.id = job_id AND c.owner_id = auth.uid())
);
CREATE POLICY "apps_student_delete" ON public.applications FOR DELETE USING (auth.uid() = student_id);

-- saved jobs
CREATE POLICY "saved_select_own" ON public.saved_jobs FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "saved_insert_own" ON public.saved_jobs FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "saved_delete_own" ON public.saved_jobs FOR DELETE USING (auth.uid() = student_id);

-- ============ STORAGE ============
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true) ON CONFLICT DO NOTHING;

-- resumes: students upload to own folder; company can read resume that was attached to their applications (open via signed URL flow handled in code via select)
CREATE POLICY "resumes_owner_rw" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "resumes_company_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'resumes' AND EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    JOIN public.companies c ON c.id = j.company_id
    WHERE c.owner_id = auth.uid()
      AND a.resume_url LIKE '%' || storage.objects.name || '%'
  )
);

-- company logos: public read, owner write
CREATE POLICY "logos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'company-logos');
CREATE POLICY "logos_auth_write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "logos_auth_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'company-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "logos_auth_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'company-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
