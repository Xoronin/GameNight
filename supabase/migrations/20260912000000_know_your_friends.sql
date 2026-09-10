-- Know Your Friends: one player answers about themselves, everyone else
-- predicts what they said.
--
-- Both sides of a round are the same shape — a player and the option they
-- picked — so they share one table and are told apart by is_subject.
-- Everyone acts in the same window rather than in two phases: the
-- subject's pick is simply hidden until the reveal, which keeps the round
-- to a single timer and nobody waiting on anybody.

create table if not exists friends_questions (
  id uuid primary key default gen_random_uuid(),

  -- Both prompts carry a {name} placeholder for the subject.
  prompt_en text not null,
  prompt_de text not null,

  options_en text[] not null,
  options_de text[] not null,

  active boolean not null default true,

  created_at timestamptz not null default now(),

  constraint friends_questions_options_check
    check (
      array_length(options_en, 1) = 4
      and array_length(options_de, 1) = 4
    ),

  constraint friends_questions_placeholder_check
    check (
      prompt_en like '%{name}%'
      and prompt_de like '%{name}%'
    )
);

create table if not exists friends_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,

  status text not null default 'playing'
    check (status in ('playing', 'finished')),

  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists friends_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  session_id uuid not null references friends_sessions(id) on delete cascade,

  round_number int not null,

  question_id uuid not null references friends_questions(id),

  -- Whose evening, holiday or guilty pleasure this round is about.
  subject_player_id uuid not null references players(id) on delete cascade,

  status text not null default 'answering'
    check (status in ('answering', 'reveal', 'finished')),

  created_at timestamptz not null default now(),
  ends_at timestamptz,

  unique (session_id, round_number)
);

create table if not exists friends_answers (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references friends_rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,

  selected_index smallint not null
    check (selected_index between 0 and 3),

  -- The subject's own answer rather than a prediction of it.
  is_subject boolean not null default false,

  is_correct boolean not null default false,
  points int not null default 0,

  created_at timestamptz not null default now(),

  unique (round_id, player_id)
);

create index if not exists friends_rounds_session_idx
  on friends_rounds (session_id);

create index if not exists friends_answers_round_idx
  on friends_answers (round_id);

alter table friends_questions enable row level security;
alter table friends_sessions enable row level security;
alter table friends_rounds enable row level security;
alter table friends_answers enable row level security;

create policy "Anyone can read Friends questions"
  on friends_questions for select
  using (true);

create policy "Anyone can manage Friends sessions"
  on friends_sessions for all
  using (true)
  with check (true);

create policy "Anyone can manage Friends rounds"
  on friends_rounds for all
  using (true)
  with check (true);

create policy "Anyone can manage Friends answers"
  on friends_answers for all
  using (true)
  with check (true);

alter publication supabase_realtime add table friends_sessions;
alter publication supabase_realtime add table friends_rounds;
alter publication supabase_realtime add table friends_answers;

-- ----------------------------------------------------------------
-- Starter content (45 questions).
--
-- Every option has to be a plausible answer for somebody, or the round
-- stops being a prediction and becomes a giveaway. They are also kept
-- kind: the game is played with friends in the room, so nothing here
-- invites an answer anyone would rather not give.
-- ----------------------------------------------------------------

insert into friends_questions (prompt_en, prompt_de, options_en, options_de)
values
  ('How does {name} spend a free evening?', 'Wie verbringt {name} einen freien Abend?',
    ARRAY['On the sofa with a series','Out with friends','Doing a hobby','Going to bed early'],
    ARRAY['Auf dem Sofa mit einer Serie','Mit Freunden unterwegs','Bei einem Hobby','Früh ins Bett']),
  ('Where would {name} rather go on holiday?', 'Wohin würde {name} lieber in den Urlaub fahren?',
    ARRAY['A beach','The mountains','A big city','Somewhere with nobody around'],
    ARRAY['An den Strand','In die Berge','In eine Großstadt','Irgendwo ohne Menschen']),
  ('What does {name} order at a cafe?', 'Was bestellt {name} im Café?',
    ARRAY['Coffee, black','Something with a lot of milk','Tea','Something cold'],
    ARRAY['Kaffee, schwarz','Etwas mit viel Milch','Tee','Etwas Kaltes']),
  ('How does {name} arrive at things?', 'Wie kommt {name} zu Terminen?',
    ARRAY['Far too early','Just on time','A little late','It depends entirely'],
    ARRAY['Viel zu früh','Punktlich','Ein bisschen zu spät','Kommt ganz darauf an']),
  ('What is on {name}''s plate most often?', 'Was landet bei {name} am häufigsten auf dem Teller?',
    ARRAY['Pasta','Something with rice','Bread and cheese','Whatever is left in the fridge'],
    ARRAY['Nudeln','Etwas mit Reis','Brot und Käse','Was der Kühlschrank hergibt']),
  ('How does {name} handle a long train journey?', 'Wie übersteht {name} eine lange Zugfahrt?',
    ARRAY['Music the whole way','Reading','Sleeping','Staring out of the window'],
    ARRAY['Die ganze Zeit Musik','Lesen','Schlafen','Aus dem Fenster schauen']),
  ('What would {name} do with an unexpected free day?', 'Was macht {name} mit einem unerwartet freien Tag?',
    ARRAY['Absolutely nothing','Finally tidy up','Go somewhere new','Call people'],
    ARRAY['Gar nichts','Endlich aufräumen','Irgendwo hinfahren','Leute anrufen']),
  ('How does {name} take a group photo?', 'Wie verhält sich {name} beim Gruppenfoto?',
    ARRAY['Front and centre','Somewhere at the back','Taking the photo','Trying to escape it'],
    ARRAY['Ganz vorne','Irgendwo hinten','Macht das Foto','Versucht zu entkommen']),
  ('What is {name}''s relationship with alarms?', 'Wie hält es {name} mit dem Wecker?',
    ARRAY['Up on the first one','Snoozes a few times','Sets five of them','Does not need one'],
    ARRAY['Steht beim ersten auf','Drückt ein paar Mal','Stellt fünf Stück','Braucht keinen']),
  ('Which seat does {name} take on a plane?', 'Welchen Platz nimmt {name} im Flugzeug?',
    ARRAY['Window','Aisle','Whatever is free','Middle, and fine with it'],
    ARRAY['Fenster','Gang','Was frei ist','Mitte, und es ist okay']),
  ('How does {name} pack for a trip?', 'Wie packt {name} für eine Reise?',
    ARRAY['Weeks in advance','The night before','An hour before leaving','Barely packs at all'],
    ARRAY['Wochen vorher','Am Abend davor','Eine Stunde vor der Abfahrt','Packt kaum etwas']),
  ('What does {name} do at a party?', 'Was macht {name} auf einer Party?',
    ARRAY['Talks to everyone','Sticks with one person','Ends up in the kitchen','Leaves early'],
    ARRAY['Redet mit allen','Bleibt bei einer Person','Landet in der Küche','Geht früh']),
  ('How does {name} pick a film?', 'Wie sucht {name} einen Film aus?',
    ARRAY['Has one ready','Scrolls for an hour','Lets someone else choose','Rewatches a favourite'],
    ARRAY['Hat schon einen','Scrollt eine Stunde','Lässt andere wählen','Schaut einen Liebling nochmal']),
  ('What is {name}''s idea of a good morning?', 'Was ist für {name} ein guter Morgen?',
    ARRAY['Up with the sun','A slow start','Straight into work','Still asleep'],
    ARRAY['Mit der Sonne auf','Ein langsamer Start','Direkt an die Arbeit','Noch am Schlafen']),
  ('How does {name} react to a surprise plan?', 'Wie reagiert {name} auf einen spontanen Plan?',
    ARRAY['Immediately in','Needs a moment','Asks a lot of questions','Would rather not'],
    ARRAY['Sofort dabei','Braucht kurz','Stellt viele Fragen','Lieber nicht']),
  ('What does {name} listen to while working?', 'Was hört {name} beim Arbeiten?',
    ARRAY['Music with words','Music without words','A podcast','Silence'],
    ARRAY['Musik mit Text','Musik ohne Text','Einen Podcast','Stille']),
  ('How many tabs does {name} have open?', 'Wie viele Tabs hat {name} offen?',
    ARRAY['One or two','About ten','Too many to count','Different device, different story'],
    ARRAY['Ein oder zwei','Ungefähr zehn','Nicht mehr zählbar','Je nach Gerät anders']),
  ('What does {name} do with a long queue?', 'Was macht {name} bei einer langen Schlange?',
    ARRAY['Waits patiently','Waits and complains','Comes back later','Gives up on it'],
    ARRAY['Wartet geduldig','Wartet und meckert','Kommt später wieder','Lässt es sein']),
  ('How does {name} feel about karaoke?', 'Wie steht {name} zu Karaoke?',
    ARRAY['First to sing','Only in a group','Only very late','Never'],
    ARRAY['Singt als Erstes','Nur in der Gruppe','Nur sehr spät','Niemals']),
  ('What is {name} like at a museum?', 'Wie ist {name} im Museum?',
    ARRAY['Reads every label','Walks straight through','Stops at two things','Ends up in the shop'],
    ARRAY['Liest jedes Schild','Geht schnell durch','Bleibt bei zwei Dingen stehen','Landet im Shop']),
  ('How does {name} keep in touch?', 'Wie hält {name} Kontakt?',
    ARRAY['Voice messages','Long texts','Short texts','Actually calls'],
    ARRAY['Sprachnachrichten','Lange Nachrichten','Kurze Nachrichten','Ruft wirklich an']),
  ('What would {name} rather give up?', 'Worauf würde {name} eher verzichten?',
    ARRAY['Coffee','Dessert','Social media','Their favourite series'],
    ARRAY['Kaffee','Nachtisch','Social Media','Die Lieblingsserie']),
  ('How does {name} deal with a board game?', 'Wie geht {name} mit einem Brettspiel um?',
    ARRAY['Plays to win','Plays for fun','Reads the rules aloud','Quietly wins anyway'],
    ARRAY['Spielt auf Sieg','Spielt zum Spaß','Liest die Regeln vor','Gewinnt einfach so']),
  ('What is in {name}''s bag?', 'Was ist in {name}s Tasche?',
    ARRAY['Only the essentials','A little of everything','Something for every emergency','No bag'],
    ARRAY['Nur das Nötigste','Von allem etwas','Für jeden Notfall etwas','Keine Tasche']),
  ('How does {name} choose a restaurant?', 'Wie sucht {name} ein Restaurant aus?',
    ARRAY['The usual place','Reads every review','Whatever is nearest','Lets the group decide'],
    ARRAY['Das übliche Lokal','Liest alle Bewertungen','Was am nächsten ist','Lässt die Gruppe wählen']),
  ('What does {name} do on a rainy day?', 'Was macht {name} an einem Regentag?',
    ARRAY['Goes out anyway','Stays in and cooks','Stays in and reads','Sleeps'],
    ARRAY['Geht trotzdem raus','Bleibt drin und kocht','Bleibt drin und liest','Schläft']),
  ('How does {name} take a compliment?', 'Wie nimmt {name} ein Kompliment an?',
    ARRAY['Says thank you','Deflects it','Returns it immediately','Goes bright red'],
    ARRAY['Sagt danke','Wiegelt ab','Gibt es sofort zurück','Wird knallrot']),
  ('What is {name}''s phone battery usually at?', 'Wie voll ist {name}s Handyakku meistens?',
    ARRAY['Near full','Somewhere in the middle','Under twenty percent','About to die'],
    ARRAY['Fast voll','Irgendwo in der Mitte','Unter zwanzig Prozent','Gleich leer']),
  ('How does {name} approach a big decision?', 'Wie trifft {name} eine große Entscheidung?',
    ARRAY['Makes a list','Asks everyone','Sleeps on it','Decides on the spot'],
    ARRAY['Macht eine Liste','Fragt alle','Schläft darüber','Entscheidet sofort']),
  ('What does {name} do with leftovers?', 'Was macht {name} mit Resten?',
    ARRAY['Eats them next day','Forgets them entirely','Turns them into something','Never has any'],
    ARRAY['Isst sie am nächsten Tag','Vergisst sie komplett','Macht etwas Neues daraus','Hat nie welche']),
  ('How does {name} watch a series?', 'Wie schaut {name} eine Serie?',
    ARRAY['All in one go','One a night','Slowly over months','Starts and never finishes'],
    ARRAY['Alles am Stück','Eine pro Abend','Langsam über Monate','Fängt an und hört auf']),
  ('What would {name} pick as a superpower?', 'Welche Superkraft würde {name} wählen?',
    ARRAY['Flying','Invisibility','Reading minds','Never needing sleep'],
    ARRAY['Fliegen','Unsichtbarkeit','Gedanken lesen','Nie schlafen müssen']),
  ('How does {name} handle spicy food?', 'Wie verträgt {name} scharfes Essen?',
    ARRAY['The spicier the better','Enjoys a bit','Regrets it every time','Avoids it'],
    ARRAY['Je schärfer desto besser','Mag etwas Schärfe','Bereut es jedes Mal','Meidet es']),
  ('What does {name} do first in the morning?', 'Was macht {name} morgens als Erstes?',
    ARRAY['Reaches for the phone','Makes a drink','Gets straight up','Lies there a while'],
    ARRAY['Greift zum Handy','Macht sich ein Getränk','Steht sofort auf','Bleibt noch liegen']),
  ('How does {name} give directions?', 'Wie erklärt {name} den Weg?',
    ARRAY['Very precisely','With landmarks','Sends a link','Has no idea'],
    ARRAY['Sehr genau','Mit Orientierungspunkten','Schickt einen Link','Hat keine Ahnung']),
  ('What is {name} like when hungry?', 'Wie ist {name}, wenn hungrig?',
    ARRAY['Perfectly fine','Slightly quieter','Noticeably grumpy','Plans the next meal'],
    ARRAY['Völlig in Ordnung','Etwas stiller','Deutlich mürrischer','Plant die nächste Mahlzeit']),
  ('How does {name} spend a long flight?', 'Wie verbringt {name} einen langen Flug?',
    ARRAY['Films back to back','Sleeping through it','Reading','Talking to a neighbour'],
    ARRAY['Filme am Stück','Durchschlafen','Lesen','Mit Nachbarn reden']),
  ('What kind of gift does {name} give?', 'Welche Geschenke macht {name}?',
    ARRAY['Something thoughtful','Something useful','Something funny','Whatever was quick'],
    ARRAY['Etwas Durchdachtes','Etwas Nützliches','Etwas Lustiges','Was schnell ging']),
  ('How does {name} handle being cold?', 'Wie geht {name} mit Kälte um?',
    ARRAY['Never seems cold','Layers up early','Complains constantly','Refuses a coat anyway'],
    ARRAY['Friert nie','Zieht früh Schichten an','Beschwert sich ständig','Zieht trotzdem keine Jacke an']),
  ('What is {name}''s desk like?', 'Wie sieht {name}s Schreibtisch aus?',
    ARRAY['Spotless','Organised chaos','Actual chaos','Does not have one'],
    ARRAY['Blitzsauber','Geordnetes Chaos','Echtes Chaos','Hat keinen']),
  ('How does {name} pick music for the room?', 'Wie wählt {name} Musik für alle aus?',
    ARRAY['Has a playlist ready','Asks what people want','Puts on their favourite','Would rather not choose'],
    ARRAY['Hat eine Playlist parat','Fragt, was alle wollen','Legt den eigenen Liebling auf','Wählt lieber nicht']),
  ('What does {name} do at the end of a game night?', 'Was macht {name} am Ende eines Spieleabends?',
    ARRAY['Wants one more round','Helps tidy up','Is already asleep','Left an hour ago'],
    ARRAY['Will noch eine Runde','Hilft aufräumen','Schläft schon','Ist längst weg']),
  ('How does {name} feel about the window seat on a bus?', 'Was hält {name} vom Fensterplatz im Bus?',
    ARRAY['Essential','Nice but not important','Prefers the aisle','Stands anyway'],
    ARRAY['Unverzichtbar','Schön, aber egal','Sitzt lieber am Gang','Steht sowieso']),
  ('What would {name} rescue from a burning flat?', 'Was würde {name} aus der brennenden Wohnung retten?',
    ARRAY['Photos','A laptop','Something sentimental','Whatever is nearest the door'],
    ARRAY['Fotos','Einen Laptop','Etwas mit Erinnerungswert','Was neben der Tür liegt']),
  ('How does {name} order at a new place?', 'Wie bestellt {name} an einem neuen Ort?',
    ARRAY['The most unusual thing','The safest thing','Whatever is recommended','Cannot decide at all'],
    ARRAY['Das Ungewöhnlichste','Das Sicherste','Was empfohlen wird','Kann sich nicht entscheiden']);
