// app/api/admin/affiliates/route.js

import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '../../../../lib/admin';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function GET(request) {
  const { user, error } = await getAuthenticatedAdmin(request);
  if (!user) return NextResponse.json({ error }, { status: 403 });

  const db = supabaseAdmin();
  const { data: affiliates, error: listError } = await db
    .from('affiliates')
    .select('*')
    .order('created_at', { ascending: false });
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

  const { data: commissions, error: commError } = await db.from('commissions').select('*');
  if (commError) return NextResponse.json({ error: commError.message }, { status: 500 });

  const rows = (affiliates || []).map((a) => {
    const own = (commissions || []).filter((c) => c.affiliate_id === a.id);
    const pendingCents = own.filter((c) => c.status === 'pendente').reduce((sum, c) => sum + c.amount_cents, 0);
    const paidCents = own.filter((c) => c.status === 'pago').reduce((sum, c) => sum + c.amount_cents, 0);
    return { ...a, pendingCents, paidCents, activations: own.length };
  });

  return NextResponse.json({ affiliates: rows });
}

export async function POST(request) {
  const { user, error } = await getAuthenticatedAdmin(request);
  if (!user) return NextResponse.json({ error }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  let code = String(body.code || '').trim().toUpperCase();

  if (!name || !email) {
    return NextResponse.json({ error: 'Nome e e-mail são obrigatórios.' }, { status: 400 });
  }
  if (!code) {
    code = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12) || `PARCEIRO${Date.now()}`;
  }

  const db = supabaseAdmin();
  const { data: created, error: insertError } = await db
    .from('affiliates')
    .insert({ name, email, code })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ affiliate: created });
}
