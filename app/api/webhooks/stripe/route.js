// app/api/webhooks/stripe/route.js
//
// Configure esse endpoint no Stripe (Developers -> Webhooks) escutando
// o evento "checkout.session.completed". É aqui que a licença de fato
// é criada no Supabase depois que o pagamento é confirmado.

import { NextResponse } from 'next/server';
import { stripeClient } from '../../../../lib/stripe';
import {
  grantLicense,
  grantDeviceSlot,
  grantAffiliateCommissionIfReferred,
  markPaymentProcessed,
} from '../../../../lib/grantPurchase';

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
      console.error('[webhook stripe] checkout.session.completed sem user_id em metadata/client_reference_id.');
      return NextResponse.json({ received: true });
    }

    try {
      // Stripe pode reenviar o mesmo evento (retry) — sem essa trava,
      // um reenvio concederia um segundo slot extra pro mesmo pagamento.
      const isNew = await markPaymentProcessed({ provider: 'stripe', paymentReference: session.id });
      if (!isNew) {
        return NextResponse.json({ received: true });
      }

      if (purchaseType === 'device_slot') {
        const deviceId = session.metadata && session.metadata.device_id;
        if (!deviceId) {
          console.error('[webhook stripe] checkout de device_slot sem device_id em metadata.');
          return NextResponse.json({ received: true });
        }
        await grantDeviceSlot({ deviceId });
        return NextResponse.json({ received: true });
      }

      // purchaseType === 'license'
      await grantLicense({
        userId,
        amountCents: session.amount_total,
        stripeCustomerId: session.customer,
        stripePaymentIntentId: session.payment_intent,
      });
      await grantAffiliateCommissionIfReferred({ userId });
    } catch (err) {
      console.error('[webhook stripe] Falha ao processar compra:', err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
