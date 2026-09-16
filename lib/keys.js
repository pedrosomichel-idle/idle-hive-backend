// lib/keys.js
//
// Gera códigos de chave tipo "7K2M-9PXR-4QWT" — sem caracteres
// ambíguos (0/O, 1/I/L) pra ficar fácil de digitar/ler em voz alta.

import crypto from 'crypto';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateKeyCode(groups = 3, groupLength = 4) {
  const randomChar = () => ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  const parts = Array.from({ length: groups }, () =>
    Array.from({ length: groupLength }, randomChar).join('')
  );
  return parts.join('-');
}
