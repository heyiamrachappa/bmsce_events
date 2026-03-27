-- Campus Connect Hub - Initial Consolidated Schema
-- Includes: Profiles, Colleges, Clubs, Events, Registrations, Attendance, Certificates, Volunteering, and Club Transfers

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

DO $$ BEGIN
    CREATE TYPE public.transfer_status AS ENUM ('pending', 'completed', 'cancelled', 'expired');
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
  ('Code IO', 'Coding Clubs'),
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
  registrations_open BOOLEAN NOT NULL DEFAULT true,
  activity_points INT DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT false,
  attendance_token TEXT,
  attendance_token_expires_at TIMESTAMPTZ,
  attendance_session_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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
  department TEXT,
  semester TEXT,
  attendance_marked BOOLEAN NOT NULL DEFAULT false,
  scanned_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- 7. Activity Points Table
CREATE TABLE IF NOT EXISTS public.activity_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    points INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, event_id)
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
  department text,
  semester text,
  created_at timestamptz DEFAULT now()
);

-- Attendance Table
CREATE TABLE IF NOT EXISTS public.event_attendance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES public.event_registrations(id) ON DELETE SET NULL,
  student_name text,
  usn text,
  college_email text,
  marked_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id)
);

-- Issued Certificates Table
CREATE TABLE IF NOT EXISTS public.issued_certificates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name text,
  usn text,
  college_email text,
  certificate_url text,
  certificate_id TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  issued_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Event Volunteering Table
CREATE TABLE IF NOT EXISTS public.event_volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT,
  college_email TEXT,
  usn TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
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

-- Club Transfer Requests
CREATE TABLE IF NOT EXISTS public.club_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  current_admin_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  new_admin_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  status public.transfer_status DEFAULT 'pending' NOT NULL,
  admin_confirmed BOOLEAN DEFAULT false,
  new_admin_accepted BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Club Transfer History
CREATE TABLE IF NOT EXISTS public.club_transfer_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  old_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  new_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  transferred_at TIMESTAMPTZ DEFAULT now()
);

-- 8. RPC Function: verify_live_attendance
CREATE OR REPLACE FUNCTION public.verify_live_attendance(p_event_id UUID, p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event RECORD;
    v_registration RECORD;
    v_points INTEGER;
    v_profile RECORD;
BEGIN
    -- 1. Verify Event and Token
    SELECT * INTO v_event FROM public.events 
    WHERE id = p_event_id 
    AND attendance_session_active = true 
    AND attendance_token = p_token;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired QR code.');
    END IF;

    -- 2. Verify Registration
    SELECT * INTO v_registration FROM public.event_registrations
    WHERE event_id = p_event_id AND user_id = auth.uid();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not registered for this event.');
    END IF;

    IF v_registration.attendance_marked = true THEN
        RETURN jsonb_build_object('success', false, 'message', 'Attendance already marked.');
    END IF;

    -- 3. Mark Attendance in registrations
    UPDATE public.event_registrations
    SET attendance_marked = true,
        scanned_at = now()
    WHERE id = v_registration.id;

    -- 4. Also insert into event_attendance for backward compatibility
    SELECT * INTO v_profile FROM public.profiles WHERE user_id = auth.uid();
    
    INSERT INTO public.event_attendance (
        event_id, user_id, registration_id, student_name, usn, college_email, marked_by, marked_at
    ) VALUES (
        p_event_id, auth.uid(), v_registration.id, v_profile.full_name, v_registration.usn, v_registration.college_email, v_event.created_by, now()
    ) ON CONFLICT (event_id, user_id) DO NOTHING;

    -- 5. Award Activity Points
    v_points := COALESCE(v_event.activity_points, 10);
    INSERT INTO public.activity_points (user_id, event_id, points)
    VALUES (auth.uid(), p_event_id, v_points)
    ON CONFLICT (user_id, event_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Attendance marked successfully!',
        'points_awarded', v_points
    );
END;
$$;

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
  -- Check for BMSCE email
  IF NEW.email NOT LIKE '%@bmsce.ac.in' THEN
    RAISE EXCEPTION 'Only @bmsce.ac.in email addresses are permitted.';
  END IF;

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
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issued_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_transfer_history ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "Admin view own club" ON public.events TO authenticated USING (
  club_id IN (SELECT club_id FROM public.profiles WHERE user_id = auth.uid() AND (role = 'admin' OR account_type = 'admin')) 
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
CREATE POLICY "Anyone can read attendance" ON public.event_attendance 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = event_id AND created_by = auth.uid()
  ) OR 
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND (role = 'admin' OR account_type = 'admin')
  )
);

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

-- Activity Points Policies
DROP POLICY IF EXISTS "Users can view own points" ON public.activity_points;
CREATE POLICY "Users can view own points" ON public.activity_points
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Organizers can view points for their events" ON public.activity_points;
CREATE POLICY "Organizers can view points for their events" ON public.activity_points
FOR SELECT USING (
    event_id IN (
        SELECT id FROM public.events 
        WHERE created_by = auth.uid() 
        OR club_id IN (
            SELECT club_id FROM public.profiles 
            WHERE user_id = auth.uid() AND (role = 'admin' OR account_type = 'admin')
        )
    )
);

-- Event Volunteers Policies
DROP POLICY IF EXISTS "Users view own volunteering" ON public.event_volunteers;
CREATE POLICY "Users view own volunteering" ON public.event_volunteers FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can volunteer" ON public.event_volunteers;
CREATE POLICY "Users can volunteer" ON public.event_volunteers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can cancel volunteering" ON public.event_volunteers;
CREATE POLICY "Users can cancel volunteering" ON public.event_volunteers FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Organizers view event volunteers" ON public.event_volunteers;
CREATE POLICY "Organizers view event volunteers" ON public.event_volunteers FOR SELECT TO authenticated USING (
  event_id IN (
    SELECT id FROM public.events 
    WHERE created_by = auth.uid() 
    OR club_id IN (
      SELECT club_id FROM public.profiles 
      WHERE user_id = auth.uid() AND (role = 'admin' OR account_type = 'admin')
    )
  )
);

DROP POLICY IF EXISTS "Organizers manage event volunteers" ON public.event_volunteers;
CREATE POLICY "Organizers manage event volunteers" ON public.event_volunteers FOR UPDATE TO authenticated USING (
  event_id IN (
    SELECT id FROM public.events 
    WHERE created_by = auth.uid() 
    OR club_id IN (
      SELECT club_id FROM public.profiles 
      WHERE user_id = auth.uid() AND (role = 'admin' OR account_type = 'admin')
    )
  )
);

-- Admin Requests Policies
DROP POLICY IF EXISTS "Super admin all" ON public.admin_requests;
CREATE POLICY "Super admin all" ON public.admin_requests FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users self requests" ON public.admin_requests;
CREATE POLICY "Users self requests" ON public.admin_requests FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert requests" ON public.admin_requests;
CREATE POLICY "Users insert requests" ON public.admin_requests FOR INSERT WITH CHECK (user_id = auth.uid());

-- club_transfer_requests Policies
DROP POLICY IF EXISTS "Users view own transfer requests" ON public.club_transfer_requests;
CREATE POLICY "Users view own transfer requests" ON public.club_transfer_requests FOR SELECT TO authenticated USING (current_admin_id = auth.uid() OR new_admin_id = auth.uid());

-- 10. Storage
CREATE SCHEMA IF NOT EXISTS storage;

-- Using a DO block to insert buckets gracefully
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public) VALUES ('admin-proofs', 'admin-proofs', false) ON CONFLICT (id) DO NOTHING;
    INSERT INTO storage.buckets (id, name, public) VALUES ('event-covers', 'event-covers', true) ON CONFLICT (id) DO NOTHING;
    INSERT INTO storage.buckets (id, name, public) VALUES ('certificate-templates', 'certificate-templates', true) ON CONFLICT (id) DO NOTHING;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'storage.buckets table does not exist, skipping bucket insertion.';
END $$;

-- Policies for storage.objects
DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone view covers" ON storage.objects;
    CREATE POLICY "Anyone view covers" ON storage.objects FOR SELECT USING (bucket_id = 'event-covers');

    DROP POLICY IF EXISTS "Admins upload covers" ON storage.objects;
    CREATE POLICY "Admins upload covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-covers');

    DROP POLICY IF EXISTS "Anyone view certificate templates" ON storage.objects;
    CREATE POLICY "Anyone view certificate templates" ON storage.objects FOR SELECT USING (bucket_id = 'certificate-templates');

    DROP POLICY IF EXISTS "Admins upload certificate templates" ON storage.objects;
    CREATE POLICY "Admins upload certificate templates" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'certificate-templates');

    -- Hardened proofs policy (Owner + Super Admin only)
    DROP POLICY IF EXISTS "Users can only see their own proofs" ON storage.objects;
    CREATE POLICY "Users can only see their own proofs"
    ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'admin-proofs' 
      AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.has_role(auth.uid(), 'super_admin')
      )
    );

    DROP POLICY IF EXISTS "Users can upload their own proofs" ON storage.objects;
    CREATE POLICY "Users can upload their own proofs"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'admin-proofs' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

    DROP POLICY IF EXISTS "Users can delete their own proofs" ON storage.objects;
    CREATE POLICY "Users can delete their own proofs"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'admin-proofs' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'storage.objects table does not exist, skipping policy definitions.';
END $$;


-- 11. End of schema
-- Leaderboard Scoring Logic
-- Score = (Events Conducted * 10) + (Total Registrations * 1)

CREATE OR REPLACE FUNCTION public.get_club_leaderboard(
  p_category_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_events_weight DOUBLE PRECISION DEFAULT 10.0,
  p_regs_weight DOUBLE PRECISION DEFAULT 1.0
)
RETURNS TABLE (
  club_id UUID,
  club_name TEXT,
  club_category TEXT,
  events_count BIGINT,
  registrations_count BIGINT,
  score DOUBLE PRECISION,
  rank BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH club_stats AS (
    SELECT 
      c.id AS club_id,
      c.name AS club_name,
      c.category AS club_category,
      COUNT(DISTINCT e.id) FILTER (WHERE e.is_published = true AND (p_start_date IS NULL OR e.start_date >= p_start_date)) AS events_count,
      COUNT(r.id) FILTER (
        WHERE e.is_published = true 
        AND (p_start_date IS NULL OR e.start_date >= p_start_date)
        AND r.registration_status = 'confirmed'
        AND (r.payment_status = 'paid' OR r.payment_status = 'free')
      ) AS registrations_count
    FROM 
      public.clubs c
    LEFT JOIN 
      public.events e ON e.club_id = c.id
    LEFT JOIN 
      public.event_registrations r ON r.event_id = e.id
    WHERE 
      (p_category_id IS NULL OR e.category_id = p_category_id OR c.category = (SELECT name FROM public.event_categories WHERE id = p_category_id LIMIT 1))
    GROUP BY 
      c.id, c.name, c.category
  )
  SELECT 
    cs.club_id,
    cs.club_name,
    cs.club_category,
    cs.events_count,
    cs.registrations_count,
    (cs.events_count * p_events_weight + cs.registrations_count * p_regs_weight) AS score,
    RANK() OVER (ORDER BY (cs.events_count * p_events_weight + cs.registrations_count * p_regs_weight) DESC, cs.events_count DESC) as rank
  FROM 
    club_stats cs
  WHERE 
    cs.events_count > 0 OR cs.registrations_count > 0
  ORDER BY 
    score DESC, cs.events_count DESC;
END;
$$;

-- 11. Schema Updates (Ensuring new columns exist for existing databases)
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS attendance_token TEXT;
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS attendance_token_expires_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS attendance_session_active BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS public.event_registrations ADD COLUMN IF NOT EXISTS attendance_marked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE IF EXISTS public.event_registrations ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS public.issued_certificates ADD COLUMN IF NOT EXISTS certificate_id TEXT UNIQUE DEFAULT gen_random_uuid()::text;
