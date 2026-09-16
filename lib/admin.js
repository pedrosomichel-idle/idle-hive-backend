// lib/admin.js
//
// Além de autenticado (getAuthenticatedUser), a rota precisa que o
// usuário esteja na tabela `admins`. Usado por toda rota /api/admin/*.

import { getAuthenticatedUser } from './auth';
import { supabaseAdmin } from './supabaseAdmin';

export async function getAuthenticatedAdmin(request) {
  const { user, error } = await getAuthenticatedUser(request);
  if (!user) return { user: null, error };

  const db = supabaseAdmin();
  const { data, error: adminError } = await db
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (adminError) return { user: null, error: adminError.message };
  if (!data) return { user: null, error: 'Sua conta não tem acesso ao painel administrativo.' };

  return { user, error: null };
}
