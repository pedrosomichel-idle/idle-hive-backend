// app/api/admin/overview/route.js

import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '../../../../lib/admin';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function GET(request) {
  const { user, error } = await getAuthenticatedAdmin(request);
  if (!user) return NextResponse.json({ error }, { status: 403 });

  const db = supabaseAdmin();

  const [authUsersRes, licenseCountRes, trialCountRes, deviceCountRes, paidLicensesRes, keyCountRes, redeemedKeyCountRes] =
    await Promise.all([
      db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      db.from('licenses').select('*', { count: 'exact', head: true }),
      db.from('trials').select('*', { count: 'exact', head: true }),
      db.from('devices').select('*', { count: 'exact', head: true }),
      db.from('licenses').select('amount_cents').not('amount_cents', 'is', null),
      db.from('license_keys').select('*', { count: 'exact', head: true }),
      db.from('license_keys').select('*', { count: 'exact', head: true }).not('redeemed_by', 'is', null),
    ]);

  if (authUsersRes.error) {
    return NextResponse.json({ error: authUsersRes.error.message }, { status: 500 });
  }

  const totalRevenueCents = (paidLicensesRes.data || []).reduce((sum, l) => sum + (l.amount_cents || 0), 0);

  return NextResponse.json({
    totalUsers: authUsersRes.data.users.length,
    totalLicenses: licenseCountRes.count || 0,
    totalTrials: trialCountRes.count || 0,
    totalDevices: deviceCountRes.count || 0,
    totalRevenueCents,
    totalKeys: keyCountRes.count || 0,
    redeemedKeys: redeemedKeyCountRes.count || 0,
  });
}
