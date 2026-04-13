CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_profile_id uuid;
  v_user_id uuid;
BEGIN
  -- If an admin profile already exists, do nothing (idempotent)
  SELECT id
  INTO v_profile_id
  FROM public.profiles
  WHERE username = 'admin'
  LIMIT 1;

  IF v_profile_id IS NOT NULL THEN
    RETURN;
  END IF;

  -- Look for an existing auth user for the default admin email
  SELECT id
  INTO v_user_id
  FROM auth.users
  WHERE email = 'admin@app.local'
  LIMIT 1;

  -- Create auth user if it doesn't exist yet
  IF v_user_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      role,
      aud,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data
    )
    VALUES (
      uuid_generate_v4(),
      NULL,
      'authenticated',
      'authenticated',
      'admin@app.local',
      crypt('admin123', gen_salt('bf')),
      now(),
      now(),
      now(),
      jsonb_build_object('provider', 'email', 'provider_id', 'admin@app.local'),
      jsonb_build_object('username', 'admin', 'role', 'admin')
    )
    RETURNING id INTO v_user_id;
  END IF;

  -- Safety check: we must have a user id at this point
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create or locate default admin auth user';
  END IF;

  -- Create the corresponding admin profile if missing
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
    v_user_id,
    'System Admin',
    'admin',
    '9999999999',
    'admin',
    NULL,
    now()
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;