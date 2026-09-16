// app/api/webhooks/stripe/route.js
//
// Configure esse endpoint no Stripe (Developers -> Webhooks) escutando
// o evento "checkout.session.completed". É aqui que a licença de fato
// é criada no Supabase depois que o pagamento é confirmado.

import { NextResponse } from 'next/server';
import { stripeClient } from '../../../../lib/stripe';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { DEFAULT_MAX_DEVICES } from '../../../../lib/license';

// Next.js precisa do corpo cru (não parseado) pra validar a assinatura
// do Stripe — por isso lemos com request.text() em vez de request.json().
export async function POST(request) {
  const signature = request.headers.get('stripe-signature');
  const rawBody = await request.text();

  let event;
  try {
    event = stripeClient().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Assinatura inválida: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata && session.metadata.user_id ? session.metadata.user_id : session.client_reference_id;
    const purchaseType = session.metadata && session.metadata.type === 'device_slot' ? 'device_slot' : 'license';

    if (!userId) {
      console.error('[webhook] checkout.session.completed sem user_id em metadata/client_reference_id.');
      return NextResponse.json({ received: true });
    }

    const db = supabaseAdmin();

    if (purchaseType === 'device_slot') {
      const deviceId = session.metadata && session.metadata.device_id;
      if (!deviceId) {
        console.error('[webhook] checkout de device_slot sem device_id em metadata.');
        return NextResponse.json({ received: true });
      }

      const { data: existingSlot, error: slotReadError } = await db
        .from('device_extra_slots')
        .select('extra_slots')
        .eq('device_id', deviceId)
        .maybeSingle();

      if (slotReadError) {
        console.error('[webhook] Falha ao ler device_extra_slots:', slotReadError.message);
        return NextResponse.json({ error: slotReadError.message }, { status: 500 });
      }

      const newExtraSlots = (existingSlot ? existingSlot.extra_slots : 0) + 1;

      const { error: slotWriteError } = await db.from('device_extra_slots').upsert(
        { device_id: deviceId, extra_slots: newExtraSlots, updated_at: new Date().toISOString() },
        { onConflict: 'device_id' }
      );

      if (slotWriteError) {
        console.error('[webhook] Falha ao gravar device_extra_slots:', slotWriteError.message);
        return NextResponse.json({ error: slotWriteError.message }, { status: 500 });
      }

      return NextResponse.json({ received: true });
    }

    // purchaseType === 'license'
    const { error } = await db.from('licenses').upsert(
      {
        user_id: userId,
        plan: 'standard',
        max_devices: DEFAULT_MAX_DEVICES,
        stripe_customer_id: session.customer,
        stripe_payment_intent_id: session.payment_intent,
        amount_cents: session.amount_total,
        expires_at: null, // licença paga é permanente, sem prazo
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('[webhook] Falha ao gravar licença:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Comissão de afiliado: se o comprador se cadastrou com um código
    // de indicação (salvo em user_metadata.referral_code no signUp),
    // registra a comissão pendente pro parceiro correspondente.
    try {
      const { data: buyer } = await db.auth.admin.getUserById(userId);
      const referralCode = buyer && buyer.user && buyer.user.user_metadata ? buyer.user.user_metadata.referral_code : null;

      if (referralCode) {
        const { data: affiliate } = await db
          .from('affiliates')
          .select('*')
          .eq('code', String(referralCode).toUpperCase())
          .maybeSingle();

        if (affiliate) {
          // Comissão fixa (não é mais % da venda) — o mesmo valor pra
          // qualquer licença vendida através do afiliado.
          const amountCents = Number(process.env.AFFILIATE_COMMISSION_FLAT_CENTS || 500);
          await db.from('commissions').insert({
            affiliate_id: affiliate.id,
            user_id: userId,
            amount_cents: amountCents,
            status: 'pendente',
          });
        }
      }
    } catch (commissionErr) {
      // Não bloqueia a liberação da licença por causa da comissão —
      // só loga, pra investigar depois se precisar.
      console.error('[webhook] Falha ao processar comissão de afiliado:', commissionErr.message);
    }
  }

  return NextResponse.json({ received: true });
}
