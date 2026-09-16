// app/api/license/activate/route.js
//
// Registra este dispositivo (identificado por deviceId, gerado e salvo
// localmente pelo Electron) contra a licença/trial do usuário,
// respeitando o limite de dispositivos. Se o dispositivo já estava
// registrado, só atualiza o "last_seen_at".

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { getLicenseStatus } from '../../../../lib/license';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function POST(request) {
  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { deviceId, deviceName } = body;
  if (!deviceId) {
    return NextResponse.json({ error: 'deviceId é obrigatório.' }, { status: 400 });
  }

  let status;
  try {
    status = await getLicenseStatus(user.id);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  if (!status.valid) {
    return NextResponse.json({ error: 'Sem licença ativa nem trial válido.' }, { status: 403 });
  }

  const db = supabaseAdmin();

  const { data: existingDevice, error: findError } = await db
    .from('devices')
    .select('*')
    .eq('user_id', user.id)
    .eq('device_id', deviceId)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: `Falha ao consultar dispositivo: ${findError.message}` }, { status: 500 });
  }

  if (existingDevice) {
    const { error: updateError } = await db
      .from('devices')
      .update({ last_seen_at: new Date().toISOString(), device_name: deviceName || existingDevice.device_name })
      .eq('id', existingDevice.id);

    if (updateError) {
      return NextResponse.json({ error: `Falha ao atualizar dispositivo: ${updateError.message}` }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { count, error: countError } = await db
    .from('devices')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (countError) {
    return NextResponse.json({ error: `Falha ao contar dispositivos: ${countError.message}` }, { status: 500 });
  }

  if ((count || 0) >= status.maxDevices) {
    return NextResponse.json(
      { error: `Limite de ${status.maxDevices} dispositivo(s) atingido. Remova um dispositivo antigo pra ativar este.` },
      { status: 403 }
    );
  }

  // Limite de contas por dispositivo: por padrão, um dispositivo só pode
  // ter 1 conta IdleHive ativa. Isso é o inverso do limite acima (que é
  // "quantos dispositivos por licença") — aqui é "quantas contas
  // diferentes numa mesma máquina". Só entra em jogo quando esta conta
  // (user.id) ainda não tem nenhum registro neste device_id (senão já
  // teria caído no "existingDevice" acima).
  const { data: devicesOnThisMachine, error: machineError } = await db
    .from('devices')
    .select('user_id')
    .eq('device_id', deviceId);

  if (machineError) {
    return NextResponse.json({ error: `Falha ao consultar dispositivo: ${machineError.message}` }, { status: 500 });
  }

  const distinctUsersOnThisMachine = new Set((devicesOnThisMachine || []).map((d) => d.user_id));

  if (!distinctUsersOnThisMachine.has(user.id)) {
    const { data: slotRow, error: slotError } = await db
      .from('device_extra_slots')
      .select('extra_slots')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (slotError) {
      return NextResponse.json({ error: `Falha ao consultar slots do dispositivo: ${slotError.message}` }, { status: 500 });
    }

    const allowedAccounts = 1 + (slotRow ? slotRow.extra_slots : 0);

    if (distinctUsersOnThisMachine.size >= allowedAccounts) {
      return NextResponse.json(
        {
          error: 'Este dispositivo já atingiu o limite de contas IdleHive. Compre um slot extra pra usar outra conta nesta máquina.',
          reason: 'device_limit',
        },
        { status: 403 }
      );
    }
  }

  const { error: insertError } = await db.from('devices').insert({
    user_id: user.id,
    device_id: deviceId,
    device_name: deviceName || null,
  });

  if (insertError) {
    return NextResponse.json({ error: `Falha ao registrar dispositivo: ${insertError.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
