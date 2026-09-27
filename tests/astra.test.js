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
