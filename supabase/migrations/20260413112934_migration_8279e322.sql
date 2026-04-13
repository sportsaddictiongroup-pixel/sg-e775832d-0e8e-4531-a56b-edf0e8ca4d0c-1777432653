CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  -- profiles
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY,
      full_name text NOT NULL,
      username text NOT NULL,
      mobile_number text NOT NULL,
      role text NOT NULL,
      upline_profile_id uuid NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT profiles_username_key UNIQUE (username),
      CONSTRAINT profiles_mobile_number_key UNIQUE (mobile_number),
      CONSTRAINT profiles_upline_fk FOREIGN KEY (upline_profile_id)
        REFERENCES public.profiles (id) ON DELETE SET NULL,
      CONSTRAINT profiles_auth_fk FOREIGN KEY (id)
        REFERENCES auth.users (id) ON DELETE CASCADE
    );
  END IF;

  -- countries
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'countries'
  ) THEN
    CREATE TABLE public.countries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT countries_name_key UNIQUE (name)
    );
  END IF;

  -- states
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'states'
  ) THEN
    CREATE TABLE public.states (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      country_id uuid NOT NULL,
      name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT states_country_fk FOREIGN KEY (country_id)
        REFERENCES public.countries (id) ON DELETE CASCADE,
      CONSTRAINT states_country_name_key UNIQUE (country_id, name)
    );
  END IF;

  -- districts
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'districts'
  ) THEN
    CREATE TABLE public.districts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      state_id uuid NOT NULL,
      name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT districts_state_fk FOREIGN KEY (state_id)
        REFERENCES public.states (id) ON DELETE CASCADE,
      CONSTRAINT districts_state_name_key UNIQUE (state_id, name)
    );
  END IF;

  -- pincodes
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pincodes'
  ) THEN
    CREATE TABLE public.pincodes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      district_id uuid NOT NULL,
      code text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT pincodes_district_fk FOREIGN KEY (district_id)
        REFERENCES public.districts (id) ON DELETE CASCADE,
      CONSTRAINT pincodes_district_code_key UNIQUE (district_id, code)
    );
  END IF;

  -- locations
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'locations'
  ) THEN
    CREATE TABLE public.locations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pincode_id uuid NOT NULL,
      name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT locations_pincode_fk FOREIGN KEY (pincode_id)
        REFERENCES public.pincodes (id) ON DELETE CASCADE,
      CONSTRAINT locations_pincode_name_key UNIQUE (pincode_id, name)
    );
  END IF;

  -- territory_assignments
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'territory_assignments'
  ) THEN
    CREATE TABLE public.territory_assignments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id uuid NOT NULL,
      role text NOT NULL,
      country_id uuid NULL,
      state_id uuid NULL,
      district_id uuid NULL,
      pincode_id uuid NULL,
      location_id uuid NULL,
      is_active boolean NOT NULL DEFAULT true,
      assigned_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT territory_assignments_profile_fk FOREIGN KEY (profile_id)
        REFERENCES public.profiles (id) ON DELETE CASCADE,
      CONSTRAINT territory_assignments_country_fk FOREIGN KEY (country_id)
        REFERENCES public.countries (id) ON DELETE SET NULL,
      CONSTRAINT territory_assignments_state_fk FOREIGN KEY (state_id)
        REFERENCES public.states (id) ON DELETE SET NULL,
      CONSTRAINT territory_assignments_district_fk FOREIGN KEY (district_id)
        REFERENCES public.districts (id) ON DELETE SET NULL,
      CONSTRAINT territory_assignments_pincode_fk FOREIGN KEY (pincode_id)
        REFERENCES public.pincodes (id) ON DELETE SET NULL,
      CONSTRAINT territory_assignments_location_fk FOREIGN KEY (location_id)
        REFERENCES public.locations (id) ON DELETE SET NULL
    );
  END IF;
END $$;

-- Uniqueness for active heads/partners per territory
CREATE UNIQUE INDEX IF NOT EXISTS territory_state_head_unique
  ON public.territory_assignments (state_id)
  WHERE role = 'state_head' AND is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS territory_district_head_unique
  ON public.territory_assignments (district_id)
  WHERE role = 'district_head' AND is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS territory_pincode_head_unique
  ON public.territory_assignments (pincode_id)
  WHERE role = 'pincode_head' AND is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS territory_pincode_partner_unique
  ON public.territory_assignments (location_id)
  WHERE role = 'pincode_partner' AND is_active = true;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pincodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territory_assignments ENABLE ROW LEVEL SECURITY;

-- Profiles policies: own access + admin override
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='profiles'
      AND policyname='profiles_select_authenticated'
  ) THEN
    CREATE POLICY profiles_select_authenticated
      ON public.profiles
      FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='profiles'
      AND policyname='profiles_insert_admin_or_self'
  ) THEN
    CREATE POLICY profiles_insert_admin_or_self
      ON public.profiles
      FOR INSERT
      WITH CHECK (
        auth.uid() = id
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='profiles'
      AND policyname='profiles_update_admin_or_self'
  ) THEN
    CREATE POLICY profiles_update_admin_or_self
      ON public.profiles
      FOR UPDATE
      USING (
        auth.uid() = id
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
      )
      WITH CHECK (
        auth.uid() = id
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='profiles'
      AND policyname='profiles_delete_admin'
  ) THEN
    CREATE POLICY profiles_delete_admin
      ON public.profiles
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
      );
  END IF;
END $$;

-- Location and territory tables: public read, authenticated write
DO $$
BEGIN
  -- countries
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='countries'
      AND policyname='countries_public_read'
  ) THEN
    CREATE POLICY countries_public_read
      ON public.countries
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='countries'
      AND policyname='countries_auth_write'
  ) THEN
    CREATE POLICY countries_auth_write
      ON public.countries
      FOR ALL
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- states
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='states'
      AND policyname='states_public_read'
  ) THEN
    CREATE POLICY states_public_read
      ON public.states
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='states'
      AND policyname='states_auth_write'
  ) THEN
    CREATE POLICY states_auth_write
      ON public.states
      FOR ALL
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- districts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='districts'
      AND policyname='districts_public_read'
  ) THEN
    CREATE POLICY districts_public_read
      ON public.districts
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='districts'
      AND policyname='districts_auth_write'
  ) THEN
    CREATE POLICY districts_auth_write
      ON public.districts
      FOR ALL
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- pincodes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='pincodes'
      AND policyname='pincodes_public_read'
  ) THEN
    CREATE POLICY pincodes_public_read
      ON public.pincodes
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='pincodes'
      AND policyname='pincodes_auth_write'
  ) THEN
    CREATE POLICY pincodes_auth_write
      ON public.pincodes
      FOR ALL
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- locations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='locations'
      AND policyname='locations_public_read'
  ) THEN
    CREATE POLICY locations_public_read
      ON public.locations
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='locations'
      AND policyname='locations_auth_write'
  ) THEN
    CREATE POLICY locations_auth_write
      ON public.locations
      FOR ALL
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- territory_assignments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='territory_assignments'
      AND policyname='territory_assignments_public_read'
  ) THEN
    CREATE POLICY territory_assignments_public_read
      ON public.territory_assignments
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='territory_assignments'
      AND policyname='territory_assignments_auth_write'
  ) THEN
    CREATE POLICY territory_assignments_auth_write
      ON public.territory_assignments
      FOR ALL
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Seed default admin auth user + profile (idempotent)
DO $$
DECLARE
  v_admin_user auth.users%ROWTYPE;
  v_admin_profile public.profiles%ROWTYPE;
BEGIN
  -- If profile with username 'admin' already exists, do nothing
  SELECT *
  INTO v_admin_profile
  FROM public.profiles
  WHERE username = 'admin'
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  -- Find or create auth user with email admin@app.local
  SELECT *
  INTO v_admin_user
  FROM auth.users
  WHERE email = 'admin@app.local'
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      created_at,
      updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@app.local',
      crypt('admin123', gen_salt('bf')),
      now(),
      now()
    )
    RETURNING * INTO v_admin_user;
  END IF;

  -- Create linked profile
  INSERT INTO public.profiles (
    id,
    full_name,
    username,
    mobile_number,
    role,
    upline_profile_id,
    created_at
  )
  VALUES (
    v_admin_user.id,
    'System Admin',
    'admin',
    '9999999999',
    'admin',
    NULL,
    now()
  )
  ON CONFLICT (id) DO NOTHING;
END $$;