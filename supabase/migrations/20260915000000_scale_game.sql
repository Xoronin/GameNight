-- Scale: a reference object stands at a fixed size and a mystery object
-- appears beside it. Stretch the mystery one until the proportion looks
-- right. There is no ruler and no number on screen — you are matching one
-- shape against another by eye.
--
-- Scoring
-- -------
-- On the ratio, never the difference. Guessing twice too big has to cost
-- exactly what twice too small costs, and subtracting heights does not
-- give you that, so the error is |ln(guess / truth)| and the points fall
-- off from there. See scaleService for the curve.
--
-- Heights
-- -------
-- height_m is the whole basis for scoring, so it is curated here. The
-- silhouettes are separate: they live in src/data/scaleSilhouettes.ts,
-- built from geometric primitives by scripts/generate-silhouettes.mjs, and
-- carry no third-party artwork. A stylised drawing does not make a round
-- wrong — only the height does — so the art only has to be recognisable.

create table if not exists scale_objects (
  id uuid primary key default gen_random_uuid(),

  -- Matches a key in src/data/scaleSilhouettes.ts.
  shape_key text not null unique,

  name_en text not null,
  name_de text not null,

  height_m numeric not null
    check (height_m > 0),

  active boolean not null default true,

  created_at timestamptz not null default now()
);

create table if not exists scale_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,

  status text not null default 'playing'
    check (status in ('playing', 'finished')),

  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists scale_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  session_id uuid not null references scale_sessions(id) on delete cascade,

  round_number int not null,

  status text not null default 'guessing'
    check (status in ('guessing', 'reveal', 'finished')),

  -- The one drawn at a fixed size, with its height named.
  reference_id uuid not null references scale_objects(id),

  -- The one being stretched. Its height is not shown until the reveal.
  mystery_id uuid not null references scale_objects(id),

  created_at timestamptz not null default now(),
  ends_at timestamptz,

  unique (session_id, round_number),

  constraint scale_rounds_distinct_check
    check (reference_id <> mystery_id)
);

create table if not exists scale_guesses (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references scale_rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,

  -- How many times the reference's height the player made the mystery.
  ratio numeric not null
    check (ratio > 0),

  -- |ln(ratio / true ratio)|, stored so the reveal can rank without
  -- recomputing and a past round can still be explained.
  log_error numeric not null default 0,

  points int not null default 0,

  created_at timestamptz not null default now(),

  unique (round_id, player_id)
);

create index if not exists scale_rounds_session_idx
  on scale_rounds (session_id);

create index if not exists scale_guesses_round_idx
  on scale_guesses (round_id);

alter table scale_objects enable row level security;
alter table scale_sessions enable row level security;
alter table scale_rounds enable row level security;
alter table scale_guesses enable row level security;

create policy "Anyone can read Scale objects"
  on scale_objects for select
  using (true);

create policy "Anyone can manage Scale sessions"
  on scale_sessions for all
  using (true)
  with check (true);

create policy "Anyone can manage Scale rounds"
  on scale_rounds for all
  using (true)
  with check (true);

create policy "Anyone can manage Scale guesses"
  on scale_guesses for all
  using (true)
  with check (true);

alter publication supabase_realtime add table scale_sessions;
alter publication supabase_realtime add table scale_rounds;
alter publication supabase_realtime add table scale_guesses;


-- ----------------------------------------------------------------
-- 37 objects, from a 0.095 m mug to a 20 m oak — a spread of
-- more than two orders of magnitude, so a pair can be comfortably
-- close or absurdly far apart.
-- ----------------------------------------------------------------

insert into scale_objects (shape_key, name_en, name_de, height_m) values
  ('coffee_cup', 'Coffee mug', 'Kaffeebecher', 0.095),
  ('smartphone', 'Smartphone', 'Smartphone', 0.15),
  ('toaster', 'Toaster', 'Toaster', 0.19),
  ('wine_glass', 'Wine glass', 'Weinglas', 0.22),
  ('football', 'Football', 'Fußball', 0.22),
  ('microwave', 'Microwave', 'Mikrowelle', 0.29),
  ('wine_bottle', 'Wine bottle', 'Weinflasche', 0.3),
  ('bowling_pin', 'Bowling pin', 'Bowlingpin', 0.38),
  ('suitcase', 'Suitcase', 'Koffer', 0.7),
  ('desk', 'Desk', 'Schreibtisch', 0.74),
  ('fire_hydrant', 'Fire hydrant', 'Hydrant', 0.75),
  ('traffic_cone', 'Traffic cone', 'Verkehrshütchen', 0.75),
  ('park_bench', 'Park bench', 'Parkbank', 0.85),
  ('washing_machine', 'Washing machine', 'Waschmaschine', 0.85),
  ('chair', 'Chair', 'Stuhl', 0.9),
  ('guitar', 'Guitar', 'Gitarre', 1.0),
  ('bicycle', 'Bicycle', 'Fahrrad', 1.1),
  ('wheelie_bin', 'Wheelie bin', 'Mülltonne', 1.1),
  ('office_chair', 'Office chair', 'Bürostuhl', 1.15),
  ('penguin', 'Emperor penguin', 'Kaiserpinguin', 1.15),
  ('postbox', 'Postbox', 'Briefkasten', 1.4),
  ('car', 'Car', 'Auto', 1.45),
  ('person', 'Adult', 'Erwachsener', 1.75),
  ('fridge', 'Fridge', 'Kühlschrank', 1.8),
  ('double_bass', 'Double bass', 'Kontrabass', 1.85),
  ('door', 'Door', 'Tür', 2.0),
  ('wardrobe', 'Wardrobe', 'Kleiderschrank', 2.1),
  ('street_sign', 'Street sign', 'Straßenschild', 2.1),
  ('phone_box', 'Phone box', 'Telefonzelle', 2.5),
  ('ladder', 'Ladder', 'Leiter', 3.0),
  ('traffic_light', 'Traffic light', 'Ampel', 3.0),
  ('basketball_hoop', 'Basketball hoop', 'Basketballkorb', 3.05),
  ('lorry', 'Lorry', 'Lastwagen', 4.0),
  ('bus_double_decker', 'Double-decker bus', 'Doppeldeckerbus', 4.4),
  ('lamp_post', 'Lamp post', 'Laternenmast', 5.0),
  ('giraffe', 'Giraffe', 'Giraffe', 5.5),
  ('tree_oak', 'Oak tree', 'Eiche', 20.0)
on conflict (shape_key) do nothing;
