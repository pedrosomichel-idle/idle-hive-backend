// lib/grantPurchase.js
//
// O que acontece depois que um pagamento é confirmado — seja pelo
// Stripe ou pelo Mercado Pago. Os dois webhooks chamam essas mesmas
// funções, pra nunca ter duas versões da regra de negócio (conceder
// licença, liberar slot extra, registrar comissão de afiliado)
// divergindo uma da outra.

import { supabaseAdmin } from './supabaseAdmin';
import { DEFAULT_MAX_DEVICES } from './license';

// Registra que um pagamento específico já foi processado, ANTES de
// conceder qualquer coisa. Webhooks de pagamento podem ser reenviados
// (retry de rede, o provedor tentando de novo) — sem essa trava, um
// reenvio concederia um segundo slot extra de dispositivo pro mesmo
// pagamento (a licença em si já era protegida contra isso, por usar
// upsert, mas o slot extra soma +1 a cada chamada, então precisa de
// proteção explícita). Retorna true na primeira vez que vê esse
// pagamento (pode processar), false se já tinha visto antes (ignora).
export async function markPaymentProcessed({ provider, paymentReference }) {
  const db = supabaseAdmin();
  const { error } = await db
    .from('payment_events')
    .insert({ provider, payment_reference: String(paymentReference) });

  if (error) {
    if (error.code === '23505') return false; // já processado antes (unique violation)
    throw new Error(`Falha ao registrar evento de pagamento: ${error.message}`);
  }
  return true;
}

// Concede a licença padrão (permanente) pro usuário. Os três campos de
// referência do provedor são opcionais — cada webhook preenche só os
// que fazem sentido pra ele (Stripe preenche stripe_*, Mercado Pago
// preenche mercadopago_payment_id).
export async function grantLicense({
  userId,
  amountCents,
  stripeCustomerId,
  stripePaymentIntentId,
  mercadopagoPaymentId,
}) {
  const db = supabaseAdmin();
  const { error } = await db.from('licenses').upsert(
    {
      user_id: userId,
      plan: 'standard',
      max_devices: DEFAULT_MAX_DEVICES,
      stripe_customer_id: stripeCustomerId || null,
      stripe_payment_intent_id: stripePaymentIntentId || null,
      mercadopago_payment_id: mercadopagoPaymentId || null,
      amount_cents: amountCents,
      expires_at: null, // licença paga é permanente, sem prazo
    },
    { onConflict: 'user_id' }
  );

  if (error) throw new Error(`Falha ao gravar licença: ${error.message}`);
}

// Libera mais uma vaga de dispositivo pra esse deviceId específico.
export async function grantDeviceSlot({ deviceId }) {
  const db = supabaseAdmin();

  const { data: existingSlot, error: slotReadError } = await db
    .from('device_extra_slots')
    .select('extra_slots')
    .eq('device_id', deviceId)
    .maybeSingle();

  if (slotReadError) throw new Error(`Falha ao ler device_extra_slots: ${slotReadError.message}`);

  const newExtraSlots = (existingSlot ? existingSlot.extra_slots : 0) + 1;

  const { error: slotWriteError } = await db.from('device_extra_slots').upsert(
    { device_id: deviceId, extra_slots: newExtraSlots, updated_at: new Date().toISOString() },
    { onConflict: 'device_id' }
  );

  if (slotWriteError) throw new Error(`Falha ao gravar device_extra_slots: ${slotWriteError.message}`);
}

// Se o comprador se cadastrou com um código de indicação (salvo em
// user_metadata.referral_code no signUp), registra a comissão pendente
// pro parceiro correspondente. Nunca lança erro pra fora — uma falha
// aqui não pode travar a liberação da licença em si, só fica logada.
export async function grantAffiliateCommissionIfReferred({ userId }) {
  const db = supabaseAdmin();
  try {
    const { data: buyer } = await db.auth.admin.getUserById(userId);
    const referralCode =
      buyer && buyer.user && buyer.user.user_metadata ? buyer.user.user_metadata.referral_code : null;

    if (!referralCode) return;

    const { data: affiliate } = await db
      .from('affiliates')
      .select('*')
      .eq('code', String(referralCode).toUpperCase())
      .maybeSingle();

    if (affiliate) {
      // Comissão fixa (não é % da venda) — o mesmo valor pra qualquer
      // licença vendida através do afiliado, não importa o provedor.
      const amountCents = Number(process.env.AFFILIATE_COMMISSION_FLAT_CENTS || 500);
      await db.from('commissions').insert({
        affiliate_id: affiliate.id,
        user_id: userId,
        amount_cents: amountCents,
        status: 'pendente',
      });
    }
  } catch (err) {
    console.error('[grantPurchase] Falha ao processar comissão de afiliado:', err.message);
  }
}
