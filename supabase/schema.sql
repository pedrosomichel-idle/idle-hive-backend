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

-- =====================================================================
-- Mercado RMT — anúncios, chat, reputação e moderação
-- =====================================================================
--
-- Regras centrais (todas aplicadas no backend, nunca só no app):
--   * Só quem tem licença ativa entra no Mercado.
--   * Reputação vive na PESSOA (user_id do IdleHive), nunca no
--     personagem do jogo — jogador tem dezenas de chars, trocar de char
--     não zera a ficha.
--   * Uma transação só conta pra reputação quando os DOIS lados
--     confirmam, de forma independente.
--   * O mesmo par de pessoas só gera 1 transação contabilizada a cada
--     24h (evita duas contas combinadas inflando reputação).
--   * Cada pessoa tem um teto diário de transações contabilizadas
--     (evita rotacionar entre várias contas alternativas).
--   * Só libera confirmar depois de uma conversa real (mínimo de
--     mensagens dos dois lados).

-- Perfil público do usuário dentro do Mercado (apelido escolhido na
-- primeira entrada). Sem isso, o usuário nem aparece no Mercado.
create table if not exists public.marketplace_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  suspended_until timestamptz, -- null = não suspenso; futuro = banido do Mercado até lá
  suspended_reason text,
  created_at timestamptz not null default now()
);

-- Anúncios de compra e venda.
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game text not null default 'huntera', -- preparado pra outros jogos depois
  kind text not null, -- 'venda' | 'compra'
  title text not null,
  description text,
  price_text text, -- texto livre ("500k gold", "troco por X") — nunca dinheiro real
  character_name text, -- opcional: com qual char negociar dentro do jogo
  status text not null default 'aberto', -- 'aberto' | 'concluido' | 'cancelado'
  created_at timestamptz not null default now()
);

create index if not exists listings_open_idx on public.listings (game, status, created_at desc);
create index if not exists listings_user_idx on public.listings (user_id, created_at desc);

-- Conversa entre duas pessoas, geralmente a partir de um anúncio.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

-- user_a_id/user_b_id são guardados sempre na mesma ordem (o menor uuid
-- primeiro) — assim o par é canônico e dá pra consultar "conversa entre
-- essas duas pessoas" sem duplicar.
create unique index if not exists conversations_pair_listing_idx
  on public.conversations (user_a_id, user_b_id, coalesce(listing_id, '00000000-0000-0000-0000-000000000000'::uuid));

create index if not exists conversations_recent_idx on public.conversations (last_message_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

-- Transação: uma por conversa. Só vira reputação quando os dois
-- confirmam E passa nas regras anti-scam (counted = true).
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references public.conversations(id) on delete cascade,
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  a_confirmed_at timestamptz,
  b_confirmed_at timestamptz,
  completed_at timestamptz, -- preenchido quando os DOIS confirmaram
  counted boolean not null default false, -- passou nas regras anti-scam?
  not_counted_reason text, -- por que não contou (limite 24h, teto diário...)
  created_at timestamptz not null default now()
);

create index if not exists transactions_pair_idx on public.transactions (user_a_id, user_b_id, completed_at desc);
create index if not exists transactions_counted_idx on public.transactions (counted, completed_at desc);

-- Denúncias (golpe, spam, abuso) — alimentam a fila de moderação do
-- painel admin.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  reason text not null,
  status text not null default 'aberta', -- 'aberta' | 'resolvida' | 'descartada'
  created_at timestamptz not null default now()
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);

alter table public.marketplace_profiles enable row level security;
alter table public.listings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.transactions enable row level security;
alter table public.reports enable row level security;
