import { json, usuarioDe, leerSuscripcion, esPlus, stripe, origen } from '../lib/comun.mts';

const PLANES: Record<string, { cents: number; interval: 'month' | 'year' }> = { mensual: { cents: 499, interval: 'month' }, anual: { cents: 2999, interval: 'year' } };
const PRUEBA_DIAS = 7;

// Crea el pago de Astra Plus en Stripe Checkout. Los 7 días gratis solo la primera vez.
export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'metodo' }, 405);
  const s = stripe();
  if (!s) return json({ error: 'not_configured' }, 503);
  const usuario = await usuarioDe(req);
  if (!usuario) return json({ error: 'no_autenticado' }, 401);
  const { plan } = await req.json().catch(() => ({}));
  const p = PLANES[plan];
  if (!p) return json({ error: 'plan' }, 400);
  const previa = await leerSuscripcion(usuario.id);
  if (esPlus(previa)) return json({ error: 'ya_es_plus' }, 409);
  const sesion = await s.checkout.sessions.create({
    mode: 'subscription',
    client_reference_id: usuario.id,
    ...(previa?.customer ? { customer: previa.customer } : { customer_email: usuario.email }),
    line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: p.cents, recurring: { interval: p.interval }, product_data: { name: 'Astra Plus', description: 'Daily 3-card spread, week ahead, monthly theme, deep compatibility and premium themes.' } } }],
    subscription_data: { metadata: { uid: usuario.id }, ...(previa ? {} : { trial_period_days: PRUEBA_DIAS }) },
    allow_promotion_codes: true,
    success_url: `${origen(req)}/?plus=ok`,
    cancel_url: `${origen(req)}/?plus=cancel`,
  });
  return json({ url: sesion.url });
};
export const config = { path: '/api/suscribir' };
