-- Draw & Guess: let the drawer pick a color and brush size instead of
-- a hardcoded white 5px line.

alter table drawing_strokes
  add column if not exists color text not null default '#f8fafc';
