import { json, stripe, env, guardarSuscripcion } from '../lib/comun.mts';

// Stripe avisa altas, renovaciones, cambios y cancelaciones; aquí se guarda el estado de Plus por usuario.
export default async (req: Request) => {
  const s = stripe();
  if (!s || !env('STRIPE_WEBHOOK_SECRET')) return json({ error: 'not_configured' }, 503);
  const cuerpo = await req.text();
  let evento;
  try {
    evento = await s.webhooks.constructEventAsync(cuerpo, req.headers.get('stripe-signature') || '', env('STRIPE_WEBHOOK_SECRET'));
  } catch {
    return json({ error: 'firma' }, 400);
  }
  const obj: any = evento.data.object;
  if (evento.type === 'checkout.session.completed' && obj.mode === 'subscription' && obj.client_reference_id && obj.subscription) {
    const sub = await s.subscriptions.retrieve(obj.subscription);
    await guardarSuscripcion(obj.client_reference_id, sub);
  } else if (evento.type.startsWith('customer.subscription.') && obj.metadata?.uid) {
    await guardarSuscripcion(obj.metadata.uid, obj);
  }
  return json({ ok: true });
};
export const config = { path: '/api/stripe-webhook' };
