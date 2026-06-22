import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { T, fontTitle, fontBody, fontMono } from '../tokens.js';
import EditableField from '../components/EditableField.jsx';

const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                   'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

function fmtEuro(n) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n) {
  if (n === null || n === undefined) return '—';
  return (n >= 0 ? '+' : '') + (n * 100).toFixed(1) + '%';
}
function weekDate(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

// ────────────────────────────────────────────────────────────
//  Section components
// ────────────────────────────────────────────────────────────

function SectionHeader({ label, color }) {
  return (
    <div style={{
      fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.14em',
      textTransform: 'uppercase', color: color || T.muted,
      padding: '10px 16px 4px', borderTop: `1px solid ${T.line}`,
    }}>{label}</div>
  );
}

function Row({ label, children, indent = false }) {
  return (
    <div style={{ display: 'flex', gap: 0, padding: '1px 16px', alignItems: 'flex-start' }}>
      <div style={{
        minWidth: 140, fontFamily: fontBody, fontSize: 11,
        color: T.muted, paddingTop: 5, flexShrink: 0,
        paddingLeft: indent ? 12 : 0,
      }}>{label}</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function KpiRow({ label, value, delta, positive }) {
  const sign = delta !== null && delta !== undefined;
  const up   = delta >= 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 16px' }}>
      <span style={{ fontFamily: fontBody, fontSize: 11, color: T.muted, minWidth: 140 }}>{label}</span>
      <span style={{ fontFamily: fontMono, fontSize: 12, color: T.ink }}>{fmtEuro(value)}</span>
      {sign && (
        <span style={{
          fontFamily: fontMono, fontSize: 10,
          color: (positive ? up : !up) ? T.green : T.alert,
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          {up ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
          {fmtPct(delta)}
        </span>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  Main view
// ────────────────────────────────────────────────────────────

export default function PianoView({ plan, onChange }) {
  const [weekIdx, setWeekIdx]     = useState(0);
  const [viewMode, setViewMode]   = useState('detail'); // 'detail' | 'overview'
  const [filterMonth, setFilterMonth] = useState(null);

  const { weeks } = plan;

  const cur = weeks[weekIdx];
  const date = new Date(cur.date);
  const monthName = MONTHS_IT[date.getMonth()];

  // Months that have at least one week
  const months = useMemo(() => {
    const seen = new Set();
    return weeks.reduce((acc, w) => {
      const m = new Date(w.date).getMonth();
      if (!seen.has(m)) { seen.add(m); acc.push({ m, label: MONTHS_IT[m].slice(0,3) }); }
      return acc;
    }, []);
  }, [weeks]);

  function update(path, val) {
    onChange(weekIdx, path, val);
  }

  function setWeekFromDate(d) {
    const idx = weeks.findIndex(w => new Date(w.date).getMonth() === d);
    if (idx >= 0) setWeekIdx(idx);
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 60px' }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Mode toggle */}
        {['detail','overview'].map(m => (
          <button key={m} onClick={() => setViewMode(m)} style={{
            padding: '5px 14px', borderRadius: 2,
            background: viewMode === m ? T.ink : T.surface,
            color: viewMode === m ? '#fff' : T.muted,
            border: `1px solid ${T.line}`, cursor: 'pointer',
            fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>{m === 'detail' ? 'Dettaglio settimana' : 'Panoramica mesi'}</button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {months.map(({ m, label }) => (
            <button key={m} onClick={() => { setWeekFromDate(m); setViewMode('detail'); }} style={{
              padding: '4px 10px', borderRadius: 999,
              background: date.getMonth() === m ? T.gold : T.surface,
              color: date.getMonth() === m ? T.ink : T.muted,
              border: `1px solid ${T.line}`, cursor: 'pointer',
              fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.06em',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {viewMode === 'detail' ? (
        <DetailView cur={cur} weekIdx={weekIdx} weeks={weeks}
          setWeekIdx={setWeekIdx} monthName={monthName} update={update} date={date} />
      ) : (
        <OverviewMode weeks={weeks} onSelect={i => { setWeekIdx(i); setViewMode('detail'); }} />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  Detail view
// ────────────────────────────────────────────────────────────

function DetailView({ cur, weekIdx, weeks, setWeekIdx, monthName, update, date }) {
  const hasPerf = cur.performance.ecomLY !== null || cur.performance.ecomActual !== null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

      {/* ── Left column ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Week header card */}
        <WeekCard color={T.ink}>
          <div style={{ padding: '16px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: fontMono, fontSize: 11, color: T.muted, marginBottom: 4 }}>
                {cur.quarter || ''} · {cur.month || monthName}
              </div>
              <div style={{ fontFamily: fontTitle, fontSize: 28, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1 }}>
                W{cur.week}
              </div>
              <div style={{ fontFamily: fontMono, fontSize: 11, color: T.muted, marginTop: 4 }}>
                {cur.weekdays ? cur.weekdays.replace('-', ' – ') : ''} · {date.getFullYear()}
              </div>
            </div>
            {/* Prev / Next */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setWeekIdx(i => Math.max(0, i-1))} disabled={weekIdx === 0}
                style={navBtn(weekIdx === 0)}><ChevronLeft size={16}/></button>
              <button onClick={() => setWeekIdx(i => Math.min(weeks.length-1, i+1))} disabled={weekIdx === weeks.length-1}
                style={navBtn(weekIdx === weeks.length-1)}><ChevronRight size={16}/></button>
            </div>
          </div>

          {/* Ghost week number */}
          <div style={{
            position: 'absolute', right: 12, bottom: -8,
            fontFamily: fontTitle, fontSize: 80, fontWeight: 900,
            color: T.ink, opacity: 0.04, lineHeight: 1, userSelect: 'none',
          }}>{cur.week}</div>
        </WeekCard>

        {/* Context */}
        <WeekCard>
          <SectionHeader label="Contesto" />
          <Row label="2025 (last year)">
            <div style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, padding: '4px 6px', fontStyle: 'italic' }}>
              {cur.context.lastYear || '—'}
            </div>
          </Row>
          <Row label="Topic 2026">
            <EditableField
              value={cur.context.weekTopic}
              onChange={v => update('context.weekTopic', v)}
              placeholder="Aggiungi topic..."
            />
          </Row>
        </WeekCard>

        {/* Brand Calendar */}
        <WeekCard>
          <SectionHeader label="Brand Calendar" color={T.gold} />
          {[
            { key: 'mainCampaign', label: '① Main Campaign' },
            { key: 'commercial',   label: '② Commercial' },
            { key: 'opportunity',  label: '③ Opportunity' },
            { key: 'corporate',    label: '④ Corporate' },
            { key: 'regional',     label: '⑤ Regional' },
          ].map(({ key, label }) => (
            <Row key={key} label={label}>
              <EditableField
                value={cur.brand[key]}
                onChange={v => update(`brand.${key}`, v)}
                multiline={cur.brand[key] && cur.brand[key].length > 60}
                placeholder="—"
              />
            </Row>
          ))}
        </WeekCard>

        {/* Performance */}
        {hasPerf && (
          <WeekCard>
            <SectionHeader label="Performance eCom" />
            <KpiRow label="LY"     value={cur.performance.ecomLY}     />
            <KpiRow label="Budget" value={cur.performance.ecomBudget} delta={cur.performance.ecomDeltaBdg} positive />
            <KpiRow label="Actual '26" value={cur.performance.ecomActual} delta={cur.performance.ecomDeltaAct} positive />
            <div style={{ height: 8 }} />
          </WeekCard>
        )}
      </div>

      {/* ── Right column ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Tuesday */}
        <WeekCard>
          <SectionHeader label="Martedì — WW Push" />
          <Row label="Topic WW">
            <EditableField value={cur.marketing.tuesday.ww}
              onChange={v => update('marketing.tuesday.ww', v)} multiline />
          </Row>
          <Row label="Note">
            <EditableField value={cur.marketing.tuesday.note}
              onChange={v => update('marketing.tuesday.note', v)} multiline />
          </Row>
          <Row label="SKU Code">
            <EditableField value={cur.marketing.tuesday.skuCode}
              onChange={v => update('marketing.tuesday.skuCode', v)}
              mono multiline placeholder="GWF00000.F000000..." />
          </Row>
          <Row label="Immagine">
            <div style={{ fontFamily: fontMono, fontSize: 11, color: T.muted, padding: '4px 6px' }}>
              {cur.marketing.tuesday.image || '—'}
            </div>
          </Row>
        </WeekCard>

        {/* Wednesday */}
        <WeekCard>
          <SectionHeader label="Mercoledì — Best Performer" />
          <Row label="Topic">
            <EditableField value={cur.marketing.wednesday.topic}
              onChange={v => update('marketing.wednesday.topic', v)} />
          </Row>
          {[['eu','EMEA'],['us','US'],['kr','KR']].map(([k,label]) => (
            <Row key={k} label={label} indent>
              <EditableField value={cur.marketing.wednesday[k]}
                onChange={v => update(`marketing.wednesday.${k}`, v)}
                mono multiline placeholder="GMF00000..." />
            </Row>
          ))}
        </WeekCard>

        {/* Thursday */}
        <WeekCard>
          <SectionHeader label="Giovedì" />
          <Row label="Topic">
            <EditableField value={cur.marketing.thursday.topic}
              onChange={v => update('marketing.thursday.topic', v)} />
          </Row>
          {[['eu','EMEA'],['us','US'],['kr','KR']].map(([k,label]) => (
            <Row key={k} label={label} indent>
              <EditableField value={cur.marketing.thursday[k]}
                onChange={v => update(`marketing.thursday.${k}`, v)} multiline />
            </Row>
          ))}
        </WeekCard>

        {/* Friday */}
        <WeekCard>
          <SectionHeader label="Venerdì — Worst Seller + App" />
          <Row label="Topic WS">
            <EditableField value={cur.marketing.friday.topic}
              onChange={v => update('marketing.friday.topic', v)} />
          </Row>
          {[['eu','EMEA'],['us','US'],['kr','KR']].map(([k,label]) => (
            <Row key={k} label={label} indent>
              <EditableField value={cur.marketing.friday[k]}
                onChange={v => update(`marketing.friday.${k}`, v)}
                mono multiline placeholder="GMF00000..." />
            </Row>
          ))}
          <div style={{ borderTop: `1px dashed ${T.line}`, margin: '6px 16px' }} />
          <Row label="App Exclusive">
            <EditableField value={cur.marketing.friday.appTopic}
              onChange={v => update('marketing.friday.appTopic', v)} />
          </Row>
          <Row label="Product Code" indent>
            <EditableField value={cur.marketing.friday.productCode}
              onChange={v => update('marketing.friday.productCode', v)}
              mono multiline />
          </Row>
        </WeekCard>

        {/* Saturday */}
        <WeekCard>
          <SectionHeader label="Sabato — Newsletter" />
          <Row label="Topic">
            <EditableField value={cur.marketing.saturday.topic}
              onChange={v => update('marketing.saturday.topic', v)} multiline />
          </Row>
          <Row label="SKU">
            <EditableField value={cur.marketing.saturday.skuCode}
              onChange={v => update('marketing.saturday.skuCode', v)}
              mono multiline />
          </Row>
          <Row label="Note">
            <EditableField value={cur.marketing.saturday.note}
              onChange={v => update('marketing.saturday.note', v)} multiline />
          </Row>
        </WeekCard>

      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  Overview mode — compact table of all weeks
// ────────────────────────────────────────────────────────────

function OverviewMode({ weeks, onSelect }) {
  const MONTHS_IT_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  let lastMonth = null;

  return (
    <div style={{ border: `1px solid ${T.line}`, borderRadius: 4, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '60px 100px 1fr 1fr 1fr',
        background: T.ink, padding: '8px 12px',
      }}>
        {['W','Date','Topic 2026','Main Campaign','Commercial'].map(h => (
          <div key={h} style={{ fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>{h}</div>
        ))}
      </div>

      {weeks.map((w, i) => {
        const d = new Date(w.date);
        const m = d.getMonth();
        const monthBreak = m !== lastMonth;
        lastMonth = m;
        const hasData = w.context.weekTopic || w.brand.mainCampaign || w.brand.commercial;
        const today = new Date(); today.setHours(0,0,0,0);
        const isCur = d <= today && new Date(w.date).getTime() + 7*86400000 > today.getTime();

        return (
          <div key={w.week}>
            {monthBreak && (
              <div style={{
                background: T.bg, padding: '6px 12px',
                fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: T.ink, borderTop: `1px solid ${T.line}`,
              }}>
                {MONTHS_IT_SHORT[m]} {w.year}
              </div>
            )}
            <div
              onClick={() => onSelect(i)}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 100px 1fr 1fr 1fr',
                padding: '7px 12px',
                borderTop: `1px solid ${T.line}`,
                cursor: 'pointer',
                background: isCur ? T.goldBg : T.surface,
                borderLeft: isCur ? `3px solid ${T.gold}` : '3px solid transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg}
              onMouseLeave={e => e.currentTarget.style.background = isCur ? T.goldBg : T.surface}
            >
              <span style={{ fontFamily: fontMono, fontSize: 12, color: T.ink, fontWeight: 600 }}>W{w.week}</span>
              <span style={{ fontFamily: fontMono, fontSize: 10, color: T.muted }}>{w.weekdays || ''}</span>
              <Cell text={w.context.weekTopic} />
              <Cell text={w.brand.mainCampaign} gold />
              <Cell text={w.brand.commercial} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Cell({ text, gold }) {
  return (
    <span style={{
      fontFamily: fontBody, fontSize: 11,
      color: text ? (gold ? T.gold : T.ink) : T.muted,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      paddingRight: 8,
    }}>
      {text || '—'}
    </span>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function WeekCard({ children, color }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.line}`,
      borderRadius: 4, position: 'relative', overflow: 'hidden',
      paddingBottom: 8,
    }}>
      {children}
    </div>
  );
}

function navBtn(disabled) {
  return {
    background: disabled ? T.line : T.bg,
    border: `1px solid ${T.line}`, borderRadius: 2,
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: disabled ? T.muted : T.ink,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, padding: 0,
  };
}
