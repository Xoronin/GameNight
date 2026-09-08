-- Alphabet topics: a content bank so the host can pick "Random Topic"
-- instead of always typing a custom one. Rounds keep a nullable
-- topic_id back-reference so a session can exclude already-used
-- topics when rolling a new random one (same "don't repeat within a
-- game" pattern as Minefield's questions).

create table if not exists alphabet_topics (
  id uuid primary key default gen_random_uuid(),

  topic_en text not null,
  topic_de text not null,

  active boolean not null default true,

  created_at timestamptz not null default now()
);

alter table alphabet_topics enable row level security;

create policy "Anyone can read Alphabet topics"
  on alphabet_topics for select
  using (true);

alter table alphabet_rounds
  add column if not exists topic_id uuid references alphabet_topics(id);

-- ----------------------------------------------------------------
-- Starter content (30 topics).
-- ----------------------------------------------------------------

insert into alphabet_topics (topic_en, topic_de)
values
  ('Animals', 'Tiere'),
  ('Countries', 'Länder'),
  ('Foods', 'Speisen'),
  ('Movies', 'Filme'),
  ('Cities', 'Städte'),
  ('Fruits & Vegetables', 'Obst & Gemüse'),
  ('Jobs & Professions', 'Berufe'),
  ('Sports', 'Sportarten'),
  ('Famous People', 'Berühmte Persönlichkeiten'),
  ('Household Items', 'Haushaltsgegenstände'),
  ('School Subjects', 'Schulfächer'),
  ('Superheroes & Villains', 'Superhelden & Schurken'),
  ('Board & Card Games', 'Brett- & Kartenspiele'),
  ('Musical Instruments', 'Musikinstrumente'),
  ('Car Brands', 'Automarken'),
  ('Drinks & Beverages', 'Getränke'),
  ('Body Parts', 'Körperteile'),
  ('Clothing Items', 'Kleidungsstücke'),
  ('TV Shows', 'TV-Serien'),
  ('Video Games', 'Videospiele'),
  ('Kitchen Items', 'Küchenutensilien'),
  ('Hobbies', 'Hobbys'),
  ('Insects & Bugs', 'Insekten'),
  ('Tools', 'Werkzeuge'),
  ('Weather Phenomena', 'Wetterphänomene'),
  ('Fictional Characters', 'Fiktive Charaktere'),
  ('Famous Landmarks', 'Berühmte Wahrzeichen'),
  ('Music Genres', 'Musikrichtungen'),
  ('Birds', 'Vögel'),
  ('Desserts', 'Nachspeisen');
