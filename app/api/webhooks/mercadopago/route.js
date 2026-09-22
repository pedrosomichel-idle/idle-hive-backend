// app/api/webhooks/mercadopago/route.js
//
// Configure essa URL no Mercado Pago (Suas integrações -> Webhooks ->
// Configurar notificação), pro tópico "Pagamentos". É aqui que a
// licença de fato é criada no Supabase depois que o pagamento é
// confirmado.
//
// O Mercado Pago manda o id do pagamento como query string
// (?data.id=...&type=payment), não no corpo — e assina a notificação
// via header x-signature, validado com WebhookSignatureValidator (o
// validador oficial do pacote, não uma reimplementação manual do HMAC).

import { NextResponse } from 'next/server';
import { Payment, WebhookSignatureValidator, InvalidWebhookSignatureError } from 'mercadopago';
import { mercadopagoClient } from '../../../../lib/mercadopago';
import {
  grantLicense,
  grantDeviceSlot,
  grantAffiliateCommissionIfReferred,
  markPaymentProcessed,
} from '../../../../lib/grantPurchase';

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const dataId = searchParams.get('data.id');
  const type = searchParams.get('type');

  // Consome o corpo mesmo sem usar — o Mercado Pago espera a resposta
  // rápida, e não ler o corpo em alguns runtimes deixa a conexão presa.
  await request.text().catch(() => {});

  // Só nos interessa notificação de pagamento — o Mercado Pago manda
  // vários outros tipos de evento (assinatura, disputa, etc) pro mesmo
  // endpoint se configurado de forma ampla.
  if (type !== 'payment' || !dataId) {
    return NextResponse.json({ received: true });
  }

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (secret) {
    try {
      WebhookSignatureValidator.validate({
        xSignature: request.headers.get('x-signature'),
        xRequestId: request.headers.get('x-request-id'),
        dataId,
        secret,
      });
    } catch (err) {
      if (err instanceof InvalidWebhookSignatureError) {
        return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 });
      }
      throw err;
    }
  } else {
    console.error('[webhook mercadopago] MERCADOPAGO_WEBHOOK_SECRET não configurado — aceitando sem validar assinatura.');
  }

  try {
    const payment = await new Payment(mercadopagoClient()).get({ id: dataId });

    if (payment.status !== 'approved') {
      return NextResponse.json({ received: true });
    }

    let reference;
    try {
      reference = JSON.parse(payment.external_reference || '{}');
    } catch {
      console.error('[webhook mercadopago] external_reference não é um JSON válido:', payment.external_reference);
      return NextResponse.json({ received: true });
    }

    const userId = reference.user_id;
    const purchaseType = reference.type === 'device_slot' ? 'device_slot' : 'license';

    if (!userId) {
      console.error('[webhook mercadopago] pagamento aprovado sem user_id no external_reference.');
      return NextResponse.json({ received: true });
    }

    // O Mercado Pago pode reenviar a mesma notificação (retry) — sem
    // essa trava, um reenvio concederia um segundo slot extra pro
    // mesmo pagamento.
    const isNew = await markPaymentProcessed({ provider: 'mercadopago', paymentReference: payment.id });
    if (!isNew) {
      return NextResponse.json({ received: true });
    }

    if (purchaseType === 'device_slot') {
      const deviceId = reference.device_id;
      if (!deviceId) {
        console.error('[webhook mercadopago] pagamento de device_slot sem device_id no external_reference.');
        return NextResponse.json({ received: true });
      }
      await grantDeviceSlot({ deviceId });
      return NextResponse.json({ received: true });
    }

    // purchaseType === 'license'
    await grantLicense({
      userId,
      amountCents: Math.round((payment.transaction_amount || 0) * 100),
      mercadopagoPaymentId: String(payment.id),
    });
    await grantAffiliateCommissionIfReferred({ userId });
  } catch (err) {
    console.error('[webhook mercadopago] Falha ao processar pagamento:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
