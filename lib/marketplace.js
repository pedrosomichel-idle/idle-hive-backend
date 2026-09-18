// lib/marketplace.js
//
// Regras de negócio do Mercado RMT. Tudo aqui roda no servidor — nunca
// confie no app pra aplicar limite nenhum.

import { supabaseAdmin } from './supabaseAdmin';
import { getLicenseStatus } from './license';

// Quantas transações contabilizadas cada faixa exige. Platina é o topo.
export const TIERS = [
  { key: 'bronze', label: 'Bronze', min: 0 },
  { key: 'prata', label: 'Prata', min: 5 },
  { key: 'ouro', label: 'Ouro', min: 15 },
  { key: 'platina', label: 'Platina', min: 40 },
  { key: 'diamante', label: 'Diamante', min: 100 },
];

// Anti-scam
export const PAIR_COOLDOWN_HOURS = 24; // mesmo par: 1 transação contada a cada 24h
export const DAILY_COUNTED_CAP = 5; // teto diário de transações contadas por pessoa
export const MIN_MESSAGES_PER_SIDE = 3; // conversa real antes de poder confirmar

export function tierFor(count) {
  let current = TIERS[0];
  for (const tier of TIERS) {
    if (count >= tier.min) current = tier;
  }
  return current;
}

// O par é sempre guardado com o menor uuid primeiro, pra "conversa entre
// A e B" ser sempre a mesma linha, não importa quem abriu.
export function canonicalPair(userId1, userId2) {
  return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
}

// Porta de entrada do Mercado: precisa de licença ativa E não estar
// suspenso. Devolve o perfil quando tudo certo.
export async function requireMarketplaceAccess(userId) {
  const status = await getLicenseStatus(userId);
  if (!status.valid) {
    return { ok: false, status: 403, error: 'O Mercado é exclusivo para quem tem licença ativa.' };
  }
  if (status.plan === 'trial') {
    return { ok: false, status: 403, error: 'O Mercado é exclusivo para licenças pagas. O período de teste não dá acesso.' };
  }

  const db = supabaseAdmin();
  const { data: profile, error } = await db
    .from('marketplace_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { ok: false, status: 500, error: error.message };

  if (profile && profile.suspended_until && new Date(profile.suspended_until) > new Date()) {
    return {
      ok: false,
      status: 403,
      error: `Seu acesso ao Mercado está suspenso até ${new Date(profile.suspended_until).toLocaleString('pt-BR')}.`,
    };
  }

  return { ok: true, profile: profile || null };
}

// Reputação = transações concluídas E contabilizadas em que a pessoa
// participou (de qualquer lado).
export async function reputationFor(userId) {
  const db = supabaseAdmin();
  const { count, error } = await db
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('counted', true)
    .not('completed_at', 'is', null)
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

  if (error) throw new Error(`Falha ao calcular reputação: ${error.message}`);

  const total = count || 0;
  return { total, tier: tierFor(total) };
}

// Reputação de várias pessoas de uma vez (listagem de anúncios) — evita
// uma consulta por anúncio.
export async function reputationForMany(userIds) {
  const result = new Map();
  if (!userIds || userIds.length === 0) return result;

  const db = supabaseAdmin();
  const { data, error } = await db
    .from('transactions')
    .select('user_a_id, user_b_id')
    .eq('counted', true)
    .not('completed_at', 'is', null);

  if (error) throw new Error(`Falha ao calcular reputações: ${error.message}`);

  const tally = new Map();
  (data || []).forEach((t) => {
    tally.set(t.user_a_id, (tally.get(t.user_a_id) || 0) + 1);
    tally.set(t.user_b_id, (tally.get(t.user_b_id) || 0) + 1);
  });

  userIds.forEach((id) => {
    const total = tally.get(id) || 0;
    result.set(id, { total, tier: tierFor(total) });
  });
  return result;
}

// Decide se uma transação recém-concluída pode contar pra reputação.
// Retorna { counted, reason }.
export async function evaluateAntiScam(userAId, userBId) {
  const db = supabaseAdmin();
  const now = Date.now();

  // 1) Mesmo par já contabilizou nas últimas 24h?
  const cooldownStart = new Date(now - PAIR_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
  const { data: recentPair, error: pairError } = await db
    .from('transactions')
    .select('id')
    .eq('counted', true)
    .eq('user_a_id', userAId)
    .eq('user_b_id', userBId)
    .gte('completed_at', cooldownStart)
    .limit(1);

  if (pairError) throw new Error(pairError.message);
  if (recentPair && recentPair.length > 0) {
    return {
      counted: false,
      reason: `Vocês já registraram uma transação contabilizada nas últimas ${PAIR_COOLDOWN_HOURS}h. Esta fica registrada, mas não soma na reputação.`,
    };
  }

  // 2) Teto diário de cada um dos dois.
  const dayStart = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  for (const userId of [userAId, userBId]) {
    const { count, error } = await db
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('counted', true)
      .gte('completed_at', dayStart)
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

    if (error) throw new Error(error.message);
    if ((count || 0) >= DAILY_COUNTED_CAP) {
      return {
        counted: false,
        reason: `Limite diário de ${DAILY_COUNTED_CAP} transações contabilizadas atingido. Esta fica registrada, mas não soma na reputação.`,
      };
    }
  }

  return { counted: true, reason: null };
}

// Conversa precisa ser real antes de liberar o botão de confirmar.
export async function conversationHasRealExchange(conversationId, userAId, userBId) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('messages')
    .select('sender_id')
    .eq('conversation_id', conversationId);

  if (error) throw new Error(error.message);

  const fromA = (data || []).filter((m) => m.sender_id === userAId).length;
  const fromB = (data || []).filter((m) => m.sender_id === userBId).length;

  return {
    ok: fromA >= MIN_MESSAGES_PER_SIDE && fromB >= MIN_MESSAGES_PER_SIDE,
    fromA,
    fromB,
    required: MIN_MESSAGES_PER_SIDE,
  };
}

// Quantas transações contabilizadas esse par já fez entre si — mostrado
// no chat pra dar transparência ("cuidado: vocês só negociaram entre si").
export async function countedBetween(userAId, userBId) {
  const db = supabaseAdmin();
  const { count, error } = await db
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('counted', true)
    .eq('user_a_id', userAId)
    .eq('user_b_id', userBId);

  if (error) throw new Error(error.message);
  return count || 0;
}

// Nicknames de vários usuários de uma vez.
export async function nicknamesFor(userIds) {
  const map = new Map();
  if (!userIds || userIds.length === 0) return map;

  const db = supabaseAdmin();
  const { data, error } = await db
    .from('marketplace_profiles')
    .select('user_id, nickname')
    .in('user_id', userIds);

  if (error) throw new Error(error.message);
  (data || []).forEach((p) => map.set(p.user_id, p.nickname));
  return map;
}
