// app/api/mercadopago/checkout/route.js
//
// Cria uma "preference" do Mercado Pago (Checkout Pro) — o equivalente
// ao Stripe Checkout Session, só que o preço vai direto no corpo da
// requisição (o Mercado Pago não tem o conceito de "Price ID"
// pré-cadastrado como o Stripe). Dois tipos, mesmo padrão da rota do
// Stripe:
//   - "license" (padrão): compra da licença padrão do IdleHive.
//   - "device_slot": compra de um slot extra pra usar uma segunda
//     conta no mesmo dispositivo (deviceId obrigatório nesse caso).
// O webhook (app/api/webhooks/mercadopago/route.js) decide o que fazer
// depois do pagamento com base no external_reference.

import { NextResponse } from 'next/server';
import { Preference } from 'mercadopago';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { mercadopagoClient } from '../../../../lib/mercadopago';

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

  const priceBRL =
    type === 'device_slot'
      ? Number(process.env.MERCADOPAGO_DEVICE_SLOT_PRICE_BRL || 10)
      : Number(process.env.MERCADOPAGO_LICENSE_PRICE_BRL || 20);

  const title = type === 'device_slot' ? 'IdleHive — Slot extra de dispositivo' : 'IdleHive — Licença padrão';

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

  // O Mercado Pago só tem um campo de texto livre pra referência (até
  // 254 caracteres) — não tem "metadata" estruturado como o Stripe.
  // Codifica os três dados que o webhook precisa num JSON compacto.
  const externalReference = JSON.stringify({
    user_id: user.id,
    type,
    ...(type === 'device_slot' ? { device_id: deviceId } : {}),
  });

  try {
    const preference = await new Preference(mercadopagoClient()).create({
      body: {
        items: [
          {
            id: type,
            title,
            quantity: 1,
            unit_price: priceBRL,
            currency_id: 'BRL',
          },
        ],
        // Não mandamos payer (nem só o e-mail) — o IdleHive não coleta
        // CPF no cadastro, e mandar um comprador PARCIAL (só e-mail,
        // sem identificação) pro Checkout Pro pode travar o botão de
        // pagamento, esperando um dado que nunca vai ser preenchido
        // desse jeito. Deixa a própria tela do Mercado Pago coletar
        // tudo que precisar do comprador, do zero.
        external_reference: externalReference,
        notification_url: `${baseUrl}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${baseUrl}/checkout/success`,
          pending: `${baseUrl}/checkout/success`,
          failure: `${baseUrl}/checkout/cancel`,
        },
        auto_return: 'approved',
      },
    });

    return NextResponse.json({ checkoutUrl: preference.init_point });
  } catch (err) {
    return NextResponse.json({ error: `Falha ao criar checkout: ${err.message}` }, { status: 500 });
  }
}
