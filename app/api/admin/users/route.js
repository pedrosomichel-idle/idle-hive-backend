// app/api/admin/users/route.js

import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '../../../../lib/admin';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

const EMPTY_ID = '00000000-0000-0000-0000-000000000000';

export async function GET(request) {
  const { user, error } = await getAuthenticatedAdmin(request);
  if (!user) return NextResponse.json({ error }, { status: 403 });

  const db = supabaseAdmin();

  const { data: authUsers, error: listError } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

  const userIds = authUsers.users.map((u) => u.id);
  const idsFilter = userIds.length ? userIds : [EMPTY_ID];

  const [licensesRes, trialsRes, devicesRes] = await Promise.all([
    db.from('licenses').select('*').in('user_id', idsFilter),
    db.from('trials').select('*').in('user_id', idsFilter),
    db.from('devices').select('user_id').in('user_id', idsFilter),
  ]);

  if (licensesRes.error) return NextResponse.json({ error: licensesRes.error.message }, { status: 500 });
  if (trialsRes.error) return NextResponse.json({ error: trialsRes.error.message }, { status: 500 });
  if (devicesRes.error) return NextResponse.json({ error: devicesRes.error.message }, { status: 500 });

  const licenseByUser = new Map((licensesRes.data || []).map((l) => [l.user_id, l]));
  const trialByUser = new Map((trialsRes.data || []).map((t) => [t.user_id, t]));
  const deviceCountByUser = new Map();
  (devicesRes.data || []).forEach((d) => {
    deviceCountByUser.set(d.user_id, (deviceCountByUser.get(d.user_id) || 0) + 1);
  });

  const rows = authUsers.users
    .map((u) => {
      const license = licenseByUser.get(u.id);
      const trial = trialByUser.get(u.id);
      const plan = license ? license.plan : trial ? 'trial' : 'nenhum';
      const expiresAt = license ? license.expires_at : trial ? trial.trial_ends_at : null;

      return {
        id: u.id,
        email: u.email,
        createdAt: u.created_at,
        plan,
        expiresAt,
        devices: deviceCountByUser.get(u.id) || 0,
        referralCode: u.user_metadata ? u.user_metadata.referral_code || null : null,
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return NextResponse.json({ users: rows });
}
