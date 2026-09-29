// Cuenta opcional de Astra: respaldo del progreso en Supabase y estado de Astra Plus.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './nube-config.js';
import { fusionarEstados } from './fusion.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'astra-sesion' } });

export async function bajarPerfil(userId) {
  const { data, error } = await supabase.from('astra_perfiles').select('data, updated_at').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data?.data || null;
}

export async function subirPerfil(userId, estado) {
  const { error } = await supabase.from('astra_perfiles').upsert({ user_id: userId, data: estado, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// Al entrar: junta lo que hay en este celular con lo de la nube y guarda el resultado en ambos lados.
export async function sincronizarAlEntrar(userId, local) {
  const remoto = await bajarPerfil(userId);
  const unido = fusionarEstados(local, remoto || {});
  await subirPerfil(userId, unido);
  return unido;
}

const CACHE_PLUS = 'astra:plus';
export function plusGuardado() {
  try { return JSON.parse(localStorage.getItem(CACHE_PLUS)) || null; } catch { return null; }
}
export async function consultarPlus(sesion) {
  const res = await fetch('/api/plus', { headers: { authorization: `Bearer ${sesion.access_token}` } });
  if (!res.ok) throw new Error(`plus ${res.status}`);
  const datos = await res.json();
  try { localStorage.setItem(CACHE_PLUS, JSON.stringify({ ...datos, uid: sesion.user.id })); } catch { /* sin espacio */ }
  return datos;
}
export function olvidarPlus() { try { localStorage.removeItem(CACHE_PLUS); } catch { /* nada */ } }

async function llamar(ruta, sesion, cuerpo) {
  const res = await fetch(ruta, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${sesion.access_token}` }, body: JSON.stringify(cuerpo || {}) });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(datos.error || `error ${res.status}`);
  return datos;
}
export const irAPagar = async (sesion, plan) => { window.location.href = (await llamar('/api/suscribir', sesion, { plan })).url; };
export const irAlPortal = async (sesion) => { window.location.href = (await llamar('/api/portal', sesion)).url; };

export function mensajeError(e) {
  const m = String(e?.message || e || '');
  if (/Invalid login credentials/i.test(m)) return 'Wrong email or password.';
  if (/already registered/i.test(m)) return 'That email already has an account. Sign in instead.';
  if (/Email not confirmed/i.test(m)) return 'Please confirm your email first — check your inbox.';
  if (/Password should be/i.test(m)) return 'Use at least 6 characters.';
  if (/should be different/i.test(m)) return 'Choose a different password than before.';
  if (/not_configured/.test(m)) return 'Payments are not switched on yet. Please try again soon.';
  if (/ya_es_plus/.test(m)) return 'You already have Astra Plus.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'No connection. Try again when you are online.';
  if (/rate limit|too many/i.test(m)) return 'Too many tries. Wait a minute and try again.';
  return m || 'Something went wrong. Please try again.';
}
