// lib/mercadopago.js
//
// Configuração compartilhada do cliente do Mercado Pago — mesmo padrão
// do lib/stripe.js, um client criado sob demanda (não no import), pra
// não quebrar o build se a variável de ambiente ainda não existir em
// algum ambiente (preview, etc).

import { MercadoPagoConfig } from 'mercadopago';

let client = null;

export function mercadopagoClient() {
  if (!client) {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado no servidor.');
    }
    client = new MercadoPagoConfig({ accessToken });
  }
  return client;
}
