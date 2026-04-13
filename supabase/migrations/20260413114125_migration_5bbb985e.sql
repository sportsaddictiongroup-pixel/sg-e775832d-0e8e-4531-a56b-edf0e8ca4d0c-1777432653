-- Ensure pgcrypto is available for gen_random_uuid() and password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) PROFILES TABLE (linked to auth.users)

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  username text NOT NULL UNIQUE,
  mobile_number text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN (
    'admin',
    'investor',
    'state_head',
    'district_head',
    'pincode_head',
    'pincode_partner'
  )),
  upline_profile_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Self-referencing upline (one user can be upline of many)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_upline_profile_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_upline_profile_id_fkey
  FOREIGN KEY (upline_profile_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- Link profile.id to auth.users.id
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- 2) LOCATION HIERARCHY TABLES

-- countries
CREATE TABLE IF NOT EXISTS public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

-- states
CREATE TABLE IF NOT EXISTS public.states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL,
  name text NOT NULL,
  CONSTRAINT states_country_name_key UNIQUE (country_id, name)
);

ALTER TABLE public.states
  DROP CONSTRAINT IF EXISTS states_country_id_fkey;

ALTER TABLE public.states
  ADD CONSTRAINT states_country_id_fkey
  FOREIGN KEY (country_id)
  REFERENCES public.countries(id)
  ON DELETE CASCADE;

-- districts
CREATE TABLE IF NOT EXISTS public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id uuid NOT NULL,
  name text NOT NULL,
  CONSTRAINT districts_state_name_key UNIQUE (state_id, name)
);

ALTER TABLE public.districts
  DROP CONSTRAINT IF EXISTS districts_state_id_fkey;

ALTER TABLE public.districts
  ADD CONSTRAINT districts_state_id_fkey
  FOREIGN KEY (state_id)
  REFERENCES public.states(id)
  ON DELETE CASCADE;

-- pincodes
CREATE TABLE IF NOT EXISTS public.pincodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid NOT NULL,
  code text NOT NULL,
  CONSTRAINT pincodes_district_code_key UNIQUE (district_id, code)
);

ALTER TABLE public.pincodes
  DROP CONSTRAINT IF EXISTS pincodes_district_id_fkey;

ALTER TABLE public.pincodes
  ADD CONSTRAINT pincodes_district_id_fkey
  FOREIGN KEY (district_id)
  REFERENCES public.districts(id)
  ON DELETE CASCADE;

-- locations
CREATE TABLE IF NOT EXISTS public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pincode_id uuid NOT NULL,
  name text NOT NULL,
  CONSTRAINT locations_pincode_name_key UNIQUE (pincode_id, name)
);

ALTER TABLE public.locations
  DROP CONSTRAINT IF EXISTS locations_pincode_id_fkey;

ALTER TABLE public.locations
  ADD CONSTRAINT locations_pincode_id_fkey
  FOREIGN KEY (pincode_id)
  REFERENCES public.pincodes(id)
  ON DELETE CASCADE;

-- 3) TERRITORY ASSIGNMENTS

CREATE TABLE IF NOT EXISTS public.territory_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN (
    'investor',
    'state_head',
    'district_head',
    'pincode_head',
    'pincode_partner'
  )),
  country_id uuid,
  state_id uuid,
  district_id uuid,
  pincode_id uuid,
  location_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  assigned_at timestamptz NOT NULL DEFAULT now()
);

-- FK to profiles
ALTER TABLE public.territory_assignments
  DROP CONSTRAINT IF EXISTS territory_assignments_profile_id_fkey;

ALTER TABLE public.territory_assignments
  ADD CONSTRAINT territory_assignments_profile_id_fkey
  FOREIGN KEY (profile_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- FKs to location hierarchy (cascade so assignments are removed if territory is deleted)
ALTER TABLE public.territory_assignments
  DROP CONSTRAINT IF EXISTS territory_assignments_country_id_fkey;

ALTER TABLE public.territory_assignments
  ADD CONSTRAINT territory_assignments_country_id_fkey
  FOREIGN KEY (country_id)
  REFERENCES public.countries(id)
  ON DELETE CASCADE;

ALTER TABLE public.territory_assignments
  DROP CONSTRAINT IF EXISTS territory_assignments_state_id_fkey;

ALTER TABLE public.territory_assignments
  ADD CONSTRAINT territory_assignments_state_id_fkey
  FOREIGN KEY (state_id)
  REFERENCES public.states(id)
  ON DELETE CASCADE;

ALTER TABLE public.territory_assignments
  DROP CONSTRAINT IF EXISTS territory_assignments_district_id_fkey;

ALTER TABLE public.territory_assignments
  ADD CONSTRAINT territory_assignments_district_id_fkey
  FOREIGN KEY (district_id)
  REFERENCES public.districts(id)
  ON DELETE CASCADE;

ALTER TABLE public.territory_assignments
  DROP CONSTRAINT IF EXISTS territory_assignments_pincode_id_fkey;

ALTER TABLE public.territory_assignments
  ADD CONSTRAINT territory_assignments_pincode_id_fkey
  FOREIGN KEY (pincode_id)
  REFERENCES public.pincodes(id)
  ON DELETE CASCADE;

ALTER TABLE public.territory_assignments
  DROP CONSTRAINT IF EXISTS territory_assignments_location_id_fkey;

ALTER TABLE public.territory_assignments
  ADD CONSTRAINT territory_assignments_location_id_fkey
  FOREIGN KEY (location_id)
  REFERENCES public.locations(id)
  ON DELETE CASCADE;

-- 4) SEED DEFAULT ADMIN USER + PROFILE (idempotent)

DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Check if admin auth user already exists in THIS project
  SELECT id
  INTO v_admin_id
  FROM auth.users
  WHERE email = 'admin@app.local'
  LIMIT 1;

  -- If not, create it
  IF v_admin_id IS NULL THEN
    INSERT INTO auth.users (
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role
    )
    VALUES (
      'admin@app.local',
      crypt('admin123', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('username', 'admin', 'role', 'admin'),
      'authenticated',
      'authenticated'
    )
    RETURNING id INTO v_admin_id;
  END IF;

  -- Ensure matching admin profile in public.profiles
  INSERT INTO public.profiles (
    id,
    full_name,
    username,
    mobile_number,
    role,
    upline_profile_id
  )
  VALUES (
    v_admin_id,
    'System Admin',
    'admin',
    '9999999999',
    'admin',
    NULL
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        username = EXCLUDED.username,
        role = EXCLUDED.role;
END;
$$;