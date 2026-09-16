// app/api/admin/commissions/route.js
//
// GET ?affiliateId=<uuid> -> lista as comissões (com e-mail do
// comprador) de um afiliado específico.

import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '../../../../lib/admin';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function GET(request) {
  const { user, error } = await getAuthenticatedAdmin(request);
  if (!user) return NextResponse.json({ error }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const affiliateId = searchParams.get('affiliateId');
  if (!affiliateId) return NextResponse.json({ error: 'affiliateId é obrigatório.' }, { status: 400 });

  const db = supabaseAdmin();
  const { data: commissions, error: listError } = await db
    .from('commissions')
    .select('*')
    .eq('affiliate_id', affiliateId)
    .order('created_at', { ascending: false });

  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

  const buyerIds = Array.from(new Set((commissions || []).map((c) => c.user_id)));
  const emailById = new Map();
  await Promise.all(
    buyerIds.map(async (id) => {
      const { data } = await db.auth.admin.getUserById(id);
      if (data && data.user) emailById.set(id, data.user.email);
    })
  );

  const rows = (commissions || []).map((c) => ({ ...c, buyerEmail: emailById.get(c.user_id) || null }));

  return NextResponse.json({ commissions: rows });
}
