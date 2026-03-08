-- Campus Connect Hub - Initial Consolidated Schema
-- Includes: Profiles, Colleges, Clubs, Events, Registrations, Attendance, and Certificates

-- 1. Enums
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('super_admin', 'college_admin', 'admin', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.event_reg_type AS ENUM ('individual', 'group');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Colleges table (BMSCE only)
CREATE TABLE IF NOT EXISTS public.colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed BMSCE
INSERT INTO public.colleges (name, slug, description, location)
VALUES (
  'BMS College of Engineering',
  'bmsce',
  'BMS College of Engineering (BMSCE) — A premier autonomous engineering institution in Bengaluru, affiliated to VTU.',
  'Bull Temple Rd, Basavanagudi, Bengaluru, Karnataka 560019'
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  location = EXCLUDED.location;

-- 3. Clubs table
CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed BMSCE Clubs
INSERT INTO public.clubs (name, category) VALUES
  ('National Service Scheme (NSS)', 'Social Clubs'),
  ('Leo Satva', 'Social Clubs'),
  ('BMSCE ISRC', 'Social Clubs'),
  ('Rotaract Club of BMSCE', 'Social Clubs'),
  ('Mountaineering Club of BMSCE (BMSCEMC)', 'Social Clubs'),
  ('Yoga Club', 'Social Clubs'),
  ('The Groovehouse – Western Music', 'Cultural Clubs'),
  ('Ninaad – Eastern Music', 'Cultural Clubs'),
  ('Paramvah – Eastern Dance Team', 'Cultural Clubs'),
  ('DanzAddix – Western Dance Team', 'Cultural Clubs'),
  ('Chiranthana Kannada Sangha', 'Cultural Clubs'),
  ('Samskruthi Sambhrama', 'Cultural Clubs'),
  ('Pravrutthi – Theatre Team', 'Cultural Clubs'),
  ('PANACHE – Fashion Team', 'Cultural Clubs'),
  ('Fine Arts Club', 'Cultural Clubs'),
  ('Falcons of BMSCE – Multimedia Team', 'Cultural Clubs'),
  ('Qcaine – BMSCE Quiz Club', 'Quiz Club'),
  ('RESPAWN – Gaming Club', 'Gaming Club'),
  ('BMSCE IEEE Student Branch SB', 'Professional Bodies'),
  ('BMSCE ACM Student Chapter', 'Professional Bodies'),
  ('Google Developer Groups on Campus – Web Development', 'Coding Clubs'),
  ('Teamcodelocked – Technical Club', 'Coding Clubs'),
  ('Augment AI – Artificial Intelligence Club', 'Coding Clubs'),
  ('Singularity – The Astronomical Society of BMSCE', 'Technical Clubs'),
  ('Upagraha – Design, Build and Launch a Student Satellite', 'Technical Clubs'),
  ('Bullz Racing – Formula Student Team', 'Technical Clubs'),
  ('Pentagram – Mathematical Society', 'Technical Clubs'),
  ('Aero BMSCE – Aeromodelling Club', 'Technical Clubs'),
  ('Rocketry – Rocket Club', 'Technical Clubs'),
  ('Robotics Club', 'Technical Clubs'),
  ('CorTechs – The Innovation & Technology Hub', 'Technical Clubs'),
  ('BIG Foundation', 'Business Related Clubs'),
  ('BMS MUNSoc – Model United Nations Society', 'Business Related Clubs'),
  ('Business Insights', 'Business Related Clubs'),
  ('IIC – Building Innovation and Entrepreneurship Ecosystem', 'Business Related Clubs'),
  ('Inksanity – Literary and Debating Society of BMSCE', 'Business Related Clubs')
ON CONFLICT (name) DO NOTHING;

-- 4. Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  account_type TEXT NOT NULL DEFAULT 'student',
  college_id UUID REFERENCES public.colleges(id),
  club_id UUID REFERENCES public.clubs(id),
  club_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_admin_per_club ON public.profiles (club_id) WHERE (role = 'admin');

-- 5. User Roles and Preferences
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
  UNIQUE(user_id, role, college_id)
);

-- 6. Event Related Tables
CREATE TABLE IF NOT EXISTS public.event_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT
);

INSERT INTO public.event_categories (name, icon, color) VALUES
  ('Technical', 'Cpu', 'blue'),
  ('Cultural', 'Music', 'purple'),
  ('Sports', 'Trophy', 'orange'),
  ('Workshop', 'BookOpen', 'green'),
  ('Seminar', 'Users', 'indigo'),
  ('Social', 'Heart', 'red'),
  ('Gaming', 'Gamepad2', 'pink')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE NOT NULL,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL CHECK (title <> ''),
  description TEXT,
  category_id UUID REFERENCES public.event_categories(id),
  location TEXT,
  venue TEXT,
  cover_image_url TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  max_participants INT,
  registration_fee DECIMAL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  event_type public.event_reg_type NOT NULL DEFAULT 'individual',
  team_size INT,
  activity_points INT DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT end_date_after_start_date CHECK (end_date > start_date),
  CONSTRAINT team_size_check CHECK (
    (event_type = 'individual' AND team_size IS NULL) OR
    (event_type = 'group' AND team_size >= 2)
  )
);

-- Registrations (Unified)
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_name TEXT,
  usn TEXT,
  college_email TEXT,
  registration_status TEXT DEFAULT 'pending' CHECK (registration_status IN ('pending', 'confirmed', 'rejected')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('free', 'pending', 'paid', 'failed')),
  payment_reference TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.registration_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  leader_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, leader_user_id)
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.registration_teams(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  usn text NOT NULL,
  college_email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Attendance Table
CREATE TABLE IF NOT EXISTS public.event_attendance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  registration_id uuid REFERENCES public.event_registrations(id) ON DELETE SET NULL,
  student_name text,
  usn text,
  college_email text,
  marked_by uuid NOT NULL,
  marked_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Certificate Templates Table
CREATE TABLE IF NOT EXISTS public.certificate_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  template_image_url text NOT NULL,
  name_x integer DEFAULT 50,
  name_y integer DEFAULT 50,
  name_font_size integer DEFAULT 36,
  name_font_color text DEFAULT '#000000',
  include_usn boolean DEFAULT false,
  usn_x integer DEFAULT 50,
  usn_y integer DEFAULT 90,
  include_email boolean DEFAULT false,
  email_x integer DEFAULT 50,
  email_y integer DEFAULT 130,
  include_points boolean DEFAULT false,
  points_x integer DEFAULT 50,
  points_y integer DEFAULT 85,
  field_font_size integer DEFAULT 24,
  field_font_color text DEFAULT '#333333',
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id)
);

-- Issued Certificates Table
CREATE TABLE IF NOT EXISTS public.issued_certificates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  student_name text,
  usn text,
  college_email text,
  certificate_url text,
  issued_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Google Sheets Export Integration
CREATE TABLE IF NOT EXISTS public.event_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  google_sheet_id TEXT NOT NULL,
  google_sheet_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id)
);

-- Admin Requests
CREATE TABLE IF NOT EXISTS public.admin_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  proof_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. Functions & Triggers
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role text)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = _role)
$$;

CREATE OR REPLACE FUNCTION public.archive_ended_events()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.events SET archived = true WHERE end_date < now() - interval '7 days' AND archived = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _college_id uuid;
BEGIN
  SELECT id INTO _college_id FROM public.colleges WHERE slug = 'bmsce';
  INSERT INTO public.profiles (user_id, full_name, role, account_type, college_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), 'student', 'student', _college_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.approve_admin_request(_request_id uuid, _approved boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _rec RECORD;
  _college_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO _rec FROM public.admin_requests WHERE id = _request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF _rec.status <> 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;
  
  IF _approved THEN
    SELECT id INTO _college_id FROM public.colleges WHERE slug = 'bmsce';
    
    UPDATE public.profiles 
    SET role = 'admin', 
        club_id = _rec.club_id, 
        account_type = 'admin',
        college_id = COALESCE(college_id, _college_id)
    WHERE user_id = _rec.user_id;
    
    INSERT INTO public.user_roles (user_id, role, college_id) 
    VALUES (_rec.user_id, 'college_admin', _college_id) 
    ON CONFLICT DO NOTHING;
    
    UPDATE public.admin_requests SET status = 'approved' WHERE id = _request_id;
  ELSE
    UPDATE public.admin_requests SET status = 'rejected' WHERE id = _request_id;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS set_event_exports_updated_at ON public.event_exports;
CREATE TRIGGER set_event_exports_updated_at
BEFORE UPDATE ON public.event_exports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 9. RLS Policies
-- ============================================================

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issued_certificates ENABLE ROW LEVEL SECURITY;

-- Basic Access
DROP POLICY IF EXISTS "Colleges are viewable by everyone" ON public.colleges;
CREATE POLICY "Colleges are viewable by everyone" ON public.colleges FOR SELECT USING (true);

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.event_categories;
CREATE POLICY "Categories are viewable by everyone" ON public.event_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Clubs are viewable by everyone" ON public.clubs;
CREATE POLICY "Clubs are viewable by everyone" ON public.clubs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());

-- Events (Filtered by lifecycle)
DROP POLICY IF EXISTS "General view published" ON public.events;
CREATE POLICY "General view published" ON public.events FOR SELECT USING (is_published = true AND archived = false AND end_date > now());

DROP POLICY IF EXISTS "Admin view own club" ON public.events;
CREATE POLICY "Admin view own club" ON public.events FOR SELECT TO authenticated USING (
  club_id IN (SELECT club_id FROM public.profiles WHERE user_id = auth.uid() AND (role = 'admin' OR account_type = 'admin') UNION SELECT club_id FROM public.admin_requests WHERE user_id = auth.uid() AND status = 'approved') 
  OR created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "Admins manage own club events" ON public.events;
CREATE POLICY "Admins manage own club events" ON public.events FOR ALL TO authenticated USING (
  club_id IN (SELECT p.club_id FROM public.profiles p WHERE p.user_id = auth.uid() AND (p.role = 'admin' OR p.account_type = 'admin') UNION SELECT r.club_id FROM public.admin_requests r WHERE r.user_id = auth.uid() AND r.status = 'approved') 
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Registrations & Teams
DROP POLICY IF EXISTS "Organizers view their event registrations" ON public.event_registrations;
CREATE POLICY "Organizers view their event registrations" ON public.event_registrations
FOR SELECT TO authenticated
USING (
  event_id IN (
    SELECT id FROM public.events 
    WHERE created_by = auth.uid() 
    OR club_id IN (
      SELECT club_id FROM public.profiles 
      WHERE user_id = auth.uid() AND (role = 'admin' OR account_type = 'admin')
    )
  )
);

DROP POLICY IF EXISTS "Organizers can update their event registrations" ON public.event_registrations;
CREATE POLICY "Organizers can update their event registrations" ON public.event_registrations
FOR UPDATE TO authenticated
USING (
  event_id IN (
    SELECT id FROM public.events 
    WHERE created_by = auth.uid() 
    OR club_id IN (
      SELECT club_id FROM public.profiles 
      WHERE user_id = auth.uid() AND (role = 'admin' OR account_type = 'admin')
    )
  )
);

DROP POLICY IF EXISTS "Leaders insert team members" ON public.team_members;
CREATE POLICY "Leaders insert team members" ON public.team_members FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.registration_teams t WHERE t.id = team_members.team_id AND t.leader_user_id = auth.uid()));

DROP POLICY IF EXISTS "Standard register" ON public.event_registrations;
CREATE POLICY "Standard register" ON public.event_registrations FOR ALL TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Self team lead" ON public.registration_teams;
CREATE POLICY "Self team lead" ON public.registration_teams FOR ALL USING (leader_user_id = auth.uid());

-- Attendance Policies
DROP POLICY IF EXISTS "Anyone can read attendance" ON public.event_attendance;
CREATE POLICY "Anyone can read attendance" ON public.event_attendance FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage attendance" ON public.event_attendance;
CREATE POLICY "Admins can manage attendance" ON public.event_attendance FOR ALL USING (
  event_id IN (
    SELECT id FROM public.events 
    WHERE created_by = auth.uid() 
    OR club_id IN (
      SELECT club_id FROM public.profiles 
      WHERE user_id = auth.uid() AND (role = 'admin' OR account_type = 'admin')
    )
  )
);

-- Certificate Templates Policies
DROP POLICY IF EXISTS "Anyone can read certificate templates" ON public.certificate_templates;
CREATE POLICY "Anyone can read certificate templates" ON public.certificate_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage certificate templates" ON public.certificate_templates;
CREATE POLICY "Admins can manage certificate templates" ON public.certificate_templates FOR ALL USING (
  event_id IN (
    SELECT id FROM public.events 
    WHERE created_by = auth.uid() 
    OR club_id IN (
      SELECT club_id FROM public.profiles 
      WHERE user_id = auth.uid() AND (role = 'admin' OR account_type = 'admin')
    )
  )
);

-- Issued Certificates Policies
DROP POLICY IF EXISTS "Users can read own certificates" ON public.issued_certificates;
CREATE POLICY "Users can read own certificates" ON public.issued_certificates FOR SELECT USING (user_id = auth.uid() OR 
  event_id IN (
    SELECT id FROM public.events 
    WHERE created_by = auth.uid() 
    OR club_id IN (
      SELECT club_id FROM public.profiles 
      WHERE user_id = auth.uid() AND (role = 'admin' OR account_type = 'admin')
    )
  )
);

-- Export Policies
DROP POLICY IF EXISTS "Organizers can manage own exports" ON public.event_exports;
CREATE POLICY "Organizers can manage own exports" ON public.event_exports
FOR ALL TO authenticated
USING (
  organizer_id = auth.uid() OR
  event_id IN (SELECT id FROM public.events WHERE created_by = auth.uid())
);

-- Admin Requests Policies
DROP POLICY IF EXISTS "Super admin all" ON public.admin_requests;
CREATE POLICY "Super admin all" ON public.admin_requests FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users self requests" ON public.admin_requests;
CREATE POLICY "Users self requests" ON public.admin_requests FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert requests" ON public.admin_requests;
CREATE POLICY "Users insert requests" ON public.admin_requests FOR INSERT WITH CHECK (user_id = auth.uid());

-- 10. Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('admin-proofs', 'admin-proofs', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('event-covers', 'event-covers', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('certificate-templates', 'certificate-templates', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone view covers" ON storage.objects;
CREATE POLICY "Anyone view covers" ON storage.objects FOR SELECT USING (bucket_id = 'event-covers');

DROP POLICY IF EXISTS "Admins upload covers" ON storage.objects;
CREATE POLICY "Admins upload covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-covers');

DROP POLICY IF EXISTS "Authenticated upload proofs" ON storage.objects;
CREATE POLICY "Authenticated upload proofs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'admin-proofs');

DROP POLICY IF EXISTS "Super admin view proofs" ON storage.objects;
CREATE POLICY "Super admin view proofs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'admin-proofs');

DROP POLICY IF EXISTS "Anyone view certificate templates" ON storage.objects;
CREATE POLICY "Anyone view certificate templates" ON storage.objects FOR SELECT USING (bucket_id = 'certificate-templates');

DROP POLICY IF EXISTS "Admins upload certificate templates" ON storage.objects;
CREATE POLICY "Admins upload certificate templates" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'certificate-templates');
