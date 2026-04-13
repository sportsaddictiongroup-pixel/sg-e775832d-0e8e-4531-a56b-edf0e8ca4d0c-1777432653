CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text,
  username text NOT NULL UNIQUE,
  email text,
  mobile_number text UNIQUE,
  role text NOT NULL,
  upline_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.countries (
  id bigserial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  code text
);

CREATE TABLE IF NOT EXISTS public.states (
  id bigserial PRIMARY KEY,
  country_id bigint NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  UNIQUE (country_id, name)
);

CREATE TABLE IF NOT EXISTS public.districts (
  id bigserial PRIMARY KEY,
  state_id bigint NOT NULL REFERENCES public.states(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  UNIQUE (state_id, name)
);

CREATE TABLE IF NOT EXISTS public.pincodes (
  id bigserial PRIMARY KEY,
  district_id bigint NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  code text NOT NULL,
  UNIQUE (district_id, code)
);

CREATE TABLE IF NOT EXISTS public.locations (
  id bigserial PRIMARY KEY,
  pincode_id bigint NOT NULL REFERENCES public.pincodes(id) ON DELETE CASCADE,
  name text NOT NULL,
  UNIQUE (pincode_id, name)
);

CREATE TABLE IF NOT EXISTS public.territory_assignments (
  id bigserial PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  country_id bigint REFERENCES public.countries(id),
  state_id bigint REFERENCES public.states(id),
  district_id bigint REFERENCES public.districts(id),
  pincode_id bigint REFERENCES public.pincodes(id),
  location_id bigint REFERENCES public.locations(id),
  position_type text,
  created_at timestamptz DEFAULT now()
);