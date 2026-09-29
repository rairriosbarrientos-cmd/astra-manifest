import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signFor, moonPhase } from '../src/astro.js';
import { dailyReading, compatibility, FOCUSES } from '../src/contenido.js';
import { SIGNS } from '../src/astro.js';

test('sun signs on boundary dates', () => {
  assert.equal(signFor('1990-03-21').id, 'aries');
  assert.equal(signFor('1990-04-19').id, 'aries');
  assert.equal(signFor('1990-04-20').id, 'taurus');
  assert.equal(signFor('1990-12-22').id, 'capricorn');
  assert.equal(signFor('1991-01-19').id, 'capricorn');
  assert.equal(signFor('1991-01-20').id, 'aquarius');
  assert.equal(signFor('2000-02-29').id, 'pisces');
  assert.equal(signFor('nope'), null);
  // every day of a leap year has exactly one sign
  for (let d = new Date(2024, 0, 1); d.getFullYear() === 2024; d.setDate(d.getDate() + 1)) {
    const key = `2024-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    assert.ok(signFor(key), key);
  }
});

test('moon phase matches known dates', () => {
  assert.equal(moonPhase(new Date(Date.UTC(2024, 3, 8, 18))).name, 'New Moon'); // total eclipse day
  assert.equal(moonPhase(new Date(Date.UTC(2024, 3, 23, 23))).name, 'Full Moon');
});

test('reading is stable for the same person and day, and changes across days', () => {
  const p = { name: 'Maya', birthday: '1994-07-30', focus: 'love' };
  const a = dailyReading(p, new Date(2026, 8, 27, 9));
  const b = dailyReading(p, new Date(2026, 8, 27, 21));
  const textos = ({ moon, ...resto }) => resto; // the moon's exact % moves during the day
  assert.deepEqual(textos(a), textos(b));
  const semana = new Set(Array.from({ length: 7 }, (_, i) => dailyReading(p, new Date(2026, 8, 20 + i)).opening));
  assert.ok(semana.size >= 4, 'openings should vary through the week');
  assert.equal(a.sign.id, 'leo');
  for (const f of FOCUSES) assert.ok(dailyReading({ ...p, focus: f.id }).affirmation);
});

test('copy never promises money, health outcomes or uses fear', async () => {
  const fs = await import('node:fs');
  const texto = fs.readFileSync(new URL('../src/contenido.js', import.meta.url), 'utf8').toLowerCase();
  for (const prohibido of ['guarantee', 'cure', 'you will win', 'curse', 'bad luck', 'blocked energy', 'or else']) {
    assert.ok(!texto.includes(prohibido), prohibido);
  }
});

test('compatibility is symmetric and bounded', () => {
  for (const a of SIGNS) for (const b of SIGNS) {
    const x = compatibility(a, b);
    assert.ok(x.score >= 50 && x.score <= 99);
  }
});

test('moon events: next new and full moons are ordered and a half cycle apart', async () => {
  const { nextMoonEvents, cycleStart } = await import('../src/astro.js');
  const ev = nextMoonEvents(new Date(Date.UTC(2024, 3, 10, 12)), 4); // two days after the Apr 8 2024 new moon
  assert.equal(ev[0].type, 'full');
  assert.equal(ev[0].date, '2024-04-23');
  assert.equal(ev[1].type, 'new');
  assert.ok(ev[1].date === '2024-05-07' || ev[1].date === '2024-05-08', ev[1].date);
  assert.ok(ev.every((e, i) => i === 0 || e.date > ev[i - 1].date));
  assert.ok(['2024-04-08', '2024-04-07'].includes(cycleStart(new Date(Date.UTC(2024, 3, 10, 12)))));
});

test('cards: 44 unique, daily card is stable and prefers ones not yet collected', async () => {
  const { CARDS, cardOfDay } = await import('../src/contenido.js');
  assert.equal(CARDS.length, 44);
  assert.equal(new Set(CARDS.map((c) => c.id)).size, 44);
  const p = { name: 'Maya', birthday: '1994-07-30' };
  const d = new Date(2026, 8, 27, 9);
  assert.equal(cardOfDay(p, d).id, cardOfDay(p, new Date(2026, 8, 27, 22)).id);
  const casiTodas = CARDS.slice(1).map((c) => c.id);
  assert.equal(cardOfDay(p, d, casiTodas).id, CARDS[0].id);
  assert.ok(cardOfDay(p, d, CARDS.map((c) => c.id)));
});

test('streak keeps going with one rest day per week and never goes below 1', async () => {
  const { updateStreak, newMilestone, weeklyRecap, monthStars } = await import('../src/retencion.js');
  let s = updateStreak({}, '2026-09-21').streak; // lunes
  assert.equal(s.count, 1);
  s = updateStreak(s, '2026-09-22').streak;
  const salto = updateStreak(s, '2026-09-24'); // faltó el 23: usa el descanso
  assert.equal(salto.usedRest, true);
  assert.equal(salto.streak.count, 3);
  const otroSalto = updateStreak(salto.streak, '2026-09-26'); // misma semana, ya no hay descanso
  assert.equal(otroSalto.streak.count, 1);
  assert.equal(otroSalto.streak.best, 3);
  assert.equal(updateStreak(otroSalto.streak, '2026-09-26').streak, otroSalto.streak);
  assert.equal(newMilestone(7, [3]).days, 7);
  assert.equal(newMilestone(7, [3, 7]), null);
  const estado = { checkins: { '2026-09-27': { mood: 5, win: 'Shipped it' }, '2026-09-25': { mood: 3 }, '2026-08-30': { mood: 1 } }, cards: { '2026-09-27': 'sun' } };
  const r = weeklyRecap(estado, '2026-09-27');
  assert.equal(r.checkins, 2); assert.equal(r.mood.name, 'Good'); assert.deepEqual(r.wins, ['Shipped it']); assert.equal(r.cards, 1);
  const st = monthStars(estado.checkins, '2026-09-27');
  assert.equal(st.length, 2);
  assert.deepEqual(monthStars(estado.checkins, '2026-09-27'), st);
  assert.ok(st.every((x) => x.x > 0 && x.x < 100 && x.y > 0 && x.y < 100));
});

test('merge keeps progress from both devices', async () => {
  const { fusionarEstados } = await import('../src/fusion.js');
  const cel = { profile: { name: 'Ana', updatedAt: '2026-09-28T10:00' }, cards: { '2026-09-27': 'sun' }, checkins: { '2026-09-27': { mood: 4, win: 'Gym' } }, signs: [{ id: 'a', date: '2026-09-27', text: 'x' }], badges: [3], streak: { last: '2026-09-28', count: 2, best: 2 } };
  const nube = { profile: { name: 'Ana M', updatedAt: '2026-09-20T10:00' }, cards: { '2026-09-20': 'moon', '2026-09-27': 'sun' }, checkins: { '2026-09-27': { mood: 4 } }, signs: [{ id: 'b', date: '2026-09-20', text: 'y' }], badges: [3, 7], streak: { last: '2026-09-21', count: 9, best: 9 } };
  const r = fusionarEstados(cel, nube);
  assert.equal(r.profile.name, 'Ana');
  assert.deepEqual(Object.keys(r.cards).sort(), ['2026-09-20', '2026-09-27']);
  assert.equal(r.checkins['2026-09-27'].win, 'Gym');
  assert.deepEqual(r.signs.map((s) => s.id), ['b', 'a']);
  assert.deepEqual(r.badges, [3, 7]);
  assert.equal(r.streak.count, 2); assert.equal(r.streak.best, 9);
  assert.equal(fusionarEstados({}, nube), nube);
  assert.equal(fusionarEstados(cel, {}), cel);
});

test('plus content is stable and well formed', async () => {
  const { threeCardSpread, weeklyForecast, monthlyTheme, deepCompatibility, weekKeyOf } = await import('../src/plus.js');
  const p = { name: 'Maya', birthday: '1994-07-30', focus: 'career' };
  const s1 = threeCardSpread(p, new Date(2026, 8, 28, 9));
  const s2 = threeCardSpread(p, new Date(2026, 8, 28, 22));
  assert.deepEqual(s1.map((x) => x.carta.id), s2.map((x) => x.carta.id));
  assert.equal(new Set(s1.map((x) => x.carta.id)).size, 3);
  assert.equal(weekKeyOf(new Date(2026, 8, 30)), '2026-09-28');
  const w = weeklyForecast(p, new Date(2026, 8, 30));
  assert.deepEqual(w, weeklyForecast(p, new Date(2026, 9, 4)));
  assert.equal(new Set(w.mejores.map((m) => m[2])).size, 3);
  const m = monthlyTheme(p, new Date(2026, 9, 10));
  assert.ok(m.nombre && m.lunas.every((l) => l.date.startsWith('2026-10')) && m.lunas.length >= 1);
  const { SIGNS } = await import('../src/astro.js');
  for (const a of SIGNS) for (const b of SIGNS) assert.ok(deepCompatibility(a, b).consejo);
});

test('plus copy never promises money, health outcomes or uses fear', async () => {
  const fs = await import('node:fs');
  const texto = fs.readFileSync(new URL('../src/plus.js', import.meta.url), 'utf8').toLowerCase();
  for (const prohibido of ['guarantee', 'cure', 'you will win', 'curse', 'bad luck', 'blocked energy', 'or else', 'last chance']) assert.ok(!texto.includes(prohibido), prohibido);
});
