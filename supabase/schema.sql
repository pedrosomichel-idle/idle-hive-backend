-- supabase/schema.sql
--
-- Rode isso no SQL Editor do seu projeto Supabase (Database -> SQL Editor).
-- Usa a tabela auth.users que o Supabase Auth já mantém — não precisa
-- criar tabela de usuários própria.

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'standard',
  max_devices int not null default 2,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  amount_cents integer,
  expires_at timestamptz, -- null = licença permanente (paga). preenchido = licença por prazo (chave promo/sorteio)
  created_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  device_name text,
  activated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create table if not exists public.trials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trial_ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- RLS habilitado, mas sem policies públicas: só o backend (usando a
-- service_role key, que ignora RLS) acessa essas tabelas. O app Electron
-- nunca fala direto com o Supabase pra essas tabelas — só via API do
-- backend, autenticado com o token da sessão do usuário.
alter table public.licenses enable row level security;
alter table public.devices enable row level security;
alter table public.trials enable row level security;

-- ---------------------------------------------------------------------
-- Painel admin: quem pode entrar
-- ---------------------------------------------------------------------

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.admins enable row level security;

-- Depois de rodar este schema inteiro, adicione você mesmo como admin
-- (troque o e-mail pelo que você usou pra criar sua conta no app):
--
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'seu-email@exemplo.com';

-- ---------------------------------------------------------------------
-- Chaves de ativação manuais (parceiros, sorteios)
-- ---------------------------------------------------------------------

create table if not exists public.license_keys (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  days int not null,
  max_devices int not null default 2,
  note text,
  created_by uuid references auth.users(id),
  redeemed_by uuid references auth.users(id),
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.license_keys enable row level security;

-- ---------------------------------------------------------------------
-- Afiliados / parceiros e comissões
-- ---------------------------------------------------------------------

create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text,
  code text not null unique,
  created_at timestamptz not null default now()
);

-- Se você já tinha uma versão anterior da tabela affiliates (sem
-- user_id / com email obrigatório), rode também estes ajustes:
--   alter table public.affiliates add column if not exists user_id uuid references auth.users(id) on delete set null;
--   alter table public.affiliates alter column email drop not null;
create unique index if not exists affiliates_user_id_key on public.affiliates (user_id) where user_id is not null;

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents integer not null,
  status text not null default 'pendente', -- 'pendente' | 'pago'
  created_at timestamptz not null default now()
);

alter table public.affiliates enable row level security;
alter table public.commissions enable row level security;

-- ---------------------------------------------------------------------
-- Limite de 1 conta IdleHive por dispositivo (com slots extras pagos)
-- ---------------------------------------------------------------------
--
-- A tabela "devices" já limita quantos DISPOSITIVOS uma LICENÇA pode
-- usar (max_devices). Esta tabela é o inverso: quantas CONTAS
-- diferentes um mesmo DISPOSITIVO pode ativar. Por padrão é 1 (o
-- comprador entrando no próprio PC); "extra_slots" soma a esse 1 quando
-- alguém paga por um slot extra pra usar uma segunda conta na mesma
-- máquina.

create table if not exists public.device_extra_slots (
  device_id text primary key,
  extra_slots int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.device_extra_slots enable row level security;
