// app/api/checkout/route.js
//
// Cria uma sessão do Stripe Checkout. Dois tipos:
//   - "license" (padrão): compra da licença padrão do IdleHive.
//   - "device_slot": compra de um slot extra pra usar uma segunda conta
//     no mesmo dispositivo (deviceId obrigatório nesse caso).
// O webhook (app/api/webhooks/stripe/route.js) decide o que fazer
// depois do pagamento com base em metadata.type.

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../lib/auth';
import { stripeClient } from '../../../lib/stripe';

export async function POST(request) {
  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const type = body.type === 'device_slot' ? 'device_slot' : 'license';
  const deviceId = body.deviceId;

  if (type === 'device_slot' && !deviceId) {
    return NextResponse.json({ error: 'deviceId é obrigatório pra comprar um slot extra.' }, { status: 400 });
  }

  const priceId = type === 'device_slot' ? process.env.STRIPE_DEVICE_SLOT_PRICE_ID : process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: `Preço não configurado no servidor pra "${type}".` }, { status: 500 });
  }

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

  try {
    const session = await stripeClient().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        type,
        ...(type === 'device_slot' ? { device_id: deviceId } : {}),
      },
      customer_email: user.email || undefined,
      success_url: `${baseUrl}/checkout/success`,
      cancel_url: `${baseUrl}/checkout/cancel`,
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err) {
    return NextResponse.json({ error: `Falha ao criar checkout: ${err.message}` }, { status: 500 });
  }
}
