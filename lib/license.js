// lib/license.js
//
// Regra de negócio central: um usuário está liberado a usar o app se
// tiver (a) uma licença paga registrada, ou (b) um trial de
// TRIAL_HOURS ainda não expirado. Se nenhum dos dois existir ainda,
// cria o trial na primeira consulta (é o equivalente ao "teste grátis
// de 8h, sem cartão" do idle-labs.com).

import { supabaseAdmin } from './supabaseAdmin';

const TRIAL_HOURS = Number(process.env.TRIAL_HOURS || 8);
const DEFAULT_MAX_DEVICES = Number(process.env.DEFAULT_MAX_DEVICES || 2);

export async function getOrCreateTrial(userId) {
  const db = supabaseAdmin();

  const { data: existing, error: readError } = await db
    .from('trials')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (readError) throw new Error(`Falha ao ler trial: ${readError.message}`);
  if (existing) return existing;

  const trialEndsAt = new Date(Date.now() + TRIAL_HOURS * 60 * 60 * 1000).toISOString();
  const { data: created, error: insertError } = await db
    .from('trials')
    .insert({ user_id: userId, trial_ends_at: trialEndsAt })
    .select()
    .single();

  if (insertError) throw new Error(`Falha ao criar trial: ${insertError.message}`);
  return created;
}

export async function getLicenseStatus(userId) {
  const db = supabaseAdmin();

  const { data: license, error: licenseError } = await db
    .from('licenses')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (licenseError) throw new Error(`Falha ao ler licença: ${licenseError.message}`);

  const { data: devices, error: devicesError } = await db
    .from('devices')
    .select('device_id, device_name, activated_at, last_seen_at')
    .eq('user_id', userId);

  if (devicesError) throw new Error(`Falha ao ler dispositivos: ${devicesError.message}`);

  if (license) {
    const expired = license.expires_at && new Date(license.expires_at).getTime() <= Date.now();

    if (!expired) {
      return {
        valid: true,
        plan: license.plan,
        maxDevices: license.max_devices,
        trialEndsAt: null,
        expiresAt: license.expires_at,
        devices: devices || [],
      };
    }
    // Licença por prazo (chave promo/sorteio) expirou — cai pra trial normal
    // abaixo (que provavelmente também já expirou, resultando em valid:false).
  }

  const trial = await getOrCreateTrial(userId);
  const trialEndsAt = trial.trial_ends_at;
  const stillValid = new Date(trialEndsAt).getTime() > Date.now();

  return {
    valid: stillValid,
    plan: 'trial',
    maxDevices: 1,
    trialEndsAt,
    devices: devices || [],
  };
}

export { DEFAULT_MAX_DEVICES };
