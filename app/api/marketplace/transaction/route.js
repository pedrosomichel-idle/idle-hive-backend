// app/api/marketplace/transaction/route.js
//
// POST — confirma a transação da conversa ({ conversationId }).
//
// A confirmação é SEMPRE individual: cada lado confirma por si. Só
// quando os dois confirmaram é que a transação fecha — e só então as
// regras anti-scam decidem se ela conta pra reputação.

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import {
  requireMarketplaceAccess,
  conversationHasRealExchange,
  evaluateAntiScam,
} from '../../../../lib/marketplace';

export async function POST(request) {
  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const access = await requireMarketplaceAccess(user.id);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const payload = await request.json().catch(() => ({}));
  const conversationId = payload.conversationId;
  if (!conversationId) return NextResponse.json({ error: 'conversationId é obrigatório.' }, { status: 400 });

  const db = supabaseAdmin();

  const { data: conversation, error: convError } = await db
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle();

  if (convError) return NextResponse.json({ error: convError.message }, { status: 500 });
  if (!conversation) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 });
  if (conversation.user_a_id !== user.id && conversation.user_b_id !== user.id) {
    return NextResponse.json({ error: 'Essa conversa não é sua.' }, { status: 403 });
  }

  try {
    // Só libera confirmar depois de uma negociação real — dificulta
    // confirmação automática entre contas combinadas.
    const exchange = await conversationHasRealExchange(
      conversationId,
      conversation.user_a_id,
      conversation.user_b_id
    );
    if (!exchange.ok) {
      return NextResponse.json(
        {
          error: `Converse de verdade antes de confirmar: são necessárias pelo menos ${exchange.required} mensagens de cada lado.`,
        },
        { status: 400 }
      );
    }

    const iAmA = conversation.user_a_id === user.id;
    const nowIso = new Date().toISOString();

    const { data: existing } = await db
      .from('transactions')
      .select('*')
      .eq('conversation_id', conversationId)
      .maybeSingle();

    let transaction = existing;

    if (!transaction) {
      const { data: created, error: insertError } = await db
        .from('transactions')
        .insert({
          conversation_id: conversationId,
          user_a_id: conversation.user_a_id,
          user_b_id: conversation.user_b_id,
          a_confirmed_at: iAmA ? nowIso : null,
          b_confirmed_at: iAmA ? null : nowIso,
        })
        .select()
        .single();

      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
      transaction = created;
    } else {
      if (transaction.completed_at) {
        return NextResponse.json({ error: 'Essa transação já foi concluída.' }, { status: 400 });
      }

      const alreadyMine = iAmA ? transaction.a_confirmed_at : transaction.b_confirmed_at;
      if (alreadyMine) {
        return NextResponse.json({
          ok: true,
          waitingOther: true,
          message: 'Você já confirmou. Aguardando a confirmação do outro lado.',
        });
      }

      const patch = iAmA ? { a_confirmed_at: nowIso } : { b_confirmed_at: nowIso };
      const { data: updated, error: updateError } = await db
        .from('transactions')
        .update(patch)
        .eq('id', transaction.id)
        .select()
        .single();

      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
      transaction = updated;
    }

    const bothConfirmed = !!transaction.a_confirmed_at && !!transaction.b_confirmed_at;
    if (!bothConfirmed) {
      return NextResponse.json({
        ok: true,
        waitingOther: true,
        message: 'Confirmado! Assim que o outro lado confirmar, a transação entra na sua reputação.',
      });
    }

    // Os dois confirmaram — agora decidimos se conta pra reputação.
    const antiScam = await evaluateAntiScam(conversation.user_a_id, conversation.user_b_id);

    const { error: completeError } = await db
      .from('transactions')
      .update({
        completed_at: new Date().toISOString(),
        counted: antiScam.counted,
        not_counted_reason: antiScam.reason,
      })
      .eq('id', transaction.id);

    if (completeError) return NextResponse.json({ error: completeError.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      completed: true,
      counted: antiScam.counted,
      message: antiScam.counted
        ? 'Transação confirmada pelos dois lados e somada à reputação de vocês.'
        : antiScam.reason,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
