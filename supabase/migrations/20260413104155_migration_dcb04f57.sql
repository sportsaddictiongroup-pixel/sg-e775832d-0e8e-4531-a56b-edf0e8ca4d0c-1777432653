-- Ensure UUID extension is available for consistent primary key defaults
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) Ensure profiles structure matches required fields (username, mobile_number, role, upline_profile_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
  ) THEN
    -- username
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'username'
    ) THEN
      ALTER TABLE public.profiles
        ADD COLUMN username text;
    END IF;

    -- mobile_number
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'mobile_number'
    ) THEN
      ALTER TABLE public.profiles
        ADD COLUMN mobile_number text;
    END IF;

    -- role
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'role'
    ) THEN
      ALTER TABLE public.profiles
        ADD COLUMN role text;
    END IF;

    -- upline_profile_id
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'upline_profile_id'
    ) THEN
      ALTER TABLE public.profiles
        ADD COLUMN upline_profile_id uuid;
    END IF;

    -- Foreign key from upline_profile_id → profiles.id (self-reference), only if missing
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'profiles_upline_profile_id_fkey'
        AND conrelid = 'public.profiles'::regclass
    ) THEN
      ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_upline_profile_id_fkey
        FOREIGN KEY (upline_profile_id)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL;
    END IF;

    -- Default any NULL roles to "investor" so we can safely enforce NOT NULL
    BEGIN
      UPDATE public.profiles
      SET role = 'investor'
      WHERE role IS NULL;
    EXCEPTION
      WHEN undefined_column THEN
        -- If role column still does not exist for any reason, ignore this step
        NULL;
    END;

    -- Enforce NOT NULL on role if the column exists
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'role'
    ) THEN
      BEGIN
        ALTER TABLE public.profiles
          ALTER COLUMN role SET NOT NULL;
      EXCEPTION
        WHEN others THEN
          -- If there is some data-related issue preventing NOT NULL, skip instead of failing the whole script
          NULL;
      END;
    END IF;
  END IF;
END $$;

-- Unique indexes for username and mobile_number (enforce global uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key
  ON public.profiles (username);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_mobile_number_key
  ON public.profiles (mobile_number);

-- 2) Location hierarchy tables

CREATE TABLE IF NOT EXISTS public.countries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.states (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id uuid NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name text NOT NULL,
  CONSTRAINT states_country_name_key UNIQUE (country_id, name)
);

CREATE TABLE IF NOT EXISTS public.districts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_id uuid NOT NULL REFERENCES public.states(id) ON DELETE CASCADE,
  name text NOT NULL,
  CONSTRAINT districts_state_name_key UNIQUE (state_id, name)
);

CREATE TABLE IF NOT EXISTS public.pincodes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_id uuid NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  code text NOT NULL,
  CONSTRAINT pincodes_district_code_key UNIQUE (district_id, code)
);

CREATE TABLE IF NOT EXISTS public.locations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pincode_id uuid NOT NULL REFERENCES public.pincodes(id) ON DELETE CASCADE,
  name text NOT NULL,
  CONSTRAINT locations_pincode_name_key UNIQUE (pincode_id, name)
);

-- 3) Territory assignments table, future-ready for hierarchy rules

CREATE TABLE IF NOT EXISTS public.territory_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL,
  country_id uuid REFERENCES public.countries(id),
  state_id uuid REFERENCES public.states(id),
  district_id uuid REFERENCES public.districts(id),
  pincode_id uuid REFERENCES public.pincodes(id),
  location_id uuid REFERENCES public.locations(id),
  is_active boolean NOT NULL DEFAULT true,
  assigned_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes for lookups
CREATE INDEX IF NOT EXISTS territory_assignments_profile_id_idx
  ON public.territory_assignments (profile_id);

CREATE INDEX IF NOT EXISTS territory_assignments_country_id_idx
  ON public.territory_assignments (country_id);

CREATE INDEX IF NOT EXISTS territory_assignments_state_id_idx
  ON public.territory_assignments (state_id);

CREATE INDEX IF NOT EXISTS territory_assignments_district_id_idx
  ON public.territory_assignments (district_id);

CREATE INDEX IF NOT EXISTS territory_assignments_pincode_id_idx
  ON public.territory_assignments (pincode_id);

CREATE INDEX IF NOT EXISTS territory_assignments_location_id_idx
  ON public.territory_assignments (location_id);

-- Role/territory uniqueness (one active head/partner per territory level)

-- One active State Head per state
CREATE UNIQUE INDEX IF NOT EXISTS territory_assignments_unique_state_head
  ON public.territory_assignments (state_id)
  WHERE role = 'state_head'
    AND is_active = true
    AND state_id IS NOT NULL;

-- One active District Head per district
CREATE UNIQUE INDEX IF NOT EXISTS territory_assignments_unique_district_head
  ON public.territory_assignments (district_id)
  WHERE role = 'district_head'
    AND is_active = true
    AND district_id IS NOT NULL;

-- One active PIN Code Head per pincode
CREATE UNIQUE INDEX IF NOT EXISTS territory_assignments_unique_pincode_head
  ON public.territory_assignments (pincode_id)
  WHERE role = 'pincode_head'
    AND is_active = true
    AND pincode_id IS NOT NULL;

-- One active PIN Code Partner per location
CREATE UNIQUE INDEX IF NOT EXISTS territory_assignments_unique_pincode_partner
  ON public.territory_assignments (location_id)
  WHERE role = 'pincode_partner'
    AND is_active = true
    AND location_id IS NOT NULL;

-- 4) Enable RLS and policies for new tables

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pincodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territory_assignments ENABLE ROW LEVEL SECURITY;

-- Countries: public read, authenticated write (admin UI will be authenticated)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'countries'
      AND policyname = 'public_read_countries'
  ) THEN
    CREATE POLICY "public_read_countries" ON public.countries
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'countries'
      AND policyname = 'auth_write_countries'
  ) THEN
    CREATE POLICY "auth_write_countries" ON public.countries
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    CREATE POLICY "auth_update_countries" ON public.countries
      FOR UPDATE USING (auth.uid() IS NOT NULL);
    CREATE POLICY "auth_delete_countries" ON public.countries
      FOR DELETE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- States
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'states'
      AND policyname = 'public_read_states'
  ) THEN
    CREATE POLICY "public_read_states" ON public.states
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'states'
      AND policyname = 'auth_write_states'
  ) THEN
    CREATE POLICY "auth_write_states" ON public.states
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    CREATE POLICY "auth_update_states" ON public.states
      FOR UPDATE USING (auth.uid() IS NOT NULL);
    CREATE POLICY "auth_delete_states" ON public.states
      FOR DELETE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Districts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'districts'
      AND policyname = 'public_read_districts'
  ) THEN
    CREATE POLICY "public_read_districts" ON public.districts
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'districts'
      AND policyname = 'auth_write_districts'
  ) THEN
    CREATE POLICY "auth_write_districts" ON public.districts
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    CREATE POLICY "auth_update_districts" ON public.districts
      FOR UPDATE USING (auth.uid() IS NOT NULL);
    CREATE POLICY "auth_delete_districts" ON public.districts
      FOR DELETE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Pincodes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pincodes'
      AND policyname = 'public_read_pincodes'
  ) THEN
    CREATE POLICY "public_read_pincodes" ON public.pincodes
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pincodes'
      AND policyname = 'auth_write_pincodes'
  ) THEN
    CREATE POLICY "auth_write_pincodes" ON public.pincodes
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    CREATE POLICY "auth_update_pincodes" ON public.pincodes
      FOR UPDATE USING (auth.uid() IS NOT NULL);
    CREATE POLICY "auth_delete_pincodes" ON public.pincodes
      FOR DELETE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Locations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'locations'
      AND policyname = 'public_read_locations'
  ) THEN
    CREATE POLICY "public_read_locations" ON public.locations
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'locations'
      AND policyname = 'auth_write_locations'
  ) THEN
    CREATE POLICY "auth_write_locations" ON public.locations
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    CREATE POLICY "auth_update_locations" ON public.locations
      FOR UPDATE USING (auth.uid() IS NOT NULL);
    CREATE POLICY "auth_delete_locations" ON public.locations
      FOR DELETE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Territory assignments: authenticated-only access (admin + partners)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'territory_assignments'
      AND policyname = 'auth_read_territory_assignments'
  ) THEN
    CREATE POLICY "auth_read_territory_assignments" ON public.territory_assignments
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'territory_assignments'
      AND policyname = 'auth_write_territory_assignments'
  ) THEN
    CREATE POLICY "auth_write_territory_assignments" ON public.territory_assignments
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    CREATE POLICY "auth_update_territory_assignments" ON public.territory_assignments
      FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;