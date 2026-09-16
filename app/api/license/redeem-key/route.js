// app/api/license/redeem-key/route.js
//
// Usuário digita uma chave gerada no painel admin (ex: parceiro
// divulgando, ou prêmio de sorteio). Se válida e ainda não usada, cria
// (ou substitui, se a anterior já tiver expirado) uma licença por prazo
// pra esse usuário.

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function POST(request) {
  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const code = String(body.code || '').trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: 'Informe o código da chave.' }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: existingLicense, error: existingError } = await db
    .from('licenses')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }
  if (existingLicense && (!existingLicense.expires_at || new Date(existingLicense.expires_at) > new Date())) {
    return NextResponse.json({ error: 'Você já tem uma licença ativa.' }, { status: 400 });
  }

  const { data: key, error: findError } = await db
    .from('license_keys')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }
  if (!key) {
    return NextResponse.json({ error: 'Chave inválida.' }, { status: 404 });
  }
  if (key.redeemed_by) {
    return NextResponse.json({ error: 'Essa chave já foi usada.' }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + key.days * 24 * 60 * 60 * 1000).toISOString();

  const { error: upsertError } = await db.from('licenses').upsert(
    {
      user_id: user.id,
      plan: 'promo',
      max_devices: key.max_devices,
      expires_at: expiresAt,
      amount_cents: null,
      stripe_customer_id: null,
      stripe_payment_intent_id: null,
    },
    { onConflict: 'user_id' }
  );

  if (upsertError) {
    return NextResponse.json({ error: `Falha ao ativar licença: ${upsertError.message}` }, { status: 500 });
  }

  const { error: redeemError } = await db
    .from('license_keys')
    .update({ redeemed_by: user.id, redeemed_at: new Date().toISOString() })
    .eq('id', key.id);

  if (redeemError) {
    return NextResponse.json({ error: `Falha ao marcar chave como usada: ${redeemError.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, expiresAt });
}
