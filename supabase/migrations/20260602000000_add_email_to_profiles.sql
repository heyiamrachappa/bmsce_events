-- Add email column to public.profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill existing profiles with emails from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id;

-- Update trigger function to automatically set email for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _college_id uuid;
BEGIN
  -- Link to BMSCE only if email matches
  IF NEW.email LIKE '%@bmsce.ac.in' THEN
    SELECT id INTO _college_id FROM public.colleges WHERE slug = 'bmsce';
  ELSE
    _college_id := NULL;
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, role, account_type, college_id)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), 'student', 'student', _college_id);
  RETURN NEW;
END;
$$;
