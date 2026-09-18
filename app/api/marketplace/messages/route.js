// app/api/marketplace/messages/route.js
//
// GET  — mensagens de uma conversa + estado da transação (se já dá pra
//        confirmar, quem já confirmou, histórico do par)
// POST — envia mensagem ({ conversationId, body })

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import {
  requireMarketplaceAccess,
  conversationHasRealExchange,
  countedBetween,
  reputationFor,
  nicknamesFor,
} from '../../../../lib/marketplace';

const MAX_MESSAGE_LENGTH = 800;

// Carrega a conversa garantindo que o usuário é um dos dois lados.
async function loadConversation(db, conversationId, userId) {
  const { data: conversation, error } = await db
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle();

  if (error) return { error: error.message, status: 500 };
  if (!conversation) return { error: 'Conversa não encontrada.', status: 404 };
  if (conversation.user_a_id !== userId && conversation.user_b_id !== userId) {
    return { error: 'Essa conversa não é sua.', status: 403 };
  }
  return { conversation };
}

export async function GET(request) {
  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const access = await requireMarketplaceAccess(user.id);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');
  if (!conversationId) return NextResponse.json({ error: 'conversationId é obrigatório.' }, { status: 400 });

  const db = supabaseAdmin();
  const loaded = await loadConversation(db, conversationId, user.id);
  if (loaded.error) return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  const { conversation } = loaded;

  const otherId = conversation.user_a_id === user.id ? conversation.user_b_id : conversation.user_a_id;

  try {
    const { data: messages, error: messagesError } = await db
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(300);

    if (messagesError) return NextResponse.json({ error: messagesError.message }, { status: 500 });

    const { data: transaction } = await db
      .from('transactions')
      .select('*')
      .eq('conversation_id', conversationId)
      .maybeSingle();

    const [exchange, pairCount, otherReputation, nicknames] = await Promise.all([
      conversationHasRealExchange(conversationId, conversation.user_a_id, conversation.user_b_id),
      countedBetween(conversation.user_a_id, conversation.user_b_id),
      reputationFor(otherId),
      nicknamesFor([otherId]),
    ]);

    const iAmA = conversation.user_a_id === user.id;
    const myConfirm = transaction ? (iAmA ? transaction.a_confirmed_at : transaction.b_confirmed_at) : null;
    const theirConfirm = transaction ? (iAmA ? transaction.b_confirmed_at : transaction.a_confirmed_at) : null;

    return NextResponse.json({
      messages: (messages || []).map((m) => ({
        id: m.id,
        body: m.body,
        mine: m.sender_id === user.id,
        createdAt: m.created_at,
      })),
      other: {
        nickname: nicknames.get(otherId) || 'Jogador',
        reputation: otherReputation,
      },
      pairCountedTransactions: pairCount,
      transaction: {
        canConfirm: exchange.ok,
        exchange,
        iConfirmed: !!myConfirm,
        theyConfirmed: !!theirConfirm,
        completed: transaction ? !!transaction.completed_at : false,
        counted: transaction ? transaction.counted : false,
        notCountedReason: transaction ? transaction.not_counted_reason : null,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const access = await requireMarketplaceAccess(user.id);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const payload = await request.json().catch(() => ({}));
  const conversationId = payload.conversationId;
  const body = String(payload.body || '').trim();

  if (!conversationId) return NextResponse.json({ error: 'conversationId é obrigatório.' }, { status: 400 });
  if (!body) return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 });
  if (body.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `Máximo de ${MAX_MESSAGE_LENGTH} caracteres.` }, { status: 400 });
  }

  const db = supabaseAdmin();
  const loaded = await loadConversation(db, conversationId, user.id);
  if (loaded.error) return NextResponse.json({ error: loaded.error }, { status: loaded.status });

  const { error } = await db.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return NextResponse.json({ ok: true });
}
