import { T, fontTitle } from '../tokens.js';

const VIEWS = [
  { id: 'upload',   label: 'Upload' },
  { id: 'piano',    label: 'Piano', planRequired: true },
  { id: 'calendar', label: 'Calendario' },
  { id: 'report',   label: 'Report' },
  { id: 'yoy',      label: 'Anno su Anno' },
];

export default function Header({ view, onView, hasPlan }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: T.ink, color: '#fff',
      display: 'flex', alignItems: 'center', gap: 32,
      padding: '0 32px', height: 56,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ color: T.gold, fontSize: 18 }}>★</span>
        <span style={{
          fontFamily: fontTitle, fontSize: 13, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: '#fff', fontWeight: 700,
        }}>
          Digital Team Assistant
        </span>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', gap: 4 }}>
        {VIEWS.map(v => {
          const disabled = v.planRequired && !hasPlan;
          return (
            <a
              key={v.id}
              href={disabled ? undefined : `#/${v.id}`}
              onClick={e => { if (disabled) e.preventDefault(); }}
              title={disabled ? 'Carica il MASTER CALENDAR per accedere' : ''}
              style={{
                display: 'inline-block',
                background: view === v.id ? T.gold : 'transparent',
                color: view === v.id ? T.ink : (disabled ? '#3a3836' : T.muted),
                textDecoration: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                padding: '6px 14px', borderRadius: 2,
                fontFamily: fontTitle, fontSize: 11,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                fontWeight: 700, outline: 'none',
                transition: 'background 0.15s, color 0.15s',
                opacity: disabled ? 0.4 : 1,
              }}
            >
              {v.label}
              {v.planRequired && hasPlan && (
                <span style={{ display: 'inline-block', width: 5, height: 5, background: T.gold, borderRadius: 999, marginLeft: 5, verticalAlign: 'middle' }} />
              )}
            </a>
          );
        })}
      </nav>

      <div style={{ marginLeft: 'auto', fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', color: T.muted, textTransform: 'uppercase' }}>
        Golden Goose
      </div>
    </header>
  );
}
