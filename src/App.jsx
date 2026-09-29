import { useEffect, useMemo, useState } from 'react';
import { SIGNS, signFor, localDateKey, moonPhase, nextMoonEvents, cycleStart } from './astro.js';
import { FOCUSES, dailyReading, compatibility, CARDS, cardOfDay, MOON_RITUALS } from './contenido.js';
import { MOODS, MILESTONES, updateStreak, restAvailable, newMilestone, monthStars, weeklyRecap } from './retencion.js';
import { supabase, sincronizarAlEntrar, subirPerfil, consultarPlus, plusGuardado, olvidarPlus } from './nube.js';
import { CuentaModal, PlusModal, NuevaContrasena, Bloqueado, Modal } from './Cuenta.jsx';
import { threeCardSpread, weeklyForecast, monthlyTheme, deepCompatibility, THEMES } from './plus.js';

const CLAVE = 'astra:v1';
function cargar() { try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch { return {}; } }
function guardar(estado) { try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { /* storage full or blocked */ } }

function useEstado() {
  const [estado, setEstado] = useState(cargar);
  const actualizar = (cambio) => setEstado((prev) => { const nuevo = typeof cambio === 'function' ? cambio(prev) : { ...prev, ...cambio }; guardar(nuevo); return nuevo; });
  return [estado, actualizar];
}

const fechaCorta = (key) => new Date(`${key}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const coleccion = (estado) => [...new Set(Object.values(estado.cards || {}))];

export default function App() {
  const [estado, actualizar] = useEstado();
  const [tab, setTab] = useState('today');
  const [celebrar, setCelebrar] = useState(null);
  const hoy = localDateKey();
  // Cuenta opcional (respaldo) y Astra Plus.
  const [sesion, setSesion] = useState(null);
  const [plus, setPlus] = useState(plusGuardado);
  const [modal, setModal] = useState(null); // 'cuenta' | 'entrar' | 'cuenta-plus' | 'plus' | 'nueva-clave' | 'bienvenida'
  const uid = sesion?.user?.id;
  const tienePlus = !!(uid && plus?.plus && (!plus.uid || plus.uid === uid));

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      setSesion(s);
      if (evento === 'PASSWORD_RECOVERY') setModal('nueva-clave');
      if (evento === 'SIGNED_OUT') { olvidarPlus(); setPlus(null); }
    });
    // Regreso de Stripe Checkout.
    const vuelta = new URLSearchParams(window.location.search).get('plus');
    if (vuelta) { window.history.replaceState(null, '', window.location.pathname); if (vuelta === 'ok') setModal('bienvenida'); }
    return () => sub.subscription.unsubscribe();
  }, []);

  // Al entrar: junta este celular con la nube y revisa Plus (reintenta un poco porque el aviso de Stripe puede tardar).
  useEffect(() => {
    if (!uid) return undefined;
    let vivo = true;
    sincronizarAlEntrar(uid, cargar()).then((unido) => { if (vivo) actualizar(() => unido); }).catch(() => {});
    setModal((m) => (m === 'cuenta-plus' ? 'plus' : m === 'entrar' ? null : m));
    let intentos = 0;
    const revisar = () => consultarPlus(sesion).then((p) => {
      if (!vivo) return;
      setPlus({ ...p, uid });
      if (!p.plus && modal === 'bienvenida' && intentos++ < 5) setTimeout(revisar, 3000);
    }).catch(() => {});
    revisar();
    return () => { vivo = false; };
  }, [uid]);

  // Respaldo automático unos segundos después de cada cambio.
  useEffect(() => {
    if (!uid || !estado.profile) return undefined;
    const t = setTimeout(() => subirPerfil(uid, estado).catch(() => {}), 2500);
    return () => clearTimeout(t);
  }, [estado, uid]);

  // Tema de color (Plus).
  useEffect(() => {
    const tema = THEMES.find((t) => t.id === (tienePlus ? estado.theme : 'night')) || THEMES[0];
    const raiz = document.documentElement;
    for (const t of THEMES) for (const k of Object.keys(t.vars)) raiz.style.removeProperty(k);
    for (const [k, v] of Object.entries(tema.vars)) raiz.style.setProperty(k, v);
  }, [estado.theme, tienePlus]);

  const abrirPlus = () => setModal('plus');
  const modales = (
    <>
      {(modal === 'cuenta' || modal === 'entrar' || modal === 'cuenta-plus') && (
        <CuentaModal sesion={sesion} plus={plus} motivo={modal === 'cuenta-plus' ? 'plus' : null} modoInicial={modal === 'entrar' ? 'entrar' : 'crear'} onCerrar={() => setModal(null)} onPlus={() => setModal('plus')} />
      )}
      {modal === 'plus' && <PlusModal sesion={sesion} plus={tienePlus ? plus : null} onCerrar={() => setModal(null)} onNecesitaCuenta={() => setModal('cuenta-plus')} />}
      {modal === 'nueva-clave' && <NuevaContrasena onListo={() => setModal(null)} />}
      {modal === 'bienvenida' && (
        <Modal onCerrar={() => setModal(null)}>
          <div className="plus-sello">✦</div>
          <h2 className="hoja-titulo center">{tienePlus ? 'Welcome to Astra Plus' : 'Almost there…'}</h2>
          <p className="lead center">{tienePlus ? 'Your 3-card spread, week ahead and monthly theme are unlocked.' : 'We are confirming your payment. This takes a few seconds.'}</p>
          <button className="btn" onClick={() => setModal(null)}>Continue ✦</button>
        </Modal>
      )}
    </>
  );

  // Racha diaria con un día de descanso por semana; los logros se celebran una sola vez.
  useEffect(() => {
    if (!estado.profile) return;
    const { streak, usedRest } = updateStreak(estado.streak, hoy);
    if (streak === estado.streak) return;
    const logro = newMilestone(streak.count, estado.badges || []);
    actualizar((p) => ({ ...p, streak, badges: logro ? [...(p.badges || []), logro.days] : p.badges || [] }));
    if (logro) setCelebrar({ tipo: 'logro', ...logro });
    else if (usedRest) setCelebrar({ tipo: 'descanso' });
  }, [estado.profile, hoy]);

  if (!estado.profile) return <>{modales}<Onboarding onListo={(profile) => actualizar({ profile: { ...profile, updatedAt: new Date().toISOString() } })} onEntrar={() => setModal('entrar')} /></>;

  return (
    <div className="app">
      <div className="stars" aria-hidden />
      <main className="contenido">
        {tab === 'today' && <Today estado={estado} actualizar={actualizar} irA={setTab} tienePlus={tienePlus} abrirPlus={abrirPlus} />}
        {tab === 'manifest' && <Manifest estado={estado} actualizar={actualizar} />}
        {tab === 'moon' && <Moon estado={estado} actualizar={actualizar} tienePlus={tienePlus} abrirPlus={abrirPlus} />}
        {tab === 'journal' && <Journal estado={estado} actualizar={actualizar} />}
        {tab === 'me' && <Me estado={estado} actualizar={actualizar} tienePlus={tienePlus} abrirPlus={abrirPlus} sesion={sesion} abrirCuenta={() => setModal('cuenta')} />}
      </main>
      <nav className="tabs">
        {[['today', '☾', 'Today'], ['manifest', '✦', 'Manifest'], ['moon', '◐', 'Moon'], ['journal', '✎', 'Journal'], ['me', '◎', 'Me']].map(([k, i, t]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined}><span>{i}</span>{t}</button>
        ))}
      </nav>
      {celebrar && <Celebracion datos={celebrar} onCerrar={() => setCelebrar(null)} />}
      {modales}
    </div>
  );
}

function Celebracion({ datos, onCerrar }) {
  return (
    <div className="modal" onClick={onCerrar} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {datos.tipo === 'logro' ? (
          <>
            <div className="badge-big">{datos.emoji}</div>
            <p className="eyebrow">New milestone</p>
            <h2>{datos.name}</h2>
            <p className="lead">{datos.note}</p>
          </>
        ) : (
          <>
            <div className="badge-big">🛌</div>
            <p className="eyebrow">Rest day used</p>
            <h2>Your streak is safe</h2>
            <p className="lead">Everyone needs a day off. You get one rest day each week — welcome back.</p>
          </>
        )}
        <button className="btn" onClick={onCerrar}>Continue ✦</button>
      </div>
    </div>
  );
}

function Onboarding({ onListo, onEntrar }) {
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
            <p className="lead">Your daily card, reading and rituals — written for who you are becoming.</p>
            <label className="campo">What should we call you?<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" maxLength={30} autoComplete="given-name" /></label>
            <button className="btn" disabled={!name.trim()} onClick={() => setPaso(1)}>Begin</button>
            <button className="link" style={{ marginTop: 16 }} onClick={onEntrar}>Already have an account? Sign in</button>
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
            <button className="btn" disabled={!intention.trim()} onClick={() => onListo({ name: name.trim(), birthday, focus, intention: intention.trim(), since: localDateKey() })}>Draw my first card ✦</button>
          </>
        )}
        <p className="fine">For entertainment and self-reflection. Your answers stay on this device.</p>
      </div>
    </div>
  );
}

/* ============================= TODAY ============================= */

function Today({ estado, actualizar, irA, tienePlus, abrirPlus }) {
  const { profile } = estado;
  const hoy = localDateKey();
  const r = useMemo(() => dailyReading(profile), [profile, hoy]);
  const [compartiendo, setCompartiendo] = useState(false);
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Good morning' : hora < 18 ? 'Good afternoon' : 'Good evening';
  const proxima = nextMoonEvents(new Date(), 1)[0];
  const recap = weeklyRecap(estado, hoy);
  const esDomingo = new Date().getDay() === 0;

  return (
    <>
      <header className="top">
        <p className="eyebrow">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1>{saludo}, {profile.name}</h1>
        <div className="pills">
          <span className="pill">{r.sign?.glyph} {r.sign?.name}</span>
          <span className="pill">{r.moon.emoji} {r.moon.name}</span>
          {estado.streak?.count > 0 && <span className="pill">🔥 {estado.streak.count} day{estado.streak.count === 1 ? '' : 's'}{restAvailable(estado.streak, hoy) ? ' · 🛌' : ''}</span>}
        </div>
      </header>

      <CartaDelDia estado={estado} actualizar={actualizar} />

      {tienePlus ? <TiradaTres profile={profile} /> : <Bloqueado eyebrow="3-card spread" titulo="Past · Present · Next step" texto="A deeper daily spread that shows what shaped today and where to put your energy." onAbrir={abrirPlus} />}

      {hora >= 17 && !estado.checkins?.[hoy] && (
        <button className="card nudge" onClick={() => irA('journal')}>
          <span className="nudge-emoji">🌌</span>
          <span><b>Tonight's check-in</b><br /><span className="muted small">Add today's star to your constellation.</span></span>
          <span className="flecha">→</span>
        </button>
      )}

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
        <button className="btn ghost" onClick={async () => { setCompartiendo(true); await compartirTarjeta(historiaAfirmacion(r)); setCompartiendo(false); }}>{compartiendo ? 'Creating…' : 'Share as a story ↗'}</button>
      </section>

      <section className="grid3">
        <div className="mini"><span>Number</span><b>{r.luckyNumber}</b></div>
        <div className="mini"><span>Color</span><b>{r.color}</b></div>
        <div className="mini"><span>Crystal</span><b>{r.crystal}</b></div>
      </section>

      {proxima && (
        <button className="card nudge" onClick={() => irA('moon')}>
          <span className="nudge-emoji">{proxima.emoji}</span>
          <span><b>{proxima.name} {proxima.days <= 1 ? 'tomorrow' : `in ${proxima.days} days`}</b><br /><span className="muted small">{proxima.type === 'new' ? 'Your intention ritual opens then.' : 'Your release ritual opens then.'}</span></span>
          <span className="flecha">→</span>
        </button>
      )}

      {tienePlus ? <Semana profile={profile} /> : new Date().getDay() === 1 && <Bloqueado eyebrow="Your week ahead" titulo="Your best days this week" texto="See your best days for love, work and rest, with a theme for the week." onAbrir={abrirPlus} />}

      <section className="card">
        <p className="eyebrow">Your aligned action</p>
        <p>{r.action}</p>
      </section>

      {(esDomingo || recap.checkins >= 3) && (
        <section className="card recap">
          <p className="eyebrow">Your week in the stars</p>
          <div className="grid3 sin-margen">
            <div className="mini"><span>Check-ins</span><b>{recap.checkins}/7</b></div>
            <div className="mini"><span>Mood</span><b>{recap.mood ? recap.mood.emoji : '—'}</b></div>
            <div className="mini"><span>Cards</span><b>{recap.cards}</b></div>
          </div>
          {recap.wins.length > 0 && <><p className="muted small" style={{ marginTop: 12 }}>Wins this week</p>{recap.wins.slice(0, 4).map((w, i) => <p key={i}>✦ {w}</p>)}</>}
        </section>
      )}

      <p className="fine">Readings are for entertainment and self-reflection, not predictions or professional advice.</p>
    </>
  );
}

function CartaDelDia({ estado, actualizar }) {
  const hoy = localDateKey();
  const idHoy = estado.cards?.[hoy];
  const mia = coleccion(estado);
  const carta = CARDS.find((c) => c.id === idHoy) || cardOfDay(estado.profile, new Date(), mia);
  const [volteando, setVolteando] = useState(false);
  const revelada = !!idHoy;
  const nueva = revelada && Object.entries(estado.cards || {}).filter(([, id]) => id === carta.id).every(([d]) => d === hoy);

  const voltear = () => {
    setVolteando(true);
    setTimeout(() => actualizar((p) => ({ ...p, cards: { ...(p.cards || {}), [hoy]: carta.id } })), 450);
  };

  return (
    <section className="card carta-zona">
      <p className="eyebrow">Your card today</p>
      <button className={`carta ${revelada || volteando ? 'volteada' : ''}`} onClick={() => !revelada && voltear()} disabled={revelada} aria-label={revelada ? carta.name : 'Reveal your card'}>
        <span className="carta-cara carta-dorso"><span className="dorso-sello">✦</span><span className="dorso-texto">Tap to reveal</span></span>
        <span className="carta-cara carta-frente">
          <span className="carta-emoji">{carta.emoji}</span>
          <span className="carta-nombre">{carta.name}</span>
          <span className="carta-clave">{carta.keyword}</span>
        </span>
      </button>
      {revelada && (
        <div className="carta-mensaje">
          {nueva && <span className="nueva">New card · {mia.length}/{CARDS.length} collected</span>}
          <p className="big">{carta.message}</p>
          <button className="btn ghost" onClick={() => compartirTarjeta(historiaCarta(carta))}>Share my card ↗</button>
        </div>
      )}
    </section>
  );
}

/* ============================= MANIFEST ============================= */

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
  const [senal, setSenal] = useState('');
  const total = RITUAL.reduce((s, r) => s + r.veces, 0);
  const hechos = RITUAL.reduce((s, r) => s + (dia[r.id] || 0), 0);
  const diasCompletos = Object.values(estado.manifest || {}).filter((d) => RITUAL.every((r) => (d[r.id] || 0) >= r.veces)).length;
  const senales = (estado.signs || []).slice().reverse();

  const marcar = (id, veces) => actualizar((prev) => {
    const actual = prev.manifest?.[hoy]?.[id] || 0;
    return { ...prev, manifest: { ...prev.manifest, [hoy]: { ...prev.manifest?.[hoy], [id]: Math.min(veces, actual + 1) } } };
  });
  const agregarSenal = () => {
    const texto = senal.trim();
    if (!texto) return;
    actualizar((p) => ({ ...p, signs: [...(p.signs || []), { id: Math.random().toString(36).slice(2, 9), date: hoy, text: texto }] }));
    setSenal('');
  };

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
            <button className="btn" onClick={() => { actualizar((p) => ({ ...p, profile: { ...p.profile, intention: nueva.trim() || intencion, updatedAt: new Date().toISOString() } })); setEditando(false); }}>Save intention</button>
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

      <section className="card">
        <p className="eyebrow">Signs & small wins</p>
        <p className="muted small">Noticed something that feels aligned with your intention? Write it down — noticing is how momentum grows.</p>
        <div className="fila-input">
          <input className="line" value={senal} onChange={(e) => setSenal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && agregarSenal()} placeholder="A friend mentioned the exact job I want…" maxLength={160} />
          <button className="btn mini-btn" onClick={agregarSenal} disabled={!senal.trim()}>Add</button>
        </div>
        {senales.slice(0, 8).map((s) => <p key={s.id} className="senal"><span>✦</span>{s.text}<small>{fechaCorta(s.date)}</small></p>)}
        {senales.length > 8 && <p className="muted small">+{senales.length - 8} more signs noticed</p>}
      </section>
      <p className="fine">Tip: write by hand, slowly, and feel it as already true.</p>
    </>
  );
}

/* ============================= MOON ============================= */

function Moon({ estado, actualizar, tienePlus, abrirPlus }) {
  const ahora = new Date();
  const fase = moonPhase(ahora);
  const eventos = nextMoonEvents(ahora, 4);
  const ciclo = cycleStart(ahora);
  const datos = estado.moons?.[ciclo] || {};
  const tipoRitual = fase.name === 'New Moon' ? 'new' : fase.name === 'Full Moon' ? 'full' : null;
  const [intenciones, setIntenciones] = useState(datos.intentions || ['', '', '']);
  const [soltar, setSoltar] = useState('');
  const [quemando, setQuemando] = useState(false);
  const guardarCiclo = (cambio) => actualizar((p) => ({ ...p, moons: { ...(p.moons || {}), [ciclo]: { ...(p.moons?.[ciclo] || {}), ...cambio } } }));
  const anteriores = Object.entries(estado.moons || {}).filter(([k, v]) => k !== ciclo && v.intentions?.some(Boolean)).sort(([a], [b]) => b.localeCompare(a)).slice(0, 3);
  const liberadas = Object.values(estado.moons || {}).reduce((s, v) => s + (v.releases || 0), 0);
  // La sombra se corre de un lado al otro según la fase: creciente se ilumina por la derecha.
  const creciente = fase.age < 14.77;
  const desplazamiento = (creciente ? -1 : 1) * fase.illumination;

  const liberar = () => {
    setQuemando(true);
    setTimeout(() => { guardarCiclo({ releases: (datos.releases || 0) + 1 }); setSoltar(''); setQuemando(false); }, 1600);
  };

  return (
    <>
      <header className="top"><p className="eyebrow">Moon</p><h1>{fase.name}</h1></header>
      <section className="card luna-card">
        <div className="luna" aria-hidden><div className="luna-sombra" style={{ transform: `translateX(${desplazamiento}%)` }} /></div>
        <p className="big center">{fase.illumination}% illuminated</p>
        <p className="muted center">The {fase.name.toLowerCase()} invites you to {fase.energy}.</p>
      </section>

      {tienePlus ? <TemaMes profile={estado.profile} /> : <Bloqueado eyebrow="Monthly theme" titulo="The energy of your month" texto="A theme for the whole month with its key moon dates and how to work with them." onAbrir={abrirPlus} />}

      {tipoRitual ? (
        <section className="card ritual-luna">
          <p className="eyebrow">Open now</p>
          <h2>{MOON_RITUALS[tipoRitual].title}</h2>
          <p className="muted">{MOON_RITUALS[tipoRitual].hint}</p>
          {tipoRitual === 'new' ? (
            <>
              {intenciones.map((t, i) => (
                <input key={i} className="line" value={t} placeholder={`${i + 1}. I am…`} maxLength={140} onChange={(e) => { const n = [...intenciones]; n[i] = e.target.value; setIntenciones(n); }} />
              ))}
              <button className="btn" disabled={!intenciones.some((t) => t.trim())} onClick={() => guardarCiclo({ intentions: intenciones.map((t) => t.trim()), sealed: localDateKey() })}>{datos.sealed ? 'Update intentions' : MOON_RITUALS.new.cta}</button>
              {datos.sealed && <p className="done-note center">Sealed for this cycle ✦ We'll check back at the full moon.</p>}
            </>
          ) : (
            <>
              <textarea className={`area ${quemando ? 'quemando' : ''}`} rows={4} value={soltar} onChange={(e) => setSoltar(e.target.value)} placeholder="I release the need to have everything figured out." maxLength={300} />
              <button className="btn" disabled={!soltar.trim() || quemando} onClick={liberar}>{quemando ? 'Releasing…' : MOON_RITUALS.full.cta}</button>
              {datos.releases > 0 && !quemando && <p className="done-note center">Released {datos.releases} time{datos.releases === 1 ? '' : 's'} this cycle. Lighter already.</p>}
              {datos.intentions?.some(Boolean) && (
                <div className="revisar">
                  <p className="eyebrow">Your new-moon intentions</p>
                  {datos.intentions.filter(Boolean).map((t, i) => <p key={i}>✦ {t}</p>)}
                  <p className="muted small">How far have they come? Note any signs in Manifest.</p>
                </div>
              )}
            </>
          )}
        </section>
      ) : datos.intentions?.some(Boolean) && (
        <section className="card">
          <p className="eyebrow">This cycle's intentions</p>
          {datos.intentions.filter(Boolean).map((t, i) => <p key={i}>✦ {t}</p>)}
        </section>
      )}

      <section className="card">
        <p className="eyebrow">Coming up</p>
        {eventos.map((e) => (
          <div key={`${e.type}${e.date}`} className="evento">
            <span className="evento-emoji">{e.emoji}</span>
            <span className="evento-nombre"><b>{e.name}</b><br /><span className="muted small">{fechaCorta(e.date)} · {e.type === 'new' ? 'set intentions' : 'release ritual'}</span></span>
            <span className="evento-dias">{e.days <= 1 ? 'tomorrow' : `${e.days}d`}</span>
          </div>
        ))}
      </section>

      {(anteriores.length > 0 || liberadas > 0) && (
        <section className="card">
          <p className="eyebrow">Your moon story</p>
          {liberadas > 0 && <p>🔥 {liberadas} release{liberadas === 1 ? '' : 's'} so far.</p>}
          {anteriores.map(([k, v]) => (
            <details key={k} className="past"><summary>Cycle of {fechaCorta(k)}</summary>{v.intentions.filter(Boolean).map((t, i) => <p key={i}>✦ {t}</p>)}</details>
          ))}
        </section>
      )}
    </>
  );
}

/* ============================= JOURNAL ============================= */

function Journal({ estado, actualizar }) {
  const hoy = localDateKey();
  const r = useMemo(() => dailyReading(estado.profile), [estado.profile, hoy]);
  const entrada = estado.journal?.[hoy] || { gratitude: ['', '', ''], reflection: '' };
  const guardarEntrada = (cambio) => actualizar((prev) => ({ ...prev, journal: { ...prev.journal, [hoy]: { ...entrada, ...prev.journal?.[hoy], ...cambio } } }));
  const pasadas = Object.entries(estado.journal || {}).filter(([d, e]) => d !== hoy && (e.reflection || e.gratitude?.some(Boolean))).sort(([a], [b]) => b.localeCompare(a)).slice(0, 14);

  return (
    <>
      <header className="top"><p className="eyebrow">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p><h1>Journal</h1></header>
      <CheckIn estado={estado} actualizar={actualizar} />
      <Constelacion estado={estado} />
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
              <summary>{fechaCorta(d)}</summary>
              {e.gratitude?.filter(Boolean).map((g, i) => <p key={i}>✦ {g}</p>)}
              {e.reflection && <p className="muted">{e.reflection}</p>}
            </details>
          ))}
        </section>
      )}
    </>
  );
}

function CheckIn({ estado, actualizar }) {
  const hoy = localDateKey();
  const actual = estado.checkins?.[hoy];
  const [mood, setMood] = useState(actual?.mood || 0);
  const [win, setWin] = useState(actual?.win || '');
  const [editando, setEditando] = useState(!actual);
  const guardarCheck = () => { actualizar((p) => ({ ...p, checkins: { ...(p.checkins || {}), [hoy]: { mood, win: win.trim() } } })); setEditando(false); };
  const m = MOODS.find((x) => x.id === actual?.mood);

  if (!editando && actual) {
    return (
      <section className="card checkin hecho">
        <p className="eyebrow">Tonight's check-in</p>
        <p className="big">{m?.emoji} Today felt {m?.name.toLowerCase()}.</p>
        {actual.win && <p>✦ {actual.win}</p>}
        <p className="done-note">A new star joined your constellation.</p>
        <button className="link" onClick={() => setEditando(true)}>Edit</button>
      </section>
    );
  }
  return (
    <section className="card checkin">
      <p className="eyebrow">Tonight's check-in</p>
      <p className="big">How did today feel?</p>
      <div className="moods">
        {MOODS.map((x) => <button key={x.id} className={`mood ${mood === x.id ? 'on' : ''}`} onClick={() => setMood(x.id)} aria-label={x.name}><span>{x.emoji}</span><small>{x.name}</small></button>)}
      </div>
      <input className="line" value={win} onChange={(e) => setWin(e.target.value)} placeholder="One win from today, however small" maxLength={140} />
      <button className="btn" disabled={!mood} onClick={guardarCheck}>Add my star ✦</button>
    </section>
  );
}

function Constelacion({ estado }) {
  const hoy = localDateKey();
  const estrellas = monthStars(estado.checkins, hoy);
  const mes = new Date().toLocaleDateString('en-US', { month: 'long' });
  const diasMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  return (
    <section className="card constelacion">
      <p className="eyebrow">Your {mes} constellation</p>
      <svg viewBox="0 0 100 100" className="cielo" role="img" aria-label={`${estrellas.length} stars this month`}>
        {estrellas.slice(1).map((s, i) => <line key={s.date} x1={estrellas[i].x} y1={estrellas[i].y} x2={s.x} y2={s.y} stroke="rgba(231,199,123,0.35)" strokeWidth="0.4" />)}
        {estrellas.map((s) => {
          const c = MOODS.find((x) => x.id === s.mood) || MOODS[2];
          const radio = 0.7 + (s.mood || 3) * 0.25;
          return (
            <g key={s.date}>
              <circle cx={s.x} cy={s.y} r={radio * 2.4} fill={c.color} opacity="0.16" />
              <circle cx={s.x} cy={s.y} r={radio} fill={c.color} className={s.date === hoy ? 'estrella-hoy' : ''} />
            </g>
          );
        })}
      </svg>
      <p className="muted small center">{estrellas.length} of {diasMes} stars · each check-in lights one up</p>
    </section>
  );
}

/* ============================= ME ============================= */

function Me({ estado, actualizar, tienePlus, abrirPlus, sesion, abrirCuenta }) {
  const { profile } = estado;
  const sign = signFor(profile.birthday);
  const [otro, setOtro] = useState('leo');
  const otroSigno = SIGNS.find((s) => s.id === otro);
  const compat = compatibility(sign, otroSigno);
  const mia = coleccion(estado);
  const badges = estado.badges || [];

  return (
    <>
      <header className="top"><p className="eyebrow">{sign?.element} sign</p><h1>{sign?.glyph} {profile.name}</h1></header>
      <button className={`card cuenta-card ${tienePlus ? 'plus' : ''}`} onClick={abrirCuenta}>
        <span className="cuenta-icono">{tienePlus ? '✦' : sesion ? '☁︎' : '🔒'}</span>
        <span className="cuenta-texto"><b>{tienePlus ? 'Astra Plus' : sesion ? 'Backed up' : 'Save your progress'}</b><small>{sesion ? sesion.user.email : 'Free account · use Astra on any device'}</small></span>
        <span className="flecha">→</span>
      </button>
      {!tienePlus && (
        <button className="card plus-banner" onClick={abrirPlus}>
          <span><b>Astra Plus</b><small>3-card spread, week ahead, monthly theme and more · 7 days free</small></span>
          <span className="flecha">→</span>
        </button>
      )}
      <section className="card">
        <p className="big">You are {sign?.traits}.</p>
        <p>Your gift is {sign?.gift}. When you honor it, everything flows more easily.</p>
      </section>
      <section className="grid3">
        <div className="mini"><span>Streak</span><b>🔥 {estado.streak?.count || 0}</b></div>
        <div className="mini"><span>Best</span><b>{estado.streak?.best || 0} days</b></div>
        <div className="mini"><span>Stars</span><b>{Object.keys(estado.checkins || {}).length}</b></div>
      </section>

      <section className="card">
        <p className="eyebrow">Your deck · {mia.length}/{CARDS.length}</p>
        <div className="mazo">
          {CARDS.map((c) => mia.includes(c.id)
            ? <div key={c.id} className="mini-carta" title={`${c.name} — ${c.keyword}`}><span>{c.emoji}</span><small>{c.keyword}</small></div>
            : <div key={c.id} className="mini-carta vacia" aria-label="Not collected yet"><span>✦</span></div>)}
        </div>
        <p className="muted small">A new card is waiting every day.</p>
      </section>

      <section className="card">
        <p className="eyebrow">Milestones</p>
        <div className="logros">
          {MILESTONES.map((m) => (
            <div key={m.days} className={`logro ${badges.includes(m.days) ? 'on' : ''}`}>
              <span>{badges.includes(m.days) ? m.emoji : '🔒'}</span><b>{m.name}</b><small>{m.days} days</small>
            </div>
          ))}
        </div>
        <p className="muted small">One rest day a week keeps your streak safe.</p>
      </section>

      <section className="card">
        <p className="eyebrow">App theme</p>
        <div className="temas">
          {THEMES.map((t) => {
            const bloqueado = t.plus && !tienePlus;
            const activo = (estado.theme || 'night') === t.id && !bloqueado;
            return (
              <button key={t.id} className={`tema ${activo ? 'on' : ''}`} onClick={() => (bloqueado ? abrirPlus() : actualizar((p) => ({ ...p, theme: t.id })))}>
                <span className="muestra-tema" style={{ background: `linear-gradient(135deg, ${t.vars['--night'] || '#120E24'}, ${t.vars['--gold'] || '#E7C77B'})` }} />
                {t.name}{bloqueado ? ' 🔒' : ''}
              </button>
            );
          })}
        </div>
      </section>
      <section className="card">
        <p className="eyebrow">Your focus</p>
        <div className="focus-grid">
          {FOCUSES.map((f) => <button key={f.id} className={`chip ${profile.focus === f.id ? 'on' : ''}`} onClick={() => actualizar((p) => ({ ...p, profile: { ...p.profile, focus: f.id, updatedAt: new Date().toISOString() } }))}><span>{f.emoji}</span>{f.name}</button>)}
        </div>
      </section>
      <section className="card">
        <p className="eyebrow">Compatibility (just for fun)</p>
        <label className="campo">{sign?.name} &amp;
          <select value={otro} onChange={(e) => setOtro(e.target.value)}>{SIGNS.map((s) => <option key={s.id} value={s.id}>{s.glyph} {s.name}</option>)}</select>
        </label>
        {compat && (
          <>
            <p className="score">{compat.score}%</p><p>{compat.note}</p>
            {tienePlus ? <CompatFondo a={sign} b={otroSigno} /> : <button className="link" style={{ margin: '4px 0 6px' }} onClick={abrirPlus}>See the deep compatibility (Plus) →</button>}
            <button className="btn ghost" onClick={() => compartirTarjeta(historiaCompat(sign, otroSigno, compat))}>Send to them ↗</button>
          </>
        )}
      </section>
      <section className="card">
        <p className="eyebrow">About Astra</p>
        <p className="muted small">Astra offers readings and rituals for entertainment and self-reflection. It doesn't predict the future and isn't a substitute for medical, financial or mental-health advice. If you're struggling, please reach out to someone you trust or call or text 988 (US).</p>
        <button className="link danger" onClick={() => { if (window.confirm('Delete your profile, journal and rituals from this device?')) { localStorage.removeItem(CLAVE); window.location.reload(); } }}>Delete my data</button>
      </section>
    </>
  );
}

/* ============================= PLUS ============================= */

function TiradaTres({ profile }) {
  const tirada = threeCardSpread(profile);
  return (
    <section className="card tirada">
      <p className="eyebrow">Your 3-card spread · Plus</p>
      <div className="tres">
        {tirada.map(({ posicion, carta }) => (
          <div key={posicion} className="tres-carta"><small>{posicion}</small><span>{carta.emoji}</span><b>{carta.name}</b></div>
        ))}
      </div>
      {tirada.map(({ posicion, pregunta, carta }) => <p key={posicion}><b>{posicion}</b> — <span className="muted">{pregunta}.</span> {carta.message}</p>)}
    </section>
  );
}

function Semana({ profile }) {
  const w = weeklyForecast(profile);
  return (
    <section className="card">
      <p className="eyebrow">Your week ahead · Plus</p>
      <p className="big">{w.tema}</p>
      <div className="grid3 sin-margen">
        {w.mejores.map(([emoji, que, dia]) => <div key={que} className="mini"><span>{emoji} {que}</span><b>{dia.slice(0, 3)}</b></div>)}
      </div>
      <p style={{ marginTop: 12 }}>{w.consejo}</p>
      {w.signo && <p className="muted">{w.signo}</p>}
    </section>
  );
}

function TemaMes({ profile }) {
  const m = monthlyTheme(profile);
  return (
    <section className="card reading">
      <p className="eyebrow">{new Date().toLocaleDateString('en-US', { month: 'long' })} theme · Plus</p>
      <h2>{m.nombre}</h2>
      <p style={{ marginTop: 8 }}>{m.texto}</p>
      {m.lunas.map((l) => <p key={l.date} className="muted small">{l.emoji} {l.name} · {fechaCorta(l.date)} — {l.type === 'new' ? 'set your intentions' : 'release what is heavy'}</p>)}
    </section>
  );
}

function CompatFondo({ a, b }) {
  const d = deepCompatibility(a, b);
  if (!d) return null;
  return (
    <div className="revisar">
      <p><b>Strengths</b> — {d.fortalezas}</p>
      <p><b>Friction</b> — {d.friccion}</p>
      <p><b>How to love well</b> — {d.consejo}</p>
    </div>
  );
}

/* ============================= STORY CARDS ============================= */

const hoyLargo = () => new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
const historiaAfirmacion = (r) => ({ arriba: `${r.sign?.glyph || '✦'}  ${(r.sign?.name || '').toUpperCase()}  ·  ${r.moon.emoji} ${r.moon.name.toUpperCase()}`, centro: `“${r.affirmation}”`, abajo: hoyLargo(), archivo: 'astra-affirmation.png' });
const historiaCarta = (c) => ({ arriba: `MY CARD TODAY · ${c.keyword.toUpperCase()}`, grande: c.emoji, titulo: c.name, centro: c.message, abajo: hoyLargo(), archivo: 'astra-card.png' });
const historiaCompat = (a, b, x) => ({ arriba: `${a.glyph} ${a.name.toUpperCase()}  +  ${b.glyph} ${b.name.toUpperCase()}`, grande: `${x.score}%`, centro: x.note, abajo: 'What does Astra say about us?', archivo: 'astra-match.png' });

// 1080×1920 para historias de Instagram/TikTok.
async function compartirTarjeta(h) {
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
  g.fillStyle = '#E7C77B'; g.font = '600 42px Inter, sans-serif';
  g.fillText(h.arriba, 540, 400);
  let y = 960;
  if (h.grande) {
    g.fillStyle = '#FFFFFF'; g.font = h.grande.endsWith('%') ? '600 220px "Cormorant Garamond", Georgia, serif' : '200px serif';
    g.fillText(h.grande, 540, 700);
    if (h.titulo) { g.fillStyle = '#E7C77B'; g.font = '600 76px "Cormorant Garamond", Georgia, serif'; g.fillText(h.titulo, 540, 830); }
    y = 1080;
  }
  g.fillStyle = '#FFFFFF'; g.font = `italic 600 ${h.grande ? 64 : 84}px "Cormorant Garamond", Georgia, serif`;
  const alto = h.grande ? 82 : 104;
  const palabras = h.centro.split(' ');
  const lineas = []; let linea = '';
  for (const p of palabras) { const prueba = linea ? `${linea} ${p}` : p; if (g.measureText(prueba).width > 860) { lineas.push(linea); linea = p; } else linea = prueba; }
  lineas.push(linea);
  const y0 = y - ((lineas.length - 1) * alto) / 2;
  lineas.forEach((l, i) => g.fillText(l, 540, y0 + i * alto));
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = '500 40px Inter, sans-serif';
  g.fillText(h.abajo, 540, 1520);
  g.fillStyle = '#E7C77B'; g.font = '600 58px "Cormorant Garamond", Georgia, serif';
  g.fillText('✦ Astra', 540, 1720);
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
  const archivo = new File([blob], h.archivo, { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [archivo] })) { await navigator.share({ files: [archivo], title: 'Astra' }); return; }
  } catch { return; /* cancelled */ }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = archivo.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
