import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { T, fontTitle, fontBody, fontMono } from '../tokens.js';
import { getISOWeek, getISOYear, getWeekRange, formatWeekRange } from '../utils/isoWeek.js';
import Pill from '../components/Pill.jsx';
import ActivityModal from '../components/ActivityModal.jsx';

const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

function groupByWeek(activities) {
  const map = {};
  for (const a of activities) {
    const key = `${getISOYear(a.date)}-${a.week}`;
    if (!map[key]) map[key] = { week: a.week, year: getISOYear(a.date), commercial: [], brand: [] };
    if (a.source === 'commercial') map[key].commercial.push(a);
    else map[key].brand.push(a);
  }
  return Object.values(map).sort((a, b) => a.year !== b.year ? a.year - b.year : a.week - b.week);
}

export default function CalendarView({ calendars }) {
  const [modal, setModal]           = useState(null);
  const [filterConc, setFilterConc] = useState(false);
  const [filterSrc, setFilterSrc]   = useState('all'); // 'all'|'commercial'|'brand'
  const today = new Date();

  const all = useMemo(() => {
    const acts = [];
    if (calendars.curCom) acts.push(...calendars.curCom.activities.filter(a => filterSrc !== 'brand'));
    if (calendars.curBra) acts.push(...calendars.curBra.activities.filter(a => filterSrc !== 'commercial'));
    return acts;
  }, [calendars, filterSrc]);

  // Group by month → weeks
  const byMonth = useMemo(() => {
    const months = {};
    for (const a of all) {
      const key = `${a.year}-${a.month}`;
      if (!months[key]) months[key] = { year: a.year, month: a.month, activities: [] };
      months[key].activities.push(a);
    }
    return Object.values(months).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
  }, [all]);

  if (!calendars.curCom && !calendars.curBra) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontFamily: fontTitle, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>
          Nessun calendario caricato
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'Tutti' },
          { id: 'commercial', label: 'Commerciale' },
          { id: 'brand', label: 'Brand' },
        ].map(opt => (
          <button key={opt.id} onClick={() => setFilterSrc(opt.id)} style={{
            padding: '5px 14px', borderRadius: 0,
            background: filterSrc === opt.id ? T.ink : T.surface,
            color: filterSrc === opt.id ? '#fff' : T.muted,
            border: `1px solid ${filterSrc === opt.id ? T.ink : T.line}`, cursor: 'pointer',
            fontFamily: fontTitle, fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>{opt.label}</button>
        ))}
        <button onClick={() => setFilterConc(v => !v)} style={{
          padding: '5px 14px', borderRadius: 0,
          background: filterConc ? T.goldBg : T.surface,
          color: filterConc ? T.goldDark : T.muted,
          border: `1px solid ${filterConc ? T.gold : T.line}`, cursor: 'pointer',
          fontFamily: fontTitle, fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <AlertTriangle size={11} /> Solo concomitanze
        </button>
      </div>

      {byMonth.map(({ year, month, activities }) => {
        const weeks = groupByWeek(activities);
        const filtered = filterConc ? weeks.filter(w => w.commercial.length > 0 && w.brand.length > 0) : weeks;
        if (!filtered.length) return null;

        return (
          <div key={`${year}-${month}`} style={{ marginBottom: 56, position: 'relative' }}>
            {/* Ghost month name */}
            <div style={{
              position: 'absolute', top: -10, left: -8,
              fontFamily: "'Arial Narrow', Arial, sans-serif",
              fontSize: 'clamp(60px, 10vw, 100px)',
              fontWeight: 900, color: T.ink,
              opacity: 0.04, lineHeight: 1,
              textTransform: 'uppercase', pointerEvents: 'none',
              userSelect: 'none', letterSpacing: '-0.02em',
            }}>
              {MONTHS_IT[month]}
            </div>

            {/* Month header */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14, position: 'relative' }}>
              <h2 style={{ fontFamily: fontTitle, fontSize: 16, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.ink, margin: 0, fontWeight: 700 }}>
                {MONTHS_IT[month]} {year}
              </h2>
              <span style={{ fontFamily: fontMono, fontSize: 11, color: T.muted }}>
                {activities.length} attività
              </span>
            </div>

            {/* Week grid */}
            <div style={{ border: `1px solid ${T.line}`, borderRadius: 0, overflow: 'hidden' }}>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '48px 148px 1fr 1fr 96px', background: T.bg, height: 34, borderBottom: `1px solid ${T.line}` }}>
                {['W', 'Periodo', 'Commerciale', 'Brand', 'Status'].map(h => (
                  <div key={h} style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.20em', textTransform: 'uppercase', color: T.lineS, fontWeight: 500 }}>
                    {h}
                  </div>
                ))}
              </div>

              {filtered.map((w, idx) => {
                const isCurrentWeek = getISOWeek(today) === w.week && getISOYear(today) === w.year;
                const hasConc = w.commercial.length > 0 && w.brand.length > 0;
                const range = formatWeekRange(w.year, w.week);
                const baseBg = hasConc ? 'rgba(192,152,80,0.04)' : T.surface;

                return (
                  <div key={`${w.year}-${w.week}`} style={{
                    display: 'grid', gridTemplateColumns: '48px 148px 1fr 1fr 96px',
                    minHeight: 52,
                    borderBottom: `1px solid ${T.line}`,
                    background: isCurrentWeek ? T.goldBg : baseBg,
                    borderLeft: hasConc ? `3px solid ${T.gold}` : (isCurrentWeek ? `3px solid ${T.gold}` : '3px solid transparent'),
                    position: 'relative',
                    transition: 'background 150ms',
                  }}
                    onMouseEnter={e => { if (!isCurrentWeek && !hasConc) e.currentTarget.style.background = T.bg; }}
                    onMouseLeave={e => { if (!isCurrentWeek && !hasConc) e.currentTarget.style.background = baseBg; }}
                  >
                    {/* Watermark week number */}
                    <div style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      fontFamily: fontTitle, fontSize: 72, fontWeight: 700,
                      color: hasConc ? 'rgba(192,152,80,0.08)' : 'rgba(17,17,16,0.03)',
                      lineHeight: 1, userSelect: 'none', pointerEvents: 'none',
                    }}>{w.week}</div>

                    {/* Week number */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontFamily: fontMono, fontSize: 10, color: hasConc ? T.gold : T.lineS }}>
                      W{w.week}
                    </div>

                    {/* Date range */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontFamily: fontMono, fontSize: 11, color: T.ink2 }}>
                      {range}
                    </div>

                    {/* Commercial */}
                    <div style={{ padding: '8px 10px', display: 'flex', flexWrap: 'wrap', alignContent: 'center', alignItems: 'center' }}>
                      {w.commercial.map(a => <Pill key={a.id} activity={a} onClick={setModal} />)}
                    </div>

                    {/* Brand */}
                    <div style={{ padding: '8px 10px', display: 'flex', flexWrap: 'wrap', alignContent: 'center', alignItems: 'center' }}>
                      {w.brand.map(a => <Pill key={a.id} activity={a} onClick={setModal} />)}
                    </div>

                    {/* Status */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', position: 'relative' }}>
                      {hasConc && (
                        <span style={{
                          fontFamily: fontTitle, fontSize: 9, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
                          color: T.gold, background: 'rgba(192,152,80,0.15)', padding: '3px 7px',
                        }}>Conflitto</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <ActivityModal activity={modal} onClose={() => setModal(null)} />
    </div>
  );
}
