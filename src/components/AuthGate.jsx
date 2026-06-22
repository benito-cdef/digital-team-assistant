import { useState } from 'react';
import { T, fontTitle, fontBody, fontMono } from '../tokens.js';
import { isEditor } from '../config/editors.js';

const ALLOWED_DOMAIN = 'goldengoose.com';
const STORAGE_KEY    = 'dta:auth:email';

function isAllowed(email) {
  return email?.trim().toLowerCase().endsWith('@' + ALLOWED_DOMAIN);
}

export default function AuthGate({ children }) {
  const [email,   setEmail]   = useState('');
  const [blocked, setBlocked] = useState(false);
  const [authed,  setAuthed]  = useState(() => {
    // Ricorda l'email tra i reload
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && isAllowed(saved) ? saved : null;
  });

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (isAllowed(trimmed)) {
      localStorage.setItem(STORAGE_KEY, trimmed);
      setAuthed(trimmed);
    } else {
      setBlocked(true);
    }
  }

  function handleSignOut() {
    localStorage.removeItem(STORAGE_KEY);
    setAuthed(null);
    setEmail('');
    setBlocked(false);
  }

  // ── Autenticato ───────────────────────────────────────────────────────────
  if (authed) {
    const editor = isEditor(authed);
    return (
      <div>
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
          background: T.ink, padding: '5px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12,
        }}>
          {editor && (
            <span style={{ fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.gold }}>
              Editor
            </span>
          )}
          <span style={{ fontFamily: fontMono, fontSize: 10, color: T.muted }}>{authed}</span>
          <button onClick={handleSignOut} style={{
            fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: T.muted, background: 'transparent', border: `1px solid #333`,
            borderRadius: 2, padding: '3px 10px', cursor: 'pointer',
          }}>Esci</button>
        </div>
        {/* Passa isEditor come prop a tutti i children tramite cloneElement */}
        {typeof children === 'function' ? children({ userEmail: authed, isEditor: editor }) : children}
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
          <div style={{ fontSize: 28, color: T.gold, marginBottom: 8 }}>★</div>
          <h1 style={{ fontFamily: fontTitle, fontSize: 16, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.ink, margin: '0 0 6px' }}>
            Digital Team Assistant
          </h1>
          <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: 0 }}>Golden Goose</p>
        </div>

        {/* Card */}
        <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 4, padding: 32 }}>

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
                    border: `1px solid ${T.line}`, borderRadius: 2,
                    fontFamily: fontBody, fontSize: 14, color: T.ink,
                    outline: 'none', boxSizing: 'border-box', background: T.surface,
                  }}
                  onFocus={e => e.target.style.borderColor = T.gold}
                  onBlur={e => e.target.style.borderColor = T.line}
                />
                <button
                  type="submit"
                  disabled={!email}
                  style={{
                    width: '100%', padding: '11px 0',
                    background: T.ink, color: '#fff',
                    border: 'none', borderRadius: 2, cursor: 'pointer',
                    fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
                  Accedi →
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
          Accesso riservato · Golden Goose Digital Team
        </p>
      </div>
    </div>
  );
}
