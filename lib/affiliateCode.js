// lib/affiliateCode.js
//
// Gera um código de afiliado curto tipo "HIVE-7K2M" — legível, fácil de
// falar/digitar, sem caracteres ambíguos. Usado quando o próprio usuário
// se afilia pelo app (sem o admin criar manualmente).

import crypto from 'crypto';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateAffiliateCode() {
  const randomChar = () => ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  const suffix = Array.from({ length: 4 }, randomChar).join('');
  return `HIVE-${suffix}`;
}
