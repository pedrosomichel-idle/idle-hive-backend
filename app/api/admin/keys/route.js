// app/api/admin/keys/route.js
//
// GET  -> lista as chaves geradas (com o e-mail de quem resgatou, se já
//         foi resgatada).
// POST -> gera uma nova chave: { days, note?, maxDevices? }.

import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '../../../../lib/admin';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { generateKeyCode } from '../../../../lib/keys';

export async function GET(request) {
  const { user, error } = await getAuthenticatedAdmin(request);
  if (!user) return NextResponse.json({ error }, { status: 403 });

  const db = supabaseAdmin();
  const { data: keys, error: listError } = await db
    .from('license_keys')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);

  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

  const redeemedIds = Array.from(new Set((keys || []).map((k) => k.redeemed_by).filter(Boolean)));
  const emailById = new Map();
  await Promise.all(
    redeemedIds.map(async (id) => {
      const { data } = await db.auth.admin.getUserById(id);
      if (data && data.user) emailById.set(id, data.user.email);
    })
  );

  const rows = (keys || []).map((k) => ({
    ...k,
    redeemedByEmail: k.redeemed_by ? emailById.get(k.redeemed_by) || null : null,
  }));

  return NextResponse.json({ keys: rows });
}

export async function POST(request) {
  const { user, error } = await getAuthenticatedAdmin(request);
  if (!user) return NextResponse.json({ error }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const days = Number(body.days);
  const note = String(body.note || '').trim() || null;
  const maxDevices = body.maxDevices ? Number(body.maxDevices) : Number(process.env.DEFAULT_MAX_DEVICES || 2);

  if (!days || days <= 0) {
    return NextResponse.json({ error: 'Informe um número de dias válido.' }, { status: 400 });
  }

  const db = supabaseAdmin();
  let code = generateKeyCode();

  // Colisão de código é extremamente improvável, mas confere mesmo assim.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await db.from('license_keys').select('id').eq('code', code).maybeSingle();
    if (!existing) break;
    code = generateKeyCode();
  }

  const { data: created, error: insertError } = await db
    .from('license_keys')
    .insert({ code, days, max_devices: maxDevices, note, created_by: user.id })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ key: created });
}
