import { useEffect, useMemo, useState } from 'react';
import { SIGNS, signFor, localDateKey } from './astro.js';
import { FOCUSES, dailyReading, compatibility } from './contenido.js';

const CLAVE = 'astra:v1';
function cargar() { try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch { return {}; } }
function guardar(estado) { try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { /* storage full or blocked */ } }

function useEstado() {
  const [estado, setEstado] = useState(cargar);
  const actualizar = (cambio) => setEstado((prev) => { const nuevo = typeof cambio === 'function' ? cambio(prev) : { ...prev, ...cambio }; guardar(nuevo); return nuevo; });
  return [estado, actualizar];
}

function ayer(key) { const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate() - 1); return localDateKey(d); }

export default function App() {
  const [estado, actualizar] = useEstado();
  const [tab, setTab] = useState('today');
  const hoy = localDateKey();

  // Daily streak: counts consecutive days the app was opened.
  useEffect(() => {
    if (!estado.profile) return;
    const r = estado.streak || {};
    if (r.last === hoy) return;
    actualizar({ streak: { last: hoy, count: r.last === ayer(hoy) ? (r.count || 0) + 1 : 1, best: Math.max(r.best || 0, r.last === ayer(hoy) ? (r.count || 0) + 1 : 1) } });
  }, [estado.profile, hoy]);

  if (!estado.profile) return <Onboarding onListo={(profile) => actualizar({ profile })} />;

  return (
    <div className="app">
      <div className="stars" aria-hidden />
      <main className="contenido">
        {tab === 'today' && <Today estado={estado} actualizar={actualizar} />}
        {tab === 'manifest' && <Manifest estado={estado} actualizar={actualizar} />}
        {tab === 'journal' && <Journal estado={estado} actualizar={actualizar} />}
        {tab === 'me' && <Me estado={estado} actualizar={actualizar} />}
      </main>
      <nav className="tabs">
        {[['today', '☾', 'Today'], ['manifest', '✦', 'Manifest'], ['journal', '✎', 'Journal'], ['me', '◎', 'Me']].map(([k, i, t]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined}><span>{i}</span>{t}</button>
        ))}
      </nav>
    </div>
  );
}

function Onboarding({ onListo }) {
  const [paso, setPaso] = useState(0);
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [focus, setFocus] = useState('');
  const [intention, setIntention] = useState('');
  const sign = signFor(birthday);

  return (
    <div className="app onboarding">
      <div className="stars" aria-hidden />
      <div className="ob-card">
        <div className="logo-mark">✦</div>
        {paso === 0 && (
          <>
            <h1>Astra</h1>
            <p className="lead">Your daily reading, rituals and gentle reminders — written for who you are becoming.</p>
            <label className="campo">What should we call you?<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" maxLength={30} autoComplete="given-name" /></label>
            <button className="btn" disabled={!name.trim()} onClick={() => setPaso(1)}>Begin</button>
          </>
        )}
        {paso === 1 && (
          <>
            <h2>When were you born, {name.trim()}?</h2>
            <p className="lead">Your birthday reveals your sun sign.</p>
            <label className="campo">Birthday<input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} max={localDateKey()} /></label>
            {sign && <p className="sign-reveal"><span>{sign.glyph}</span> You're a <b>{sign.name}</b> — {sign.traits}.</p>}
            <button className="btn" disabled={!sign} onClick={() => setPaso(2)}>Continue</button>
          </>
        )}
        {paso === 2 && (
          <>
            <h2>What are you calling in?</h2>
            <p className="lead">Choose the energy you want to focus on right now. You can change it anytime.</p>
            <div className="focus-grid">
              {FOCUSES.map((f) => <button key={f.id} className={`chip ${focus === f.id ? 'on' : ''}`} onClick={() => setFocus(f.id)}><span>{f.emoji}</span>{f.name}</button>)}
            </div>
            <button className="btn" disabled={!focus} onClick={() => setPaso(3)}>Continue</button>
          </>
        )}
        {paso === 3 && (
          <>
            <h2>Write your intention</h2>
            <p className="lead">Say it as if it's already true. <i>“I am…”</i> or <i>“I have…”</i></p>
            <label className="campo"><textarea value={intention} onChange={(e) => setIntention(e.target.value)} rows={3} maxLength={160} placeholder="I am calm, confident and open to new opportunities." /></label>
            <button className="btn" disabled={!intention.trim()} onClick={() => onListo({ name: name.trim(), birthday, focus, intention: intention.trim(), since: localDateKey() })}>Reveal my first reading ✦</button>
          </>
        )}
        <p className="fine">For entertainment and self-reflection. Your answers stay on this device.</p>
      </div>
    </div>
  );
}

function Today({ estado }) {
  const { profile } = estado;
  const r = useMemo(() => dailyReading(profile), [profile, localDateKey()]);
  const [compartiendo, setCompartiendo] = useState(false);
  const saludo = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <header className="top">
        <p className="eyebrow">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1>{saludo}, {profile.name}</h1>
        <div className="pills">
          <span className="pill">{r.sign?.glyph} {r.sign?.name}</span>
          <span className="pill">{r.moon.emoji} {r.moon.name}</span>
          {estado.streak?.count > 0 && <span className="pill">🔥 {estado.streak.count} day{estado.streak.count === 1 ? '' : 's'}</span>}
        </div>
      </header>

      <section className="card reading">
        <p className="eyebrow">Your reading</p>
        <p className="big">{r.opening}</p>
        <p>{r.insight}</p>
        <p className="muted">{r.signNote}</p>
        <p className="muted">{r.moonNote}</p>
      </section>

      <section className="card affirmation">
        <p className="eyebrow">Today's affirmation</p>
        <p className="quote">“{r.affirmation}”</p>
        <button className="btn ghost" onClick={async () => { setCompartiendo(true); await compartirTarjeta(r, profile); setCompartiendo(false); }}>{compartiendo ? 'Creating…' : 'Share as a story ↗'}</button>
      </section>

      <section className="grid3">
        <div className="mini"><span>Number</span><b>{r.luckyNumber}</b></div>
        <div className="mini"><span>Color</span><b>{r.color}</b></div>
        <div className="mini"><span>Crystal</span><b>{r.crystal}</b></div>
      </section>

      <section className="card">
        <p className="eyebrow">Your aligned action</p>
        <p>{r.action}</p>
      </section>

      <section className="card">
        <p className="eyebrow">Reflect</p>
        <p className="big">{r.prompt}</p>
        <p className="muted small">Write about it in your Journal tonight.</p>
      </section>

      <p className="fine">Readings are for entertainment and self-reflection, not predictions or professional advice.</p>
    </>
  );
}

const RITUAL = [
  { id: 'am', label: 'Morning', veces: 3, hint: 'Write your intention 3 times' },
  { id: 'pm', label: 'Afternoon', veces: 6, hint: 'Write it 6 times' },
  { id: 'night', label: 'Night', veces: 9, hint: 'Write it 9 times' },
];

function Manifest({ estado, actualizar }) {
  const hoy = localDateKey();
  const intencion = estado.profile.intention;
  const dia = estado.manifest?.[hoy] || {};
  const [editando, setEditando] = useState(false);
  const [nueva, setNueva] = useState(intencion);
  const total = RITUAL.reduce((s, r) => s + r.veces, 0);
  const hechos = RITUAL.reduce((s, r) => s + (dia[r.id] || 0), 0);
  const diasCompletos = Object.values(estado.manifest || {}).filter((d) => RITUAL.every((r) => (d[r.id] || 0) >= r.veces)).length;

  const marcar = (id, veces) => actualizar((prev) => {
    const actual = prev.manifest?.[hoy]?.[id] || 0;
    return { ...prev, manifest: { ...prev.manifest, [hoy]: { ...prev.manifest?.[hoy], [id]: Math.min(veces, actual + 1) } } };
  });

  return (
    <>
      <header className="top">
        <p className="eyebrow">The 3·6·9 method</p>
        <h1>Manifest</h1>
      </header>
      <section className="card intention">
        <p className="eyebrow">Your intention</p>
        {editando ? (
          <>
            <textarea className="area" value={nueva} onChange={(e) => setNueva(e.target.value)} rows={3} maxLength={160} />
            <button className="btn" onClick={() => { actualizar((p) => ({ ...p, profile: { ...p.profile, intention: nueva.trim() || intencion } })); setEditando(false); }}>Save intention</button>
          </>
        ) : (
          <>
            <p className="quote">“{intencion}”</p>
            <button className="link" onClick={() => setEditando(true)}>Edit</button>
          </>
        )}
      </section>

      <div className="progress"><div style={{ width: `${(hechos / total) * 100}%` }} /></div>
      <p className="muted small center">{hechos} of {total} today · {diasCompletos} full day{diasCompletos === 1 ? '' : 's'} completed</p>

      {RITUAL.map((r) => {
        const n = dia[r.id] || 0;
        return (
          <section key={r.id} className={`card ritual ${n >= r.veces ? 'done' : ''}`}>
            <div className="ritual-head"><div><b>{r.label}</b><p className="muted small">{r.hint}</p></div><span className="count">{n}/{r.veces}</span></div>
            <div className="beads">{Array.from({ length: r.veces }, (_, i) => <i key={i} className={i < n ? 'on' : ''} />)}</div>
            {n < r.veces
              ? <button className="btn ghost" onClick={() => marcar(r.id, r.veces)}>I wrote it ✦</button>
              : <p className="done-note">Complete. Let it go and trust the process.</p>}
          </section>
        );
      })}
      <p className="fine">Tip: write by hand, slowly, and feel it as already true.</p>
    </>
  );
}

function Journal({ estado, actualizar }) {
  const hoy = localDateKey();
  const r = useMemo(() => dailyReading(estado.profile), [estado.profile, hoy]);
  const entrada = estado.journal?.[hoy] || { gratitude: ['', '', ''], reflection: '' };
  const guardarEntrada = (cambio) => actualizar((prev) => ({ ...prev, journal: { ...prev.journal, [hoy]: { ...entrada, ...prev.journal?.[hoy], ...cambio } } }));
  const pasadas = Object.entries(estado.journal || {}).filter(([d, e]) => d !== hoy && (e.reflection || e.gratitude?.some(Boolean))).sort(([a], [b]) => b.localeCompare(a)).slice(0, 14);

  return (
    <>
      <header className="top"><p className="eyebrow">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p><h1>Journal</h1></header>
      <section className="card">
        <p className="eyebrow">Three things I'm grateful for</p>
        {[0, 1, 2].map((i) => (
          <input key={i} className="line" value={entrada.gratitude?.[i] || ''} placeholder={`${i + 1}.`} maxLength={140}
            onChange={(e) => { const g = [...(entrada.gratitude || ['', '', ''])]; g[i] = e.target.value; guardarEntrada({ gratitude: g }); }} />
        ))}
      </section>
      <section className="card">
        <p className="eyebrow">Reflect</p>
        <p className="big">{r.prompt}</p>
        <textarea className="area" rows={6} value={entrada.reflection || ''} onChange={(e) => guardarEntrada({ reflection: e.target.value })} placeholder="Write freely. Only you can see this." />
      </section>
      {pasadas.length > 0 && (
        <section className="card">
          <p className="eyebrow">Past entries</p>
          {pasadas.map(([d, e]) => (
            <details key={d} className="past">
              <summary>{new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</summary>
              {e.gratitude?.filter(Boolean).map((g, i) => <p key={i}>✦ {g}</p>)}
              {e.reflection && <p className="muted">{e.reflection}</p>}
            </details>
          ))}
        </section>
      )}
    </>
  );
}

function Me({ estado, actualizar }) {
  const { profile } = estado;
  const sign = signFor(profile.birthday);
  const [otro, setOtro] = useState('leo');
  const compat = compatibility(sign, SIGNS.find((s) => s.id === otro));

  return (
    <>
      <header className="top"><p className="eyebrow">{sign?.element} sign</p><h1>{sign?.glyph} {profile.name}</h1></header>
      <section className="card">
        <p className="big">You are {sign?.traits}.</p>
        <p>Your gift is {sign?.gift}. When you honor it, everything flows more easily.</p>
      </section>
      <section className="grid3">
        <div className="mini"><span>Streak</span><b>🔥 {estado.streak?.count || 0}</b></div>
        <div className="mini"><span>Best</span><b>{estado.streak?.best || 0} days</b></div>
        <div className="mini"><span>Journal</span><b>{Object.keys(estado.journal || {}).length}</b></div>
      </section>
      <section className="card">
        <p className="eyebrow">Your focus</p>
        <div className="focus-grid">
          {FOCUSES.map((f) => <button key={f.id} className={`chip ${profile.focus === f.id ? 'on' : ''}`} onClick={() => actualizar((p) => ({ ...p, profile: { ...p.profile, focus: f.id } }))}><span>{f.emoji}</span>{f.name}</button>)}
        </div>
      </section>
      <section className="card">
        <p className="eyebrow">Compatibility (just for fun)</p>
        <label className="campo">{sign?.name} &amp;
          <select value={otro} onChange={(e) => setOtro(e.target.value)}>{SIGNS.map((s) => <option key={s.id} value={s.id}>{s.glyph} {s.name}</option>)}</select>
        </label>
        {compat && <><p className="score">{compat.score}%</p><p>{compat.note}</p></>}
      </section>
      <section className="card">
        <p className="eyebrow">About Astra</p>
        <p className="muted small">Astra offers readings and rituals for entertainment and self-reflection. It doesn't predict the future and isn't a substitute for medical, financial or mental-health advice. If you're struggling, please reach out to someone you trust or call or text 988 (US).</p>
        <button className="link danger" onClick={() => { if (window.confirm('Delete your profile, journal and rituals from this device?')) { localStorage.removeItem(CLAVE); window.location.reload(); } }}>Delete my data</button>
      </section>
    </>
  );
}

// 1080×1920 story card with today's affirmation.
async function compartirTarjeta(r, profile) {
  const c = document.createElement('canvas');
  c.width = 1080; c.height = 1920;
  const g = c.getContext('2d');
  const fondo = g.createLinearGradient(0, 0, 1080, 1920);
  fondo.addColorStop(0, '#1B1238'); fondo.addColorStop(0.6, '#2A1B4F'); fondo.addColorStop(1, '#4A2C5E');
  g.fillStyle = fondo; g.fillRect(0, 0, 1080, 1920);
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + rnd() * 0.6})`; g.beginPath(); g.arc(rnd() * 1080, rnd() * 1920, rnd() * 2.4, 0, Math.PI * 2); g.fill(); }
  await document.fonts.ready;
  g.textAlign = 'center';
  g.fillStyle = '#E7C77B'; g.font = '600 44px Inter, sans-serif';
  g.fillText(`${r.sign?.glyph || '✦'}  ${(r.sign?.name || '').toUpperCase()}  ·  ${r.moon.emoji} ${r.moon.name.toUpperCase()}`, 540, 420);
  g.fillStyle = '#FFFFFF'; g.font = 'italic 600 84px "Cormorant Garamond", Georgia, serif';
  const palabras = `“${r.affirmation}”`.split(' ');
  const lineas = []; let linea = '';
  for (const p of palabras) { const prueba = linea ? `${linea} ${p}` : p; if (g.measureText(prueba).width > 860) { lineas.push(linea); linea = p; } else linea = prueba; }
  lineas.push(linea);
  const y0 = 960 - ((lineas.length - 1) * 104) / 2;
  lineas.forEach((l, i) => g.fillText(l, 540, y0 + i * 104));
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = '500 40px Inter, sans-serif';
  g.fillText(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), 540, 1500);
  g.fillStyle = '#E7C77B'; g.font = '600 58px "Cormorant Garamond", Georgia, serif';
  g.fillText('✦ Astra', 540, 1720);
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
  const archivo = new File([blob], 'astra-affirmation.png', { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [archivo] })) { await navigator.share({ files: [archivo], title: 'My affirmation today' }); return; }
  } catch { return; /* cancelled */ }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = archivo.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
