import { useState, useEffect } from 'react';
import { T, fontTitle, fontBody, fontMono } from '../tokens.js';
import { getCurrentISOWeek, getCurrentISOYear, formatWeekRangeLong } from '../utils/isoWeek.js';
import { getAllUsers } from '../utils/db.js';

function QuickCard({ label, icon, href, onClick, disabled }) {
  return (
    <a
      href={disabled ? undefined : href}
      onClick={e => { if (disabled || onClick) { e.preventDefault(); if (onClick) onClick(); } }}
      style={{
        display: 'block', padding: '20px 22px',
        background: T.surface, border: `1px solid ${T.line}`, borderRadius: 4,
        textDecoration: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.borderColor = T.gold; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; }}
    >
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.ink }}>
        {label}
      </div>
    </a>
  );
}

function countUpcoming(calendars, days) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const limit = new Date(today); limit.setDate(limit.getDate() + days);
  let count = 0;
  for (const cal of [calendars.curCom, calendars.curBra]) {
    if (!cal?.activities) continue;
    for (const a of cal.activities) {
      const d = a.date ? new Date(a.date) : null;
      if (d && d >= today && d <= limit) count++;
    }
  }
  return count;
}

export default function DashboardView({ calendars, plan, isSuperAdmin, onNav }) {
  const week = getCurrentISOWeek();
  const year = getCurrentISOYear();
  const range = formatWeekRangeLong(year, week);
  const [users, setUsers] = useState(null);

  useEffect(() => {
    if (!isSuperAdmin) return;
    getAllUsers().then(setUsers).catch(() => {});
  }, [isSuperAdmin]);

  const next14 = countUpcoming(calendars, 14);
  const next7  = countUpcoming(calendars, 7);
  const hasData = !!(calendars.curCom || calendars.curBra);

  const roleCounts = users
    ? { super_admin: 0, editor: 0, user: 0, ...Object.fromEntries(['super_admin','editor','user'].map(r => [r, users.filter(u => u.role === r).length])) }
    : null;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 80px' }}>

      {/* Week header */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted, margin: '0 0 6px' }}>
          Settimana corrente
        </p>
        <h1 style={{ fontFamily: fontTitle, fontSize: 28, letterSpacing: '0.06em', color: T.ink, margin: '0 0 4px' }}>
          W{week} <span style={{ color: T.gold }}>·</span> {year}
        </h1>
        <p style={{ fontFamily: fontBody, fontSize: 14, color: T.muted, margin: 0 }}>{range}</p>
      </div>

      {/* Quick access */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted, margin: '0 0 14px' }}>
          Accesso rapido
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          <QuickCard label="Calendario" icon="📅" href="#/calendar" />
          <QuickCard label={`Piano W${week}`} icon="🗓" href={`#/piano/W${week}`} disabled={!plan} />
          <QuickCard label="Anno su Anno" icon="📊" href="#/yoy" disabled={!hasData} />
          {isSuperAdmin && <QuickCard label="Settings" icon="⚙️" href="#/settings" />}
        </div>
      </div>

      {/* Stats row */}
      {hasData && (
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted, margin: '0 0 14px' }}>
            Attività in arrivo
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Prossimi 7 giorni', value: next7 },
              { label: 'Prossimi 14 giorni', value: next14 },
            ].map(({ label, value }) => (
              <div key={label} style={{
                flex: 1, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 4,
                padding: '16px 20px',
              }}>
                <div style={{ fontFamily: fontTitle, fontSize: 24, color: T.ink, marginBottom: 4 }}>{value}</div>
                <div style={{ fontFamily: fontBody, fontSize: 12, color: T.muted }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Super admin: users */}
      {isSuperAdmin && roleCounts && (
        <div>
          <p style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted, margin: '0 0 14px' }}>
            Utenti registrati
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Super Admin', key: 'super_admin', color: T.gold },
              { label: 'Editor',      key: 'editor',      color: T.ink },
              { label: 'Lettori',     key: 'user',        color: T.muted },
            ].map(({ label, key, color }) => (
              <div key={key} style={{
                flex: 1, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 4,
                padding: '16px 20px',
              }}>
                <div style={{ fontFamily: fontTitle, fontSize: 24, color, marginBottom: 4 }}>
                  {roleCounts[key] ?? 0}
                </div>
                <div style={{ fontFamily: fontBody, fontSize: 12, color: T.muted }}>{label}</div>
              </div>
            ))}
          </div>
          <p style={{
            fontFamily: fontBody, fontSize: 12, color: T.muted, margin: '12px 0 0',
            cursor: 'pointer', textDecoration: 'underline',
          }} onClick={() => onNav('settings')}>
            Gestisci utenti →
          </p>
        </div>
      )}

      {/* No data message */}
      {!hasData && (
        <div style={{
          background: T.surface, border: `1px solid ${T.line}`, borderRadius: 4,
          padding: '32px 24px', textAlign: 'center',
        }}>
          <p style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, margin: '0 0 8px' }}>
            Nessun dato calendario
          </p>
          <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: 0 }}>
            {isSuperAdmin
              ? 'Carica i file MASTER CALENDAR dalla pagina Settings.'
              : 'I dati verranno visualizzati non appena un editor caricherà i file.'}
          </p>
        </div>
      )}
    </div>
  );
}
