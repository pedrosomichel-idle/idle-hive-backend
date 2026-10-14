// lib/metaCapi.js
//
// Envia eventos pra API de Conversões da Meta (servidor → Meta). Usado
// pela compra: o PIX é pago dentro do app, então o pixel do navegador
// nunca vê a venda — quem avisa a Meta é o webhook do Mercado Pago.
//
// Precisa de NEXT_PUBLIC_META_PIXEL_ID e META_CAPI_TOKEN na Vercel. Sem
// eles, não faz nada (a venda segue normal, só não é medida).
// Nunca deixa uma falha aqui derrubar o webhook de pagamento.

import { createHash } from 'node:crypto';
import { supabaseAdmin } from './supabaseAdmin';

const sha256 = (v) => createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');

export async function sendPurchaseToMeta({ userId, value, paymentId }) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixelId || !token) return;

  try {
    const { data } = await supabaseAdmin().auth.admin.getUserById(userId);
    const email = data?.user?.email;

    const body = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: `mp-${paymentId}`, // dedup se um dia o navegador também enviar
          action_source: 'other', // pago no app desktop via PIX (não é evento de site nem de app mobile)
          user_data: {
            ...(email ? { em: [sha256(email)] } : {}),
            external_id: [sha256(userId)],
          },
          custom_data: { currency: 'BRL', value: Number(value) || 0, content_name: 'IdleHive — Licença padrão' },
        },
      ],
    };

    const res = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error('[meta capi] falha ao enviar Purchase:', res.status, await res.text());
  } catch (err) {
    console.error('[meta capi] erro ao enviar Purchase:', err.message);
  }
}
