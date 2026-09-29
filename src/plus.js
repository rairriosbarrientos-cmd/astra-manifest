// Astra Plus: contenido extra, igual de estable por persona y fecha que la lectura diaria.
// Mismas reglas de tono: para reflexionar y disfrutar, nunca miedo ni promesas de dinero, salud o eventos.
import { signFor, localDateKey, nextMoonEvents } from './astro.js';
import { CARDS, FOCUSES } from './contenido.js';

export const PLUS = {
  mensual: { id: 'mensual', precio: '$4.99', periodo: 'month' },
  anual: { id: 'anual', precio: '$29.99', periodo: 'year', ahorro: 'Save 50%' },
  pruebaDias: 7,
  beneficios: [
    ['🔮', 'Daily 3-card spread', 'Past, present and next step — a deeper look every day.'],
    ['📅', 'Your week ahead', 'Every Monday: your best days for love, work and rest.'],
    ['🌙', 'Monthly theme', 'The energy of the month with its key moon dates.'],
    ['💞', 'Deep compatibility', 'Strengths, friction points and how to love each sign well.'],
    ['🎨', 'Premium themes', 'Aurora, Rose Quartz and Gold skins for your app.'],
  ],
};

function hash(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function aleatorio(semilla) {
  let a = semilla;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const semillaDe = (profile, extra) => hash(`${extra}|${profile?.name?.toLowerCase().trim()}|${profile?.birthday}|${profile?.focus}`);

// ---------- Tirada de 3 cartas ----------
const POSICIONES = [
  ['Past', 'What shaped this moment'],
  ['Present', 'What is asking for your attention'],
  ['Next step', 'Where to put your energy'],
];
export function threeCardSpread(profile, date = new Date()) {
  const rnd = aleatorio(semillaDe(profile, `spread|${localDateKey(date)}`));
  const mazo = [...CARDS];
  return POSICIONES.map(([posicion, pregunta]) => {
    const carta = mazo.splice(Math.floor(rnd() * mazo.length), 1)[0];
    return { posicion, pregunta, carta };
  });
}

// ---------- Semana ----------
const DIAS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TEMAS_SEMANA = [
  'This week rewards finishing over starting. Close one open loop and feel the space it creates.',
  'Conversations carry extra weight this week. Say the honest thing, kindly and early.',
  'A week for small upgrades: one habit, one space, one boundary.',
  'Your intuition is sharp this week. Notice the first answer before your mind argues with it.',
  'Connection is the theme. Reach out to someone you have been meaning to call.',
  'This week asks for patience with yourself. Progress is happening even when it is quiet.',
  'Creative energy is high. Make something just for the joy of it.',
  'A good week to ask for what you need — at work, at home and from yourself.',
];
const CONSEJOS = {
  love: 'Plan one moment of real attention — phone down, fully there.',
  abundance: 'Write down one money or opportunity goal and one tiny action toward it.',
  career: 'Protect two blocks of deep work and treat them like meetings.',
  healing: 'Schedule rest the way you schedule tasks.',
  selflove: 'Keep one promise to yourself every day this week.',
};
export function weekKeyOf(date = new Date()) {
  const d = new Date(date); d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return localDateKey(d);
}
export function weeklyForecast(profile, date = new Date()) {
  const semana = weekKeyOf(date);
  const rnd = aleatorio(semillaDe(profile, `week|${semana}`));
  const indices = DIAS.map((_, i) => i);
  const tomar = () => indices.splice(Math.floor(rnd() * indices.length), 1)[0];
  const focus = FOCUSES.find((f) => f.id === profile?.focus) || FOCUSES[0];
  const sign = signFor(profile?.birthday);
  return {
    semana,
    tema: TEMAS_SEMANA[Math.floor(rnd() * TEMAS_SEMANA.length)],
    mejores: [['💗', 'Love & connection', DIAS[tomar()]], ['💼', 'Work & focus', DIAS[tomar()]], ['🛌', 'Rest & recharge', DIAS[tomar()]]],
    consejo: CONSEJOS[focus.id],
    signo: sign ? `${sign.name}, your gift for ${sign.gift} is your edge this week.` : '',
  };
}

// ---------- Mes ----------
const TEMAS_MES = [
  ['Roots', 'A month for foundations: routines, home and the people who steady you.'],
  ['Bloom', 'What you have been tending starts to show. Let yourself be seen.'],
  ['Clear Sky', 'Simplify. Fewer commitments, more of what matters.'],
  ['Tide', 'Feelings move in and out this month. Let them, without deciding everything at once.'],
  ['Spark', 'New ideas arrive quickly. Capture them and pick one to follow.'],
  ['Harvest', 'Notice how far you have come and celebrate it on purpose.'],
  ['Compass', 'A month to choose direction. Say yes to one path and no to one distraction.'],
  ['Hearth', 'Warmth, rest and closeness. Invest in the relationships that feel like home.'],
];
export function monthlyTheme(profile, date = new Date()) {
  const mes = localDateKey(date).slice(0, 7);
  const rnd = aleatorio(semillaDe(profile, `month|${mes}`));
  const [nombre, texto] = TEMAS_MES[Math.floor(rnd() * TEMAS_MES.length)];
  const inicio = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const lunas = nextMoonEvents(inicio, 6).filter((e) => e.date.startsWith(mes));
  return { mes, nombre, texto, lunas };
}

// ---------- Compatibilidad a fondo ----------
const POR_ELEMENTO = {
  Fire: { da: 'energy, courage and spontaneity', necesita: 'freedom and enthusiasm' },
  Earth: { da: 'loyalty, stability and follow-through', necesita: 'consistency and practical care' },
  Air: { da: 'ideas, humor and great conversation', necesita: 'space to think and talk things through' },
  Water: { da: 'depth, empathy and emotional honesty', necesita: 'reassurance and gentle attention' },
};
export function deepCompatibility(a, b) {
  if (!a || !b) return null;
  const ea = POR_ELEMENTO[a.element]; const eb = POR_ELEMENTO[b.element];
  const mismo = a.element === b.element;
  return {
    fortalezas: `${a.name} brings ${ea.da}; ${b.name} brings ${eb.da}.`,
    friccion: mismo
      ? `You recognize yourselves in each other — sometimes too much. Take turns leading.`
      : `${a.name} needs ${ea.necesita}, while ${b.name} needs ${eb.necesita}. Name those needs out loud.`,
    consejo: `Love ${b.name} well by offering ${eb.necesita}. Let them love you by asking for ${ea.necesita}.`,
  };
}

// ---------- Temas de color ----------
export const THEMES = [
  { id: 'night', name: 'Night', plus: false, vars: {} },
  { id: 'aurora', name: 'Aurora', plus: true, vars: { '--night': '#071A24', '--gold': '#7FE0C4', '--rose': '#8FB8FF' } },
  { id: 'rose', name: 'Rose Quartz', plus: true, vars: { '--night': '#24101E', '--gold': '#F2B3C9', '--rose': '#FFD6E4' } },
  { id: 'gold', name: 'Gold', plus: true, vars: { '--night': '#1A140A', '--gold': '#F5C04E', '--rose': '#FFE3A3' } },
];
