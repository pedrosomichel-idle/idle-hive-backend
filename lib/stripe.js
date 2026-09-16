// lib/stripe.js

import Stripe from 'stripe';

let client = null;

export function stripeClient() {
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });
  }
  return client;
}
