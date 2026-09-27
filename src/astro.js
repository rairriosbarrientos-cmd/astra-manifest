// Sun signs and moon phase, computed offline.

export const SIGNS = [
  { id: 'aries', name: 'Aries', glyph: '♈', element: 'Fire', from: [3, 21], to: [4, 19], traits: 'bold, driven and wonderfully honest', gift: 'the courage to go first' },
  { id: 'taurus', name: 'Taurus', glyph: '♉', element: 'Earth', from: [4, 20], to: [5, 20], traits: 'steady, sensual and deeply loyal', gift: 'building things that last' },
  { id: 'gemini', name: 'Gemini', glyph: '♊', element: 'Air', from: [5, 21], to: [6, 20], traits: 'curious, quick and endlessly adaptable', gift: 'connecting ideas and people' },
  { id: 'cancer', name: 'Cancer', glyph: '♋', element: 'Water', from: [6, 21], to: [7, 22], traits: 'intuitive, protective and quietly strong', gift: 'making others feel at home' },
  { id: 'leo', name: 'Leo', glyph: '♌', element: 'Fire', from: [7, 23], to: [8, 22], traits: 'warm, generous and magnetic', gift: 'lighting up every room' },
  { id: 'virgo', name: 'Virgo', glyph: '♍', element: 'Earth', from: [8, 23], to: [9, 22], traits: 'thoughtful, precise and caring', gift: 'turning chaos into calm' },
  { id: 'libra', name: 'Libra', glyph: '♎', element: 'Air', from: [9, 23], to: [10, 22], traits: 'graceful, fair and harmony-seeking', gift: 'seeing every side with kindness' },
  { id: 'scorpio', name: 'Scorpio', glyph: '♏', element: 'Water', from: [10, 23], to: [11, 21], traits: 'intense, perceptive and fiercely devoted', gift: 'transforming pain into power' },
  { id: 'sagittarius', name: 'Sagittarius', glyph: '♐', element: 'Fire', from: [11, 22], to: [12, 21], traits: 'free-spirited, optimistic and wise', gift: 'finding meaning in every journey' },
  { id: 'capricorn', name: 'Capricorn', glyph: '♑', element: 'Earth', from: [12, 22], to: [1, 19], traits: 'ambitious, patient and resilient', gift: 'climbing any mountain, one step at a time' },
  { id: 'aquarius', name: 'Aquarius', glyph: '♒', element: 'Air', from: [1, 20], to: [2, 18], traits: 'original, visionary and kind-hearted', gift: 'imagining a better world' },
  { id: 'pisces', name: 'Pisces', glyph: '♓', element: 'Water', from: [2, 19], to: [3, 20], traits: 'dreamy, empathetic and creative', gift: 'feeling what others cannot say' },
];

// birthday: 'YYYY-MM-DD'
export function signFor(birthday) {
  const [, m, d] = String(birthday).split('-').map(Number);
  if (!m || !d) return null;
  const n = m * 100 + d;
  return SIGNS.find((s) => {
    const a = s.from[0] * 100 + s.from[1];
    const b = s.to[0] * 100 + s.to[1];
    return a <= b ? n >= a && n <= b : n >= a || n <= b;
  });
}

const SYNODIC = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

export function moonPhase(date = new Date()) {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86400000;
  const age = ((days % SYNODIC) + SYNODIC) % SYNODIC;
  const phases = [
    { max: 1.84566, name: 'New Moon', emoji: '🌑', energy: 'set fresh intentions' },
    { max: 5.53699, name: 'Waxing Crescent', emoji: '🌒', energy: 'take the first small step' },
    { max: 9.22831, name: 'First Quarter', emoji: '🌓', energy: 'push through resistance' },
    { max: 12.91963, name: 'Waxing Gibbous', emoji: '🌔', energy: 'refine and keep going' },
    { max: 16.61096, name: 'Full Moon', emoji: '🌕', energy: 'celebrate and release' },
    { max: 20.30228, name: 'Waning Gibbous', emoji: '🌖', energy: 'share what you have learned' },
    { max: 23.99361, name: 'Last Quarter', emoji: '🌗', energy: 'let go of what is heavy' },
    { max: 27.68493, name: 'Waning Crescent', emoji: '🌘', energy: 'rest and reflect' },
    { max: SYNODIC + 1, name: 'New Moon', emoji: '🌑', energy: 'set fresh intentions' },
  ];
  const phase = phases.find((p) => age < p.max);
  return { ...phase, age: Math.round(age * 10) / 10, illumination: Math.round(((1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2) * 100) };
}

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
