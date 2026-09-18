// app/api/admin/reports/route.js
//
// GET   — fila de denúncias (abertas primeiro), com apelidos dos dois lados
// PATCH — resolve/descarta uma denúncia e, opcionalmente, suspende o
//         denunciado do Mercado ({ id, action, suspendDays })

import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '../../../../lib/admin';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { nicknamesFor, reputationForMany } from '../../../../lib/marketplace';

export async function GET(request) {
  const { user, error } = await getAuthenticatedAdmin(request);
  if (!user) return NextResponse.json({ error }, { status: 403 });

  const db = supabaseAdmin();
  const { data: reports, error: listError } = await db
    .from('reports')
    .select('*')
    .order('status', { ascending: true }) // 'aberta' vem antes de 'descartada'/'resolvida'
    .order('created_at', { ascending: false })
    .limit(200);

  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

  try {
    const userIds = Array.from(
      new Set((reports || []).flatMap((r) => [r.reporter_id, r.reported_id]))
    );
    const [nicknames, reputations] = await Promise.all([
      nicknamesFor(userIds),
      reputationForMany(userIds),
    ]);

    // Situação de suspensão de cada denunciado
    const { data: profiles } = await db
      .from('marketplace_profiles')
      .select('user_id, suspended_until')
      .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']);
    const suspensions = new Map((profiles || []).map((p) => [p.user_id, p.suspended_until]));

    const rows = (reports || []).map((r) => ({
      id: r.id,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
      conversationId: r.conversation_id,
      reporter: { nickname: nicknames.get(r.reporter_id) || '—' },
      reported: {
        id: r.reported_id,
        nickname: nicknames.get(r.reported_id) || '—',
        reputation: reputations.get(r.reported_id) || { total: 0, tier: { key: 'bronze', label: 'Bronze' } },
        suspendedUntil: suspensions.get(r.reported_id) || null,
      },
    }));

    return NextResponse.json({ reports: rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const { user, error } = await getAuthenticatedAdmin(request);
  if (!user) return NextResponse.json({ error }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const id = body.id;
  const action = body.action; // 'resolver' | 'descartar'
  const suspendDays = Number(body.suspendDays || 0);

  if (!id || !['resolver', 'descartar'].includes(action)) {
    return NextResponse.json({ error: 'id e action válidos são obrigatórios.' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: report, error: findError } = await db
    .from('reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!report) return NextResponse.json({ error: 'Denúncia não encontrada.' }, { status: 404 });

  if (action === 'resolver' && suspendDays > 0) {
    const until = new Date(Date.now() + suspendDays * 24 * 60 * 60 * 1000).toISOString();
    const { error: suspendError } = await db
      .from('marketplace_profiles')
      .update({ suspended_until: until, suspended_reason: report.reason })
      .eq('user_id', report.reported_id);

    if (suspendError) return NextResponse.json({ error: suspendError.message }, { status: 500 });
  }

  const { error: updateError } = await db
    .from('reports')
    .update({ status: action === 'resolver' ? 'resolvida' : 'descartada' })
    .eq('id', id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
