// lib/adminFetch.js

'use client';

import { supabaseBrowser } from './supabaseBrowser';

export async function adminFetch(path, options = {}) {
  const { data } = await supabaseBrowser().auth.getSession();
  const token = data.session ? data.session.access_token : null;

  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `Erro ${res.status}`);
  }
  return json;
}
