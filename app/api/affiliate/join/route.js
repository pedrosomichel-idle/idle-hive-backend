// app/api/affiliate/join/route.js
//
// O usuário logado se torna afiliado por conta própria (sem o admin
// criar manualmente). Gera um código único automaticamente e devolve o
// código + link de indicação. Idempotente: se já for afiliado, só
// devolve o que já existe.

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { generateAffiliateCode } from '../../../../lib/affiliateCode';

export async function POST(request) {
  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const db = supabaseAdmin();
  const base = process.env.AFFILIATE_LINK_BASE || process.env.APP_BASE_URL || 'https://idlehive.com';

  // Já é afiliado? Devolve o existente (idempotente).
  const { data: existing, error: findError } = await db
    .from('affiliates')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }
  if (existing) {
    return NextResponse.json({
      ok: true,
      code: existing.code,
      link: `${base}/r/${existing.code}`,
      alreadyAffiliate: true,
    });
  }

  // Gera um código único (tenta algumas vezes em caso de colisão).
  let code = generateAffiliateCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: clash } = await db.from('affiliates').select('id').eq('code', code).maybeSingle();
    if (!clash) break;
    code = generateAffiliateCode();
  }

  const displayName = user.email ? user.email.split('@')[0] : 'Afiliado';

  const { data: created, error: insertError } = await db
    .from('affiliates')
    .insert({
      user_id: user.id,
      name: displayName,
      email: user.email || null,
      code,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: `Falha ao criar afiliado: ${insertError.message}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    code: created.code,
    link: `${base}/r/${created.code}`,
    alreadyAffiliate: false,
  });
}
