// app/api/marketplace/listings/route.js
//
// GET    — lista anúncios abertos (com apelido e reputação de quem postou)
// POST   — cria um anúncio
// PATCH  — muda o status de um anúncio seu ({ id, status })

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { requireMarketplaceAccess, reputationForMany, nicknamesFor } from '../../../../lib/marketplace';

const MAX_OPEN_LISTINGS = 10; // evita alguém entupir a lista com spam

export async function GET(request) {
  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const access = await requireMarketplaceAccess(user.id);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind'); // 'venda' | 'compra' | null (todos)
  const search = (searchParams.get('q') || '').trim();

  const db = supabaseAdmin();
  let query = db
    .from('listings')
    .select('*')
    .eq('game', 'huntera')
    .eq('status', 'aberto')
    .order('created_at', { ascending: false })
    .limit(100);

  if (kind === 'venda' || kind === 'compra') query = query.eq('kind', kind);
  if (search) query = query.ilike('title', `%${search}%`);

  const { data: listings, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    const userIds = Array.from(new Set((listings || []).map((l) => l.user_id)));
    const [reputations, nicknames] = await Promise.all([
      reputationForMany(userIds),
      nicknamesFor(userIds),
    ]);

    const rows = (listings || []).map((l) => ({
      ...l,
      isMine: l.user_id === user.id,
      nickname: nicknames.get(l.user_id) || 'Jogador',
      reputation: reputations.get(l.user_id) || { total: 0, tier: { key: 'bronze', label: 'Bronze' } },
    }));

    return NextResponse.json({ listings: rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const access = await requireMarketplaceAccess(user.id);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.profile) {
    return NextResponse.json({ error: 'Escolha um apelido antes de anunciar.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const kind = body.kind === 'compra' ? 'compra' : 'venda';
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim() || null;
  const priceText = String(body.priceText || '').trim() || null;
  const characterName = String(body.characterName || '').trim() || null;

  if (title.length < 3 || title.length > 80) {
    return NextResponse.json({ error: 'O título precisa ter entre 3 e 80 caracteres.' }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { count, error: countError } = await db
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'aberto');

  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
  if ((count || 0) >= MAX_OPEN_LISTINGS) {
    return NextResponse.json(
      { error: `Você já tem ${MAX_OPEN_LISTINGS} anúncios abertos. Encerre algum antes de criar outro.` },
      { status: 400 }
    );
  }

  const { data: created, error } = await db
    .from('listings')
    .insert({
      user_id: user.id,
      game: 'huntera',
      kind,
      title,
      description,
      price_text: priceText,
      character_name: characterName,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, listing: created });
}

export async function PATCH(request) {
  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const access = await requireMarketplaceAccess(user.id);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json().catch(() => ({}));
  const id = body.id;
  const status = ['aberto', 'concluido', 'cancelado'].includes(body.status) ? body.status : null;

  if (!id || !status) {
    return NextResponse.json({ error: 'id e status válidos são obrigatórios.' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db.from('listings').update({ status }).eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
