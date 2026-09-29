import { json, usuarioDe, leerSuscripcion, esPlus, stripe } from '../lib/comun.mts';

// Estado de Astra Plus de quien pregunta.
export default async (req: Request) => {
  const usuario = await usuarioDe(req);
  if (!usuario) return json({ error: 'no_autenticado' }, 401);
  const s = await leerSuscripcion(usuario.id);
  return json({ plus: esPlus(s), status: s?.status || null, hasta: s?.hasta || null, cancelaAlFinal: !!s?.cancelaAlFinal, configurado: !!stripe() });
};
export const config = { path: '/api/plus' };
