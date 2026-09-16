// app/api/affiliate/me/route.js
//
// Retorna o status de afiliado do usuário logado: se ele já é afiliado,
// devolve o código, o link de indicação e um resumo (quantas ativações,
// quanto de comissão pendente/paga). Se ainda não é, devolve
// isAffiliate:false — o app mostra o botão "Tornar-se afiliado".

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function GET(request) {
  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const db = supabaseAdmin();

  const { data: affiliate, error: findError } = await db
    .from('affiliates')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }

  if (!affiliate) {
    return NextResponse.json({ isAffiliate: false });
  }

  const { data: commissions, error: commError } = await db
    .from('commissions')
    .select('amount_cents, status')
    .eq('affiliate_id', affiliate.id);

  if (commError) {
    return NextResponse.json({ error: commError.message }, { status: 500 });
  }

  const pendingCents = (commissions || [])
    .filter((c) => c.status === 'pendente')
    .reduce((sum, c) => sum + c.amount_cents, 0);
  const paidCents = (commissions || [])
    .filter((c) => c.status === 'pago')
    .reduce((sum, c) => sum + c.amount_cents, 0);

  const base = process.env.AFFILIATE_LINK_BASE || process.env.APP_BASE_URL || 'https://idlehive.com';

  return NextResponse.json({
    isAffiliate: true,
    code: affiliate.code,
    link: `${base}/r/${affiliate.code}`,
    activations: (commissions || []).length,
    pendingCents,
    paidCents,
  });
}
