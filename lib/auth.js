// lib/auth.js
//
// Extrai o token de sessão do Supabase enviado pelo app Electron
// (header "Authorization: Bearer <access_token>") e resolve o usuário
// autenticado correspondente. Toda rota que mexe com licença/dispositivo
// passa por aqui antes de fazer qualquer coisa.

import { supabaseAdmin } from './supabaseAdmin';

export async function getAuthenticatedUser(request) {
  const authHeader = request.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { user: null, error: 'Token de autenticação ausente.' };
  }

  const token = match[1];
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data || !data.user) {
    return { user: null, error: 'Sessão inválida ou expirada.' };
  }

  return { user: data.user, error: null };
}
