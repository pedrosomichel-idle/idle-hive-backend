// app/api/marketplace/conversations/route.js
//
// GET  — lista minhas conversas (com apelido/reputação do outro lado)
// POST — abre (ou reaproveita) a conversa de um anúncio ({ listingId })

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import {
  requireMarketplaceAccess,
  canonicalPair,
  reputationForMany,
  nicknamesFor,
} from '../../../../lib/marketplace';

export async function GET(request) {
  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const access = await requireMarketplaceAccess(user.id);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const db = supabaseAdmin();
  const { data: conversations, error } = await db
    .from('conversations')
    .select('*')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    const others = (conversations || []).map((c) => (c.user_a_id === user.id ? c.user_b_id : c.user_a_id));
    const uniqueOthers = Array.from(new Set(others));
    const [reputations, nicknames] = await Promise.all([
      reputationForMany(uniqueOthers),
      nicknamesFor(uniqueOthers),
    ]);

    // Título do anúncio de cada conversa, quando houver
    const listingIds = Array.from(new Set((conversations || []).map((c) => c.listing_id).filter(Boolean)));
    const listingTitles = new Map();
    if (listingIds.length > 0) {
      const { data: listings } = await db.from('listings').select('id, title').in('id', listingIds);
      (listings || []).forEach((l) => listingTitles.set(l.id, l.title));
    }

    const rows = (conversations || []).map((c) => {
      const otherId = c.user_a_id === user.id ? c.user_b_id : c.user_a_id;
      return {
        id: c.id,
        listingId: c.listing_id,
        listingTitle: c.listing_id ? listingTitles.get(c.listing_id) || null : null,
        lastMessageAt: c.last_message_at,
        other: {
          nickname: nicknames.get(otherId) || 'Jogador',
          reputation: reputations.get(otherId) || { total: 0, tier: { key: 'bronze', label: 'Bronze' } },
        },
      };
    });

    return NextResponse.json({ conversations: rows });
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
    return NextResponse.json({ error: 'Escolha um apelido antes de conversar.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const listingId = body.listingId;
  if (!listingId) return NextResponse.json({ error: 'listingId é obrigatório.' }, { status: 400 });

  const db = supabaseAdmin();
  const { data: listing, error: listingError } = await db
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .maybeSingle();

  if (listingError) return NextResponse.json({ error: listingError.message }, { status: 500 });
  if (!listing) return NextResponse.json({ error: 'Anúncio não encontrado.' }, { status: 404 });
  if (listing.user_id === user.id) {
    return NextResponse.json({ error: 'Esse anúncio é seu.' }, { status: 400 });
  }

  const [userAId, userBId] = canonicalPair(user.id, listing.user_id);

  // Já existe conversa desse par pra esse anúncio? Reaproveita.
  const { data: existing } = await db
    .from('conversations')
    .select('*')
    .eq('user_a_id', userAId)
    .eq('user_b_id', userBId)
    .eq('listing_id', listingId)
    .maybeSingle();

  if (existing) return NextResponse.json({ ok: true, conversationId: existing.id });

  const { data: created, error } = await db
    .from('conversations')
    .insert({ listing_id: listingId, user_a_id: userAId, user_b_id: userBId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, conversationId: created.id });
}
