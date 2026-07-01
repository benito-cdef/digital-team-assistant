import { useState, useMemo } from 'react';
import { T, fontTitle, fontBody, fontMono } from '../tokens.js';
import { getCurrentISOWeek, getCurrentISOYear, getWeekRange, formatWeekRangeLong } from '../utils/isoWeek.js';

// ── Date helpers ────────────────────────────────────────────────────────────
const IT_DAYS   = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
const IT_MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                   'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const IT_MONTHS_SHORT = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];
const DAY_ABBR  = { tuesday:'MAR', wednesday:'MER', thursday:'GIO', friday:'VEN', saturday:'SAB' };

function formatFullDate(d) {
  return `${IT_DAYS[d.getDay()]}, ${d.getDate()} ${IT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatWeekRangeShort(year, week) {
  const r = getWeekRange(year, week);
  const s = r.start, e = r.end;
  return `${s.getDate()} ${IT_MONTHS_SHORT[s.getMonth()]} — ${e.getDate()} ${IT_MONTHS_SHORT[e.getMonth()]} ${e.getFullYear()}`;
}

function fmtEuro(n) {
  if (n === null || n === undefined || n === '') return '—';
  return new Intl.NumberFormat('it-IT', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(n);
}

function fmtPct(delta) {
  if (delta === null || delta === undefined) return '—';
  return (delta >= 0 ? '+' : '') + (delta * 100).toFixed(1) + '%';
}

function deltaColor(delta) {
  if (delta === null || delta === undefined) return T.muted;
  return delta >= 0 ? T.green : T.gold;
}

// ── Marketing activations counter ───────────────────────────────────────────
function countActivations(week) {
  const m = week?.marketing;
  if (!m) return { total:0, ww:0, eu:0, us:0, kr:0, days:[] };
  let ww=0, eu=0, us=0, kr=0;
  const days = [];
  for (const [day, d] of Object.entries(m)) {
    if (!d) continue;
    let hit = false;
    if (d.ww?.trim())       { ww++;  hit = true; }
    if (d.eu?.trim())       { eu++;  hit = true; }
    if (d.us?.trim())       { us++;  hit = true; }
    if (d.kr?.trim())       { kr++;  hit = true; }
    if (d.topic?.trim())    hit = true;
    if (d.appTopic?.trim()) hit = true;
    if (hit && DAY_ABBR[day]) days.push(day);
  }
  return { total: ww + eu + us + kr, ww, eu, us, kr, days };
}

// ── Alert generation ────────────────────────────────────────────────────────
function generateAlerts(plan, calendars, weekNum, planYear) {
  if (!plan?.weeks) return [];
  const alerts = [];
  const today = new Date(); today.setHours(0,0,0,0);
  const d30 = new Date(today); d30.setDate(d30.getDate() + 30);
  const d14 = new Date(today); d14.setDate(d14.getDate() + 14);

  const comActs = calendars?.curCom?.activities || [];
  const braActs = calendars?.curBra?.activities || [];

  for (const week of plan.weeks) {
    const wStart = new Date(week.date); wStart.setHours(0,0,0,0);
    const wEnd   = new Date(wStart); wEnd.setDate(wEnd.getDate() + 6);
    if (wEnd < today) continue;

    if (wStart <= d30) {
      const hasCom = comActs.some(a => { const d = a.date ? new Date(a.date) : null; return d && d >= wStart && d <= wEnd; });
      const hasBra = braActs.some(a => { const d = a.date ? new Date(a.date) : null; return d && d >= wStart && d <= wEnd; })
                     || !!(week.brand?.mainCampaign || week.brand?.commercial);
      if (hasCom && hasBra)
        alerts.push({ type:'warning', text:`W${week.week} — Attività commerciali e brand in concomitanza` });

      const acts = countActivations(week);
      if (acts.total === 0 && !week.marketing?.saturday?.topic?.trim())
        alerts.push({ type:'muted', text:`W${week.week} — Nessuna attivazione marketing pianificata` });
    }

    if (wStart <= d14 && wStart >= today && !week.context?.weekTopic?.trim())
      alerts.push({ type:'muted', text:`W${week.week} — Week topic non definito` });
  }

  return alerts;
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ height = 120 }) {
  return (
    <>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      <div style={{ background:T.surface, border:`1px solid ${T.line}`, height, borderRadius:0, overflow:'hidden', position:'relative' }}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.55) 50%,transparent 100%)', animation:'shimmer 1.5s infinite' }} />
      </div>
    </>
  );
}

// ── Brand pill ────────────────────────────────────────────────────────────────
function BrandPill({ children, small = false }) {
  return (
    <span style={{
      display:'inline-block', background:T.goldBg, color:T.goldDark,
      border:`1px solid ${T.gold}`, borderRadius:20,
      padding: small ? '2px 7px' : '3px 10px',
      fontFamily:fontTitle, fontSize: small ? 9 : 11,
      letterSpacing:'0.06em', textTransform:'uppercase', fontWeight:500, lineHeight:1.4,
    }}>{children}</span>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily:fontTitle, fontSize:10, letterSpacing:'0.20em', textTransform:'uppercase', color:T.muted, marginBottom:10 }}>
      {children}
    </div>
  );
}

// ── Block 1 — Dove siamo adesso ───────────────────────────────────────────────
function Block1({ currentWeek, weekNum, planYear, onNav, loading }) {
  if (loading) return <Skeleton height={160} />;

  if (!currentWeek) return (
    <div style={{ background:T.ink, borderRadius:0, padding:'28px 28px', position:'relative', overflow:'hidden' }}>
      <div style={{ fontFamily:fontBody, fontSize:13, color:'rgba(255,255,255,0.45)', marginBottom:16 }}>
        Nessun piano caricato — carica i dati in Settings per visualizzare questa settimana.
      </div>
      <button onClick={() => onNav('settings')} style={{
        fontFamily:fontTitle, fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase',
        background:T.gold, color:T.ink, border:'none', borderRadius:0, padding:'8px 16px', cursor:'pointer', fontWeight:600,
      }}>Vai a Settings →</button>
    </div>
  );

  const range = formatWeekRangeShort(planYear, weekNum);

  return (
    <div style={{ background:T.ink, borderRadius:0, padding:'28px 28px', position:'relative', overflow:'hidden' }}>
      <div aria-hidden="true" style={{
        position:'absolute', right:-16, top:-24,
        fontFamily:fontTitle, fontSize:160, fontWeight:700,
        color:'rgba(255,255,255,0.025)', lineHeight:1,
        userSelect:'none', pointerEvents:'none', letterSpacing:'-0.04em',
      }}>W{weekNum}</div>

      <div style={{ position:'relative', display:'flex', gap:36, alignItems:'flex-start', flexWrap:'wrap' }}>
        <div style={{ flexShrink:0 }}>
          <div style={{ fontFamily:fontMono, fontSize:40, fontWeight:500, color:T.gold, lineHeight:1 }}>W{weekNum}</div>
          <div style={{ fontFamily:fontMono, fontSize:11, color:'rgba(255,255,255,0.45)', marginTop:5 }}>{range}</div>
        </div>
        <div style={{ flex:1, minWidth:180 }}>
          {currentWeek.context?.weekTopic ? (
            <div style={{ fontFamily:fontTitle, fontSize:20, fontWeight:600, textTransform:'uppercase', color:'#FAFAF8', lineHeight:1.2, marginBottom: currentWeek.brand?.mainCampaign ? 8 : 0 }}>
              {currentWeek.context.weekTopic}
            </div>
          ) : (
            <div style={{ fontFamily:fontBody, fontSize:13, color:'rgba(255,255,255,0.3)', fontStyle:'italic' }}>Week topic non definito</div>
          )}
          {currentWeek.brand?.mainCampaign && (
            <div style={{ fontFamily:fontBody, fontSize:14, fontWeight:300, color:'rgba(255,255,255,0.6)' }}>
              {currentWeek.brand.mainCampaign}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Block 2 — Performance snapshot ───────────────────────────────────────────
function Block2({ currentWeek, previousWeeks, loading }) {
  if (loading) return <Skeleton height={140} />;

  const p = currentWeek?.performance;
  const hasPerf = p && (p.ecomActual !== null && p.ecomActual !== undefined);

  if (!hasPerf) return (
    <div style={{ background:T.surface, border:`1px solid ${T.line}`, borderRadius:0, padding:'20px 24px' }}>
      <div style={{ fontFamily:fontBody, fontSize:12, color:T.muted, fontStyle:'italic' }}>
        Nessun dato di performance disponibile per questa settimana.
      </div>
    </div>
  );

  const kpis = [
    { label:'Actual',      value:fmtEuro(p.ecomActual),  color:T.ink },
    { label:'Budget',      value:fmtEuro(p.ecomBudget),  color:T.lineS },
    { label:'Δ vs Budget', value:fmtPct(p.ecomDeltaBdg), color:deltaColor(p.ecomDeltaBdg) },
  ];
  const trendWeeks = previousWeeks.filter(w => w.performance?.ecomDeltaBdg !== null && w.performance?.ecomDeltaBdg !== undefined).slice(-4);

  return (
    <div style={{ background:T.surface, border:`1px solid ${T.line}`, borderRadius:0, overflow:'hidden' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)' }}>
        {kpis.map(({ label, value, color }, i) => (
          <div key={label} style={{ padding:'20px 20px 16px', borderRight: i < 2 ? `1px solid ${T.line}` : 'none' }}>
            <div style={{ fontFamily:fontMono, fontSize:28, fontWeight:500, color, lineHeight:1 }}>{value}</div>
            <div style={{ fontFamily:fontTitle, fontSize:9, letterSpacing:'0.24em', textTransform:'uppercase', color:T.muted, marginTop:7 }}>{label}</div>
          </div>
        ))}
      </div>
      {trendWeeks.length > 0 && (
        <div style={{ borderTop:`1px solid ${T.line}`, padding:'10px 20px', display:'flex', gap:24, alignItems:'center' }}>
          <div style={{ fontFamily:fontTitle, fontSize:9, letterSpacing:'0.16em', textTransform:'uppercase', color:T.muted }}>Trend</div>
          {trendWeeks.map(w => (
            <div key={w.week} style={{ display:'flex', flexDirection:'column', gap:2 }}>
              <div style={{ fontFamily:fontMono, fontSize:9, color:T.muted }}>W{w.week}</div>
              <div style={{ fontFamily:fontMono, fontSize:10, fontWeight:500, color:deltaColor(w.performance.ecomDeltaBdg) }}>
                {fmtPct(w.performance.ecomDeltaBdg)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Block 3 — Questa settimana in sintesi ─────────────────────────────────────
function Block3({ currentWeek, loading }) {
  if (loading) return <Skeleton height={120} />;
  if (!currentWeek) return null;

  const brand = currentWeek.brand || {};
  const brandItems = [brand.mainCampaign, brand.commercial, brand.opportunity].filter(Boolean);
  const acts = countActivations(currentWeek);
  const dayLabels = acts.days.map(d => DAY_ABBR[d]).filter(Boolean).join(' · ');

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', border:`1px solid ${T.line}`, borderRadius:0, overflow:'hidden' }}>
      <div style={{ padding:'20px 20px', borderRight:`1px solid ${T.line}`, background:T.surface }}>
        <div style={{ fontFamily:fontTitle, fontSize:9, letterSpacing:'0.20em', textTransform:'uppercase', color:T.muted, marginBottom:12 }}>Brand Calendar</div>
        {brandItems.length > 0 ? (
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {brandItems.map((item, i) => <BrandPill key={i}>{item}</BrandPill>)}
          </div>
        ) : (
          <div style={{ fontFamily:fontBody, fontSize:12, color:T.lineM, fontStyle:'italic' }}>Nessuna attività brand questa settimana</div>
        )}
      </div>
      <div style={{ padding:'20px 20px', background:T.surface }}>
        <div style={{ fontFamily:fontTitle, fontSize:9, letterSpacing:'0.20em', textTransform:'uppercase', color:T.muted, marginBottom:12 }}>Marketing Activations</div>
        <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:10 }}>
          <span style={{ fontFamily:fontMono, fontSize:28, fontWeight:500, color:T.ink, lineHeight:1 }}>{acts.total}</span>
          <span style={{ fontFamily:fontTitle, fontSize:9, letterSpacing:'0.16em', textTransform:'uppercase', color:T.muted }}>totale</span>
        </div>
        {acts.total > 0 && (
          <div style={{ display:'flex', gap:14, marginBottom:8, flexWrap:'wrap' }}>
            {[['WW',acts.ww],['EU',acts.eu],['US',acts.us],['KR',acts.kr]].map(([m,c]) =>
              c > 0 ? <div key={m} style={{ fontFamily:fontMono, fontSize:11, color:T.ink2 }}>{m}: {c}</div> : null
            )}
          </div>
        )}
        {dayLabels && (
          <div style={{ fontFamily:fontTitle, fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:T.muted }}>{dayLabels}</div>
        )}
        {acts.total === 0 && (
          <div style={{ fontFamily:fontBody, fontSize:12, color:T.lineM, fontStyle:'italic' }}>Nessuna attivazione pianificata</div>
        )}
      </div>
    </div>
  );
}

// ── Block 4 — Prossime settimane ──────────────────────────────────────────────
function Block4({ nextWeeks, planYear, loading }) {
  if (loading) return <Skeleton height={120} />;
  if (!nextWeeks.length) return null;

  return (
    <div style={{ border:`1px solid ${T.line}`, borderRadius:0, overflow:'hidden' }}>
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${nextWeeks.length}, 1fr)` }}>
        {nextWeeks.map((w, i) => {
          const range = formatWeekRangeLong(planYear, w.week);
          const acts  = countActivations(w);
          return (
            <div key={w.week} style={{ padding:'16px 18px', borderRight: i < nextWeeks.length - 1 ? `1px solid ${T.line}` : 'none', background:T.surface }}>
              <div style={{ fontFamily:fontMono, fontSize:14, fontWeight:500, color:T.gold, marginBottom:2 }}>W{w.week}</div>
              <div style={{ fontFamily:fontMono, fontSize:10, color:T.muted, marginBottom:12 }}>{range}</div>
              <div style={{ fontFamily:fontTitle, fontSize:11, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.06em', color: w.context?.weekTopic ? T.ink : T.lineM, marginBottom:10, lineHeight:1.3 }}>
                {w.context?.weekTopic || '—'}
              </div>
              {w.brand?.mainCampaign ? <BrandPill small>{w.brand.mainCampaign}</BrandPill> : <span style={{ fontFamily:fontBody, fontSize:11, color:T.lineM }}>—</span>}
              <div style={{ fontFamily:fontMono, fontSize:10, color:T.muted, marginTop:10 }}>
                {acts.total > 0 ? `${acts.total} attivazioni` : 'nessuna attivazione'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Block 5 — Alert ────────────────────────────────────────────────────────────
function Block5({ alerts, loading }) {
  const [showAll, setShowAll] = useState(false);
  if (loading) return <Skeleton height={72} />;

  if (alerts.length === 0) return (
    <div style={{ background:T.surface, border:`1px solid ${T.line}`, borderRadius:0, padding:'16px 20px' }}>
      <div style={{ fontFamily:fontBody, fontSize:13, fontWeight:300, color:T.muted, fontStyle:'italic' }}>
        Tutto in ordine per le prossime settimane.
      </div>
    </div>
  );

  const visible = showAll ? alerts : alerts.slice(0, 6);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
      {visible.map((alert, i) => (
        <div key={i} style={{
          background: alert.type === 'warning' ? T.goldBg : T.surface,
          border:`1px solid ${T.line}`,
          borderLeft:`3px solid ${alert.type === 'warning' ? T.gold : T.lineM}`,
          padding:'10px 14px',
        }}>
          <div style={{ fontFamily:fontBody, fontSize:12, fontWeight:300, color: alert.type === 'warning' ? T.goldDark : T.ink2 }}>
            {alert.text}
          </div>
        </div>
      ))}
      {!showAll && alerts.length > 6 && (
        <button onClick={() => setShowAll(true)} style={{
          fontFamily:fontTitle, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase',
          background:'transparent', color:T.muted, border:`1px solid ${T.line}`, borderRadius:0,
          padding:'9px', cursor:'pointer', textAlign:'center', marginTop:2,
        }}>
          Mostra tutti ({alerts.length - 6} altri)
        </button>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardView({ calendars, plan, isSuperAdmin, onNav, cloudLoading, planYear }) {
  const weekNum      = getCurrentISOWeek();
  const resolvedYear = planYear ?? getCurrentISOYear();
  const today        = new Date();

  const { currentWeek, previousWeeks, nextWeeks, alerts } = useMemo(() => {
    if (!plan?.weeks) return { currentWeek:null, previousWeeks:[], nextWeeks:[], alerts:[] };
    const idx  = plan.weeks.findIndex(w => w.week === weekNum);
    const cur  = idx >= 0 ? plan.weeks[idx] : null;
    const prev = idx > 0  ? plan.weeks.slice(Math.max(0, idx - 4), idx) : [];
    const next = idx >= 0 ? plan.weeks.slice(idx + 1, idx + 4) : plan.weeks.slice(0, 3);
    const alts = generateAlerts(plan, calendars, weekNum, resolvedYear);
    return { currentWeek:cur, previousWeeks:prev, nextWeeks:next, alerts:alts };
  }, [plan, calendars, weekNum, resolvedYear]);

  const loading = !!cloudLoading && !plan;

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'40px 24px 80px' }}>

      {/* Page header */}
      <div style={{ marginBottom:36 }}>
        <div style={{ fontFamily:fontTitle, fontSize:9, letterSpacing:'0.28em', textTransform:'uppercase', color:T.gold, marginBottom:4 }}>
          Golden Goose Digital
        </div>
        <h1 style={{ fontFamily:fontTitle, fontSize:28, fontWeight:700, letterSpacing:'0.04em', textTransform:'uppercase', color:T.ink, margin:'0 0 6px' }}>
          Dashboard
        </h1>
        <div style={{ fontFamily:fontMono, fontSize:12, color:T.muted }}>{formatFullDate(today)}</div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

        <section>
          <SectionLabel>Dove siamo adesso</SectionLabel>
          <Block1 currentWeek={currentWeek} weekNum={weekNum} planYear={resolvedYear} onNav={onNav} loading={loading} />
        </section>

        <section>
          <SectionLabel>Performance eCom · W{weekNum}</SectionLabel>
          <Block2 currentWeek={currentWeek} previousWeeks={previousWeeks} loading={loading} />
        </section>

        <section>
          <SectionLabel>Questa settimana in sintesi</SectionLabel>
          <Block3 currentWeek={currentWeek} loading={loading} />
        </section>

        {(loading || nextWeeks.length > 0) && (
          <section>
            <SectionLabel>Prossime {nextWeeks.length || 3} settimane</SectionLabel>
            <Block4 nextWeeks={nextWeeks} planYear={resolvedYear} loading={loading} />
          </section>
        )}

        <section>
          <SectionLabel>Da tenere d'occhio</SectionLabel>
          <Block5 alerts={alerts} loading={loading} />
        </section>

      </div>
    </div>
  );
}
