import { useState, useRef, useEffect } from 'react';
import { T, fontTitle, fontBody } from '../tokens.js';

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'calendar',  label: 'Calendario' },
  { id: 'piano',     label: 'Piano', planRequired: true },
  { id: 'yoy',       label: 'Anno su Anno' },
  { id: 'report',    label: 'Report' },
];

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
        padding: '5px 12px', borderRadius: 2,
        background: open ? T.gold : 'transparent',
        color: open ? T.ink : '#fff',
        border: `1px solid ${open ? T.gold : '#333'}`,
        cursor: 'pointer', fontFamily: fontTitle, fontSize: 10,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        transition: 'background 0.15s, color 0.15s',
      }}>
        <span style={{ fontSize: 12 }}>📅</span>
        <span>{selectedPlan?.name || '–'}</span>
        <span style={{ fontSize: 8, opacity: 0.7 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 300,
          background: T.surface, border: `1px solid ${T.line}`, borderRadius: 4,
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
                fontFamily: fontBody, fontSize: 13, color: active ? T.gold : T.ink,
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

export default function Header({ view, onView, hasPlan, isSuperAdmin, availablePlans, selectedPlan, onSelectPlan }) {
  const views = NAV;
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: T.ink, color: '#fff',
      display: 'flex', alignItems: 'center', gap: 20,
      padding: '0 24px', height: 56,
    }}>
      {/* Logo + Golden Goose */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ color: T.gold, fontSize: 18, lineHeight: 1 }}>★</span>
        <div>
          <div style={{ fontFamily: fontTitle, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#fff', fontWeight: 700, lineHeight: 1.15 }}>
            Digital Team Assistant
          </div>
          <div style={{ fontFamily: fontTitle, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, lineHeight: 1 }}>
            Golden Goose
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', gap: 2 }}>
        {views.map(v => {
          const disabled = v.planRequired && !hasPlan;
          const active   = view === v.id;
          return (
            <a key={v.id}
              href={disabled ? undefined : `#/${v.id}`}
              onClick={e => { if (disabled) e.preventDefault(); }}
              title={disabled ? 'Carica il MASTER CALENDAR per accedere' : ''}
              style={{
                display: 'inline-block',
                background: active ? T.gold : 'transparent',
                color: active ? T.ink : (disabled ? '#3a3836' : T.muted),
                textDecoration: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                padding: '6px 12px', borderRadius: 2,
                fontFamily: fontTitle, fontSize: 10,
                letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
                opacity: disabled ? 0.35 : 1,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {v.label}
              {v.planRequired && hasPlan && (
                <span style={{ display: 'inline-block', width: 4, height: 4, background: active ? T.ink : T.gold, borderRadius: 999, marginLeft: 4, verticalAlign: 'middle' }} />
              )}
            </a>
          );
        })}
      </nav>

      {/* Right: calendar switcher + gear */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {onSelectPlan && (
          <PlanDropdown availablePlans={availablePlans} selectedPlan={selectedPlan} onSelectPlan={onSelectPlan} />
        )}
        {isSuperAdmin && (
          <button onClick={() => onView('settings')} title="Settings" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 2,
            background: view === 'settings' ? T.gold : 'transparent',
            color: view === 'settings' ? T.ink : T.muted,
            border: `1px solid ${view === 'settings' ? T.gold : '#333'}`,
            cursor: 'pointer', fontSize: 15, transition: 'background 0.15s',
          }}
            onMouseEnter={e => { if (view !== 'settings') { e.currentTarget.style.borderColor = '#666'; e.currentTarget.style.color = '#fff'; } }}
            onMouseLeave={e => { if (view !== 'settings') { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = T.muted; } }}
          >⚙</button>
        )}
      </div>
    </header>
  );
}
