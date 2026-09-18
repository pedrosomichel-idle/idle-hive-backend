// app/api/marketplace/profile/route.js
//
// GET  — status do usuário no Mercado: tem acesso? já escolheu apelido?
//        qual a reputação/tier atual?
// POST — escolhe o apelido na primeira entrada ({ nickname }).

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { requireMarketplaceAccess, reputationFor } from '../../../../lib/marketplace';

export async function GET(request) {
  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const access = await requireMarketplaceAccess(user.id);
  if (!access.ok) {
    return NextResponse.json({ hasAccess: false, error: access.error }, { status: access.status });
  }

  try {
    const reputation = await reputationFor(user.id);
    return NextResponse.json({
      hasAccess: true,
      needsNickname: !access.profile,
      nickname: access.profile ? access.profile.nickname : null,
      reputation,
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
  if (access.profile) {
    return NextResponse.json({ error: 'Você já tem um apelido no Mercado.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const nickname = String(body.nickname || '').trim();

  if (nickname.length < 3 || nickname.length > 20) {
    return NextResponse.json({ error: 'O apelido precisa ter entre 3 e 20 caracteres.' }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_ ]+$/.test(nickname)) {
    return NextResponse.json({ error: 'Use apenas letras, números, espaço e underline.' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: created, error } = await db
    .from('marketplace_profiles')
    .insert({ user_id: user.id, nickname })
    .select()
    .single();

  if (error) {
    // unique violation
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Esse apelido já está em uso.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, nickname: created.nickname });
}
