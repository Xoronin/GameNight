-- Spectrum starter content: 5 chronological categories + 8 ranking
-- categories, ~10 items each. Every item carries a real sortable
-- value so placement is checked against facts, never a vote.
--
-- Note on data: the four "how big/how much" categories (Instagram
-- followers, Spotify listeners, football market values, company
-- valuations) track numbers that move constantly in real life. Items
-- were spaced with wide safety margins so the *relative* order stays
-- correct even as exact figures drift, but if this content sits
-- unused for a long time those four categories are the ones worth
-- refreshing first.

-- ------------------------------------------------------------------
-- Movie release dates (chronological)
-- ------------------------------------------------------------------
with cat as (
  insert into spectrum_categories
    (name_en, name_de, category_type, unit_en, unit_de, sort_direction)
  values
    ('Movie Release Dates', 'Filme nach Erscheinungsjahr', 'timeline',
     'release year', 'Erscheinungsjahr', 'asc')
  returning id
)
insert into spectrum_items
  (category_id, name_en, name_de, value, value_label_en, value_label_de)
select id, v.name_en, v.name_de, v.value, v.value, v.value
from cat, (values
  ('Jaws', 'Der weiße Hai', 1975::numeric, '1975'),
  ('Star Wars', 'Star Wars', 1977, '1977'),
  ('E.T. the Extra-Terrestrial', 'E.T. – Der Außerirdische', 1982, '1982'),
  ('Titanic', 'Titanic', 1997, '1997'),
  ('The Lord of the Rings: The Fellowship of the Ring', 'Der Herr der Ringe: Die Gefährten', 2001, '2001'),
  ('The Dark Knight', 'The Dark Knight', 2008, '2008'),
  ('Avatar', 'Avatar', 2009, '2009'),
  ('Inception', 'Inception', 2010, '2010'),
  ('Frozen', 'Die Eiskönigin', 2013, '2013'),
  ('Avengers: Endgame', 'Avengers: Endgame', 2019, '2019'),
  ('Barbie', 'Barbie', 2023, '2023')
) as v(name_en, name_de, value, value_label);

-- ------------------------------------------------------------------
-- Historical events (chronological)
-- ------------------------------------------------------------------
with cat as (
  insert into spectrum_categories
    (name_en, name_de, category_type, unit_en, unit_de, sort_direction)
  values
    ('Historical Events', 'Historische Ereignisse', 'timeline',
     'year', 'Jahr', 'asc')
  returning id
)
insert into spectrum_items
  (category_id, name_en, name_de, value, value_label_en, value_label_de)
select id, v.name_en, v.name_de, v.value, v.value, v.value
from cat, (values
  ('Gutenberg''s printing press', 'Gutenbergs Buchdruck', 1440::numeric, '1440'),
  ('Columbus reaches the Americas', 'Kolumbus erreicht Amerika', 1492, '1492'),
  ('French Revolution begins', 'Beginn der Französischen Revolution', 1789, '1789'),
  ('End of World War I', 'Ende des Ersten Weltkriegs', 1918, '1918'),
  ('Discovery of penicillin', 'Entdeckung des Penicillins', 1928, '1928'),
  ('End of World War II', 'Ende des Zweiten Weltkriegs', 1945, '1945'),
  ('Moon Landing', 'Mondlandung', 1969, '1969'),
  ('Fall of the Berlin Wall', 'Fall der Berliner Mauer', 1989, '1989'),
  ('Founding of the World Wide Web', 'Gründung des World Wide Web', 1991, '1991'),
  ('Start of the COVID-19 pandemic', 'Beginn der COVID-19-Pandemie', 2020, '2020')
) as v(name_en, name_de, value, value_label);

-- ------------------------------------------------------------------
-- Game releases (chronological)
-- ------------------------------------------------------------------
with cat as (
  insert into spectrum_categories
    (name_en, name_de, category_type, unit_en, unit_de, sort_direction)
  values
    ('Video Game Releases', 'Videospiele nach Erscheinungsjahr', 'timeline',
     'release year', 'Erscheinungsjahr', 'asc')
  returning id
)
insert into spectrum_items
  (category_id, name_en, name_de, value, value_label_en, value_label_de)
select id, v.name_en, v.name_de, v.value, v.value, v.value
from cat, (values
  ('Pac-Man', 'Pac-Man', 1980::numeric, '1980'),
  ('Tetris', 'Tetris', 1984, '1984'),
  ('Super Mario Bros.', 'Super Mario Bros.', 1985, '1985'),
  ('The Legend of Zelda', 'The Legend of Zelda', 1986, '1986'),
  ('Sonic the Hedgehog', 'Sonic the Hedgehog', 1991, '1991'),
  ('Pokémon Red & Blue', 'Pokémon Rot & Blau', 1996, '1996'),
  ('Minecraft', 'Minecraft', 2011, '2011'),
  ('Grand Theft Auto V', 'Grand Theft Auto V', 2013, '2013'),
  ('Fortnite', 'Fortnite', 2017, '2017'),
  ('Among Us', 'Among Us', 2018, '2018'),
  ('Elden Ring', 'Elden Ring', 2022, '2022')
) as v(name_en, name_de, value, value_label);

-- ------------------------------------------------------------------
-- Inventions (chronological)
-- ------------------------------------------------------------------
with cat as (
  insert into spectrum_categories
    (name_en, name_de, category_type, unit_en, unit_de, sort_direction)
  values
    ('Inventions', 'Erfindungen', 'timeline',
     'year invented', 'Erfindungsjahr', 'asc')
  returning id
)
insert into spectrum_items
  (category_id, name_en, name_de, value, value_label_en, value_label_de)
select id, v.name_en, v.name_de, v.value, v.value, v.value
from cat, (values
  ('Paper (Cai Lun, China)', 'Papier (Cai Lun, China)', 105::numeric, '105'),
  ('The printing press (Gutenberg)', 'Der Buchdruck (Gutenberg)', 1440, '1440'),
  ('The telescope', 'Das Teleskop', 1608, '1608'),
  ('The steam engine (Watt)', 'Die Dampfmaschine (Watt)', 1769, '1769'),
  ('The telephone', 'Das Telefon', 1876, '1876'),
  ('The airplane (Wright brothers)', 'Das Flugzeug (Gebrüder Wright)', 1903, '1903'),
  ('Penicillin', 'Penicillin', 1928, '1928'),
  ('The World Wide Web', 'Das World Wide Web', 1989, '1989'),
  ('The first iPhone', 'Das erste iPhone', 2007, '2007'),
  ('CRISPR gene editing', 'Die CRISPR-Genschere', 2012, '2012')
) as v(name_en, name_de, value, value_label);

-- ------------------------------------------------------------------
-- Celebrity birth years (chronological)
-- ------------------------------------------------------------------
with cat as (
  insert into spectrum_categories
    (name_en, name_de, category_type, unit_en, unit_de, sort_direction)
  values
    ('Celebrity Birth Years', 'Geburtsjahre von Berühmtheiten', 'timeline',
     'birth year', 'Geburtsjahr', 'asc')
  returning id
)
insert into spectrum_items
  (category_id, name_en, name_de, value, value_label_en, value_label_de)
select id, v.name_en, v.name_de, v.value, v.value, v.value
from cat, (values
  ('Charlie Chaplin', 'Charlie Chaplin', 1889::numeric, '1889'),
  ('Walt Disney', 'Walt Disney', 1901, '1901'),
  ('Marilyn Monroe', 'Marilyn Monroe', 1926, '1926'),
  ('Elvis Presley', 'Elvis Presley', 1935, '1935'),
  ('Muhammad Ali', 'Muhammad Ali', 1942, '1942'),
  ('Freddie Mercury', 'Freddie Mercury', 1946, '1946'),
  ('Barack Obama', 'Barack Obama', 1961, '1961'),
  ('Leonardo DiCaprio', 'Leonardo DiCaprio', 1974, '1974'),
  ('Cristiano Ronaldo', 'Cristiano Ronaldo', 1985, '1985'),
  ('Taylor Swift', 'Taylor Swift', 1989, '1989')
) as v(name_en, name_de, value, value_label);

-- ------------------------------------------------------------------
-- Instagram followers (ranking)
-- ------------------------------------------------------------------
with cat as (
  insert into spectrum_categories
    (name_en, name_de, category_type, unit_en, unit_de, sort_direction)
  values
    ('Instagram Followers', 'Instagram-Follower', 'ranking',
     'Instagram followers', 'Instagram-Follower', 'desc')
  returning id
)
insert into spectrum_items
  (category_id, name_en, name_de, value, value_label_en, value_label_de)
select id, v.name_en, v.name_de, v.value, v.value_label, v.value_label
from cat, (values
  ('Cristiano Ronaldo', 'Cristiano Ronaldo', 650000000::numeric, '650M'),
  ('Lionel Messi', 'Lionel Messi', 500000000, '500M'),
  ('Selena Gomez', 'Selena Gomez', 420000000, '420M'),
  ('Kylie Jenner', 'Kylie Jenner', 390000000, '390M'),
  ('Dwayne Johnson', 'Dwayne Johnson', 370000000, '370M'),
  ('Ariana Grande', 'Ariana Grande', 350000000, '350M'),
  ('Kim Kardashian', 'Kim Kardashian', 330000000, '330M'),
  ('Beyoncé', 'Beyoncé', 310000000, '310M'),
  ('Justin Bieber', 'Justin Bieber', 290000000, '290M'),
  ('Taylor Swift', 'Taylor Swift', 270000000, '270M')
) as v(name_en, name_de, value, value_label);

-- ------------------------------------------------------------------
-- Spotify monthly listeners (ranking)
-- ------------------------------------------------------------------
with cat as (
  insert into spectrum_categories
    (name_en, name_de, category_type, unit_en, unit_de, sort_direction)
  values
    ('Spotify Monthly Listeners', 'Monatliche Spotify-Hörer', 'ranking',
     'Spotify monthly listeners', 'monatliche Spotify-Hörer', 'desc')
  returning id
)
insert into spectrum_items
  (category_id, name_en, name_de, value, value_label_en, value_label_de)
select id, v.name_en, v.name_de, v.value, v.value_label, v.value_label
from cat, (values
  ('The Weeknd', 'The Weeknd', 110000000::numeric, '110M'),
  ('Taylor Swift', 'Taylor Swift', 95000000, '95M'),
  ('Bad Bunny', 'Bad Bunny', 85000000, '85M'),
  ('Ariana Grande', 'Ariana Grande', 75000000, '75M'),
  ('Drake', 'Drake', 70000000, '70M'),
  ('Billie Eilish', 'Billie Eilish', 65000000, '65M'),
  ('Ed Sheeran', 'Ed Sheeran', 60000000, '60M'),
  ('Justin Bieber', 'Justin Bieber', 55000000, '55M'),
  ('Eminem', 'Eminem', 50000000, '50M'),
  ('Rihanna', 'Rihanna', 45000000, '45M')
) as v(name_en, name_de, value, value_label);

-- ------------------------------------------------------------------
-- Country populations (ranking)
-- ------------------------------------------------------------------
with cat as (
  insert into spectrum_categories
    (name_en, name_de, category_type, unit_en, unit_de, sort_direction)
  values
    ('Country Populations', 'Länder nach Bevölkerung', 'ranking',
     'population', 'Bevölkerung', 'desc')
  returning id
)
insert into spectrum_items
  (category_id, name_en, name_de, value, value_label_en, value_label_de)
select id, v.name_en, v.name_de, v.value, v.value_label, v.value_label
from cat, (values
  ('India', 'Indien', 1428000000::numeric, '1.43B'),
  ('United States', 'USA', 335000000, '335M'),
  ('Indonesia', 'Indonesien', 277000000, '277M'),
  ('Pakistan', 'Pakistan', 240000000, '240M'),
  ('Nigeria', 'Nigeria', 223000000, '223M'),
  ('Brazil', 'Brasilien', 216000000, '216M'),
  ('Germany', 'Deutschland', 84000000, '84M'),
  ('United Kingdom', 'Vereinigtes Königreich', 68000000, '68M'),
  ('France', 'Frankreich', 66000000, '66M'),
  ('Australia', 'Australien', 26000000, '26M')
) as v(name_en, name_de, value, value_label);

-- ------------------------------------------------------------------
-- Movie box office (ranking)
-- ------------------------------------------------------------------
with cat as (
  insert into spectrum_categories
    (name_en, name_de, category_type, unit_en, unit_de, sort_direction)
  values
    ('Movie Box Office', 'Filme nach Einspielergebnis', 'ranking',
     'worldwide box office', 'weltweites Einspielergebnis', 'desc')
  returning id
)
insert into spectrum_items
  (category_id, name_en, name_de, value, value_label_en, value_label_de)
select id, v.name_en, v.name_de, v.value, v.value_label, v.value_label
from cat, (values
  ('Avatar', 'Avatar', 2900::numeric, '$2.9B'),
  ('Titanic', 'Titanic', 2200, '$2.2B'),
  ('Star Wars: The Force Awakens', 'Star Wars: Das Erwachen der Macht', 2000, '$2.0B'),
  ('Jurassic World', 'Jurassic World', 1650, '$1.65B'),
  ('The Avengers (2012)', 'The Avengers', 1500, '$1.5B'),
  ('Frozen', 'Die Eiskönigin', 1280, '$1.28B'),
  ('Finding Nemo', 'Findet Nemo', 940, '$940M'),
  ('The Sixth Sense', 'Der Sechste Sinn', 670, '$670M'),
  ('Jaws', 'Der weiße Hai', 470, '$470M'),
  ('Grease', 'Grease', 396, '$396M')
) as v(name_en, name_de, value, value_label);

-- ------------------------------------------------------------------
-- Game sales (ranking)
-- ------------------------------------------------------------------
with cat as (
  insert into spectrum_categories
    (name_en, name_de, category_type, unit_en, unit_de, sort_direction)
  values
    ('Video Game Sales', 'Videospiele nach Verkäufen', 'ranking',
     'units sold', 'verkaufte Einheiten', 'desc')
  returning id
)
insert into spectrum_items
  (category_id, name_en, name_de, value, value_label_en, value_label_de)
select id, v.name_en, v.name_de, v.value, v.value_label, v.value_label
from cat, (values
  ('Minecraft', 'Minecraft', 300000000::numeric, '300M'),
  ('Grand Theft Auto V', 'Grand Theft Auto V', 205000000, '205M'),
  ('Tetris', 'Tetris', 100000000, '100M'),
  ('Wii Sports', 'Wii Sports', 83000000, '83M'),
  ('PUBG: Battlegrounds', 'PUBG: Battlegrounds', 75000000, '75M'),
  ('Super Mario Bros.', 'Super Mario Bros.', 58000000, '58M'),
  ('Pokémon Red & Blue', 'Pokémon Rot & Blau', 47000000, '47M'),
  ('Overwatch', 'Overwatch', 35000000, '35M'),
  ('The Elder Scrolls V: Skyrim', 'The Elder Scrolls V: Skyrim', 30000000, '30M'),
  ('Grand Theft Auto: San Andreas', 'Grand Theft Auto: San Andreas', 27500000, '27.5M')
) as v(name_en, name_de, value, value_label);

-- ------------------------------------------------------------------
-- Building heights (ranking)
-- ------------------------------------------------------------------
with cat as (
  insert into spectrum_categories
    (name_en, name_de, category_type, unit_en, unit_de, sort_direction)
  values
    ('Building Heights', 'Gebäude nach Höhe', 'ranking',
     'height', 'Höhe', 'desc')
  returning id
)
insert into spectrum_items
  (category_id, name_en, name_de, value, value_label_en, value_label_de)
select id, v.name_en, v.name_de, v.value, v.value_label, v.value_label
from cat, (values
  ('Burj Khalifa', 'Burj Khalifa', 828::numeric, '828m'),
  ('Shanghai Tower', 'Shanghai Tower', 632, '632m'),
  ('Makkah Royal Clock Tower', 'Uhrturm von Mekka', 601, '601m'),
  ('CN Tower', 'CN Tower', 553, '553m'),
  ('Taipei 101', 'Taipei 101', 508, '508m'),
  ('Petronas Towers', 'Petronas-Türme', 452, '452m'),
  ('Eiffel Tower', 'Eiffelturm', 330, '330m'),
  ('Great Pyramid of Giza', 'Cheops-Pyramide', 139, '139m'),
  ('Big Ben (Elizabeth Tower)', 'Big Ben', 96, '96m'),
  ('Leaning Tower of Pisa', 'Schiefer Turm von Pisa', 57, '57m')
) as v(name_en, name_de, value, value_label);

-- ------------------------------------------------------------------
-- Football player market values (ranking)
-- ------------------------------------------------------------------
with cat as (
  insert into spectrum_categories
    (name_en, name_de, category_type, unit_en, unit_de, sort_direction)
  values
    ('Football Player Values', 'Marktwerte von Fußballspielern', 'ranking',
     'market value', 'Marktwert', 'desc')
  returning id
)
insert into spectrum_items
  (category_id, name_en, name_de, value, value_label_en, value_label_de)
select id, v.name_en, v.name_de, v.value, v.value_label, v.value_label
from cat, (values
  ('Erling Haaland', 'Erling Haaland', 180::numeric, '€180M'),
  ('Kylian Mbappé', 'Kylian Mbappé', 170, '€170M'),
  ('Jude Bellingham', 'Jude Bellingham', 150, '€150M'),
  ('Vinícius Júnior', 'Vinícius Júnior', 130, '€130M'),
  ('Bukayo Saka', 'Bukayo Saka', 110, '€110M'),
  ('Pedri', 'Pedri', 90, '€90M'),
  ('Rodrygo', 'Rodrygo', 80, '€80M'),
  ('Florian Wirtz', 'Florian Wirtz', 70, '€70M'),
  ('Alphonso Davies', 'Alphonso Davies', 50, '€50M'),
  ('Christian Pulisic', 'Christian Pulisic', 35, '€35M')
) as v(name_en, name_de, value, value_label);

-- ------------------------------------------------------------------
-- Company valuations (ranking)
-- ------------------------------------------------------------------
with cat as (
  insert into spectrum_categories
    (name_en, name_de, category_type, unit_en, unit_de, sort_direction)
  values
    ('Company Valuations', 'Unternehmen nach Marktbewertung', 'ranking',
     'market valuation', 'Marktbewertung', 'desc')
  returning id
)
insert into spectrum_items
  (category_id, name_en, name_de, value, value_label_en, value_label_de)
select id, v.name_en, v.name_de, v.value, v.value_label, v.value_label
from cat, (values
  ('Apple', 'Apple', 3000::numeric, '$3.0T'),
  ('Saudi Aramco', 'Saudi Aramco', 1800, '$1.8T'),
  ('Amazon', 'Amazon', 1500, '$1.5T'),
  ('Alphabet (Google)', 'Alphabet (Google)', 1300, '$1.3T'),
  ('Meta', 'Meta', 900, '$900B'),
  ('Tesla', 'Tesla', 650, '$650B'),
  ('Walmart', 'Walmart', 450, '$450B'),
  ('Coca-Cola', 'Coca-Cola', 260, '$260B'),
  ('McDonald''s', 'McDonald''s', 210, '$210B'),
  ('Nike', 'Nike', 110, '$110B')
) as v(name_en, name_de, value, value_label);
