import { useState, useEffect } from 'react';
import { T, fontTitle, fontBody, fontMono } from '../tokens.js';
import { getAllUsers, updateUserRole, upsertUser, deleteUser } from '../utils/db.js';
import { getCurrentISOYear, getWeeksInYear, weekToMonday, formatWeekRangeLong } from '../utils/isoWeek.js';
import { KEYS, saveCalendar, removeCalendar } from '../utils/storage.js';
import UploadSlot from '../components/UploadSlot.jsx';

// ── Sezione Utenti (solo super_admin) ─────────────────────────────────────
function UsersSection({ userEmail }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole]   = useState('user');
  const [showAdd, setShowAdd]   = useState(false);

  function reload() {
    setLoading(true);
    getAllUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => { reload(); }, []);

  async function handleRoleChange(email, role) {
    if (role === 'super_admin') {
      if (!confirm(`Promuovere ${email} a Super Admin? Avrà accesso completo a tutte le impostazioni.`)) return;
    }
    await updateUserRole(email, role);
    reload();
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!addEmail.trim()) return;
    await upsertUser(addEmail.trim().toLowerCase(), addRole, userEmail);
    setAddEmail(''); setAddRole('user'); setShowAdd(false);
    reload();
  }

  async function handleDelete(email) {
    if (!confirm(`Rimuovere ${email} dall'accesso allo strumento?`)) return;
    await deleteUser(email);
    reload();
  }

  if (loading) return <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted }}>Caricamento utenti…</p>;

  return (
    <div>
      {/* Tabella utenti */}
      <div style={{ border: `1px solid ${T.line}`, borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: T.bg }}>
              {['Email', 'Ruolo', 'Creato il', 'Ultimo accesso', ''].map(h => (
                <th key={h} style={{
                  fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: T.muted, padding: '10px 14px', textAlign: 'left',
                  borderBottom: `1px solid ${T.line}`,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.email} style={{ borderBottom: `1px solid ${T.line}` }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <td style={{ fontFamily: fontMono, fontSize: 11, color: T.ink, padding: '10px 14px' }}>{u.email}</td>
                <td style={{ padding: '10px 14px' }}>
                  <select
                    value={u.role}
                    disabled={u.email === userEmail}
                    onChange={e => handleRoleChange(u.email, e.target.value)}
                    style={{
                      fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: u.role === 'super_admin' ? T.gold : u.role === 'editor' ? T.ink : T.muted,
                      background: T.surface, border: `1px solid ${T.line}`, borderRadius: 2,
                      padding: '3px 8px', cursor: u.email === userEmail ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <option value="user">User</option>
                    <option value="editor">Editor</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </td>
                <td style={{ fontFamily: fontBody, fontSize: 11, color: T.muted, padding: '10px 14px' }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('it-IT') : '–'}
                </td>
                <td style={{ fontFamily: fontBody, fontSize: 11, color: T.muted, padding: '10px 14px' }}>
                  {u.last_login ? new Date(u.last_login).toLocaleDateString('it-IT', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : 'mai'}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {u.email !== userEmail && (
                    <button onClick={() => handleDelete(u.email)} style={{
                      fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: T.alert, background: 'transparent', border: `1px solid ${T.alert}`,
                      borderRadius: 2, padding: '3px 10px', cursor: 'pointer',
                    }}>Rimuovi</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Aggiungi utente */}
      {!showAdd ? (
        <button onClick={() => setShowAdd(true)} style={{
          fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: T.ink, background: T.surface, border: `1px solid ${T.line}`,
          borderRadius: 2, padding: '7px 16px', cursor: 'pointer',
        }}>+ Aggiungi utente</button>
      ) : (
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="email" required value={addEmail} onChange={e => setAddEmail(e.target.value)}
            placeholder="email@goldengoose.com"
            style={{
              fontFamily: fontBody, fontSize: 13, color: T.ink,
              border: `1px solid ${T.line}`, borderRadius: 2, padding: '8px 12px',
              background: T.surface, outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = T.gold}
            onBlur={e => e.target.style.borderColor = T.line}
          />
          <select value={addRole} onChange={e => setAddRole(e.target.value)} style={{
            fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
            background: T.surface, border: `1px solid ${T.line}`, borderRadius: 2,
            padding: '8px 12px', color: T.ink, cursor: 'pointer',
          }}>
            <option value="user">User</option>
            <option value="editor">Editor</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <button type="submit" style={{
            fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
            background: T.ink, color: '#fff', border: 'none', borderRadius: 2,
            padding: '8px 16px', cursor: 'pointer', fontWeight: 700,
          }}>Salva</button>
          <button type="button" onClick={() => setShowAdd(false)} style={{
            fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: T.muted, background: 'transparent', border: `1px solid ${T.line}`,
            borderRadius: 2, padding: '8px 16px', cursor: 'pointer',
          }}>Annulla</button>
        </form>
      )}
    </div>
  );
}

// ── Sezione Calendari (upload) ─────────────────────────────────────────────
function CalendariSection({ calendars, onCalendarChange, onPlanReady, plan }) {
  function save(key, filename, activities) {
    saveCalendar(key, { filename, uploadedAt: new Date().toISOString(), activities, rowCount: activities.length });
    onCalendarChange();
  }
  function handleSave(key)    { return ({ filename, activities }) => save(key, filename, activities); }
  function handleSaveBoth({ filename, commercial, brand }) {
    save(KEYS.curCom, filename, commercial);
    save(KEYS.curBra, filename, brand);
  }
  function handleRemove(key)  { removeCalendar(key); onCalendarChange(); }

  return (
    <div>
      <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: '0 0 20px', lineHeight: 1.6 }}>
        Questi file vengono usati come riferimento dati fino al passaggio definitivo alla gestione integrata nello strumento.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <UploadSlot label="Calendario Commerciale" accent="ink" storageKey={KEYS.curCom}
          data={calendars.curCom} onSave={handleSave(KEYS.curCom)}
          onSaveBoth={handleSaveBoth} onPlanReady={onPlanReady} onRemove={() => handleRemove(KEYS.curCom)} />
        <UploadSlot label="Calendario Brand" accent="gold" storageKey={KEYS.curBra}
          data={calendars.curBra} onSave={handleSave(KEYS.curBra)}
          onSaveBoth={handleSaveBoth} onRemove={() => handleRemove(KEYS.curBra)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <UploadSlot label="Commerciale anno prec." accent="ink" storageKey={KEYS.preCom} isPrev
          data={calendars.preCom} onSave={handleSave(KEYS.preCom)} onRemove={() => handleRemove(KEYS.preCom)} />
        <UploadSlot label="Brand anno prec." accent="gold" storageKey={KEYS.preBra} isPrev
          data={calendars.preBra} onSave={handleSave(KEYS.preBra)} onRemove={() => handleRemove(KEYS.preBra)} />
      </div>
    </div>
  );
}

// ── Sezione Condividi ─────────────────────────────────────────────────────
function CondividiSection() {
  const appUrl = window.location.origin + window.location.pathname;
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(appUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const waMsg = encodeURIComponent(`Ti condivido l'accesso al Digital Team Assistant di Golden Goose: ${appUrl}`);
  const mailSubject = encodeURIComponent('Digital Team Assistant – Golden Goose');
  const mailBody = encodeURIComponent(`Ciao,\n\nti condivido il link al Digital Team Assistant del team digital di Golden Goose:\n\n${appUrl}\n\nAccedi con la tua email @goldengoose.com.`);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appUrl)}`;

  return (
    <div>
      {/* URL */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20 }}>
        <code style={{
          fontFamily: fontMono, fontSize: 12, color: T.ink, background: T.bg,
          border: `1px solid ${T.line}`, borderRadius: 2, padding: '8px 12px', flex: 1,
        }}>{appUrl}</code>
        <button onClick={handleCopy} style={{
          fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          background: copied ? T.green : T.ink, color: '#fff', border: 'none', borderRadius: 2,
          padding: '8px 16px', cursor: 'pointer', transition: 'background 0.2s',
        }}>{copied ? '✓ Copiato' : 'Copia'}</button>
      </div>

      {/* Pulsanti share */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        <a href={`https://wa.me/?text=${waMsg}`} target="_blank" rel="noopener noreferrer" style={{
          fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          background: '#25D366', color: '#fff', border: 'none', borderRadius: 2,
          padding: '8px 16px', textDecoration: 'none', display: 'inline-block',
        }}>WhatsApp</a>
        <a href={`mailto:?subject=${mailSubject}&body=${mailBody}`} style={{
          fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          background: T.surface, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 2,
          padding: '8px 16px', textDecoration: 'none', display: 'inline-block',
        }}>Email</a>
      </div>

      {/* QR code */}
      <div>
        <p style={{ fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, margin: '0 0 10px' }}>
          QR Code
        </p>
        <img src={qrSrc} alt="QR Code" width={160} height={160}
          style={{ border: `1px solid ${T.line}`, borderRadius: 4, display: 'block', marginBottom: 8 }} />
        <a href={qrSrc} download="DTA_QR.png" style={{
          fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: T.muted, textDecoration: 'underline', fontSize: 11,
        }}>Scarica QR</a>
      </div>
    </div>
  );
}

// ── Sezione Nuovo Anno ────────────────────────────────────────────────────
function NuovoAnnoSection({ availableYears, onCreatePlan }) {
  const currentYear = getCurrentISOYear();
  const [year, setYear] = useState(currentYear + 1);
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (availableYears.includes(year)) {
      if (!confirm(`Il piano ${year} esiste già. Sovrascrivere?`)) return;
    }
    setCreating(true);
    const weeks = [];
    const totalWeeks = getWeeksInYear(year);
    for (let w = 1; w <= totalWeeks; w++) {
      weeks.push({
        week: w, year,
        date: weekToMonday(year, w).toISOString(),
        quarter: '', month: '',
        weekdays: formatWeekRangeLong(year, w),
        commercial: '', brandPush: '',
        performance: { ecomLY: null, ecomBudget: null, ecomDeltaBdg: null, ecomActual: null, ecomDeltaAct: null, rtlLY: null, rtlBudget: null },
        context: { lastYear: '', weekTopic: '' },
        brand: { mainCampaign: '', commercial: '', opportunity: '', corporate: '', regional: '' },
        marketing: {
          tuesday:   { ww: '', note: '', skuCode: '', image: '' },
          wednesday: { topic: '', eu: '', us: '', kr: '' },
          thursday:  { topic: '', eu: '', us: '', kr: '' },
          friday:    { topic: '', eu: '', us: '', kr: '', appTopic: '', productCode: '', appImage: '' },
          saturday:  { topic: '', skuCode: '', note: '' },
        },
        strategyLinks: [],
      });
    }
    const newPlan = { year, filename: `Nuovo calendario ${year}`, description: desc, weeks, createdAt: new Date().toISOString() };
    await onCreatePlan(year, newPlan);
    setCreating(false);
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  }

  return (
    <div>
      <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: '0 0 20px', lineHeight: 1.6 }}>
        Genera un nuovo piano annuale vuoto. Le settimane vengono create automaticamente (ISO 8601).
        {availableYears.length > 0 && ` Anni esistenti: ${availableYears.join(', ')}.`}
      </p>
      <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 400 }}>
        <div>
          <label style={{ fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, display: 'block', marginBottom: 6 }}>
            Anno
          </label>
          <input type="number" required min={currentYear} max={currentYear + 10}
            value={year} onChange={e => setYear(parseInt(e.target.value))}
            style={{
              fontFamily: fontBody, fontSize: 14, color: T.ink,
              border: `1px solid ${T.line}`, borderRadius: 2, padding: '9px 12px',
              background: T.surface, outline: 'none', width: 120,
            }}
            onFocus={e => e.target.style.borderColor = T.gold}
            onBlur={e => e.target.style.borderColor = T.line}
          />
        </div>
        <div>
          <label style={{ fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, display: 'block', marginBottom: 6 }}>
            Descrizione (opzionale)
          </label>
          <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
            placeholder={`Piano editoriale ${year}`}
            style={{
              fontFamily: fontBody, fontSize: 13, color: T.ink,
              border: `1px solid ${T.line}`, borderRadius: 2, padding: '9px 12px',
              background: T.surface, outline: 'none', width: '100%',
            }}
            onFocus={e => e.target.style.borderColor = T.gold}
            onBlur={e => e.target.style.borderColor = T.line}
          />
        </div>
        <div>
          <button type="submit" disabled={creating} style={{
            fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
            background: done ? T.green : T.ink, color: '#fff', border: 'none', borderRadius: 2,
            padding: '10px 24px', cursor: creating ? 'wait' : 'pointer', fontWeight: 700,
            opacity: creating ? 0.7 : 1, transition: 'background 0.2s',
          }}>
            {creating ? 'Creazione in corso…' : done ? '✓ Creato!' : `Crea piano ${year}`}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Sezione generica con titolo ───────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{
        fontFamily: fontTitle, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: T.ink, margin: '0 0 6px', paddingBottom: 10,
        borderBottom: `1px solid ${T.line}`,
      }}>{title}</h2>
      <div style={{ paddingTop: 20 }}>{children}</div>
    </div>
  );
}

// ── View principale ───────────────────────────────────────────────────────
export default function SettingsView({
  userEmail, isEditor, isSuperAdmin,
  calendars, onCalendarChange, onPlanReady, plan,
  availableYears, onCreatePlan,
}) {
  if (!isSuperAdmin && !isEditor) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>🔒</div>
        <p style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>
          Accesso riservato agli editor
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 80px' }}>
      <h1 style={{ fontFamily: fontTitle, fontSize: 22, letterSpacing: '0.06em', color: T.ink, margin: '0 0 40px' }}>
        Settings
      </h1>

      {isSuperAdmin && (
        <Section title="Utenti">
          <UsersSection userEmail={userEmail} />
        </Section>
      )}

      <Section title="Calendari">
        <CalendariSection
          calendars={calendars}
          onCalendarChange={onCalendarChange}
          onPlanReady={onPlanReady}
          plan={plan}
        />
      </Section>

      <Section title="Condividi">
        <CondividiSection />
      </Section>

      <Section title="Nuovo Anno">
        <NuovoAnnoSection availableYears={availableYears} onCreatePlan={onCreatePlan} />
      </Section>
    </div>
  );
}
