// lib/supabaseBrowser.js
//
// Cliente Supabase que roda no navegador (painel admin), usando a anon
// key (pública, segura de expor). Só faz login/logout — a leitura e
// escrita de dados de verdade passa pelas rotas /api/admin/*, que usam
// a service_role key no servidor.

'use client';

import { createClient } from '@supabase/supabase-js';

let client = null;

export function supabaseBrowser() {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }
  return client;
}
