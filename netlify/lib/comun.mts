import { getStore } from '@netlify/blobs';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { SUPABASE_URL, SUPABASE_KEY } from '../../src/nube-config.js';

export const env = (k: string) => (globalThis as any).Netlify?.env?.get(k) ?? process.env[k] ?? '';
export const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
export const store = () => getStore({ name: 'astra', consistency: 'strong' });
export const stripe = () => (env('STRIPE_SECRET_KEY') ? new Stripe(env('STRIPE_SECRET_KEY')) : null);
export const origen = (req: Request) => env('URL') || new URL(req.url).origin;

// Usuario de Supabase a partir del token de la app (sin llaves secretas: Supabase valida el token).
export async function usuarioDe(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const sb = createClient(env('SUPABASE_URL') || SUPABASE_URL, env('SUPABASE_ANON_KEY') || SUPABASE_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(token);
  return error ? null : data.user;
}

export type Suscripcion = { status: string; hasta: number | null; cancelaAlFinal: boolean; customer: string; subscription: string; actualizado: number };
export const ACTIVOS = ['active', 'trialing', 'past_due'];
export const esPlus = (s?: Suscripcion | null) => !!s && ACTIVOS.includes(s.status) && (!s.hasta || s.hasta > Date.now() - 3 * 86400000);
export async function leerSuscripcion(uid: string) {
  return (await store().get(`plus/${uid}`, { type: 'json' })) as Suscripcion | null;
}
export async function guardarSuscripcion(uid: string, sub: any) {
  const fin = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null;
  const datos: Suscripcion = {
    status: sub.status, hasta: fin ? fin * 1000 : null, cancelaAlFinal: !!sub.cancel_at_period_end,
    customer: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id, subscription: sub.id, actualizado: Date.now(),
  };
  await store().setJSON(`plus/${uid}`, datos);
  return datos;
}
