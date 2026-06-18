import { useState, useMemo } from 'react';
import { T, fontTitle, fontBody, fontMono } from '../tokens.js';
import ActivityModal from '../components/ActivityModal.jsx';

const MONTHS_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

export default function YoYView({ calendars }) {
  const [activeMonth, setActiveMonth] = useState(new Date().getMonth());
  const [modal, setModal] = useState(null);

  const curAll  = [...(calendars.curCom?.activities||[]), ...(calendars.curBra?.activities||[])];
  const prevAll = [...(calendars.preCom?.activities||[]), ...(calendars.preBra?.activities||[])];

  // Get all weeks for the selected month (by ISO week number, mapped to current month)
  const weeksCur  = useMemo(() => groupWeeks(curAll,  activeMonth), [curAll,  activeMonth]);
  const weeksPrev = useMemo(() => groupWeeks(prevAll, activeMonth), [prevAll, activeMonth]);

  const allWeeks = useMemo(() => {
    const ws = new Set([...Object.keys(weeksCur), ...Object.keys(weeksPrev)]);
    return [...ws].sort();
  }, [weeksCur, weeksPrev]);

  if (!curAll.length && !prevAll.length) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontFamily: fontTitle, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>
          Carica i calendari anno corrente e anno precedente per il confronto YoY
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
      {/* Month tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 28 }}>
        {MONTHS_IT.map((m, i) => (
          <button key={i} onClick={() => setActiveMonth(i)} style={{
            padding: '5px 14px', borderRadius: 999,
            background: activeMonth === i ? T.ink : T.surface,
            color: activeMonth === i ? '#fff' : T.muted,
            border: `1px solid ${T.line}`, cursor: 'pointer',
            fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>{m}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ border: `1px solid ${T.line}`, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', background: T.ink }}>
          {['W', 'Anno corrente', 'Anno precedente'].map(h => (
            <div key={h} style={{ padding: '8px 14px', fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff' }}>{h}</div>
          ))}
        </div>

        {allWeeks.length === 0 ? (
          <div style={{ padding: 24, fontFamily: fontBody, fontSize: 13, color: T.muted, textAlign: 'center' }}>
            Nessuna attività in questo mese
          </div>
        ) : allWeeks.map((wk, idx) => {
          const cur  = weeksCur[wk]  || [];
          const prev = weeksPrev[wk] || [];
          const isNew    = cur.length > 0 && prev.length === 0;
          const isMissing = cur.length === 0 && prev.length > 0;

          return (
            <div key={wk} style={{
              display: 'grid', gridTemplateColumns: '80px 1fr 1fr',
              borderTop: idx > 0 ? `1px solid ${T.line}` : 'none',
              background: isNew ? T.greenBg : isMissing ? T.alertBg : T.surface,
            }}>
              <div style={{ padding: '10px 14px', fontFamily: fontMono, fontSize: 12, color: T.ink, fontWeight: 600 }}>
                W{wk}
              </div>
              <div style={{ padding: '8px 10px' }}>
                {isNew && <span style={{ fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.green, background: T.greenBg, border: `1px solid ${T.green}`, borderRadius: 2, padding: '2px 6px', marginBottom: 4, display: 'inline-block' }}>NUOVO</span>}
                {cur.map(a => <ActivityRow key={a.id} a={a} onClick={setModal} />)}
              </div>
              <div style={{ padding: '8px 10px', opacity: isMissing ? 1 : 0.55 }}>
                {isMissing && <span style={{ fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.alert, background: T.alertBg, border: `1px solid ${T.alert}`, borderRadius: 2, padding: '2px 6px', marginBottom: 4, display: 'inline-block' }}>ASSENTE</span>}
                {prev.map(a => <ActivityRow key={a.id} a={a} onClick={setModal} />)}
              </div>
            </div>
          );
        })}
      </div>

      <ActivityModal activity={modal} onClose={() => setModal(null)} />
    </div>
  );
}

function ActivityRow({ a, onClick }) {
  return (
    <div onClick={() => onClick(a)} style={{
      display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer',
      padding: '2px 0', fontFamily: fontBody, fontSize: 12,
    }}>
      <span style={{
        width: 7, height: 7, flexShrink: 0,
        background: a.source === 'commercial' ? T.ink : T.gold,
        borderRadius: a.source === 'commercial' ? 1 : 999,
        display: 'inline-block',
      }} />
      <span style={{ color: T.ink }}>{a.tema}</span>
    </div>
  );
}

function groupWeeks(activities, month) {
  const map = {};
  for (const a of activities) {
    if (a.month !== month) continue;
    const wk = String(a.week).padStart(2, '0');
    if (!map[wk]) map[wk] = [];
    map[wk].push(a);
  }
  return map;
}
