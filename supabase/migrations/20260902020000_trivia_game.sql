-- Trivia game: content table + session/round/answer tables, timer support
-- included from the start (mirrors Bluff/Minefield/Higher-Lower/Categories).

create table if not exists trivia_questions (
  id uuid primary key default gen_random_uuid(),

  category_en text not null,
  category_de text not null,

  question_en text not null,
  question_de text not null,

  options_en text[] not null,
  options_de text[] not null,

  correct_index smallint not null
    check (correct_index between 0 and 3),

  difficulty text not null default 'medium'
    check (difficulty in ('easy', 'medium', 'hard')),

  active boolean not null default true,

  created_at timestamptz not null default now()
);

create table if not exists trivia_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,

  difficulty text not null default 'mixed'
    check (difficulty in ('mixed', 'easy', 'medium', 'hard')),

  status text not null default 'playing'
    check (status in ('playing', 'finished')),

  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists trivia_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  session_id uuid not null references trivia_sessions(id) on delete cascade,

  round_number int not null,

  question_id uuid not null references trivia_questions(id),

  status text not null default 'answering'
    check (status in ('answering', 'reveal', 'finished')),

  created_at timestamptz not null default now(),
  ends_at timestamptz,

  unique (session_id, round_number)
);

create table if not exists trivia_answers (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references trivia_rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,

  selected_index smallint not null
    check (selected_index between 0 and 3),

  is_correct boolean not null default false,
  points int not null default 0,

  created_at timestamptz not null default now(),

  unique (round_id, player_id)
);

create index if not exists trivia_rounds_session_idx
  on trivia_rounds (session_id);

create index if not exists trivia_answers_round_idx
  on trivia_answers (round_id);

alter table trivia_questions enable row level security;
alter table trivia_sessions enable row level security;
alter table trivia_rounds enable row level security;
alter table trivia_answers enable row level security;

create policy "Anyone can read Trivia questions"
  on trivia_questions for select
  using (true);

create policy "Anyone can manage Trivia sessions"
  on trivia_sessions for all
  using (true)
  with check (true);

create policy "Anyone can manage Trivia rounds"
  on trivia_rounds for all
  using (true)
  with check (true);

create policy "Anyone can manage Trivia answers"
  on trivia_answers for all
  using (true)
  with check (true);

alter publication supabase_realtime add table trivia_sessions;
alter publication supabase_realtime add table trivia_rounds;
alter publication supabase_realtime add table trivia_answers;

-- ----------------------------------------------------------------
-- Starter content (40 questions across 5 categories).
-- ----------------------------------------------------------------

insert into trivia_questions
  (category_en, category_de, question_en, question_de, options_en, options_de, correct_index, difficulty)
values
  -- Science / Wissenschaft
  ('Science', 'Wissenschaft', 'What planet is known as the Red Planet?', 'Welcher Planet wird als der Rote Planet bezeichnet?',
    ARRAY['Venus','Mars','Jupiter','Mercury'], ARRAY['Venus','Mars','Jupiter','Merkur'], 1, 'easy'),
  ('Science', 'Wissenschaft', 'What gas do plants absorb from the atmosphere?', 'Welches Gas nehmen Pflanzen aus der Atmosphäre auf?',
    ARRAY['Oxygen','Nitrogen','Carbon Dioxide','Hydrogen'], ARRAY['Sauerstoff','Stickstoff','Kohlendioxid','Wasserstoff'], 2, 'easy'),
  ('Science', 'Wissenschaft', 'What force pulls objects toward Earth?', 'Welche Kraft zieht Objekte zur Erde?',
    ARRAY['Magnetism','Gravity','Friction','Tension'], ARRAY['Magnetismus','Schwerkraft','Reibung','Spannung'], 1, 'easy'),
  ('Science', 'Wissenschaft', 'What is the chemical symbol for gold?', 'Wie lautet das chemische Symbol für Gold?',
    ARRAY['Ag','Au','Gd','Go'], ARRAY['Ag','Au','Gd','Go'], 1, 'medium'),
  ('Science', 'Wissenschaft', 'How many bones are in the adult human body?', 'Wie viele Knochen hat der erwachsene menschliche Körper?',
    ARRAY['186','206','226','246'], ARRAY['186','206','226','246'], 1, 'medium'),
  ('Science', 'Wissenschaft', 'What is the powerhouse of the cell?', 'Was ist das Kraftwerk der Zelle?',
    ARRAY['Nucleus','Ribosome','Mitochondria','Golgi apparatus'], ARRAY['Zellkern','Ribosom','Mitochondrium','Golgi-Apparat'], 2, 'medium'),
  ('Science', 'Wissenschaft', 'What particle is exchanged in the electromagnetic force?', 'Welches Teilchen wird bei der elektromagnetischen Kraft ausgetauscht?',
    ARRAY['Gluon','Photon','W boson','Graviton'], ARRAY['Gluon','Photon','W-Boson','Graviton'], 1, 'hard'),
  ('Science', 'Wissenschaft', 'What is the hardest known natural material?', 'Was ist das härteste bekannte natürliche Material?',
    ARRAY['Quartz','Topaz','Diamond','Corundum'], ARRAY['Quarz','Topas','Diamant','Korund'], 2, 'hard'),

  -- History / Geschichte
  ('History', 'Geschichte', 'In which year did World War II end?', 'In welchem Jahr endete der Zweite Weltkrieg?',
    ARRAY['1943','1945','1947','1950'], ARRAY['1943','1945','1947','1950'], 1, 'easy'),
  ('History', 'Geschichte', 'Who was the first President of the United States?', 'Wer war der erste Präsident der Vereinigten Staaten?',
    ARRAY['Thomas Jefferson','George Washington','John Adams','Abraham Lincoln'], ARRAY['Thomas Jefferson','George Washington','John Adams','Abraham Lincoln'], 1, 'easy'),
  ('History', 'Geschichte', 'Which ship famously sank in 1912 after hitting an iceberg?', 'Welches Schiff sank 1912 nach einer Kollision mit einem Eisberg?',
    ARRAY['Titanic','Lusitania','Britannic','Olympic'], ARRAY['Titanic','Lusitania','Britannic','Olympic'], 0, 'easy'),
  ('History', 'Geschichte', 'The Great Wall was primarily built to defend which country?', 'Die Chinesische Mauer wurde vor allem zur Verteidigung welches Landes gebaut?',
    ARRAY['Japan','China','Mongolia','Korea'], ARRAY['Japan','China','Mongolei','Korea'], 1, 'medium'),
  ('History', 'Geschichte', 'Which empire built the Colosseum?', 'Welches Reich erbaute das Kolosseum?',
    ARRAY['Greek','Roman','Ottoman','Persian'], ARRAY['Griechisches','Römisches','Osmanisches','Persisches'], 1, 'medium'),
  ('History', 'Geschichte', 'The Berlin Wall fell in which year?', 'In welchem Jahr fiel die Berliner Mauer?',
    ARRAY['1987','1989','1991','1993'], ARRAY['1987','1989','1991','1993'], 1, 'medium'),
  ('History', 'Geschichte', 'Who was the Byzantine Emperor when Constantinople fell in 1453?', 'Wer war byzantinischer Kaiser, als Konstantinopel 1453 fiel?',
    ARRAY['Justinian','Constantine XI','Basil II','Alexios I'], ARRAY['Justinian','Konstantin XI.','Basileios II.','Alexios I.'], 1, 'hard'),
  ('History', 'Geschichte', 'The Treaty of Westphalia in 1648 ended which war?', 'Der Westfälische Friede von 1648 beendete welchen Krieg?',
    ARRAY['Hundred Years'' War','Thirty Years'' War','Napoleonic Wars','Seven Years'' War'], ARRAY['Hundertjähriger Krieg','Dreißigjähriger Krieg','Napoleonische Kriege','Siebenjähriger Krieg'], 1, 'hard'),

  -- Geography / Geografie
  ('Geography', 'Geografie', 'What is the capital of France?', 'Was ist die Hauptstadt von Frankreich?',
    ARRAY['Berlin','Madrid','Paris','Rome'], ARRAY['Berlin','Madrid','Paris','Rom'], 2, 'easy'),
  ('Geography', 'Geografie', 'Which is the largest ocean on Earth?', 'Welches ist der größte Ozean der Erde?',
    ARRAY['Atlantic','Indian','Arctic','Pacific'], ARRAY['Atlantik','Indischer Ozean','Arktischer Ozean','Pazifik'], 3, 'easy'),
  ('Geography', 'Geografie', 'Which continent is the Amazon Rainforest primarily in?', 'Auf welchem Kontinent liegt der Amazonas-Regenwald hauptsächlich?',
    ARRAY['Africa','Asia','South America','Australia'], ARRAY['Afrika','Asien','Südamerika','Australien'], 2, 'easy'),
  ('Geography', 'Geografie', 'Which country has the most natural lakes?', 'Welches Land hat die meisten natürlichen Seen?',
    ARRAY['USA','Canada','Russia','Finland'], ARRAY['USA','Kanada','Russland','Finnland'], 1, 'medium'),
  ('Geography', 'Geografie', 'Mount Kilimanjaro is located in which country?', 'In welchem Land liegt der Kilimandscharo?',
    ARRAY['Kenya','Tanzania','Uganda','Ethiopia'], ARRAY['Kenia','Tansania','Uganda','Äthiopien'], 1, 'medium'),
  ('Geography', 'Geografie', 'What is the smallest country in the world?', 'Was ist das kleinste Land der Welt?',
    ARRAY['Monaco','San Marino','Vatican City','Liechtenstein'], ARRAY['Monaco','San Marino','Vatikanstadt','Liechtenstein'], 2, 'medium'),
  ('Geography', 'Geografie', 'Which strait separates Europe from Africa?', 'Welche Meerenge trennt Europa von Afrika?',
    ARRAY['Strait of Hormuz','Strait of Gibraltar','Bosphorus','Bering Strait'], ARRAY['Straße von Hormus','Straße von Gibraltar','Bosporus','Beringstraße'], 1, 'hard'),
  ('Geography', 'Geografie', 'Which desert is the largest hot desert in the world?', 'Welche Wüste ist die größte heiße Wüste der Welt?',
    ARRAY['Gobi','Kalahari','Sahara','Arabian'], ARRAY['Gobi','Kalahari','Sahara','Arabische Wüste'], 2, 'hard'),

  -- Movies & TV / Filme & TV
  ('Movies & TV', 'Filme & TV', 'Who directed the movie Jaws?', 'Wer führte bei dem Film Der weiße Hai Regie?',
    ARRAY['George Lucas','Steven Spielberg','Martin Scorsese','James Cameron'], ARRAY['George Lucas','Steven Spielberg','Martin Scorsese','James Cameron'], 1, 'easy'),
  ('Movies & TV', 'Filme & TV', 'What is the name of the coffee shop in the show Friends?', 'Wie heißt das Café in der Serie Friends?',
    ARRAY['Central Perk','Java Joe''s','The Grind','Cafe Nervosa'], ARRAY['Central Perk','Java Joe''s','The Grind','Cafe Nervosa'], 0, 'easy'),
  ('Movies & TV', 'Filme & TV', 'What color is Shrek?', 'Welche Farbe hat Shrek?',
    ARRAY['Blue','Purple','Green','Yellow'], ARRAY['Blau','Lila','Grün','Gelb'], 2, 'easy'),
  ('Movies & TV', 'Filme & TV', 'Which actor played the Joker in The Dark Knight (2008)?', 'Welcher Schauspieler spielte den Joker in The Dark Knight (2008)?',
    ARRAY['Jared Leto','Joaquin Phoenix','Heath Ledger','Jack Nicholson'], ARRAY['Jared Leto','Joaquin Phoenix','Heath Ledger','Jack Nicholson'], 2, 'medium'),
  ('Movies & TV', 'Filme & TV', 'Which studio produces the Toy Story films?', 'Welches Studio produziert die Toy-Story-Filme?',
    ARRAY['DreamWorks','Pixar','Illumination','Blue Sky'], ARRAY['DreamWorks','Pixar','Illumination','Blue Sky'], 1, 'medium'),
  ('Movies & TV', 'Filme & TV', 'What is the highest-grossing film of all time (unadjusted)?', 'Welcher Film hat weltweit am meisten eingespielt (nicht inflationsbereinigt)?',
    ARRAY['Titanic','Avatar','Avengers: Endgame','Star Wars'], ARRAY['Titanic','Avatar','Avengers: Endgame','Star Wars'], 1, 'medium'),
  ('Movies & TV', 'Filme & TV', 'Who composed the score for Star Wars?', 'Wer komponierte die Musik zu Star Wars?',
    ARRAY['Hans Zimmer','John Williams','Danny Elfman','Alan Silvestri'], ARRAY['Hans Zimmer','John Williams','Danny Elfman','Alan Silvestri'], 1, 'hard'),
  ('Movies & TV', 'Filme & TV', 'Which film won the first Academy Award for Best Picture?', 'Welcher Film gewann den ersten Oscar für den besten Film?',
    ARRAY['Sunrise','Wings','Metropolis','The Jazz Singer'], ARRAY['Sunrise','Wings','Metropolis','The Jazz Singer'], 1, 'hard'),

  -- Sports / Sport
  ('Sports', 'Sport', 'How many players are on a soccer team on the field at once?', 'Wie viele Spieler stehen bei einer Fußballmannschaft gleichzeitig auf dem Feld?',
    ARRAY['9','10','11','12'], ARRAY['9','10','11','12'], 2, 'easy'),
  ('Sports', 'Sport', 'In which sport would you perform a slam dunk?', 'In welcher Sportart würde man einen Slam Dunk ausführen?',
    ARRAY['Volleyball','Basketball','Tennis','Badminton'], ARRAY['Volleyball','Basketball','Tennis','Badminton'], 1, 'easy'),
  ('Sports', 'Sport', 'What sport is known as the king of sports in many countries?', 'Welcher Sport wird in vielen Ländern als König der Sportarten bezeichnet?',
    ARRAY['Basketball','Football/Soccer','Cricket','Tennis'], ARRAY['Basketball','Fußball','Cricket','Tennis'], 1, 'easy'),
  ('Sports', 'Sport', 'How often are the Summer Olympic Games held?', 'Wie oft finden die Olympischen Sommerspiele statt?',
    ARRAY['Every 2 years','Every 4 years','Every 5 years','Every 6 years'], ARRAY['Alle 2 Jahre','Alle 4 Jahre','Alle 5 Jahre','Alle 6 Jahre'], 1, 'medium'),
  ('Sports', 'Sport', 'Which country has won the most FIFA World Cups?', 'Welches Land hat die meisten FIFA-Weltmeisterschaften gewonnen?',
    ARRAY['Germany','Argentina','Italy','Brazil'], ARRAY['Deutschland','Argentinien','Italien','Brasilien'], 3, 'medium'),
  ('Sports', 'Sport', 'In tennis, what is a score of zero called?', 'Wie wird im Tennis der Punktestand null genannt?',
    ARRAY['Deuce','Love','Ace','Fault'], ARRAY['Deuce','Love','Ace','Fault'], 1, 'medium'),
  ('Sports', 'Sport', 'Which country hosted the first modern Olympic Games in 1896?', 'Welches Land war Gastgeber der ersten modernen Olympischen Spiele 1896?',
    ARRAY['France','Great Britain','Greece','USA'], ARRAY['Frankreich','Großbritannien','Griechenland','USA'], 2, 'hard'),
  ('Sports', 'Sport', 'How many rings are on the Olympic flag?', 'Wie viele Ringe zeigt die Olympische Flagge?',
    ARRAY['4','5','6','7'], ARRAY['4','5','6','7'], 1, 'hard');
