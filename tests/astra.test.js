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
