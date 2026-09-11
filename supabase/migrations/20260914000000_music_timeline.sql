-- Music Timeline: a song plays, and the player whose turn it is slots it
-- into their own timeline of songs they have already won. Get the decade
-- right and the card joins their timeline; get it wrong and it is gone.
-- First player to fill their timeline takes the game.
--
-- Audio
-- -----
-- The host signs in to Spotify and their browser becomes the speaker for
-- the room, via the Web Playback SDK. Nothing here stores audio or a
-- Spotify id by default: the recording is looked up at play time from the
-- title and artist below, which keeps the list from rotting as the
-- catalogue shifts. spotify_track_id is there to pin a song whose search
-- resolves to the wrong recording — a live take, say — and is null until
-- somebody needs it.
--
-- Years
-- -----
-- release_year is the year the recording was ORIGINALLY released, which is
-- the whole basis for scoring, so it is curated here rather than read back
-- from any API. Streaming metadata dates a remaster to the year of the
-- remaster, which would put a 1975 song in the 2010s and mark a correct
-- placement wrong. Songs whose original year is genuinely contested were
-- left out instead of guessed at.

create table if not exists music_songs (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  artist text not null,

  release_year int not null
    check (release_year between 1900 and 2100),

  -- Optional override for a song that does not resolve cleanly by search.
  spotify_track_id text,

  -- 'de' songs are dealt only in German rooms; 'intl' in every room.
  locale text not null default 'intl'
    check (locale in ('intl', 'de')),

  active boolean not null default true,

  created_at timestamptz not null default now(),

  unique (title, artist)
);

create table if not exists music_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,

  status text not null default 'playing'
    check (status in ('playing', 'finished')),

  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- One turn: one player, one song, one placement.
create table if not exists music_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  session_id uuid not null references music_sessions(id) on delete cascade,

  round_number int not null,

  status text not null default 'placing'
    check (status in ('placing', 'reveal', 'finished')),

  song_id uuid not null references music_songs(id),

  current_player_id uuid references players(id) on delete set null,

  created_at timestamptz not null default now(),
  ends_at timestamptz,

  unique (session_id, round_number)
);

-- The cards a player has won. Their timeline is these, sorted by year.
create table if not exists music_cards (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references music_sessions(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  song_id uuid not null references music_songs(id),

  -- The card everyone starts with, which was never placed.
  is_starter boolean not null default false,

  created_at timestamptz not null default now(),

  unique (session_id, player_id, song_id)
);

-- The attempt itself, kept so the reveal can show what was chosen.
create table if not exists music_placements (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references music_rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,

  -- Which gap in their timeline, counting from the earliest end.
  slot_index int not null,

  is_correct boolean not null default false,
  points int not null default 0,

  created_at timestamptz not null default now(),

  unique (round_id, player_id)
);

create index if not exists music_songs_pool_idx
  on music_songs (locale, active);

create index if not exists music_rounds_session_idx
  on music_rounds (session_id);

create index if not exists music_cards_session_idx
  on music_cards (session_id, player_id);

create index if not exists music_placements_round_idx
  on music_placements (round_id);

alter table music_songs enable row level security;
alter table music_sessions enable row level security;
alter table music_rounds enable row level security;
alter table music_cards enable row level security;
alter table music_placements enable row level security;

create policy "Anyone can read Music songs"
  on music_songs for select
  using (true);

create policy "Anyone can manage Music sessions"
  on music_sessions for all
  using (true)
  with check (true);

create policy "Anyone can manage Music rounds"
  on music_rounds for all
  using (true)
  with check (true);

create policy "Anyone can manage Music cards"
  on music_cards for all
  using (true)
  with check (true);

create policy "Anyone can manage Music placements"
  on music_placements for all
  using (true)
  with check (true);

alter publication supabase_realtime add table music_sessions;
alter publication supabase_realtime add table music_rounds;
alter publication supabase_realtime add table music_cards;
alter publication supabase_realtime add table music_placements;


-- ----------------------------------------------------------------
-- Starter content: 99 international and 24 German-language
-- songs, spread across every decade from the 1950s on so a timeline has
-- somewhere to grow in both directions.
-- ----------------------------------------------------------------

-- international
insert into music_songs (title, artist, release_year, locale) values
  ('Jailhouse Rock', 'Elvis Presley', 1957, 'intl'),
  ('Johnny B. Goode', 'Chuck Berry', 1958, 'intl'),
  ('She Loves You', 'The Beatles', 1963, 'intl'),
  ('(I Can''t Get No) Satisfaction', 'The Rolling Stones', 1965, 'intl'),
  ('Good Vibrations', 'The Beach Boys', 1966, 'intl'),
  ('Respect', 'Aretha Franklin', 1967, 'intl'),
  ('Light My Fire', 'The Doors', 1967, 'intl'),
  ('What a Wonderful World', 'Louis Armstrong', 1967, 'intl'),
  ('I Heard It Through the Grapevine', 'Marvin Gaye', 1968, 'intl'),
  ('Hey Jude', 'The Beatles', 1968, 'intl'),
  ('Bad Moon Rising', 'Creedence Clearwater Revival', 1969, 'intl'),
  ('Stairway to Heaven', 'Led Zeppelin', 1971, 'intl'),
  ('What''s Going On', 'Marvin Gaye', 1971, 'intl'),
  ('American Pie', 'Don McLean', 1971, 'intl'),
  ('Money', 'Pink Floyd', 1973, 'intl'),
  ('Goodbye Yellow Brick Road', 'Elton John', 1973, 'intl'),
  ('Waterloo', 'ABBA', 1974, 'intl'),
  ('Bohemian Rhapsody', 'Queen', 1975, 'intl'),
  ('Hotel California', 'Eagles', 1976, 'intl'),
  ('Dancing Queen', 'ABBA', 1976, 'intl'),
  ('Dreams', 'Fleetwood Mac', 1977, 'intl'),
  ('Stayin'' Alive', 'Bee Gees', 1977, 'intl'),
  ('I Feel Love', 'Donna Summer', 1977, 'intl'),
  ('Heart of Glass', 'Blondie', 1978, 'intl'),
  ('Video Killed the Radio Star', 'The Buggles', 1979, 'intl'),
  ('Another Brick in the Wall, Part 2', 'Pink Floyd', 1979, 'intl'),
  ('We Are Family', 'Sister Sledge', 1979, 'intl'),
  ('Under Pressure', 'Queen', 1981, 'intl'),
  ('Don''t You Want Me', 'The Human League', 1981, 'intl'),
  ('Billie Jean', 'Michael Jackson', 1983, 'intl'),
  ('Sweet Dreams (Are Made of This)', 'Eurythmics', 1983, 'intl'),
  ('Karma Chameleon', 'Culture Club', 1983, 'intl'),
  ('When Doves Cry', 'Prince', 1984, 'intl'),
  ('Last Christmas', 'Wham!', 1984, 'intl'),
  ('Do They Know It''s Christmas?', 'Band Aid', 1984, 'intl'),
  ('Take On Me', 'a-ha', 1985, 'intl'),
  ('Livin'' on a Prayer', 'Bon Jovi', 1986, 'intl'),
  ('(You Gotta) Fight for Your Right (To Party!)', 'Beastie Boys', 1986, 'intl'),
  ('I Wanna Dance with Somebody (Who Loves Me)', 'Whitney Houston', 1987, 'intl'),
  ('Never Gonna Give You Up', 'Rick Astley', 1987, 'intl'),
  ('Sweet Child o'' Mine', 'Guns N'' Roses', 1987, 'intl'),
  ('The Look', 'Roxette', 1989, 'intl'),
  ('Like a Prayer', 'Madonna', 1989, 'intl'),
  ('Pump Up the Jam', 'Technotronic', 1989, 'intl'),
  ('Smells Like Teen Spirit', 'Nirvana', 1991, 'intl'),
  ('Rhythm Is a Dancer', 'Snap!', 1992, 'intl'),
  ('I Will Always Love You', 'Whitney Houston', 1992, 'intl'),
  ('Nuthin'' but a ''G'' Thang', 'Dr. Dre', 1992, 'intl'),
  ('What Is Love', 'Haddaway', 1993, 'intl'),
  ('Wonderwall', 'Oasis', 1995, 'intl'),
  ('Gangsta''s Paradise', 'Coolio', 1995, 'intl'),
  ('Ironic', 'Alanis Morissette', 1996, 'intl'),
  ('Wannabe', 'Spice Girls', 1996, 'intl'),
  ('MMMBop', 'Hanson', 1997, 'intl'),
  ('Everybody (Backstreet''s Back)', 'Backstreet Boys', 1997, 'intl'),
  ('Believe', 'Cher', 1998, 'intl'),
  ('...Baby One More Time', 'Britney Spears', 1998, 'intl'),
  ('My Name Is', 'Eminem', 1999, 'intl'),
  ('Smooth', 'Santana', 1999, 'intl'),
  ('Livin'' la Vida Loca', 'Ricky Martin', 1999, 'intl'),
  ('Mambo No. 5 (A Little Bit of...)', 'Lou Bega', 1999, 'intl'),
  ('Stan', 'Eminem', 2000, 'intl'),
  ('Independent Women, Pt. 1', 'Destiny''s Child', 2000, 'intl'),
  ('Clint Eastwood', 'Gorillaz', 2001, 'intl'),
  ('Can''t Get You Out of My Head', 'Kylie Minogue', 2001, 'intl'),
  ('Hot in Herre', 'Nelly', 2002, 'intl'),
  ('Lose Yourself', 'Eminem', 2002, 'intl'),
  ('Hey Ya!', 'OutKast', 2003, 'intl'),
  ('Crazy in Love', 'Beyoncé', 2003, 'intl'),
  ('American Idiot', 'Green Day', 2004, 'intl'),
  ('Hollaback Girl', 'Gwen Stefani', 2005, 'intl'),
  ('Crazy', 'Gnarls Barkley', 2006, 'intl'),
  ('Rehab', 'Amy Winehouse', 2006, 'intl'),
  ('Umbrella', 'Rihanna', 2007, 'intl'),
  ('Poker Face', 'Lady Gaga', 2008, 'intl'),
  ('Sex on Fire', 'Kings of Leon', 2008, 'intl'),
  ('I Gotta Feeling', 'The Black Eyed Peas', 2009, 'intl'),
  ('Empire State of Mind', 'JAY-Z', 2009, 'intl'),
  ('Rolling in the Deep', 'Adele', 2010, 'intl'),
  ('Party Rock Anthem', 'LMFAO', 2011, 'intl'),
  ('Somebody That I Used to Know', 'Gotye', 2011, 'intl'),
  ('Gangnam Style', 'PSY', 2012, 'intl'),
  ('Get Lucky', 'Daft Punk', 2013, 'intl'),
  ('Happy', 'Pharrell Williams', 2013, 'intl'),
  ('Uptown Funk', 'Mark Ronson', 2014, 'intl'),
  ('Thinking Out Loud', 'Ed Sheeran', 2014, 'intl'),
  ('Hello', 'Adele', 2015, 'intl'),
  ('One Dance', 'Drake', 2016, 'intl'),
  ('Despacito', 'Luis Fonsi', 2017, 'intl'),
  ('Shape of You', 'Ed Sheeran', 2017, 'intl'),
  ('Havana', 'Camila Cabello', 2017, 'intl'),
  ('This Is America', 'Childish Gambino', 2018, 'intl'),
  ('Bad Guy', 'Billie Eilish', 2019, 'intl'),
  ('Blinding Lights', 'The Weeknd', 2019, 'intl'),
  ('Don''t Start Now', 'Dua Lipa', 2019, 'intl'),
  ('drivers license', 'Olivia Rodrigo', 2021, 'intl'),
  ('MONTERO (Call Me By Your Name)', 'Lil Nas X', 2021, 'intl'),
  ('As It Was', 'Harry Styles', 2022, 'intl'),
  ('Flowers', 'Miley Cyrus', 2023, 'intl')
on conflict (title, artist) do nothing;

-- German-language
insert into music_songs (title, artist, release_year, locale) values
  ('Du hast den Farbfilm vergessen', 'Nina Hagen', 1974, 'de'),
  ('Griechischer Wein', 'Udo Jürgens', 1974, 'de'),
  ('Das Modell', 'Kraftwerk', 1978, 'de'),
  ('Der Kommissar', 'Falco', 1981, 'de'),
  ('Da Da Da ich lieb dich nicht du liebst mich nicht', 'Trio', 1982, 'de'),
  ('99 Luftballons', 'Nena', 1983, 'de'),
  ('Männer', 'Herbert Grönemeyer', 1984, 'de'),
  ('Irgendwie, irgendwo, irgendwann', 'Nena', 1984, 'de'),
  ('Rock Me Amadeus', 'Falco', 1985, 'de'),
  ('Westerland', 'Die Ärzte', 1988, 'de'),
  ('Die da!?', 'Die Fantastischen Vier', 1992, 'de'),
  ('Alles nur geklaut', 'Die Prinzen', 1993, 'de'),
  ('Hyper Hyper', 'Scooter', 1994, 'de'),
  ('Du hast', 'Rammstein', 1997, 'de'),
  ('Sonne', 'Rammstein', 2001, 'de'),
  ('Nur ein Wort', 'Wir sind Helden', 2005, 'de'),
  ('Dieser Weg', 'Xavier Naidoo', 2005, 'de'),
  ('Das Beste', 'Silbermond', 2006, 'de'),
  ('Haus am See', 'Peter Fox', 2008, 'de'),
  ('Easy', 'Cro', 2012, 'de'),
  ('Tage wie diese', 'Die Toten Hosen', 2012, 'de'),
  ('Auf uns', 'Andreas Bourani', 2014, 'de'),
  ('Chöre', 'Mark Forster', 2016, 'de'),
  ('Roller', 'Apache 207', 2019, 'de')
on conflict (title, artist) do nothing;
