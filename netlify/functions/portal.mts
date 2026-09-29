import { json, usuarioDe, leerSuscripcion, stripe, origen } from '../lib/comun.mts';

// Portal de Stripe: cambiar tarjeta, cambiar de plan o cancelar, sin tener que escribirnos.
export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'metodo' }, 405);
  const s = stripe();
  if (!s) return json({ error: 'not_configured' }, 503);
  const usuario = await usuarioDe(req);
  if (!usuario) return json({ error: 'no_autenticado' }, 401);
  const sus = await leerSuscripcion(usuario.id);
  if (!sus?.customer) return json({ error: 'sin_suscripcion' }, 404);
  const sesion = await s.billingPortal.sessions.create({ customer: sus.customer, return_url: `${origen(req)}/` });
  return json({ url: sesion.url });
};
export const config = { path: '/api/portal' };
