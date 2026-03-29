-- Migration: update_event_limits.sql (20260329000001)

-- 1. Add new columns to events table for enhanced limits and team ranges
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS min_team_size INT,
ADD COLUMN IF NOT EXISTS max_team_size INT,
ADD COLUMN IF NOT EXISTS max_teams INT;

-- 2. Update existing data to maintain consistency (optional but helpful)
-- Defaulting team ranges based on old team_size column for existing group events
UPDATE public.events 
SET min_team_size = team_size, 
    max_team_size = team_size 
WHERE event_type = 'group' AND team_size IS NOT NULL 
AND min_team_size IS NULL;

-- 3. Update the team_size_check constraint to support the new columns
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS team_size_check;
ALTER TABLE public.events ADD CONSTRAINT team_size_check CHECK (
  (event_type = 'individual' AND min_team_size IS NULL AND max_team_size IS NULL) OR
  (event_type = 'group' AND min_team_size >= 1 AND max_team_size >= min_team_size)
);

-- 4. Update the check_registration_limit function to handle both individual and team limits
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
