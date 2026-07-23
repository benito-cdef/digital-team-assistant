import { useEffect, useState } from 'react';
import { T, fontTitle, fontBody, fontMono } from '../tokens.js';
import { supabase, ALLOWED_DOMAIN, isAllowedEmail } from '../supabase.js';
import { getCurrentUserProfile } from '../utils/db.js';

function authMessage(error) {
  const message = error?.message || '';
  const lower = message.toLowerCase();
  if (lower.includes('not allowed') || lower.includes('not authorized') || lower.includes('whitelist')) {
    return 'Questa email non è ancora nella whitelist dei tester. Chiedi l’accesso al Digital Team.';
  }
  if (lower.includes('expired') || lower.includes('invalid') || lower.includes('token')) {
    return 'Codice non valido o scaduto. Richiedine uno nuovo.';
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Hai effettuato troppi tentativi. Attendi qualche minuto e riprova.';
  }
  return message || 'Non è stato possibile completare l’accesso. Riprova.';
}

function LoginShell({ children }) {
  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: T.ink }}>
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <rect x="1.5" y="1.5" width="45" height="45" stroke="currentColor" strokeWidth="1.5" />
              <rect x="24" y="24" width="21" height="21" fill="#C09850" />
            </svg>
          </div>
          <h1 style={{ fontFamily: fontTitle, fontSize: 16, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.ink, margin: '0 0 6px' }}>
            Digital Team Assistant
          </h1>
          <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: 0 }}>Golden Goose</p>
        </div>

        <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 0, padding: 32 }}>
          {children}
        </div>

        <p style={{ fontFamily: fontBody, fontSize: 11, color: T.muted, textAlign: 'center', marginTop: 20 }}>
          Accesso riservato ai tester autorizzati · Golden Goose Digital Team
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px', marginBottom: 16,
  border: `1px solid ${T.lineM}`, borderRadius: 0,
  fontFamily: fontMono, fontSize: 14, color: T.ink,
  outline: 'none', boxSizing: 'border-box', background: T.surface,
};

export default function AuthGate({ children }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function refreshIdentity() {
    setLoading(true);
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError && userError.name !== 'AuthSessionMissingError') throw userError;
      if (!data.user) {
        setProfile(null);
        setError('');
        return;
      }

      const currentProfile = await getCurrentUserProfile();
      if (!currentProfile) {
        await supabase.auth.signOut({ scope: 'local' });
        throw new Error('Email non autorizzata o rimossa dalla whitelist.');
      }
      setEmail(data.user.email || currentProfile.email);
      setProfile(currentProfile);
      setError('');
    } catch (identityError) {
      setProfile(null);
      setError(authMessage(identityError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initialCheck = window.setTimeout(() => void refreshIdentity(), 0);
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      // Evita chiamate Supabase asincrone direttamente dentro il callback Auth.
      window.setTimeout(() => void refreshIdentity(), 0);
    });
    return () => {
      window.clearTimeout(initialCheck);
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleEmailSubmit(event) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    setError('');
    setNotice('');
    if (!isAllowedEmail(normalized)) {
      setError(`Usa il tuo indirizzo @${ALLOWED_DOMAIN}.`);
      return;
    }

    setSubmitting(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { shouldCreateUser: true },
    });
    setSubmitting(false);

    if (otpError) {
      setError(authMessage(otpError));
      return;
    }
    setEmail(normalized);
    setOtp('');
    setStep('otp');
    setNotice('Ti abbiamo inviato un codice di 6 cifre. Controlla anche la cartella spam.');
  }

  async function handleOtpSubmit(event) {
    event.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(otp)) {
      setError('Inserisci il codice di 6 cifre ricevuto via email.');
      return;
    }

    setSubmitting(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });
    if (verifyError) {
      setSubmitting(false);
      setError(authMessage(verifyError));
      return;
    }
    await refreshIdentity();
    setSubmitting(false);
  }

  async function handleSignOut() {
    setSubmitting(true);
    await supabase.auth.signOut();
    setProfile(null);
    setEmail('');
    setOtp('');
    setStep('email');
    setError('');
    setNotice('');
    setSubmitting(false);
  }

  if (loading) {
    return (
      <LoginShell>
        <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: 0, textAlign: 'center' }}>
          Verifica della sessione…
        </p>
      </LoginShell>
    );
  }

  if (profile) {
    const editor = ['super_admin', 'editor'].includes(profile.role);
    const isSuperAdmin = profile.role === 'super_admin';
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
          <span style={{ fontFamily: fontMono, fontSize: 10, color: T.muted }}>{profile.email}</span>
          <button onClick={handleSignOut} disabled={submitting} style={{
            fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: T.muted, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 0, padding: '3px 10px', cursor: submitting ? 'wait' : 'pointer',
          }}>Esci</button>
        </div>
        {typeof children === 'function'
          ? children({ userEmail: profile.email, userRole: profile.role, isEditor: editor, isSuperAdmin })
          : children}
      </div>
    );
  }

  return (
    <LoginShell>
      {step === 'email' ? (
        <>
          <p style={{ fontFamily: fontBody, fontSize: 14, color: T.ink2, margin: '0 0 24px', lineHeight: 1.5 }}>
            Inserisci l’email aziendale presente nella whitelist. Riceverai un codice monouso.
          </p>
          <form onSubmit={handleEmailSubmit}>
            <label htmlFor="dta-email" style={{ fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, display: 'block', marginBottom: 6 }}>
              Email aziendale
            </label>
            <input
              id="dta-email" type="email" value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder={`nome@${ALLOWED_DOMAIN}`} required autoFocus autoComplete="email"
              style={inputStyle}
            />
            {error && <p role="alert" style={{ fontFamily: fontBody, fontSize: 12, color: T.alert, lineHeight: 1.5, margin: '0 0 14px' }}>{error}</p>}
            <button type="submit" disabled={!email || submitting} style={{
              width: '100%', padding: '11px 0',
              background: (!email || submitting) ? T.line : T.ink,
              color: (!email || submitting) ? T.lineS : '#fff', border: 'none', borderRadius: 0,
              cursor: submitting ? 'wait' : (!email ? 'not-allowed' : 'pointer'),
              fontFamily: fontTitle, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600,
            }}>{submitting ? 'Invio codice…' : 'Invia codice →'}</button>
          </form>
        </>
      ) : (
        <>
          <p style={{ fontFamily: fontBody, fontSize: 14, color: T.ink2, margin: '0 0 8px', lineHeight: 1.5 }}>
            Inserisci il codice inviato a:
          </p>
          <p style={{ fontFamily: fontMono, fontSize: 12, color: T.ink, margin: '0 0 20px' }}>{email}</p>
          {notice && <p style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, lineHeight: 1.5, margin: '0 0 16px' }}>{notice}</p>}
          <form onSubmit={handleOtpSubmit}>
            <label htmlFor="dta-otp" style={{ fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, display: 'block', marginBottom: 6 }}>
              Codice di accesso
            </label>
            <input
              id="dta-otp" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
              value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000" required autoFocus autoComplete="one-time-code"
              style={{ ...inputStyle, textAlign: 'center', fontSize: 22, letterSpacing: '0.3em' }}
            />
            {error && <p role="alert" style={{ fontFamily: fontBody, fontSize: 12, color: T.alert, lineHeight: 1.5, margin: '0 0 14px' }}>{error}</p>}
            <button type="submit" disabled={otp.length !== 6 || submitting} style={{
              width: '100%', padding: '11px 0',
              background: (otp.length !== 6 || submitting) ? T.line : T.ink,
              color: (otp.length !== 6 || submitting) ? T.lineS : '#fff', border: 'none', borderRadius: 0,
              cursor: submitting ? 'wait' : (otp.length !== 6 ? 'not-allowed' : 'pointer'),
              fontFamily: fontTitle, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600,
            }}>{submitting ? 'Verifica…' : 'Accedi →'}</button>
          </form>
          <button onClick={() => { setStep('email'); setOtp(''); setError(''); setNotice(''); }} style={{
            width: '100%', marginTop: 10, padding: '8px 0', background: 'transparent', color: T.muted,
            border: 'none', cursor: 'pointer', fontFamily: fontTitle, fontSize: 10,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>← Cambia email o richiedi un nuovo codice</button>
        </>
      )}
    </LoginShell>
  );
}
