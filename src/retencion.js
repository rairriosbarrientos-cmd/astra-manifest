// Hábito sano: racha con un día de descanso por semana, logros, constelación del mes y resumen semanal.
// Nada de culpa ni miedo: perder la racha nunca borra lo que ya hiciste.
import { localDateKey } from './astro.js';

export const MILESTONES = [
  { days: 3, name: 'First Spark', emoji: '✨', note: 'Three days in a row. A ritual is starting to form.' },
  { days: 7, name: 'Full Week', emoji: '🌙', note: 'Seven days of showing up for yourself.' },
  { days: 14, name: 'Two Moons', emoji: '🌗', note: 'Two weeks. This is becoming part of who you are.' },
  { days: 21, name: 'New Habit', emoji: '🔮', note: 'Twenty-one days — the classic habit mark.' },
  { days: 30, name: 'Lunar Cycle', emoji: '🌕', note: 'A full moon cycle together.' },
  { days: 40, name: 'Forty Nights', emoji: '💫', note: 'Forty days of intention. Take a moment to feel that.' },
  { days: 100, name: 'Constellation', emoji: '🌌', note: 'One hundred days. You built this.' },
];

export const MOODS = [
  { id: 1, emoji: '🌧️', name: 'Heavy', color: '#8A93B8' },
  { id: 2, emoji: '☁️', name: 'Meh', color: '#A9A3C9' },
  { id: 3, emoji: '🌤️', name: 'Okay', color: '#E9D8A6' },
  { id: 4, emoji: '☀️', name: 'Good', color: '#F2C66D' },
  { id: 5, emoji: '🌟', name: 'Glowing', color: '#FFE08A' },
];

const dia = (key, delta) => { const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate() + delta); return localDateKey(d); };
// Lunes de la semana de una fecha: identifica la semana para el día de descanso.
export function weekKey(key) {
  const d = new Date(`${key}T12:00:00`);
  const lunes = (d.getDay() + 6) % 7;
  return dia(key, -lunes);
}

// streak: { last, count, best, restWeek } → nueva racha al abrir la app el día `hoy`.
// Si faltaste exactamente un día y no has usado el descanso de esta semana, la racha sigue.
export function updateStreak(streak = {}, hoy) {
  if (streak.last === hoy) return { streak, usedRest: false };
  let count = 1;
  let usedRest = false;
  let restWeek = streak.restWeek || null;
  if (streak.last === dia(hoy, -1)) count = (streak.count || 0) + 1;
  else if (streak.last === dia(hoy, -2) && restWeek !== weekKey(hoy)) {
    count = (streak.count || 0) + 1;
    usedRest = true;
    restWeek = weekKey(hoy);
  }
  return { streak: { last: hoy, count, best: Math.max(streak.best || 0, count), restWeek }, usedRest };
}
export const restAvailable = (streak = {}, hoy) => streak.restWeek !== weekKey(hoy);

export function newMilestone(count, earned = []) {
  return MILESTONES.find((m) => m.days === count && !earned.includes(m.days)) || null;
}

// Posición fija de la estrella de cada día del mes: acomodo tipo calendario (7 columnas)
// con un poco de azar, así hasta una sola semana se ve como constelación y no como un montón.
export function starPosition(key) {
  const d = Number(key.slice(8, 10));
  let s = Number(key.slice(0, 4)) * 31 + Number(key.slice(5, 7)) * 17 + d * 7919;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  rnd(); rnd();
  const col = (d - 1) % 7;
  const fila = Math.floor((d - 1) / 7);
  return { x: 10 + col * 13.3 + (rnd() - 0.5) * 8, y: 12 + fila * 17 + (rnd() - 0.5) * 10 };
}

export function monthStars(checkins = {}, hoy) {
  const mes = hoy.slice(0, 7);
  return Object.entries(checkins)
    .filter(([k]) => k.startsWith(mes))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, c]) => ({ date: k, mood: c.mood, win: c.win, ...starPosition(k) }));
}

// Resumen de los últimos 7 días (incluye hoy).
export function weeklyRecap(estado, hoy) {
  const dias = Array.from({ length: 7 }, (_, i) => dia(hoy, -i));
  const checkins = dias.map((d) => estado.checkins?.[d]).filter(Boolean);
  const moods = checkins.map((c) => c.mood).filter(Boolean);
  const promedio = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null;
  return {
    checkins: checkins.length,
    wins: checkins.map((c) => c.win).filter(Boolean),
    mood: promedio ? MOODS[Math.round(promedio) - 1] : null,
    cards: dias.filter((d) => estado.cards?.[d]).length,
    signs: (estado.signs || []).filter((s) => dias.includes(s.date)).length,
    journal: dias.filter((d) => { const e = estado.journal?.[d]; return e && (e.reflection || e.gratitude?.some(Boolean)); }).length,
  };
}
