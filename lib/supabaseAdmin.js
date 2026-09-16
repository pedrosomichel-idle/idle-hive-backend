// lib/supabaseAdmin.js
//
// Cliente Supabase usando a service_role key — só roda no servidor
// (nunca exponha essa chave pro Electron/navegador). Ela ignora RLS,
// então todo o controle de acesso é feito aqui no backend, verificando
// o usuário autenticado a partir do token que ele manda.

import { createClient } from '@supabase/supabase-js';

let client = null;

export function supabaseAdmin() {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
