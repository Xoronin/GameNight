-- Emoji Decode: content table + session/round/guess tables.
--
-- Unlike the other quiz games the answer is typed rather than picked, so
-- guesses are not unique per player: a player may keep trying until they
-- get it or the clock runs out. The partial unique index is what stops a
-- player scoring the same round twice.

create table if not exists emoji_puzzles (
  id uuid primary key default gen_random_uuid(),

  emojis text not null,

  category_en text not null,
  category_de text not null,

  answer_en text not null,
  answer_de text not null,

  -- Other spellings worth accepting: a German room still shouts the
  -- English title, and some answers have a common short form.
  aliases_en text[] not null default '{}',
  aliases_de text[] not null default '{}',

  difficulty text not null default 'medium'
    check (difficulty in ('easy', 'medium', 'hard')),

  active boolean not null default true,

  created_at timestamptz not null default now()
);

create table if not exists emoji_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,

  status text not null default 'playing'
    check (status in ('playing', 'finished')),

  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists emoji_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  session_id uuid not null references emoji_sessions(id) on delete cascade,

  round_number int not null,

  puzzle_id uuid not null references emoji_puzzles(id),

  status text not null default 'answering'
    check (status in ('answering', 'reveal', 'finished')),

  created_at timestamptz not null default now(),
  ends_at timestamptz,

  unique (session_id, round_number)
);

create table if not exists emoji_guesses (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references emoji_rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,

  guess text not null,

  is_correct boolean not null default false,
  points int not null default 0,

  created_at timestamptz not null default now()
);

create index if not exists emoji_rounds_session_idx
  on emoji_rounds (session_id);

create index if not exists emoji_guesses_round_idx
  on emoji_guesses (round_id);

-- Wrong guesses may repeat; a solve may not.
create unique index if not exists emoji_guesses_solved_idx
  on emoji_guesses (round_id, player_id)
  where is_correct;

alter table emoji_puzzles enable row level security;
alter table emoji_sessions enable row level security;
alter table emoji_rounds enable row level security;
alter table emoji_guesses enable row level security;

create policy "Anyone can read Emoji puzzles"
  on emoji_puzzles for select
  using (true);

create policy "Anyone can manage Emoji sessions"
  on emoji_sessions for all
  using (true)
  with check (true);

create policy "Anyone can manage Emoji rounds"
  on emoji_rounds for all
  using (true)
  with check (true);

create policy "Anyone can manage Emoji guesses"
  on emoji_guesses for all
  using (true)
  with check (true);

alter publication supabase_realtime add table emoji_sessions;
alter publication supabase_realtime add table emoji_rounds;
alter publication supabase_realtime add table emoji_guesses;

-- ----------------------------------------------------------------
-- Starter content (51 puzzles across 3 categories).
--
-- German answers use the German release title where there is one, and
-- carry the English title as an alias, because that is what people
-- actually shout at each other.
-- ----------------------------------------------------------------

insert into emoji_puzzles
  (emojis, category_en, category_de, answer_en, answer_de, aliases_en, aliases_de, difficulty)
values
  -- Movies / Filme
  ('🦁👑', 'Movie', 'Film', 'The Lion King', 'Der König der Löwen',
    ARRAY['Lion King'], ARRAY['The Lion King','König der Löwen'], 'easy'),
  ('🐟🔍🌊', 'Movie', 'Film', 'Finding Nemo', 'Findet Nemo',
    ARRAY[]::text[], ARRAY['Finding Nemo'], 'easy'),
  ('🚢🧊💔', 'Movie', 'Film', 'Titanic', 'Titanic',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🕷️🧍‍♂️🕸️', 'Movie', 'Film', 'Spider-Man', 'Spider-Man',
    ARRAY['Spiderman'], ARRAY['Spiderman'], 'easy'),
  ('💍🌋🧙‍♂️', 'Movie', 'Film', 'The Lord of the Rings', 'Der Herr der Ringe',
    ARRAY['Lord of the Rings','LOTR'], ARRAY['The Lord of the Rings','Herr der Ringe'], 'easy'),
  ('🦖🏝️🚙', 'Movie', 'Film', 'Jurassic Park', 'Jurassic Park',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('👻🚫🔫', 'Movie', 'Film', 'Ghostbusters', 'Ghostbusters',
    ARRAY[]::text[], ARRAY['Die Geisterjäger'], 'medium'),
  ('🤖🌱❤️', 'Movie', 'Film', 'WALL-E', 'WALL-E',
    ARRAY['WALLE','Wall E'], ARRAY['WALLE','Wall E'], 'medium'),
  ('🎈🏠👴', 'Movie', 'Film', 'Up', 'Oben',
    ARRAY[]::text[], ARRAY['Up'], 'medium'),
  ('❄️👸🏰', 'Movie', 'Film', 'Frozen', 'Die Eiskönigin',
    ARRAY[]::text[], ARRAY['Frozen','Eiskönigin'], 'easy'),
  ('🐭🍝👨‍🍳', 'Movie', 'Film', 'Ratatouille', 'Ratatouille',
    ARRAY[]::text[], ARRAY[]::text[], 'medium'),
  ('🃏🦇🌃', 'Movie', 'Film', 'The Dark Knight', 'The Dark Knight',
    ARRAY['Dark Knight','Batman'], ARRAY['Dark Knight','Batman'], 'medium'),
  ('🧠😢😡😱', 'Movie', 'Film', 'Inside Out', 'Alles steht Kopf',
    ARRAY[]::text[], ARRAY['Inside Out'], 'medium'),
  ('👽🚲🌕', 'Movie', 'Film', 'E.T.', 'E.T.',
    ARRAY['ET','E T'], ARRAY['ET','E T'], 'medium'),
  ('🔴💊🕶️', 'Movie', 'Film', 'The Matrix', 'Matrix',
    ARRAY['Matrix'], ARRAY['The Matrix'], 'easy'),
  ('🚗⚡🏁', 'Movie', 'Film', 'Cars', 'Cars',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🐼🥋🥢', 'Movie', 'Film', 'Kung Fu Panda', 'Kung Fu Panda',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🧸🤠🚀', 'Movie', 'Film', 'Toy Story', 'Toy Story',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('⚡🧙‍♂️🏰', 'Movie', 'Film', 'Harry Potter', 'Harry Potter',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🌪️🏠👠', 'Movie', 'Film', 'The Wizard of Oz', 'Der Zauberer von Oz',
    ARRAY['Wizard of Oz'], ARRAY['The Wizard of Oz','Zauberer von Oz'], 'medium'),
  ('🦈🌊🏊', 'Movie', 'Film', 'Jaws', 'Der weiße Hai',
    ARRAY[]::text[], ARRAY['Jaws','Weisser Hai'], 'medium'),
  ('🕶️👽🔫', 'Movie', 'Film', 'Men in Black', 'Men in Black',
    ARRAY['MIB'], ARRAY['MIB'], 'medium'),
  ('⏰🚗⚡', 'Movie', 'Film', 'Back to the Future', 'Zurück in die Zukunft',
    ARRAY[]::text[], ARRAY['Back to the Future'], 'medium'),
  ('🏴‍☠️💀⚓', 'Movie', 'Film', 'Pirates of the Caribbean', 'Fluch der Karibik',
    ARRAY[]::text[], ARRAY['Pirates of the Caribbean'], 'medium'),
  ('🧊🐿️🌰', 'Movie', 'Film', 'Ice Age', 'Ice Age',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🤵🔫🍸', 'Movie', 'Film', 'James Bond', 'James Bond',
    ARRAY['007'], ARRAY['007'], 'medium'),

  -- Games / Spiele
  ('🍄🐢👨‍🔧', 'Game', 'Spiel', 'Super Mario', 'Super Mario',
    ARRAY['Mario'], ARRAY['Mario'], 'easy'),
  ('🧱⛏️🐷', 'Game', 'Spiel', 'Minecraft', 'Minecraft',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🗡️🛡️🧝', 'Game', 'Spiel', 'The Legend of Zelda', 'The Legend of Zelda',
    ARRAY['Zelda'], ARRAY['Zelda'], 'medium'),
  ('🦔💨💍', 'Game', 'Spiel', 'Sonic the Hedgehog', 'Sonic the Hedgehog',
    ARRAY['Sonic'], ARRAY['Sonic'], 'easy'),
  ('🟦🟨🟪⬇️', 'Game', 'Spiel', 'Tetris', 'Tetris',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🐦💥🐷', 'Game', 'Spiel', 'Angry Birds', 'Angry Birds',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('👻🟡🍒', 'Game', 'Spiel', 'Pac-Man', 'Pac-Man',
    ARRAY['Pacman'], ARRAY['Pacman'], 'easy'),
  ('🚗🚔💰', 'Game', 'Spiel', 'Grand Theft Auto', 'Grand Theft Auto',
    ARRAY['GTA'], ARRAY['GTA'], 'medium'),
  ('🚀👨‍🚀🔪', 'Game', 'Spiel', 'Among Us', 'Among Us',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('⚔️🐺🧙', 'Game', 'Spiel', 'The Witcher', 'The Witcher',
    ARRAY['Witcher'], ARRAY['Witcher','Hexer'], 'medium'),
  ('🪂🏝️🔫', 'Game', 'Spiel', 'Fortnite', 'Fortnite',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🧟🔫🏚️', 'Game', 'Spiel', 'Resident Evil', 'Resident Evil',
    ARRAY[]::text[], ARRAY[]::text[], 'medium'),
  ('🐵🍌🛢️', 'Game', 'Spiel', 'Donkey Kong', 'Donkey Kong',
    ARRAY[]::text[], ARRAY[]::text[], 'medium'),
  ('⚽🎮🏆', 'Game', 'Spiel', 'FIFA', 'FIFA',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🐹⚡🔴', 'Game', 'Spiel', 'Pokemon', 'Pokémon',
    ARRAY['Pokémon'], ARRAY['Pokemon'], 'easy'),

  -- Sayings / Redewendungen
  ('🐱👜', 'Saying', 'Redewendung', 'Let the cat out of the bag', 'Die Katze aus dem Sack lassen',
    ARRAY['Cat out of the bag'], ARRAY['Die Katze aus dem Sack','Katze aus dem Sack lassen'], 'medium'),
  ('🔨🎯', 'Saying', 'Redewendung', 'Hit the nail on the head', 'Den Nagel auf den Kopf treffen',
    ARRAY['Nail on the head'], ARRAY['Nagel auf den Kopf treffen'], 'medium'),
  ('🐘🚪', 'Saying', 'Redewendung', 'The elephant in the room', 'Der Elefant im Raum',
    ARRAY['Elephant in the room'], ARRAY['Elefant im Raum'], 'medium'),
  ('🐦🪱⏰', 'Saying', 'Redewendung', 'The early bird catches the worm', 'Der frühe Vogel fängt den Wurm',
    ARRAY['Early bird catches the worm'], ARRAY['Der fruehe Vogel faengt den Wurm'], 'medium'),
  ('🧊🗻', 'Saying', 'Redewendung', 'The tip of the iceberg', 'Die Spitze des Eisbergs',
    ARRAY['Tip of the iceberg'], ARRAY['Spitze des Eisbergs'], 'medium'),
  ('💰🌳🚫', 'Saying', 'Redewendung', 'Money does not grow on trees', 'Geld wächst nicht auf Bäumen',
    ARRAY['Money doesnt grow on trees'], ARRAY['Geld waechst nicht auf Baeumen'], 'hard'),
  ('🎁🐴👄', 'Saying', 'Redewendung', 'Do not look a gift horse in the mouth', 'Einem geschenkten Gaul schaut man nicht ins Maul',
    ARRAY['Dont look a gift horse in the mouth'], ARRAY['Einem geschenkten Gaul'], 'hard'),
  ('🪡🌾', 'Saying', 'Redewendung', 'A needle in a haystack', 'Die Nadel im Heuhaufen',
    ARRAY['Needle in a haystack'], ARRAY['Nadel im Heuhaufen'], 'medium'),
  ('📚🐛', 'Saying', 'Redewendung', 'A bookworm', 'Ein Bücherwurm',
    ARRAY['Bookworm'], ARRAY['Buecherwurm','Bücherwurm'], 'easy'),
  ('🌩️🥛', 'Saying', 'Redewendung', 'A storm in a teacup', 'Ein Sturm im Wasserglas',
    ARRAY['Storm in a teacup'], ARRAY['Sturm im Wasserglas'], 'hard');
