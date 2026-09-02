-- Content expansion: Bluff and Draw & Guess had the smallest banks
-- (30 questions / 30 words) among the six games, most likely to repeat
-- within a single evening of play.

insert into bluff_questions
  (id, category_en, category_de, question_en, question_de, answer_en, answer_de, difficulty, is_active)
values
  ('pigeon-post-waterloo', 'Weird History', 'Kuriose Geschichte',
    'Financier Nathan Rothschild is (perhaps apocryphally) said to have used what fast messengers to learn of Napoleon''s defeat at Waterloo before anyone else?',
    'Der Finanzier Nathan Rothschild soll (wenn auch vielleicht nur der Legende nach) welche schnellen Boten genutzt haben, um vor allen anderen von Napoleons Niederlage bei Waterloo zu erfahren?',
    'Carrier pigeons', 'Brieftauben', 'hard', true),

  ('eiffel-tower-grows', 'Science', 'Wissenschaft',
    'The Eiffel Tower can grow up to 15cm taller during the summer. What causes this?',
    'Der Eiffelturm kann im Sommer bis zu 15 cm höher werden. Was verursacht das?',
    'Heat expansion', 'Wärmeausdehnung', 'medium', true),

  ('wombat-cube-poop', 'Animals', 'Tiere',
    'Wombats are the only animal known to produce droppings in this unusual shape.',
    'Wombats sind das einzige bekannte Tier, dessen Kot diese ungewöhnliche Form hat.',
    'Cubes', 'Würfel', 'medium', true),

  ('oxford-comma-lawsuit', 'Law & Language', 'Recht & Sprache',
    'In 2017, a Maine dairy company lost a $5 million lawsuit over a missing punctuation mark in a labor law. Which mark?',
    '2017 verlor eine Molkerei in Maine einen Rechtsstreit über 5 Millionen Dollar wegen eines fehlenden Satzzeichens in einem Arbeitsgesetz. Um welches Zeichen ging es?',
    'Oxford comma', 'Oxford-Komma', 'hard', true),

  ('great-emu-war', 'Weird History', 'Kuriose Geschichte',
    'In 1932, the Australian military waged a brief, largely unsuccessful campaign against a large flightless bird. Which one?',
    '1932 führte das australische Militär eine kurze, weitgehend erfolglose Kampagne gegen einen großen flugunfähigen Vogel. Welchen?',
    'Emu', 'Emu', 'medium', true),

  ('honey-never-spoils', 'Food Science', 'Lebensmittelwissenschaft',
    'Archaeologists have found 3,000-year-old jars of this food in Egyptian tombs that were still perfectly edible.',
    'Archäologen fanden in ägyptischen Gräbern 3000 Jahre alte Gefäße mit diesem Lebensmittel, das noch immer genießbar war.',
    'Honey', 'Honig', 'easy', true),

  ('shortest-war-history', 'Weird History', 'Kuriose Geschichte',
    'The shortest war in recorded history, between Britain and Zanzibar in 1896, lasted only how long?',
    'Der kürzeste Krieg der Geschichte, zwischen Großbritannien und Sansibar im Jahr 1896, dauerte nur wie lange?',
    '38 minutes', '38 Minuten', 'hard', true),

  ('octopus-three-hearts', 'Animals', 'Tiere',
    'An octopus has three of this organ, and two of them stop beating when it swims.',
    'Ein Oktopus hat drei dieser Organe, und zwei davon hören auf zu schlagen, wenn er schwimmt.',
    'Hearts', 'Herzen', 'easy', true),

  ('iceland-no-mosquitoes', 'Geography', 'Geografie',
    'This country is one of the only places on Earth with no native population of a certain buzzing, biting insect.',
    'Dieses Land ist einer der wenigen Orte der Erde ohne heimische Population eines bestimmten summenden, stechenden Insekts.',
    'Iceland', 'Island', 'medium', true),

  ('tardigrade-space-survive', 'Animals', 'Tiere',
    'This microscopic animal is known to survive the vacuum of outer space unprotected.',
    'Dieses mikroskopisch kleine Tier überlebt nachweislich das Vakuum des Weltraums ungeschützt.',
    'Tardigrade', 'Bärtierchen', 'medium', true),

  ('venus-day-longer-year', 'Science', 'Wissenschaft',
    'On this planet, a single day (one full rotation) is longer than its entire year.',
    'Auf diesem Planeten ist ein einzelner Tag (eine volle Rotation) länger als sein gesamtes Jahr.',
    'Venus', 'Venus', 'medium', true),

  ('bananas-radioactive', 'Science', 'Wissenschaft',
    'Bananas contain trace amounts of potassium-40, making them very slightly this.',
    'Bananen enthalten Spuren von Kalium-40, wodurch sie in sehr geringem Maße dies sind.',
    'Radioactive', 'Radioaktiv', 'medium', true),

  ('paris-syndrome', 'Psychology', 'Psychologie',
    'Some tourists visiting Paris experience a real, documented psychological shock from the city not matching their expectations. What is this condition called?',
    'Manche Touristen in Paris erleben einen echten, dokumentierten psychischen Schock, weil die Stadt nicht ihren Erwartungen entspricht. Wie heißt dieses Phänomen?',
    'Paris syndrome', 'Paris-Syndrom', 'hard', true),

  ('saturn-would-float', 'Science', 'Wissenschaft',
    'This planet is so much less dense than water that it would theoretically float in a giant bathtub.',
    'Dieser Planet hat eine so geringe Dichte, dass er theoretisch in einer riesigen Badewanne schwimmen würde.',
    'Saturn', 'Saturn', 'easy', true);

insert into drawing_words
  (word_en, word_de, category_en, category_de, difficulty, active)
values
  ('Robot', 'Roboter', 'Objects', 'Objekte', 'easy', true),
  ('Rainbow', 'Regenbogen', 'Nature', 'Natur', 'easy', true),
  ('Guitar', 'Gitarre', 'Objects', 'Objekte', 'easy', true),
  ('Astronaut', 'Astronaut', 'People', 'Personen', 'medium', true),
  ('Pineapple', 'Ananas', 'Food', 'Essen', 'easy', true),
  ('Dragon', 'Drache', 'Fantasy', 'Fantasie', 'medium', true),
  ('Kangaroo', 'Känguru', 'Animals', 'Tiere', 'easy', true),
  ('Octopus', 'Oktopus', 'Animals', 'Tiere', 'medium', true),
  ('Snowman', 'Schneemann', 'Objects', 'Objekte', 'easy', true),
  ('Skateboard', 'Skateboard', 'Objects', 'Objekte', 'easy', true),
  ('Castle', 'Schloss', 'Places', 'Orte', 'medium', true),
  ('Unicorn', 'Einhorn', 'Fantasy', 'Fantasie', 'easy', true),
  ('Tornado', 'Tornado', 'Nature', 'Natur', 'medium', true),
  ('Chess', 'Schach', 'Games', 'Spiele', 'hard', true),
  ('Mermaid', 'Meerjungfrau', 'Fantasy', 'Fantasie', 'medium', true);
