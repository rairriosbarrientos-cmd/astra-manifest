// Junta el progreso de dos celulares (o del celular y la nube) sin perder nada:
// diarios, cartas, check-ins, rituales y lunas se unen por fecha; señales por id; racha y logros, lo mejor de ambos.

const MAPAS_POR_FECHA = ['cards', 'checkins', 'journal', 'manifest', 'moons'];

function unirMapas(a = {}, b = {}, preferir) {
  const r = { ...a };
  for (const [k, v] of Object.entries(b)) r[k] = k in r ? preferir(r[k], v) : v;
  return r;
}

// Entre dos entradas del mismo día gana la que tiene más contenido (la más completa).
const peso = (x) => JSON.stringify(x ?? '').length;
const masCompleta = (x, y) => (peso(y) > peso(x) ? y : x);

export function fusionarEstados(local = {}, remoto = {}) {
  if (!remoto || !Object.keys(remoto).length) return local;
  if (!local || !Object.keys(local).length) return remoto;
  const resultado = { ...remoto, ...local };
  // Perfil: se queda el más reciente (el que se editó al último).
  const pl = local.profile; const pr = remoto.profile;
  resultado.profile = pl && pr ? ((pl.updatedAt || '') >= (pr.updatedAt || '') ? pl : pr) : pl || pr;
  for (const k of MAPAS_POR_FECHA) resultado[k] = unirMapas(remoto[k], local[k], masCompleta);
  const senales = new Map([...(remoto.signs || []), ...(local.signs || [])].map((s) => [s.id, s]));
  resultado.signs = [...senales.values()].sort((x, y) => (x.date < y.date ? -1 : 1));
  resultado.badges = [...new Set([...(remoto.badges || []), ...(local.badges || [])])].sort((x, y) => x - y);
  const sl = local.streak || {}; const sr = remoto.streak || {};
  const reciente = (sl.last || '') >= (sr.last || '') ? sl : sr;
  resultado.streak = { ...reciente, best: Math.max(sl.best || 0, sr.best || 0, reciente.count || 0) };
  return resultado;
}
