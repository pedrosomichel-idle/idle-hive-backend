// app/api/admin/keys/revoke/route.js

import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '../../../../../lib/admin';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';

export async function POST(request) {
  const { user, error } = await getAuthenticatedAdmin(request);
  if (!user) return NextResponse.json({ error }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const id = body.id;
  if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });

  const db = supabaseAdmin();
  const { data: key, error: findError } = await db.from('license_keys').select('*').eq('id', id).maybeSingle();
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!key) return NextResponse.json({ error: 'Chave não encontrada.' }, { status: 404 });
  if (key.redeemed_by) {
    return NextResponse.json({ error: 'Chave já foi resgatada, não pode ser revogada.' }, { status: 400 });
  }

  const { error: deleteError } = await db.from('license_keys').delete().eq('id', id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
