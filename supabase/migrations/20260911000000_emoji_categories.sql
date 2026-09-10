-- Emoji Decode: a stable category key, and a lot more to guess.
--
-- The original table carried only the display names (category_en /
-- category_de), which are fine to show but no good to filter on: the host
-- picks categories in the lobby, and that selection cannot depend on which
-- language the room happens to be playing in.
--
-- The key is deliberately left unconstrained. A check constraint listing
-- the categories would have to be widened by a migration every time one is
-- added, and forgetting that is exactly how the Atlas map modes shipped
-- unplayable. The app owns the list; the database just stores it.

alter table emoji_puzzles
  add column if not exists category_key text;

-- Backfill the rows that shipped in the first migration.
update emoji_puzzles
  set category_key = case category_en
    when 'Movie' then 'movie'
    when 'Game' then 'game'
    when 'Saying' then 'saying'
    else lower(category_en)
  end
  where category_key is null;

alter table emoji_puzzles
  alter column category_key set not null;

create index if not exists emoji_puzzles_category_idx
  on emoji_puzzles (category_key)
  where active;

-- ----------------------------------------------------------------
-- 74 more puzzles: four new sayings, and five categories that did not
-- exist before. Each category now holds at least fourteen, so a host can
-- pick a single one and still play a full twelve-round game without a
-- repeat.
--
-- German answers use the German title where there is one and carry the
-- English as an alias, because that is what people actually shout.
-- ----------------------------------------------------------------

insert into emoji_puzzles
  (emojis, category_key, category_en, category_de, answer_en, answer_de, aliases_en, aliases_de, difficulty)
values
  -- Sayings / Redewendungen ---------------------------------------
  ('⏳💰', 'saying', 'Saying', 'Redewendung', 'Time is money', 'Zeit ist Geld',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🐦🐦🤝', 'saying', 'Saying', 'Redewendung', 'Birds of a feather flock together', 'Gleich und gleich gesellt sich gern',
    ARRAY['Birds of a feather'], ARRAY[]::text[], 'hard'),
  ('🍎📅🩺', 'saying', 'Saying', 'Redewendung', 'An apple a day keeps the doctor away', 'Ein Apfel am Tag hält den Doktor fern',
    ARRAY['An apple a day'], ARRAY['Ein Apfel am Tag'], 'medium'),
  ('👁️🔄👁️', 'saying', 'Saying', 'Redewendung', 'An eye for an eye', 'Auge um Auge',
    ARRAY['Eye for an eye'], ARRAY[]::text[], 'medium'),

  -- Songs / Lieder -------------------------------------------------
  ('🌧️💜', 'song', 'Song', 'Lied', 'Purple Rain', 'Purple Rain',
    ARRAY[]::text[], ARRAY[]::text[], 'medium'),
  ('🚀🧑‍🚀🎸', 'song', 'Song', 'Lied', 'Rocket Man', 'Rocket Man',
    ARRAY[]::text[], ARRAY[]::text[], 'medium'),
  ('👁️🐅', 'song', 'Song', 'Lied', 'Eye of the Tiger', 'Eye of the Tiger',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('💃👑', 'song', 'Song', 'Lied', 'Dancing Queen', 'Dancing Queen',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🌉💧🌊', 'song', 'Song', 'Lied', 'Bridge over Troubled Water', 'Bridge over Troubled Water',
    ARRAY[]::text[], ARRAY[]::text[], 'hard'),
  ('🧟🕺🎃', 'song', 'Song', 'Lied', 'Thriller', 'Thriller',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('❄️🙌🎵', 'song', 'Song', 'Lied', 'Let It Go', 'Lass jetzt los',
    ARRAY[]::text[], ARRAY['Let It Go'], 'medium'),
  ('👨‍🚀🌌🎸', 'song', 'Song', 'Lied', 'Space Oddity', 'Space Oddity',
    ARRAY[]::text[], ARRAY[]::text[], 'hard'),
  ('🦁😴🌙', 'song', 'Song', 'Lied', 'The Lion Sleeps Tonight', 'The Lion Sleeps Tonight',
    ARRAY['Lion Sleeps Tonight'], ARRAY[]::text[], 'medium'),
  ('🏆👑🎸', 'song', 'Song', 'Lied', 'We Are the Champions', 'We Are the Champions',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🔔🔔🛷', 'song', 'Song', 'Lied', 'Jingle Bells', 'Jingle Bells',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🕊️🌍💭', 'song', 'Song', 'Lied', 'Imagine', 'Imagine',
    ARRAY[]::text[], ARRAY[]::text[], 'medium'),
  ('☔🎵', 'song', 'Song', 'Lied', 'Umbrella', 'Umbrella',
    ARRAY[]::text[], ARRAY[]::text[], 'medium'),
  ('🏨🌴🎸', 'song', 'Song', 'Lied', 'Hotel California', 'Hotel California',
    ARRAY[]::text[], ARRAY[]::text[], 'medium'),
  ('💔🏨', 'song', 'Song', 'Lied', 'Heartbreak Hotel', 'Heartbreak Hotel',
    ARRAY[]::text[], ARRAY[]::text[], 'hard'),

  -- TV shows / Serien ----------------------------------------------
  ('🧪💊🏜️', 'show', 'TV Show', 'Serie', 'Breaking Bad', 'Breaking Bad',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🐉🗡️👑', 'show', 'TV Show', 'Serie', 'Game of Thrones', 'Game of Thrones',
    ARRAY['GOT'], ARRAY['GOT'], 'easy'),
  ('🧟🚶🔫', 'show', 'TV Show', 'Serie', 'The Walking Dead', 'The Walking Dead',
    ARRAY['Walking Dead'], ARRAY['Walking Dead'], 'easy'),
  ('☕🛋️🏙️', 'show', 'TV Show', 'Serie', 'Friends', 'Friends',
    ARRAY[]::text[], ARRAY[]::text[], 'medium'),
  ('🏢📄😬', 'show', 'TV Show', 'Serie', 'The Office', 'The Office',
    ARRAY['Office'], ARRAY['Office'], 'medium'),
  ('👽🚲🔦', 'show', 'TV Show', 'Serie', 'Stranger Things', 'Stranger Things',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('👑💂🇬🇧', 'show', 'TV Show', 'Serie', 'The Crown', 'The Crown',
    ARRAY['Crown'], ARRAY['Crown'], 'medium'),
  ('🦑💰🎮', 'show', 'TV Show', 'Serie', 'Squid Game', 'Squid Game',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🏝️✈️❓', 'show', 'TV Show', 'Serie', 'Lost', 'Lost',
    ARRAY[]::text[], ARRAY[]::text[], 'medium'),
  ('🍩🟡👨‍👩‍👧‍👦', 'show', 'TV Show', 'Serie', 'The Simpsons', 'Die Simpsons',
    ARRAY['Simpsons'], ARRAY['The Simpsons','Simpsons'], 'easy'),
  ('🔬💥🤓', 'show', 'TV Show', 'Serie', 'The Big Bang Theory', 'The Big Bang Theory',
    ARRAY['Big Bang Theory'], ARRAY['Big Bang Theory'], 'medium'),
  ('🎭💰🏦', 'show', 'TV Show', 'Serie', 'Money Heist', 'Haus des Geldes',
    ARRAY[]::text[], ARRAY['Money Heist','La Casa de Papel'], 'medium'),
  ('🎩🔍🇬🇧', 'show', 'TV Show', 'Serie', 'Sherlock', 'Sherlock',
    ARRAY[]::text[], ARRAY[]::text[], 'medium'),
  ('🩺🏥❤️', 'show', 'TV Show', 'Serie', 'Greys Anatomy', 'Greys Anatomy',
    ARRAY['Grey s Anatomy'], ARRAY['Grey s Anatomy'], 'medium'),

  -- Books / Bücher --------------------------------------------------
  ('🐋⚓🔱', 'book', 'Book', 'Buch', 'Moby Dick', 'Moby Dick',
    ARRAY[]::text[], ARRAY[]::text[], 'medium'),
  ('🐇⏰🫖', 'book', 'Book', 'Buch', 'Alice in Wonderland', 'Alice im Wunderland',
    ARRAY[]::text[], ARRAY['Alice in Wonderland'], 'easy'),
  ('🐷🐴🚜', 'book', 'Book', 'Buch', 'Animal Farm', 'Farm der Tiere',
    ARRAY[]::text[], ARRAY['Animal Farm'], 'hard'),
  ('👁️🖥️🔢', 'book', 'Book', 'Buch', '1984', '1984',
    ARRAY['Nineteen Eighty-Four'], ARRAY[]::text[], 'medium'),
  ('🏝️👣⛵', 'book', 'Book', 'Buch', 'Robinson Crusoe', 'Robinson Crusoe',
    ARRAY[]::text[], ARRAY[]::text[], 'medium'),
  ('🧛🏰🦇', 'book', 'Book', 'Buch', 'Dracula', 'Dracula',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('⚡🧟‍♂️🔬', 'book', 'Book', 'Buch', 'Frankenstein', 'Frankenstein',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🐛🍎📗', 'book', 'Book', 'Buch', 'The Very Hungry Caterpillar', 'Die kleine Raupe Nimmersatt',
    ARRAY['Very Hungry Caterpillar'], ARRAY['Raupe Nimmersatt'], 'medium'),
  ('🤴🌹🪐', 'book', 'Book', 'Buch', 'The Little Prince', 'Der kleine Prinz',
    ARRAY['Little Prince'], ARRAY['Kleine Prinz'], 'medium'),
  ('🐍🐻🐒', 'book', 'Book', 'Buch', 'The Jungle Book', 'Das Dschungelbuch',
    ARRAY['Jungle Book'], ARRAY['Dschungelbuch'], 'easy'),
  ('🏴‍☠️🗺️💰', 'book', 'Book', 'Buch', 'Treasure Island', 'Die Schatzinsel',
    ARRAY[]::text[], ARRAY['Schatzinsel','Treasure Island'], 'medium'),
  ('🧒🍫🏭', 'book', 'Book', 'Buch', 'Charlie and the Chocolate Factory', 'Charlie und die Schokoladenfabrik',
    ARRAY[]::text[], ARRAY['Charlie and the Chocolate Factory'], 'medium'),
  ('🐗🏝️👦', 'book', 'Book', 'Buch', 'Lord of the Flies', 'Herr der Fliegen',
    ARRAY[]::text[], ARRAY['Lord of the Flies'], 'hard'),
  ('🧙‍♂️🐉🏠', 'book', 'Book', 'Buch', 'The Hobbit', 'Der Hobbit',
    ARRAY['Hobbit'], ARRAY['Hobbit'], 'easy'),
  ('📕🔥🚒', 'book', 'Book', 'Buch', 'Fahrenheit 451', 'Fahrenheit 451',
    ARRAY[]::text[], ARRAY[]::text[], 'hard'),

  -- Food / Essen ----------------------------------------------------
  ('🍎🥧', 'food', 'Food', 'Essen', 'Apple pie', 'Apfelkuchen',
    ARRAY[]::text[], ARRAY['Apfelstrudel'], 'easy'),
  ('🐟🍟', 'food', 'Food', 'Essen', 'Fish and chips', 'Fish and Chips',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🥔🥗', 'food', 'Food', 'Essen', 'Potato salad', 'Kartoffelsalat',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🧄🍞', 'food', 'Food', 'Essen', 'Garlic bread', 'Knoblauchbrot',
    ARRAY[]::text[], ARRAY[]::text[], 'medium'),
  ('🥓🍳', 'food', 'Food', 'Essen', 'Bacon and eggs', 'Speck mit Ei',
    ARRAY[]::text[], ARRAY['Bacon and Eggs'], 'medium'),
  ('🍫🎂', 'food', 'Food', 'Essen', 'Chocolate cake', 'Schokoladenkuchen',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🐔🍛', 'food', 'Food', 'Essen', 'Chicken curry', 'Hühnercurry',
    ARRAY[]::text[], ARRAY['Huehnercurry'], 'medium'),
  ('🥜🧈🍞', 'food', 'Food', 'Essen', 'Peanut butter sandwich', 'Erdnussbutterbrot',
    ARRAY[]::text[], ARRAY[]::text[], 'hard'),
  ('🥕🎂', 'food', 'Food', 'Essen', 'Carrot cake', 'Karottenkuchen',
    ARRAY[]::text[], ARRAY['Möhrenkuchen'], 'medium'),
  ('🌽🍿', 'food', 'Food', 'Essen', 'Popcorn', 'Popcorn',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🍋🥧', 'food', 'Food', 'Essen', 'Lemon pie', 'Zitronenkuchen',
    ARRAY['Lemon tart'], ARRAY['Zitronentarte'], 'medium'),
  ('🧀🍝', 'food', 'Food', 'Essen', 'Macaroni and cheese', 'Käsemakkaroni',
    ARRAY['Mac and cheese'], ARRAY['Mac and Cheese'], 'medium'),
  ('🍅🍲', 'food', 'Food', 'Essen', 'Tomato soup', 'Tomatensuppe',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🥩🥔🍺', 'food', 'Food', 'Essen', 'Steak and chips', 'Steak mit Pommes',
    ARRAY['Steak and fries'], ARRAY[]::text[], 'medium'),

  -- Places / Orte ---------------------------------------------------
  ('🗼🥐🇫🇷', 'place', 'Place', 'Ort', 'Eiffel Tower', 'Eiffelturm',
    ARRAY[]::text[], ARRAY['Eiffel Tower'], 'easy'),
  ('🗽🇺🇸', 'place', 'Place', 'Ort', 'Statue of Liberty', 'Freiheitsstatue',
    ARRAY[]::text[], ARRAY['Statue of Liberty'], 'easy'),
  ('🕌🤍🇮🇳', 'place', 'Place', 'Ort', 'Taj Mahal', 'Taj Mahal',
    ARRAY[]::text[], ARRAY[]::text[], 'medium'),
  ('🧱🐉🇨🇳', 'place', 'Place', 'Ort', 'Great Wall of China', 'Chinesische Mauer',
    ARRAY['Great Wall'], ARRAY['Grosse Mauer'], 'medium'),
  ('🗿🏝️', 'place', 'Place', 'Ort', 'Easter Island', 'Osterinsel',
    ARRAY[]::text[], ARRAY['Easter Island'], 'medium'),
  ('🎡🌉🇬🇧', 'place', 'Place', 'Ort', 'London Eye', 'London Eye',
    ARRAY[]::text[], ARRAY[]::text[], 'medium'),
  ('🌉🌁🇺🇸', 'place', 'Place', 'Ort', 'Golden Gate Bridge', 'Golden Gate Bridge',
    ARRAY[]::text[], ARRAY[]::text[], 'medium'),
  ('🔺🐫🏜️', 'place', 'Place', 'Ort', 'The Pyramids of Giza', 'Die Pyramiden von Gizeh',
    ARRAY['Pyramids of Giza','Pyramids'], ARRAY['Pyramiden von Gizeh','Pyramiden'], 'medium'),
  ('🎰🌃🏜️', 'place', 'Place', 'Ort', 'Las Vegas', 'Las Vegas',
    ARRAY[]::text[], ARRAY[]::text[], 'easy'),
  ('🏗️📐🇮🇹', 'place', 'Place', 'Ort', 'The Leaning Tower of Pisa', 'Der schiefe Turm von Pisa',
    ARRAY['Leaning Tower of Pisa','Tower of Pisa'], ARRAY['Schiefer Turm von Pisa','Turm von Pisa'], 'medium'),
  ('🏰👑🇩🇪', 'place', 'Place', 'Ort', 'Neuschwanstein Castle', 'Schloss Neuschwanstein',
    ARRAY['Neuschwanstein'], ARRAY['Neuschwanstein'], 'hard'),
  ('🦘🏄🇦🇺', 'place', 'Place', 'Ort', 'Australia', 'Australien',
    ARRAY[]::text[], ARRAY['Australia'], 'easy'),
  ('🐧🧊❄️', 'place', 'Place', 'Ort', 'Antarctica', 'Antarktis',
    ARRAY[]::text[], ARRAY['Antarctica'], 'easy'),
  ('⛩️🗻🍣', 'place', 'Place', 'Ort', 'Japan', 'Japan',
    ARRAY[]::text[], ARRAY[]::text[], 'easy');
