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
  min_team_size INT,
  max_team_size INT,
  max_teams INT,
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
    (event_type = 'individual' AND min_team_size IS NULL AND max_team_size IS NULL) OR
    (event_type = 'group' AND min_team_size >= 1 AND max_team_size >= min_team_size)
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
  department TEXT,
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

CREATE OR REPLACE FUNCTION public.check_registration_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _event RECORD;
  _current_count INT;
BEGIN
  -- We only enforce limits on confirmed registrations
  IF NEW.registration_status = 'confirmed' AND (NEW.payment_status = 'free' OR NEW.payment_status = 'paid') THEN
    
    -- Lock the event row to serialize concurrent registrations
    SELECT * INTO _event FROM public.events WHERE id = NEW.event_id FOR UPDATE;
    
    IF _event.event_type = 'individual' THEN
      -- Handle individual participant limits
      IF _event.max_participants IS NOT NULL THEN
        SELECT COUNT(*) INTO _current_count 
        FROM public.event_registrations 
        WHERE event_id = NEW.event_id 
          AND registration_status = 'confirmed' 
          AND payment_status IN ('free', 'paid')
          AND id != NEW.id; -- Exclude current row for updates
          
        IF _current_count >= _event.max_participants THEN
          RAISE EXCEPTION 'Registration limit exceeded for this event';
        END IF;
      END IF;
    ELSIF _event.event_type = 'group' THEN
      -- Handle team count limits for group events
      IF _event.max_teams IS NOT NULL THEN
        -- Count existing teams for this event
        SELECT COUNT(*) INTO _current_count 
        FROM public.registration_teams 
        WHERE event_id = NEW.event_id;
        
        -- Logic: A new team's leader registers in event_registrations *before* the team record is created.
        -- If we already have max_teams, we block the leader's registration.
        -- We check if this user is already the leader of a confirmed team (for updates).
        IF EXISTS (SELECT 1 FROM public.registration_teams WHERE event_id = NEW.event_id AND leader_user_id = NEW.user_id) THEN
            -- Already lead a team, allow update
            RETURN NEW;
        END IF;

        IF _current_count >= _event.max_teams THEN
          RAISE EXCEPTION 'Maximum teams limit reached for this event';
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_registration_limit_trigger ON public.event_registrations;
CREATE TRIGGER check_registration_limit_trigger
BEFORE INSERT OR UPDATE ON public.event_registrations
FOR EACH ROW
EXECUTE FUNCTION public.check_registration_limit();


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
      c.id AS cid,
      c.name AS cname,
      c.category AS ccat,
      COUNT(DISTINCT e.id) AS e_count,
      COUNT(r.id) AS r_count
    FROM 
      public.clubs c
    LEFT JOIN 
      public.events e ON e.club_id = c.id 
      AND e.is_published = true 
      AND (p_start_date IS NULL OR e.start_date >= p_start_date)
      AND (p_category_id IS NULL OR e.category_id = p_category_id)
    LEFT JOIN 
      public.event_registrations r ON r.event_id = e.id
      AND r.registration_status = 'confirmed'
      AND (r.payment_status = 'paid' OR r.payment_status = 'free')
    GROUP BY 
      c.id, c.name, c.category
  )
  SELECT 
    cs.cid,
    cs.cname,
    cs.ccat,
    cs.e_count,
    cs.r_count,
    (cs.e_count * p_events_weight + cs.r_count * p_regs_weight) AS score,
    RANK() OVER (ORDER BY (cs.e_count * p_events_weight + cs.r_count * p_regs_weight) DESC, cs.e_count DESC) as rank
  FROM 
    club_stats cs
  WHERE 
    cs.e_count > 0 OR cs.r_count > 0
  ORDER BY 
    score DESC;
END;
$$;

-- Ensure missing columns are added for existing local databases
ALTER TABLE IF EXISTS public.event_volunteers ADD COLUMN IF NOT EXISTS department TEXT;
-- 1. Organizer Payment Accounts Table
CREATE TABLE IF NOT EXISTS public.organizer_payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  razorpay_account_id TEXT NOT NULL,
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'disconnected')),
  linked_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organizer_user_id, club_id)
);

-- 2. Event Payments Table
CREATE TABLE IF NOT EXISTS public.event_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    organizer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    participant_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    participant_name TEXT,
    participant_usn TEXT,
    amount DECIMAL NOT NULL,
    payment_provider TEXT DEFAULT 'razorpay',
    payment_reference TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Step Down as Admin Function
CREATE OR REPLACE FUNCTION public.step_down_admin(p_club_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_has_access BOOLEAN;
BEGIN
    -- Comprehensive check: Profile association OR Approved Request
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
          AND club_id = p_club_id 
          AND (role IN ('admin', 'organizer', 'college_admin') OR account_type IN ('admin', 'organizer', 'college_admin'))
        UNION
        SELECT 1 FROM public.admin_requests
        WHERE user_id = auth.uid()
          AND club_id = p_club_id
          AND status = 'approved'
    ) INTO v_has_access;

    IF NOT v_has_access THEN
        RAISE EXCEPTION 'You are not the organiser of this club.';
    END IF;

    -- 1. Reset Profile: Return to student status and clear club association
    UPDATE public.profiles
    SET role = 'student',
        account_type = 'student',
        club_role = NULL,
        club_id = NULL
    WHERE user_id = auth.uid(); -- Clear it regardless of what p_club_id matches to be safe

    -- 2. Clean up specific roles in user_roles table
    DELETE FROM public.user_roles
    WHERE user_id = auth.uid() AND role::text IN ('admin', 'college_admin');

    -- 3. Mark approved requests as rejected to finalize the step-down
    UPDATE public.admin_requests
    SET status = 'rejected'
    WHERE user_id = auth.uid() AND club_id = p_club_id AND status = 'approved';
    
    -- NOTE: The club will be temporarily without an organiser until a new one is approved.
END;
$$;

-- 4. RLS for Organizer Payment Accounts
ALTER TABLE public.organizer_payment_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organizers can view own payment account" ON public.organizer_payment_accounts;
CREATE POLICY "Organizers can view own payment account" ON public.organizer_payment_accounts
FOR SELECT TO authenticated USING (organizer_user_id = auth.uid());

DROP POLICY IF EXISTS "Organizers can insert own payment account" ON public.organizer_payment_accounts;
CREATE POLICY "Organizers can insert own payment account" ON public.organizer_payment_accounts
FOR INSERT TO authenticated WITH CHECK (organizer_user_id = auth.uid());

DROP POLICY IF EXISTS "Organizers can update own payment account" ON public.organizer_payment_accounts;
CREATE POLICY "Organizers can update own payment account" ON public.organizer_payment_accounts
FOR UPDATE TO authenticated USING (organizer_user_id = auth.uid());

-- 5. RLS for Event Payments
ALTER TABLE public.event_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view their own payments" ON public.event_payments;
CREATE POLICY "Participants can view their own payments" ON public.event_payments
FOR SELECT TO authenticated USING (participant_user_id = auth.uid());

DROP POLICY IF EXISTS "Organizers can view payments for their events" ON public.event_payments;
CREATE POLICY "Organizers can view payments for their events" ON public.event_payments
FOR SELECT TO authenticated USING (
    event_id IN (
        SELECT id FROM public.events 
        WHERE created_by = auth.uid() 
        OR club_id IN (
            SELECT club_id FROM public.profiles 
            WHERE user_id = auth.uid() AND (role = 'admin' OR account_type = 'admin')
        )
    )
    OR organizer_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Participants can insert payments" ON public.event_payments;
CREATE POLICY "Participants can insert payments" ON public.event_payments
FOR INSERT TO authenticated WITH CHECK (participant_user_id = auth.uid());

-- 12. Additional Administrative Functions
-- Club Transfer Orchestration

CREATE OR REPLACE FUNCTION public.initiate_club_transfer(_new_admin_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_club_id UUID;
    v_request_id UUID;
BEGIN
    -- 1. Get the club ID for the current admin
    SELECT club_id INTO v_club_id 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (role = 'admin' OR account_type = 'admin');

    IF v_club_id IS NULL THEN
        RAISE EXCEPTION 'You are not an authorized club organiser.';
    END IF;

    -- 2. Verify target user exists and is at the same college (optional but safe)
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _new_admin_id) THEN
        RAISE EXCEPTION 'Target user not found.';
    END IF;

    -- 3. Cancel any existing pending transfers for this club
    UPDATE public.club_transfer_requests 
    SET status = 'cancelled' 
    WHERE club_id = v_club_id AND status = 'pending';

    -- 4. Create new transfer request
    INSERT INTO public.club_transfer_requests (
        club_id, current_admin_id, new_admin_id, status
    ) VALUES (
        v_club_id, auth.uid(), _new_admin_id, 'pending'
    ) RETURNING id INTO v_request_id;

    RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_transfer_takeover(_request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request RECORD;
BEGIN
    -- 1. Get and verify request
    SELECT * INTO v_request 
    FROM public.club_transfer_requests 
    WHERE id = _request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer request not found.';
    END IF;

    IF v_request.new_admin_id != auth.uid() THEN
        RAISE EXCEPTION 'This offer is not addressed to you.';
    END IF;

    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'This transfer request is no longer active.';
    END IF;

    -- 2. Mark as accepted
    UPDATE public.club_transfer_requests 
    SET new_admin_accepted = true,
        updated_at = now()
    WHERE id = _request_id;

    -- 3. If admin already confirmed departure, complete the transfer
    IF v_request.admin_confirmed THEN
        PERFORM public.complete_club_transfer(_request_id);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_transfer_departure(_request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request RECORD;
BEGIN
    -- 1. Get and verify request
    SELECT * INTO v_request 
    FROM public.club_transfer_requests 
    WHERE id = _request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer request not found.';
    END IF;

    IF v_request.current_admin_id != auth.uid() THEN
        RAISE EXCEPTION 'Only the current organiser can confirm departure.';
    END IF;

    -- 2. Mark as departure confirmed
    UPDATE public.club_transfer_requests 
    SET admin_confirmed = true,
        updated_at = now()
    WHERE id = _request_id;

    -- 3. If new admin already accepted, complete the transfer
    IF v_request.new_admin_accepted THEN
        PERFORM public.complete_club_transfer(_request_id);
    END IF;
END;
$$;

-- Internal helper to perform the actual swap
CREATE OR REPLACE FUNCTION public.complete_club_transfer(_request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request RECORD;
    v_college_id UUID;
BEGIN
    SELECT * INTO v_request FROM public.club_transfer_requests WHERE id = _request_id;
    
    -- 1. Get college id from any profile to keep it consistent
    SELECT college_id INTO v_college_id FROM public.profiles WHERE user_id = v_request.new_admin_id;

    -- 2. Strip old admin rights
    UPDATE public.profiles 
    SET role = 'student', 
        account_type = 'student', 
        club_id = NULL 
    WHERE user_id = v_request.current_admin_id;

    DELETE FROM public.user_roles 
    WHERE user_id = v_request.current_admin_id 
    AND role::text IN ('admin', 'college_admin');

    -- 3. Grant new admin rights
    UPDATE public.profiles 
    SET role = 'admin', 
        account_type = 'admin', 
        club_id = v_request.club_id 
    WHERE user_id = v_request.new_admin_id;

    INSERT INTO public.user_roles (user_id, role, college_id)
    VALUES (v_request.new_admin_id, 'college_admin', v_college_id)
    ON CONFLICT DO NOTHING;

    -- 4. Record history
    INSERT INTO public.club_transfer_history (club_id, old_admin_id, new_admin_id)
    VALUES (v_request.club_id, v_request.current_admin_id, v_request.new_admin_id);

    -- 5. Mark request as completed
    UPDATE public.club_transfer_requests 
    SET status = 'completed',
        updated_at = now()
    WHERE id = _request_id;
END;
$$;

-- Utility Functions

CREATE OR REPLACE FUNCTION public.is_college_member(_college_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id AND college_id = _college_id
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_student_college(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_college_id UUID;
BEGIN
  SELECT id INTO v_college_id FROM public.colleges WHERE slug = 'bmsce';
  UPDATE public.profiles SET college_id = v_college_id WHERE user_id = _user_id AND college_id IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_admin_signup(_club_role TEXT, _user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Logic to handle pre-approval or special admin registration paths
  -- For now, returns 'pending' as default
  RETURN 'pending';
END;
$$;
