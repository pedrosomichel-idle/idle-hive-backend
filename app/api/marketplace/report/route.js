// app/api/marketplace/report/route.js
//
// POST — denuncia alguém ({ conversationId, reason }). A denúncia cai na
// fila de moderação do painel admin.

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { requireMarketplaceAccess } from '../../../../lib/marketplace';

export async function POST(request) {
  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const access = await requireMarketplaceAccess(user.id);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const payload = await request.json().catch(() => ({}));
  const conversationId = payload.conversationId;
  const reason = String(payload.reason || '').trim();

  if (!conversationId) return NextResponse.json({ error: 'conversationId é obrigatório.' }, { status: 400 });
  if (reason.length < 10) {
    return NextResponse.json({ error: 'Descreva o que aconteceu (mínimo 10 caracteres).' }, { status: 400 });
  }

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

  const reportedId = conversation.user_a_id === user.id ? conversation.user_b_id : conversation.user_a_id;

  // Evita a mesma pessoa abrir várias denúncias abertas da mesma conversa.
  const { data: existing } = await db
    .from('reports')
    .select('id')
    .eq('reporter_id', user.id)
    .eq('conversation_id', conversationId)
    .eq('status', 'aberta')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Você já tem uma denúncia aberta nessa conversa.' }, { status: 400 });
  }

  const { error } = await db.from('reports').insert({
    reporter_id: user.id,
    reported_id: reportedId,
    conversation_id: conversationId,
    reason,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
