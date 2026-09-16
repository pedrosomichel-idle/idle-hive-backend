// app/api/license/status/route.js

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { getLicenseStatus } from '../../../../lib/license';

export async function POST(request) {
  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ valid: false, error: authError }, { status: 401 });
  }

  try {
    const status = await getLicenseStatus(user.id);
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json({ valid: false, error: err.message }, { status: 500 });
  }
}
