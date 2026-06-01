CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS wedding_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  couple_names text NOT NULL,
  tagline text NOT NULL,
  wedding_date text NOT NULL,
  locale text NOT NULL DEFAULT 'nl',
  location_name text NOT NULL,
  location_summary text NOT NULL,
  hero_image_url text,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  body text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS schedule_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  event_date date NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES schedule_days(id) ON DELETE CASCADE,
  event_time text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  location text,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS menu_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS menu_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES menu_courses(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  dietary_tags text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  description text NOT NULL,
  response_kind text NOT NULL CHECK (response_kind IN ('yes_no', 'choice')),
  options text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL DEFAULT '',
  rsvp_status text NOT NULL DEFAULT 'unknown' CHECK (rsvp_status IN ('unknown', 'attending', 'declined')),
  dietary_confirmed boolean NOT NULL DEFAULT false,
  dietary_notes text,
  allergy_notes text,
  is_child boolean NOT NULL DEFAULT false,
  plus_one boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invite_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  token_preview text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('owner', 'guest')),
  token_hash text NOT NULL UNIQUE,
  owner_id uuid REFERENCES owners(id) ON DELETE CASCADE,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guest_menu_selections (
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES menu_courses(id) ON DELETE CASCADE,
  option_id uuid REFERENCES menu_options(id) ON DELETE SET NULL,
  none_works boolean NOT NULL DEFAULT false,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guest_id, course_id)
);

CREATE TABLE IF NOT EXISTS guest_activity_responses (
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  response text NOT NULL,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guest_id, activity_id)
);

CREATE TABLE IF NOT EXISTS ride_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  from_location text NOT NULL,
  seats_available integer NOT NULL CHECK (seats_available > 0),
  notes text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ride_passengers (
  offer_id uuid NOT NULL REFERENCES ride_offers(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (offer_id, guest_id)
);

CREATE INDEX IF NOT EXISTS idx_guests_household_id ON guests(household_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token_hash ON invite_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_guest_menu_course ON guest_menu_selections(course_id);
CREATE INDEX IF NOT EXISTS idx_guest_activity_activity ON guest_activity_responses(activity_id);
