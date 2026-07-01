import { useState, useRef, useEffect } from 'react';
import { T, fontTitle, fontBody } from '../tokens.js';

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'calendar',  label: 'Calendario' },
  { id: 'piano',     label: 'Piano', planRequired: true },
  { id: 'yoy',       label: 'Anno su Anno' },
  { id: 'report',    label: 'Report' },
];

function LogoMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ display: 'block' }}>
      <rect x="1.5" y="1.5" width="45" height="45" stroke="currentColor" strokeWidth="1.5" />
      <rect x="24" y="24" width="21" height="21" fill="#C09850" />
    </svg>
  );
}

function initialsOf(email) {
  if (!email) return '–';
  const local = email.split('@')[0] || '';
  const parts = local.split(/[.\-_]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

// ── Calendar dropdown ─────────────────────────────────────────────────────
function PlanDropdown({ availablePlans, selectedPlan, onSelectPlan }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!availablePlans || availablePlans.length === 0) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 0,
        background: open ? T.goldBg : 'transparent',
        color: T.ink,
        border: `1px solid ${open ? T.gold : T.line}`,
        cursor: 'pointer', fontFamily: fontTitle, fontSize: 10,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
      }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = T.gold; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = T.line; }}
      >
        <span style={{ fontSize: 12 }}>📅</span>
        <span>{selectedPlan?.name || '–'}</span>
        <span style={{ fontSize: 8, opacity: 0.7 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 300,
          background: T.surface, border: `1px solid ${T.line}`, borderRadius: 0,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 220, overflow: 'hidden',
        }}>
          <div style={{ padding: '7px 12px 5px', fontFamily: fontTitle, fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted, borderBottom: `1px solid ${T.line}` }}>
            Calendari disponibili
          </div>
          {availablePlans.map(plan => {
            const active = selectedPlan?.id === plan.id;
            return (
              <button key={plan.id} onClick={() => { onSelectPlan(plan); setOpen(false); }} style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 14px', background: active ? T.goldBg : 'transparent',
                border: 'none', borderBottom: `1px solid ${T.line}`, cursor: 'pointer',
                fontFamily: fontBody, fontSize: 13, color: active ? T.goldDark : T.ink,
                fontWeight: active ? 700 : 400, transition: 'background 0.1s',
              }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.bg; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <div>{plan.name}</div>
                {plan.description && (
                  <div style={{ fontFamily: fontTitle, fontSize: 9, color: T.muted, marginTop: 1 }}>{plan.description}</div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Header({ view, onView, hasPlan, isSuperAdmin, availablePlans, selectedPlan, onSelectPlan, userEmail }) {
  const views = NAV;
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: T.surface, color: T.ink,
      display: 'flex', alignItems: 'center',
      borderBottom: `1px solid ${T.line}`,
      padding: '0 20px', height: 56,
    }}>
      {/* Logo + Golden Goose */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none', paddingRight: 20, borderRight: `1px solid ${T.line}`, height: '100%' }}>
        <span style={{ color: T.ink, display: 'flex' }}><LogoMark size={26} /></span>
        <div>
          <div style={{ fontFamily: fontTitle, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.ink, fontWeight: 700, lineHeight: 1.15 }}>
            Digital Team Assistant
          </div>
          <div style={{ fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: T.gold, fontWeight: 500, lineHeight: 1 }}>
            Golden Goose
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flex: 1, height: '100%', marginLeft: 8 }}>
        {views.map(v => {
          const disabled = v.planRequired && !hasPlan;
          const active   = view === v.id;
          return (
            <a key={v.id}
              href={disabled ? undefined : `#/${v.id}`}
              onClick={e => { if (disabled) e.preventDefault(); }}
              title={disabled ? 'Carica il MASTER CALENDAR per accedere' : ''}
              style={{
                display: 'flex', alignItems: 'center',
                color: active ? T.ink : (disabled ? T.lineS : T.muted),
                textDecoration: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                padding: '0 14px', height: '100%',
                borderBottom: active ? `2px solid ${T.gold}` : '2px solid transparent',
                marginBottom: active ? -1 : 0,
                fontFamily: fontTitle, fontSize: 11,
                letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
                opacity: disabled ? 0.5 : 1,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.color = T.ink; }}
              onMouseLeave={e => { if (!disabled && !active) e.currentTarget.style.color = T.muted; }}
            >
              {v.label}
              {v.planRequired && hasPlan && (
                <span style={{ display: 'inline-block', width: 4, height: 4, background: T.gold, borderRadius: 999, marginLeft: 4, verticalAlign: 'middle' }} />
              )}
            </a>
          );
        })}
      </nav>

      {/* Right: calendar switcher + gear + avatar */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {onSelectPlan && (
          <PlanDropdown availablePlans={availablePlans} selectedPlan={selectedPlan} onSelectPlan={onSelectPlan} />
        )}
        {isSuperAdmin && (
          <button onClick={() => onView('settings')} title="Settings" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, borderRadius: 0,
            background: view === 'settings' ? T.goldBg : 'transparent',
            color: view === 'settings' ? T.goldDark : T.muted,
            border: `1px solid ${view === 'settings' ? T.gold : T.line}`,
            cursor: 'pointer', fontSize: 15, transition: 'border-color 0.15s, color 0.15s',
          }}
            onMouseEnter={e => { if (view !== 'settings') { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.ink; } }}
            onMouseLeave={e => { if (view !== 'settings') { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.color = T.muted; } }}
          >⚙</button>
        )}
        <div title={userEmail} style={{
          width: 30, height: 30, borderRadius: '50%',
          background: T.ink, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: fontTitle, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
        }}>{initialsOf(userEmail)}</div>
      </div>
    </header>
  );
}
