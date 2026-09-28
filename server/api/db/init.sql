-- Schéma : comptes joueurs + classement. Exécuté par l'API elle-même à chaque démarrage
-- (voir src/migrate.js) : entièrement idempotent, sans dépendre d'un montage Postgres particulier.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  pseudo text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists leaderboard_entries (
  user_id uuid primary key references users(id) on delete cascade,
  total_gold_earned numeric not null default 0,
  total_keys integer not null default 0,
  prestiges integer not null default 0,
  -- revenu/s le plus élevé jamais soumis : sert de référence pour la validation anti-triche
  -- (un gain ne peut pas dépasser ce qu'un revenu plausible aurait produit dans le temps écoulé)
  max_income numeric not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists leaderboard_entries_gold_idx on leaderboard_entries (total_gold_earned desc);
