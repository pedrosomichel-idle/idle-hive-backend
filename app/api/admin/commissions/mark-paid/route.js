// app/api/admin/commissions/mark-paid/route.js

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
  const { error: updateError } = await db.from('commissions').update({ status: 'pago' }).eq('id', id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
