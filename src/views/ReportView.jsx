import { useState } from 'react';
import { T, fontTitle, fontBody, fontMono } from '../tokens.js';
import ActivityModal from '../components/ActivityModal.jsx';

function fmt(date) {
  if (!date) return '';
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ReportView({ calendars }) {
  const [modal, setModal] = useState(null);
  const today = new Date(); today.setHours(0,0,0,0);

  const all = [
    ...(calendars.curCom?.activities || []),
    ...(calendars.curBra?.activities || []),
  ].sort((a, b) => a.date - b.date);

  const past7   = all.filter(a => { const d = (today - a.date) / 86400000; return d >= 0 && d < 7; });
  const next14  = all.filter(a => { const d = (a.date - today) / 86400000; return d >= 0 && d < 14; });
  const next6w  = all.filter(a => { const d = (a.date - today) / 86400000; return d >= 14 && d < 42; });

  const statCards = [
    { label: 'Ultimi 7 giorni', count: past7.length, bg: T.ink, color: '#fff', border: T.ink },
    { label: 'Live entro 14 giorni', count: next14.length, bg: T.goldBg, color: T.gold, border: T.gold },
    { label: 'Da pianificare (6 sett.)', count: next6w.length, bg: T.surface, color: T.ink, border: T.line },
  ];

  const sections = [
    { title: 'Ultimi 7 giorni', items: past7.slice().reverse() },
    { title: 'Live entro 14 giorni', items: next14 },
    { title: 'Da pianificare — prossime 6 settimane', items: next6w },
  ];

  if (!all.length) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontFamily: fontTitle, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>
          Nessun calendario caricato
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 40 }}>
        {statCards.map(s => (
          <div key={s.label} style={{
            background: s.bg, border: `1px solid ${s.border}`, borderRadius: 0, padding: '20px 18px',
          }}>
            <div style={{ fontFamily: fontTitle, fontSize: 36, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.count}</div>
            <div style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: s.color, opacity: 0.7, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Sections */}
      {sections.map(sec => (
        <div key={sec.title} style={{ marginBottom: 36 }}>
          <h3 style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, margin: '0 0 10px' }}>
            {sec.title}
          </h3>
          {sec.items.length === 0 ? (
            <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted }}>Nessuna attività</p>
          ) : (
            <div style={{ border: `1px solid ${T.line}`, borderRadius: 0, overflow: 'hidden' }}>
              {sec.items.map((a, i) => (
                <div
                  key={a.id}
                  onClick={() => setModal(a)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    borderTop: i > 0 ? `1px solid ${T.line}` : 'none',
                    background: T.surface, cursor: 'pointer',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg}
                  onMouseLeave={e => e.currentTarget.style.background = T.surface}
                >
                  <span style={{ fontFamily: fontMono, fontSize: 11, color: T.muted, minWidth: 76 }}>{fmt(a.date)}</span>
                  <span style={{
                    display: 'inline-block', width: 8, height: 8, flexShrink: 0,
                    background: a.source === 'commercial' ? T.ink : T.gold,
                    borderRadius: a.source === 'commercial' ? 1 : 999,
                  }} />
                  <span style={{ fontFamily: fontBody, fontSize: 13, color: T.ink, flex: 1 }}>{a.tema}</span>
                  {a.canale && <span style={{ fontFamily: fontBody, fontSize: 11, color: T.muted }}>{a.canale}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <p style={{ fontFamily: fontMono, fontSize: 10, color: T.muted, marginTop: 32 }}>
        Report generato il {fmt(today)}
      </p>

      <ActivityModal activity={modal} onClose={() => setModal(null)} />
    </div>
  );
}
