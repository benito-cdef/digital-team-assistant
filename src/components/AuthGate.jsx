import { useState, useEffect } from 'react';
import { supabase, isAllowedEmail, ALLOWED_DOMAIN } from '../supabase.js';
import { T, fontTitle, fontBody, fontMono } from '../tokens.js';
import { isAuthCallback } from '../utils/router.js';

// In sviluppo locale puoi impostare VITE_BYPASS_AUTH=true in .env.local
// .env.local è in .gitignore (*.local) e non va MAI su Vercel/produzione
const BYPASS_AUTH = import.meta.env.VITE_BYPASS_AUTH === 'true';

// ── Wrapper: decide se usare il bypass o l'auth reale ─────────────────────
export default function AuthGate({ children }) {
  if (BYPASS_AUTH) {
    return (
      <div>
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
          background: '#7c3aed', padding: '4px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12,
        }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#e9d5ff' }}>
            🛠 DEV MODE — auth disabilitata (VITE_BYPASS_AUTH=true)
          </span>
        </div>
        {children}
      </div>
    );
  }
  return <AuthGateReal>{children}</AuthGateReal>;
}

// ── Auth reale ────────────────────────────────────────────────────────────
function AuthGateReal({ children }) {
  const [session, setSession]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [email, setEmail]       = useState('');
  const [step, setStep]         = useState('email');   // 'email' | 'sent' | 'blocked'
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    // Se la pagina si è aperta con un hash di callback auth (access_token=…)
    // NON usare getSession() per impostare loading=false — aspettiamo onAuthStateChange.
    // Questo evita che il form di login lampeggi prima che Supabase scambi il token.
    const isCallback = isAuthCallback();

    if (!isCallback) {
      // Sessione normale: leggi subito dalla cache
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
      });
    }
    // Se isCallback=true, restiamo in loading=true finché onAuthStateChange non scatta.
    // Timeout di sicurezza: se dopo 10s non arriva risposta (token scaduto/invalido) mostriamo il form
    let safetyTimer;
    if (isCallback) {
      safetyTimer = setTimeout(() => setLoading(false), 10_000);
    }

    // Listen for auth changes (magic link callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);
      // Dopo che Supabase processa i token, puliamo l'hash brutto dall'URL
      if (event === 'SIGNED_IN' && isCallback) {
        window.history.replaceState(null, '', window.location.pathname + '#/upload');
      }
    });

    return () => {
      subscription.unsubscribe();
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, []);

  async function handleSendLink(e) {
    e.preventDefault();
    setError('');

    const trimmed = email.trim().toLowerCase();
    if (!isAllowedEmail(trimmed)) {
      setStep('blocked');
      return;
    }

    setSending(true);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    });
    setSending(false);

    if (authError) {
      // Supabase free tier: max 3 OTP email/ora
      const msg = authError.message?.toLowerCase() ?? '';
      if (msg.includes('rate limit') || msg.includes('email rate')) {
        setError('Troppe richieste: Supabase limita a 3 email/ora sul piano gratuito. Riprova tra qualche minuto.');
      } else {
        setError(authError.message);
      }
    } else {
      setStep('sent');
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSession(null);
    setStep('email');
    setEmail('');
  }

  // Loading
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted }}>
          Caricamento…
        </span>
      </div>
    );
  }

  // Authenticated — check domain again server-side (belt & suspenders)
  if (session) {
    const userEmail = session.user?.email || '';
    if (!isAllowedEmail(userEmail)) {
      return <AccessDenied email={userEmail} onSignOut={handleSignOut} />;
    }
    return (
      <div>
        {/* Thin auth bar */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
          background: T.ink, padding: '6px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12,
        }}>
          <span style={{ fontFamily: fontMono, fontSize: 10, color: T.muted }}>{userEmail}</span>
          <button onClick={handleSignOut} style={{
            fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: T.muted, background: 'transparent', border: `1px solid #333`,
            borderRadius: 2, padding: '3px 10px', cursor: 'pointer',
          }}>Esci</button>
        </div>
        {children}
      </div>
    );
  }

  // Login screen
  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 28, color: T.gold, marginBottom: 8 }}>★</div>
          <h1 style={{ fontFamily: fontTitle, fontSize: 16, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.ink, margin: '0 0 6px' }}>
            Digital Team Assistant
          </h1>
          <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: 0 }}>Golden Goose</p>
        </div>

        {/* Card */}
        <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 4, padding: 32 }}>

          {step === 'email' && (
            <>
              <p style={{ fontFamily: fontBody, fontSize: 14, color: T.ink2, margin: '0 0 24px', lineHeight: 1.5 }}>
                Inserisci la tua email <strong>@{ALLOWED_DOMAIN}</strong> per ricevere il link di accesso.
              </p>
              <form onSubmit={handleSendLink}>
                <label style={{ fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, display: 'block', marginBottom: 6 }}>
                  Email aziendale
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={`nome@${ALLOWED_DOMAIN}`}
                  required
                  autoFocus
                  style={{
                    width: '100%', padding: '10px 12px', marginBottom: 16,
                    border: `1px solid ${error ? T.alert : T.line}`, borderRadius: 2,
                    fontFamily: fontBody, fontSize: 14, color: T.ink,
                    outline: 'none', boxSizing: 'border-box',
                    background: T.surface,
                  }}
                  onFocus={e => e.target.style.borderColor = T.gold}
                  onBlur={e => e.target.style.borderColor = T.line}
                />
                {error && (
                  <p style={{ fontFamily: fontBody, fontSize: 12, color: T.alert, margin: '-8px 0 12px' }}>{error}</p>
                )}
                <button
                  type="submit"
                  disabled={sending || !email}
                  style={{
                    width: '100%', padding: '11px 0',
                    background: sending ? T.line : T.ink,
                    color: sending ? T.muted : '#fff',
                    border: 'none', borderRadius: 2, cursor: sending ? 'wait' : 'pointer',
                    fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
                  {sending ? 'Invio in corso…' : 'Invia link di accesso →'}
                </button>
              </form>
            </>
          )}

          {step === 'sent' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>📬</div>
              <h2 style={{ fontFamily: fontTitle, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.ink, margin: '0 0 12px' }}>
                Controlla la tua email
              </h2>
              <p style={{ fontFamily: fontBody, fontSize: 13, color: T.ink2, lineHeight: 1.6, margin: '0 0 20px' }}>
                Abbiamo inviato un link di accesso a<br/>
                <strong style={{ fontFamily: fontMono, color: T.ink }}>{email}</strong>
              </p>
              <p style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, margin: '0 0 20px' }}>
                Clicca il link nell'email per accedere. Il link scade dopo 1 ora.
              </p>
              <button onClick={() => { setStep('email'); setEmail(''); }} style={{
                fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: T.muted, background: 'transparent', border: `1px solid ${T.line}`,
                borderRadius: 2, padding: '7px 16px', cursor: 'pointer',
              }}>
                Usa un'altra email
              </button>
            </div>
          )}

          {step === 'blocked' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>🚫</div>
              <h2 style={{ fontFamily: fontTitle, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.alert, margin: '0 0 12px' }}>
                Accesso non autorizzato
              </h2>
              <p style={{ fontFamily: fontBody, fontSize: 13, color: T.ink2, lineHeight: 1.6, margin: '0 0 20px' }}>
                Questo strumento è riservato al team Golden Goose.<br/>
                Usa la tua email <strong>@{ALLOWED_DOMAIN}</strong>.
              </p>
              <button onClick={() => { setStep('email'); setEmail(''); }} style={{
                fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: T.ink, background: T.surface, border: `1px solid ${T.line}`,
                borderRadius: 2, padding: '7px 16px', cursor: 'pointer',
              }}>
                ← Riprova
              </button>
            </div>
          )}
        </div>

        <p style={{ fontFamily: fontBody, fontSize: 11, color: T.muted, textAlign: 'center', marginTop: 20 }}>
          Nessuna password richiesta · Accesso sicuro via email
        </p>
      </div>
    </div>
  );
}

function AccessDenied({ email, onSignOut }) {
  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: T.surface, border: `1px solid ${T.alert}`, borderRadius: 4, padding: 32, maxWidth: 360, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🚫</div>
        <h2 style={{ fontFamily: fontTitle, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.alert, margin: '0 0 12px' }}>Accesso negato</h2>
        <p style={{ fontFamily: fontBody, fontSize: 13, color: T.ink2, margin: '0 0 20px' }}>
          <strong style={{ fontFamily: fontMono }}>{email}</strong> non appartiene al dominio @goldengoose.com.
        </p>
        <button onClick={onSignOut} style={{
          fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          background: T.ink, color: '#fff', border: 'none', borderRadius: 2, padding: '8px 20px', cursor: 'pointer',
        }}>Esci</button>
      </div>
    </div>
  );
}
