import { useState, useEffect } from 'react';
import { T, fontTitle, fontBody, fontMono } from '../tokens.js';
import { isEditor } from '../config/editors.js';
import { getOrCreateUser } from '../utils/db.js';

const ALLOWED_DOMAIN = 'goldengoose.com';
const STORAGE_KEY    = 'dta:auth:email';

function isAllowed(email) {
  return email?.trim().toLowerCase().endsWith('@' + ALLOWED_DOMAIN);
}

function fallbackRole(email) {
  return isEditor(email) ? 'editor' : 'user';
}

export default function AuthGate({ children }) {
  const [email,   setEmail]   = useState('');
  const [blocked, setBlocked] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [authed,  setAuthed]  = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && isAllowed(saved) ? saved : null;
  });
  const [userRole, setUserRole] = useState('user');

  // Risolve il ruolo dal DB quando c'è un'email autenticata (anche da reload)
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    getOrCreateUser(authed)
      .then(rec => { if (!cancelled) setUserRole(rec?.role || fallbackRole(authed)); })
      .catch(() => { if (!cancelled) setUserRole(fallbackRole(authed)); });
    return () => { cancelled = true; };
  }, [authed]);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!isAllowed(trimmed)) {
      setBlocked(true);
      return;
    }
    setVerifying(true);
    try {
      const rec = await getOrCreateUser(trimmed);
      setUserRole(rec?.role || fallbackRole(trimmed));
    } catch {
      setUserRole(fallbackRole(trimmed));
    }
    localStorage.setItem(STORAGE_KEY, trimmed);
    setVerifying(false);
    setAuthed(trimmed);
  }

  function handleSignOut() {
    localStorage.removeItem(STORAGE_KEY);
    setAuthed(null);
    setEmail('');
    setBlocked(false);
    setUserRole('user');
  }

  // ── Autenticato ───────────────────────────────────────────────────────────
  if (authed) {
    const editor = ['super_admin', 'editor'].includes(userRole);
    const isSuperAdmin = userRole === 'super_admin';
    return (
      <div>
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
          background: T.ink, padding: '5px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12,
        }}>
          {editor && (
            <span style={{ fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.gold }}>
              {isSuperAdmin ? 'Super Admin' : 'Editor'}
            </span>
          )}
          <span style={{ fontFamily: fontMono, fontSize: 10, color: T.muted }}>{authed}</span>
          <button onClick={handleSignOut} style={{
            fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: T.muted, background: 'transparent', border: `1px solid rgba(255,255,255,0.2)`,
            borderRadius: 0, padding: '3px 10px', cursor: 'pointer',
          }}>Esci</button>
        </div>
        {typeof children === 'function'
          ? children({ userEmail: authed, userRole, isEditor: editor, isSuperAdmin })
          : children}
      </div>
    );
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: T.ink }}>
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
              <rect x="1.5" y="1.5" width="45" height="45" stroke="currentColor" strokeWidth="1.5" />
              <rect x="24" y="24" width="21" height="21" fill="#C09850" />
            </svg>
          </div>
          <h1 style={{ fontFamily: fontTitle, fontSize: 16, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.ink, margin: '0 0 6px' }}>
            Digital Team Assistant
          </h1>
          <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: 0 }}>Golden Goose</p>
        </div>

        {/* Card */}
        <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 0, padding: 32 }}>

          {!blocked ? (
            <>
              <p style={{ fontFamily: fontBody, fontSize: 14, color: T.ink2, margin: '0 0 24px', lineHeight: 1.5 }}>
                Inserisci la tua email <strong>@{ALLOWED_DOMAIN}</strong> per accedere.
              </p>
              <form onSubmit={handleSubmit}>
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
                    border: `1px solid ${T.lineM}`, borderRadius: 0,
                    fontFamily: fontMono, fontSize: 14, color: T.ink,
                    outline: 'none', boxSizing: 'border-box', background: T.surface,
                  }}
                  onFocus={e => { e.target.style.borderColor = T.gold; e.target.style.outline = `2px solid rgba(192,152,80,0.25)`; e.target.style.outlineOffset = '0'; }}
                  onBlur={e => { e.target.style.borderColor = T.lineM; e.target.style.outline = 'none'; }}
                />
                <button
                  type="submit"
                  disabled={!email || verifying}
                  style={{
                    width: '100%', padding: '11px 0',
                    background: (!email || verifying) ? T.line : T.ink,
                    color: (!email || verifying) ? T.lineS : '#fff',
                    border: 'none', borderRadius: 0, cursor: verifying ? 'wait' : (!email ? 'not-allowed' : 'pointer'),
                    fontFamily: fontTitle, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase',
                    fontWeight: 600, transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (email && !verifying) { e.currentTarget.style.background = T.n700; e.currentTarget.style.outline = '3px solid rgba(192,152,80,0.3)'; e.currentTarget.style.outlineOffset = '0'; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = (!email || verifying) ? T.line : T.ink; e.currentTarget.style.outline = 'none'; }}
                >
                  {verifying ? 'Verifica accesso…' : 'Accedi →'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>🚫</div>
              <h2 style={{ fontFamily: fontTitle, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.alert, margin: '0 0 12px' }}>
                Accesso non autorizzato
              </h2>
              <p style={{ fontFamily: fontBody, fontSize: 13, color: T.ink2, lineHeight: 1.6, margin: '0 0 20px' }}>
                Questo strumento è riservato al team Golden Goose.<br />
                Usa la tua email <strong>@{ALLOWED_DOMAIN}</strong>.
              </p>
              <button onClick={() => { setBlocked(false); setEmail(''); }} style={{
                fontFamily: fontTitle, fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
                color: T.ink, background: T.surface, border: `1px solid ${T.lineM}`,
                borderRadius: 0, padding: '7px 16px', cursor: 'pointer',
              }}>
                ← Riprova
              </button>
            </div>
          )}
        </div>

        <p style={{ fontFamily: fontBody, fontSize: 11, color: T.muted, textAlign: 'center', marginTop: 20 }}>
          Accesso riservato · Golden Goose Digital Team
        </p>
      </div>
    </div>
  );
}
