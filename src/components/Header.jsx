import { T, fontTitle } from '../tokens.js';

const VIEWS = [
  { id: 'upload',   label: 'Upload' },
  { id: 'calendar', label: 'Calendario' },
  { id: 'report',   label: 'Report' },
  { id: 'yoy',      label: 'Anno su Anno' },
];

export default function Header({ view, onView }) {
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
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => onView(v.id)}
            style={{
              background: view === v.id ? T.gold : 'transparent',
              color: view === v.id ? T.ink : T.muted,
              border: 'none', cursor: 'pointer',
              padding: '6px 14px', borderRadius: 2,
              fontFamily: fontTitle, fontSize: 11,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              fontWeight: 700,
              outline: 'none',
              transition: 'background 0.15s, color 0.15s',
            }}
            onFocus={e => { e.target.style.outline = `2px solid ${T.gold}`; }}
            onBlur={e => { e.target.style.outline = 'none'; }}
          >
            {v.label}
          </button>
        ))}
      </nav>

      <div style={{ marginLeft: 'auto', fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', color: T.muted, textTransform: 'uppercase' }}>
        Golden Goose
      </div>
    </header>
  );
}
