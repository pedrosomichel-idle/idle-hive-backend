// app/api/license/deactivate/route.js

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function POST(request) {
  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { deviceId } = body;
  if (!deviceId) {
    return NextResponse.json({ error: 'deviceId é obrigatório.' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db.from('devices').delete().eq('user_id', user.id).eq('device_id', deviceId);

  if (error) {
    return NextResponse.json({ error: `Falha ao remover dispositivo: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
