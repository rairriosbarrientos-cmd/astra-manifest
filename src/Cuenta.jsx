// Cuenta (opcional, para respaldar) y pantalla de Astra Plus. Precios claros y cancelar cuando quieras.
import { useState } from 'react';
import { supabase, irAPagar, irAlPortal, mensajeError } from './nube.js';
import { PLUS } from './plus.js';

export function Modal({ onCerrar, children }) {
  return (
    <div className="modal" onClick={onCerrar} role="dialog" aria-modal="true">
      <div className="modal-card hoja" onClick={(e) => e.stopPropagation()}>
        <button className="cerrar" onClick={onCerrar} aria-label="Close">×</button>
        {children}
      </div>
    </div>
  );
}

export function CuentaModal({ sesion, plus, motivo, modoInicial = 'crear', onCerrar, onPlus }) {
  const [modo, setModo] = useState(modoInicial);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError(null); setAviso(null); setEnviando(true);
    try {
      if (modo === 'olvide') {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
        if (err) throw err;
        setAviso('If that email has an account, we sent you a link to set a new password.');
      } else if (modo === 'entrar') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
        if (err) throw err;
        if (!data.session) setAviso('Check your inbox to confirm your email, then sign in here.');
      }
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  }

  if (sesion) {
    const fecha = plus?.hasta ? new Date(plus.hasta).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null;
    return (
      <Modal onCerrar={onCerrar}>
        <p className="eyebrow">Your account</p>
        <h2 className="hoja-titulo">{sesion.user.email}</h2>
        <p className="muted small">Your readings, journal and rituals are backed up and sync across your devices.</p>
        <div className={`estado-plus ${plus?.plus ? 'on' : ''}`}>
          {plus?.plus
            ? <><b>✦ Astra Plus</b><span>{plus.status === 'trialing' ? 'Free trial' : 'Active'}{fecha ? ` · ${plus.cancelaAlFinal ? 'ends' : 'renews'} ${fecha}` : ''}</span></>
            : <><b>Free plan</b><span>Upgrade anytime for deeper readings.</span></>}
        </div>
        {plus?.plus
          ? <button className="btn ghost" onClick={async () => { try { setError(null); await irAlPortal(sesion); } catch (e) { setError(mensajeError(e)); } }}>Manage or cancel subscription</button>
          : <button className="btn" onClick={onPlus}>See Astra Plus ✦</button>}
        {error && <p className="error">{error}</p>}
        <button className="link" style={{ marginTop: 16 }} onClick={() => supabase.auth.signOut({ scope: 'local' })}>Sign out</button>
      </Modal>
    );
  }

  return (
    <Modal onCerrar={onCerrar}>
      <p className="eyebrow">{motivo === 'plus' ? 'One step before Plus' : 'Keep your progress safe'}</p>
      <h2 className="hoja-titulo">{modo === 'olvide' ? 'Reset your password' : modo === 'entrar' ? 'Welcome back' : 'Create your free account'}</h2>
      <p className="muted small">{motivo === 'plus' ? 'Your subscription is linked to your account, so it works on all your devices.' : 'Back up your cards, journal and streak, and use Astra on any device.'}</p>
      {modo !== 'olvide' && (
        <div className="segmento">
          {[['crear', 'Create account'], ['entrar', 'Sign in']].map(([k, t]) => <button key={k} className={modo === k ? 'on' : ''} onClick={() => { setModo(k); setError(null); setAviso(null); }}>{t}</button>)}
        </div>
      )}
      <form onSubmit={enviar}>
        <label className="campo">Email<input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        {modo !== 'olvide' && <label className="campo">Password<input type="password" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>}
        {error && <p className="error">{error}</p>}
        {aviso && <p className="aviso">{aviso}</p>}
        <button className="btn" disabled={enviando || !email || (modo !== 'olvide' && password.length < 6)}>{enviando ? 'One moment…' : modo === 'olvide' ? 'Send reset link' : modo === 'entrar' ? 'Sign in' : 'Create account'}</button>
      </form>
      {modo === 'entrar' && <button className="link" style={{ marginTop: 14 }} onClick={() => { setModo('olvide'); setError(null); setAviso(null); }}>Forgot your password?</button>}
      {modo === 'olvide' && <button className="link" style={{ marginTop: 14 }} onClick={() => setModo('entrar')}>Back to sign in</button>}
      <p className="fine">Your journal stays private — only you can read it.</p>
    </Modal>
  );
}

export function NuevaContrasena({ onListo }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const guardar = async (e) => {
    e.preventDefault();
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) setError(mensajeError(err)); else onListo();
  };
  return (
    <Modal onCerrar={onListo}>
      <p className="eyebrow">Account</p>
      <h2 className="hoja-titulo">Choose a new password</h2>
      <form onSubmit={guardar}>
        <label className="campo">New password<input type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={password.length < 6}>Save password</button>
      </form>
    </Modal>
  );
}

export function PlusModal({ sesion, plus, onCerrar, onNecesitaCuenta }) {
  const [plan, setPlan] = useState('anual');
  const [error, setError] = useState(null);
  const [yendo, setYendo] = useState(false);
  const elegido = PLUS[plan];
  const empezar = async () => {
    if (!sesion) return onNecesitaCuenta();
    setError(null); setYendo(true);
    try { await irAPagar(sesion, plan); } catch (e) { setError(mensajeError(e)); setYendo(false); }
  };
  return (
    <Modal onCerrar={onCerrar}>
      <div className="plus-sello">✦</div>
      <p className="eyebrow center">Astra Plus</p>
      <h2 className="hoja-titulo center">Go deeper, every day</h2>
      <ul className="beneficios">
        {PLUS.beneficios.map(([emoji, titulo, texto]) => <li key={titulo}><span>{emoji}</span><div><b>{titulo}</b><small>{texto}</small></div></li>)}
      </ul>
      <div className="planes">
        {[PLUS.anual, PLUS.mensual].map((p) => (
          <button key={p.id} className={`plan ${plan === p.id ? 'on' : ''}`} onClick={() => setPlan(p.id)}>
            {p.ahorro && <span className="ahorro">{p.ahorro}</span>}
            <b>{p.precio}</b><small>per {p.periodo}</small>
          </button>
        ))}
      </div>
      <button className="btn" onClick={empezar} disabled={yendo || plus?.plus}>{plus?.plus ? 'You have Astra Plus ✦' : yendo ? 'Opening secure checkout…' : `Start ${PLUS.pruebaDias}-day free trial`}</button>
      {error && <p className="error">{error}</p>}
      <p className="fine">Free for {PLUS.pruebaDias} days, then {elegido.precio}/{elegido.periodo}. Cancel anytime in Me → Account — you won't be charged if you cancel during the trial. Secure payment by Stripe.</p>
    </Modal>
  );
}

// Tarjeta bloqueada para contenido de Plus: muestra qué hay sin ocultar el precio ni presionar.
export function Bloqueado({ eyebrow, titulo, texto, onAbrir }) {
  return (
    <section className="card bloqueado">
      <p className="eyebrow">{eyebrow} · Plus</p>
      <p className="big">{titulo}</p>
      <p className="muted small">{texto}</p>
      <button className="btn ghost" onClick={onAbrir}>Unlock with Astra Plus ✦</button>
    </section>
  );
}
