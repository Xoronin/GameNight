-- Higher / Lower game: content table + session/round/guess tables.
--
-- RLS policies below use a permissive "anyone can read/write" model,
-- matching how the app talks to gameplay tables today (players are not
-- authenticated Supabase users). Adjust if your project enforces
-- stricter policies elsewhere.

create table if not exists higher_lower_items (
  id uuid primary key default gen_random_uuid(),

  label_en text not null,
  label_de text not null,

  category_en text not null,
  category_de text not null,

  unit_en text,
  unit_de text,

  value numeric not null,

  difficulty text not null default 'medium'
    check (difficulty in ('easy', 'medium', 'hard')),

  active boolean not null default true,

  created_at timestamptz not null default now()
);

create table if not exists higher_lower_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,

  difficulty text not null default 'mixed'
    check (difficulty in ('mixed', 'easy', 'medium', 'hard')),

  status text not null default 'playing'
    check (status in ('playing', 'finished')),

  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists higher_lower_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  session_id uuid not null references higher_lower_sessions(id) on delete cascade,

  round_number int not null,

  current_item_id uuid not null references higher_lower_items(id),
  next_item_id uuid not null references higher_lower_items(id),

  status text not null default 'guessing'
    check (status in ('guessing', 'reveal', 'finished')),

  created_at timestamptz not null default now(),

  unique (session_id, round_number)
);

create table if not exists higher_lower_guesses (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references higher_lower_rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,

  guess text not null check (guess in ('higher', 'lower')),
  is_correct boolean,

  created_at timestamptz not null default now(),

  unique (round_id, player_id)
);

create index if not exists higher_lower_rounds_session_idx
  on higher_lower_rounds (session_id);

create index if not exists higher_lower_guesses_round_idx
  on higher_lower_guesses (round_id);

alter table higher_lower_items enable row level security;
alter table higher_lower_sessions enable row level security;
alter table higher_lower_rounds enable row level security;
alter table higher_lower_guesses enable row level security;

create policy "Anyone can read Higher / Lower items"
  on higher_lower_items for select
  using (true);

create policy "Anyone can manage Higher / Lower sessions"
  on higher_lower_sessions for all
  using (true)
  with check (true);

create policy "Anyone can manage Higher / Lower rounds"
  on higher_lower_rounds for all
  using (true)
  with check (true);

create policy "Anyone can manage Higher / Lower guesses"
  on higher_lower_guesses for all
  using (true)
  with check (true);

-- ----------------------------------------------------------------
-- Starter content (60 items across 6 categories).
-- Values are illustrative party-trivia figures, not live statistics.
-- ----------------------------------------------------------------

insert into higher_lower_items
  (label_en, label_de, category_en, category_de, unit_en, unit_de, value, difficulty)
values
  -- Mountain Heights (m)
  ('Mount Everest', 'Mount Everest', 'Mountain Heights', 'Berghöhen', 'm', 'm', 8849, 'easy'),
  ('K2', 'K2', 'Mountain Heights', 'Berghöhen', 'm', 'm', 8611, 'medium'),
  ('Kangchenjunga', 'Kangchenjunga', 'Mountain Heights', 'Berghöhen', 'm', 'm', 8586, 'hard'),
  ('Denali', 'Denali', 'Mountain Heights', 'Berghöhen', 'm', 'm', 6190, 'medium'),
  ('Kilimanjaro', 'Kilimandscharo', 'Mountain Heights', 'Berghöhen', 'm', 'm', 5895, 'easy'),
  ('Mont Blanc', 'Mont Blanc', 'Mountain Heights', 'Berghöhen', 'm', 'm', 4808, 'medium'),
  ('Matterhorn', 'Matterhorn', 'Mountain Heights', 'Berghöhen', 'm', 'm', 4478, 'medium'),
  ('Mount Fuji', 'Fuji', 'Mountain Heights', 'Berghöhen', 'm', 'm', 3776, 'easy'),
  ('Ben Nevis', 'Ben Nevis', 'Mountain Heights', 'Berghöhen', 'm', 'm', 1345, 'hard'),
  ('Zugspitze', 'Zugspitze', 'Mountain Heights', 'Berghöhen', 'm', 'm', 2962, 'hard'),

  -- River Lengths (km)
  ('Nile', 'Nil', 'River Lengths', 'Flusslängen', 'km', 'km', 6650, 'easy'),
  ('Amazon', 'Amazonas', 'River Lengths', 'Flusslängen', 'km', 'km', 6400, 'easy'),
  ('Yangtze', 'Jangtse', 'River Lengths', 'Flusslängen', 'km', 'km', 6300, 'medium'),
  ('Mississippi', 'Mississippi', 'River Lengths', 'Flusslängen', 'km', 'km', 3730, 'medium'),
  ('Volga', 'Wolga', 'River Lengths', 'Flusslängen', 'km', 'km', 3530, 'hard'),
  ('Danube', 'Donau', 'River Lengths', 'Flusslängen', 'km', 'km', 2850, 'medium'),
  ('Rhine', 'Rhein', 'River Lengths', 'Flusslängen', 'km', 'km', 1230, 'medium'),
  ('Elbe', 'Elbe', 'River Lengths', 'Flusslängen', 'km', 'km', 1094, 'hard'),
  ('Seine', 'Seine', 'River Lengths', 'Flusslängen', 'km', 'km', 777, 'hard'),
  ('Thames', 'Themse', 'River Lengths', 'Flusslängen', 'km', 'km', 346, 'easy'),

  -- Country Population (people)
  ('China', 'China', 'Country Population', 'Bevölkerung eines Landes', 'people', 'Einwohner', 1412000000, 'easy'),
  ('India', 'Indien', 'Country Population', 'Bevölkerung eines Landes', 'people', 'Einwohner', 1417000000, 'easy'),
  ('United States', 'USA', 'Country Population', 'Bevölkerung eines Landes', 'people', 'Einwohner', 335000000, 'easy'),
  ('Indonesia', 'Indonesien', 'Country Population', 'Bevölkerung eines Landes', 'people', 'Einwohner', 277000000, 'medium'),
  ('Nigeria', 'Nigeria', 'Country Population', 'Bevölkerung eines Landes', 'people', 'Einwohner', 223000000, 'medium'),
  ('Germany', 'Deutschland', 'Country Population', 'Bevölkerung eines Landes', 'people', 'Einwohner', 84000000, 'medium'),
  ('France', 'Frankreich', 'Country Population', 'Bevölkerung eines Landes', 'people', 'Einwohner', 68000000, 'medium'),
  ('United Kingdom', 'Vereinigtes Königreich', 'Country Population', 'Bevölkerung eines Landes', 'people', 'Einwohner', 67000000, 'medium'),
  ('Switzerland', 'Schweiz', 'Country Population', 'Bevölkerung eines Landes', 'people', 'Einwohner', 8800000, 'hard'),
  ('Austria', 'Österreich', 'Country Population', 'Bevölkerung eines Landes', 'people', 'Einwohner', 9100000, 'hard'),

  -- Building Height (m)
  ('Burj Khalifa', 'Burj Khalifa', 'Building Height', 'Gebäudehöhe', 'm', 'm', 828, 'easy'),
  ('Shanghai Tower', 'Shanghai Tower', 'Building Height', 'Gebäudehöhe', 'm', 'm', 632, 'hard'),
  ('CN Tower', 'CN Tower', 'Building Height', 'Gebäudehöhe', 'm', 'm', 553, 'medium'),
  ('Berlin TV Tower', 'Berliner Fernsehturm', 'Building Height', 'Gebäudehöhe', 'm', 'm', 368, 'hard'),
  ('Empire State Building', 'Empire State Building', 'Building Height', 'Gebäudehöhe', 'm', 'm', 381, 'medium'),
  ('Eiffel Tower', 'Eiffelturm', 'Building Height', 'Gebäudehöhe', 'm', 'm', 330, 'easy'),
  ('Big Ben (Elizabeth Tower)', 'Big Ben (Elizabeth Tower)', 'Building Height', 'Gebäudehöhe', 'm', 'm', 96, 'medium'),
  ('Statue of Liberty', 'Freiheitsstatue', 'Building Height', 'Gebäudehöhe', 'm', 'm', 93, 'medium'),
  ('Cologne Cathedral', 'Kölner Dom', 'Building Height', 'Gebäudehöhe', 'm', 'm', 157, 'hard'),
  ('Leaning Tower of Pisa', 'Schiefer Turm von Pisa', 'Building Height', 'Gebäudehöhe', 'm', 'm', 56, 'easy'),

  -- Animal Speed (km/h)
  ('Cheetah', 'Gepard', 'Animal Speed', 'Tiergeschwindigkeit', 'km/h', 'km/h', 110, 'easy'),
  ('Pronghorn Antelope', 'Gabelbock', 'Animal Speed', 'Tiergeschwindigkeit', 'km/h', 'km/h', 88, 'hard'),
  ('Lion', 'Löwe', 'Animal Speed', 'Tiergeschwindigkeit', 'km/h', 'km/h', 80, 'medium'),
  ('Greyhound', 'Windhund', 'Animal Speed', 'Tiergeschwindigkeit', 'km/h', 'km/h', 70, 'medium'),
  ('Domestic Cat', 'Hauskatze', 'Animal Speed', 'Tiergeschwindigkeit', 'km/h', 'km/h', 48, 'medium'),
  ('Human (Usain Bolt top speed)', 'Mensch (Usain Bolts Höchstgeschwindigkeit)', 'Animal Speed', 'Tiergeschwindigkeit', 'km/h', 'km/h', 44, 'easy'),
  ('Elephant', 'Elefant', 'Animal Speed', 'Tiergeschwindigkeit', 'km/h', 'km/h', 40, 'medium'),
  ('Chicken', 'Huhn', 'Animal Speed', 'Tiergeschwindigkeit', 'km/h', 'km/h', 14, 'hard'),
  ('Giant Tortoise', 'Riesenschildkröte', 'Animal Speed', 'Tiergeschwindigkeit', 'km/h', 'km/h', 0.3, 'hard'),
  ('Garden Snail', 'Gartenschnecke', 'Animal Speed', 'Tiergeschwindigkeit', 'km/h', 'km/h', 0.05, 'easy'),

  -- Movie Box Office (million USD, lifetime worldwide gross)
  ('Avatar (2009)', 'Avatar (2009)', 'Movie Box Office', 'Filmeinspielergebnis', 'million USD', 'Mio. USD', 2923, 'easy'),
  ('Avengers: Endgame', 'Avengers: Endgame', 'Movie Box Office', 'Filmeinspielergebnis', 'million USD', 'Mio. USD', 2799, 'easy'),
  ('Titanic', 'Titanic', 'Movie Box Office', 'Filmeinspielergebnis', 'million USD', 'Mio. USD', 2264, 'easy'),
  ('Star Wars: The Force Awakens', 'Star Wars: Das Erwachen der Macht', 'Movie Box Office', 'Filmeinspielergebnis', 'million USD', 'Mio. USD', 2071, 'medium'),
  ('Avengers: Infinity War', 'Avengers: Infinity War', 'Movie Box Office', 'Filmeinspielergebnis', 'million USD', 'Mio. USD', 2048, 'medium'),
  ('Spider-Man: No Way Home', 'Spider-Man: No Way Home', 'Movie Box Office', 'Filmeinspielergebnis', 'million USD', 'Mio. USD', 1922, 'medium'),
  ('Jurassic World', 'Jurassic World', 'Movie Box Office', 'Filmeinspielergebnis', 'million USD', 'Mio. USD', 1671, 'medium'),
  ('The Avengers (2012)', 'Marvel’s The Avengers (2012)', 'Movie Box Office', 'Filmeinspielergebnis', 'million USD', 'Mio. USD', 1519, 'medium'),
  ('The Lion King (2019)', 'Der König der Löwen (2019)', 'Movie Box Office', 'Filmeinspielergebnis', 'million USD', 'Mio. USD', 1663, 'hard'),
  ('Frozen II', 'Die Eiskönigin II', 'Movie Box Office', 'Filmeinspielergebnis', 'million USD', 'Mio. USD', 1450, 'hard');
