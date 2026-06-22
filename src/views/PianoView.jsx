import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Pencil, Check, X, Download } from 'lucide-react';
import { T, fontTitle, fontBody, fontMono } from '../tokens.js';
import { exportToExcel } from '../utils/exportCalendar.js';

const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                   'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

function fmtEuro(n) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n) {
  if (n === null || n === undefined) return '—';
  return (n >= 0 ? '+' : '') + (n * 100).toFixed(1) + '%';
}

// ── Editable block wrapper ──────────────────────────────────

function EditBlock({ title, accent, children, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(null);

  function startEdit() {
    // Pass current values into draft via context; children handle it
    setEditing(true);
    setDraft({});
  }

  function cancel() { setEditing(false); setDraft(null); }

  function save() {
    if (onSave && draft) onSave(draft);
    setEditing(false);
    setDraft(null);
  }

  return (
    <div style={{
      background: T.surface, border: `1px solid ${editing ? T.gold : T.line}`,
      borderRadius: 4, overflow: 'hidden', transition: 'border-color 0.15s',
    }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 14px 7px',
        borderBottom: `1px solid ${T.line}`,
        background: editing ? T.goldBg : T.bg,
      }}>
        <span style={{
          fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: accent || T.muted,
        }}>{title}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {editing ? (
            <>
              <ActionBtn icon={<Check size={12}/>} color={T.green} label="Salva" onClick={save} />
              <ActionBtn icon={<X size={12}/>} color={T.muted} label="Annulla" onClick={cancel} />
            </>
          ) : (
            <ActionBtn icon={<Pencil size={11}/>} color={T.muted} label="Modifica" onClick={startEdit} />
          )}
        </div>
      </div>

      {/* Block content — pass editing + draft state via render prop */}
      <div style={{ paddingBottom: 6 }}>
        {children({ editing, draft, setDraft })}
      </div>
    </div>
  );
}

function ActionBtn({ icon, color, label, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '3px 8px', borderRadius: 2,
        border: `1px solid ${hover ? color : T.line}`,
        background: hover ? (color === T.green ? T.greenBg : T.bg) : 'transparent',
        color, cursor: 'pointer',
        fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
        transition: 'border-color 0.1s, background 0.1s',
      }}
    >
      {icon}{label}
    </button>
  );
}

// ── Field display / edit ────────────────────────────────────

function Field({ label, value, fieldKey, editing, draft, setDraft, mono = false, multiline = false, indent = false }) {
  const displayVal = editing && draft && draft[fieldKey] !== undefined ? draft[fieldKey] : value;

  const textStyle = {
    fontFamily: mono ? fontMono : fontBody,
    fontSize: mono ? 11 : 13,
    color: value ? T.ink : T.muted,
    lineHeight: 1.5,
  };

  return (
    <div style={{
      display: 'flex', gap: 0, padding: '4px 14px',
      alignItems: 'flex-start',
    }}>
      <div style={{
        minWidth: 130, fontFamily: fontBody, fontSize: 11,
        color: T.muted, paddingTop: 3, flexShrink: 0,
        paddingLeft: indent ? 14 : 0,
      }}>{label}</div>
      <div style={{ flex: 1 }}>
        {editing ? (
          multiline ? (
            <textarea
              value={displayVal || ''}
              rows={Math.max(2, Math.ceil((displayVal || '').length / 50))}
              onChange={e => setDraft(d => ({ ...d, [fieldKey]: e.target.value }))}
              style={{
                ...textStyle, width: '100%', resize: 'vertical',
                border: `1px solid ${T.gold}`, borderRadius: 2,
                padding: '4px 6px', background: '#FFFDF5',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          ) : (
            <input
              value={displayVal || ''}
              onChange={e => setDraft(d => ({ ...d, [fieldKey]: e.target.value }))}
              style={{
                ...textStyle, width: '100%',
                border: `1px solid ${T.gold}`, borderRadius: 2,
                padding: '4px 6px', background: '#FFFDF5',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          )
        ) : (
          <div style={{ ...textStyle, padding: '3px 6px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {value || <span style={{ opacity: 0.3, fontStyle: 'italic' }}>—</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function ReadField({ label, value, mono = false, indent = false, dim = false }) {
  return (
    <div style={{ display: 'flex', gap: 0, padding: '4px 14px', alignItems: 'flex-start' }}>
      <div style={{ minWidth: 130, fontFamily: fontBody, fontSize: 11, color: T.muted, paddingTop: 3, flexShrink: 0, paddingLeft: indent ? 14 : 0 }}>{label}</div>
      <div style={{
        fontFamily: mono ? fontMono : fontBody, fontSize: mono ? 11 : 13,
        color: dim ? T.muted : (value ? T.ink : T.muted),
        padding: '3px 6px', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        fontStyle: dim ? 'italic' : 'normal',
      }}>
        {value || <span style={{ opacity: 0.3 }}>—</span>}
      </div>
    </div>
  );
}

// ── KPI row ────────────────────────────────────────────────

function KpiRow({ label, value, delta, positive }) {
  const up = delta >= 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 14px' }}>
      <span style={{ fontFamily: fontBody, fontSize: 11, color: T.muted, minWidth: 130 }}>{label}</span>
      <span style={{ fontFamily: fontMono, fontSize: 12, color: T.ink }}>{fmtEuro(value)}</span>
      {delta !== null && delta !== undefined && (
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

// ── Main view ──────────────────────────────────────────────

export default function PianoView({ plan, onChange }) {
  const [weekIdx, setWeekIdx] = useState(0);
  const [viewMode, setViewMode] = useState('detail');

  const { weeks } = plan;
  const cur = weeks[weekIdx];
  const date = new Date(cur.date);

  const months = useMemo(() => {
    const seen = new Set();
    return weeks.reduce((acc, w) => {
      const m = new Date(w.date).getMonth();
      if (!seen.has(m)) { seen.add(m); acc.push({ m, label: MONTHS_SHORT[m] }); }
      return acc;
    }, []);
  }, [weeks]);

  // Build updater that merges draft into the correct nested path
  function handleBlockSave(weekIdx, section, draft) {
    if (!draft || Object.keys(draft).length === 0) return;
    Object.entries(draft).forEach(([key, val]) => {
      onChange(weekIdx, section ? `${section}.${key}` : key, val);
    });
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 60px' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        {['detail','overview'].map(m => (
          <button key={m} onClick={() => setViewMode(m)} style={{
            padding: '5px 14px', borderRadius: 2,
            background: viewMode === m ? T.ink : T.surface,
            color: viewMode === m ? '#fff' : T.muted,
            border: `1px solid ${T.line}`, cursor: 'pointer',
            fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>{m === 'detail' ? 'Dettaglio settimana' : 'Panoramica mesi'}</button>
        ))}

        {/* Export button */}
        <ExportButton plan={plan} />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {months.map(({ m, label }) => (
            <button key={m} onClick={() => {
              const idx = weeks.findIndex(w => new Date(w.date).getMonth() === m);
              if (idx >= 0) { setWeekIdx(idx); setViewMode('detail'); }
            }} style={{
              padding: '4px 10px', borderRadius: 999,
              background: date.getMonth() === m ? T.gold : T.surface,
              color: date.getMonth() === m ? T.ink : T.muted,
              border: `1px solid ${T.line}`, cursor: 'pointer',
              fontFamily: fontTitle, fontSize: 10,
            }}>{label}</button>
          ))}
        </div>
      </div>

      {viewMode === 'detail' ? (
        <DetailView
          cur={cur} weekIdx={weekIdx} weeks={weeks}
          setWeekIdx={setWeekIdx} date={date}
          onBlockSave={(section, draft) => handleBlockSave(weekIdx, section, draft)}
        />
      ) : (
        <OverviewMode weeks={weeks} onSelect={i => { setWeekIdx(i); setViewMode('detail'); }} />
      )}
    </div>
  );
}

// ── Detail view ────────────────────────────────────────────

function DetailView({ cur, weekIdx, weeks, setWeekIdx, date, onBlockSave }) {
  const hasPerf = cur.performance.ecomLY !== null || cur.performance.ecomActual !== null;
  const monthName = MONTHS_IT[date.getMonth()];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

      {/* LEFT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Week header — no ghost overlapping arrows */}
        <div style={{
          background: T.surface, border: `1px solid ${T.line}`, borderRadius: 4,
          padding: '16px 16px 14px', position: 'relative', overflow: 'hidden',
        }}>
          {/* Ghost behind content, left-aligned so arrows stay clear */}
          <div style={{
            position: 'absolute', left: -4, top: -10,
            fontFamily: fontTitle, fontSize: 90, fontWeight: 900,
            color: T.ink, opacity: 0.04, lineHeight: 1,
            userSelect: 'none', pointerEvents: 'none', letterSpacing: '-0.04em',
          }}>W{cur.week}</div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: fontMono, fontSize: 10, color: T.muted, marginBottom: 3 }}>
                {cur.quarter} · {cur.month || monthName}
              </div>
              <div style={{ fontFamily: fontTitle, fontSize: 36, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1 }}>
                W{cur.week}
              </div>
              <div style={{ fontFamily: fontMono, fontSize: 10, color: T.muted, marginTop: 4 }}>
                {cur.weekdays ? cur.weekdays.replace('-', ' – ') : ''} · {date.getFullYear()}
              </div>
            </div>

            {/* Nav arrows — isolated, no z-index fight */}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginTop: 4 }}>
              <NavBtn onClick={() => setWeekIdx(i => Math.max(0, i - 1))} disabled={weekIdx === 0}>
                <ChevronLeft size={15}/>
              </NavBtn>
              <NavBtn onClick={() => setWeekIdx(i => Math.min(weeks.length - 1, i + 1))} disabled={weekIdx === weeks.length - 1}>
                <ChevronRight size={15}/>
              </NavBtn>
            </div>
          </div>
        </div>

        {/* Context block */}
        <EditBlock title="Contesto" onSave={draft => onBlockSave('context', draft)}>
          {({ editing, draft, setDraft }) => (
            <>
              <ReadField label="2025 (last year)" value={cur.context.lastYear} dim />
              <Field label="Topic 2026" value={cur.context.weekTopic} fieldKey="weekTopic"
                editing={editing} draft={draft} setDraft={setDraft} multiline />
            </>
          )}
        </EditBlock>

        {/* Brand Calendar */}
        <EditBlock title="Brand Calendar" accent={T.gold} onSave={draft => onBlockSave('brand', draft)}>
          {({ editing, draft, setDraft }) => (
            <>
              {[
                { key: 'mainCampaign', label: '① Main Campaign' },
                { key: 'commercial',   label: '② Commercial' },
                { key: 'opportunity',  label: '③ Opportunity' },
                { key: 'corporate',    label: '④ Corporate' },
                { key: 'regional',     label: '⑤ Regional' },
              ].map(({ key, label }) => (
                <Field key={key} label={label} value={cur.brand[key]} fieldKey={key}
                  editing={editing} draft={draft} setDraft={setDraft} multiline />
              ))}
            </>
          )}
        </EditBlock>

        {/* Performance — read only */}
        {hasPerf && (
          <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ padding: '9px 14px 7px', borderBottom: `1px solid ${T.line}`, background: T.bg }}>
              <span style={{ fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted }}>Performance eCom</span>
            </div>
            <div style={{ paddingBottom: 6 }}>
              <KpiRow label="LY"         value={cur.performance.ecomLY} />
              <KpiRow label="Budget"     value={cur.performance.ecomBudget} delta={cur.performance.ecomDeltaBdg} positive />
              <KpiRow label="Actual '26" value={cur.performance.ecomActual} delta={cur.performance.ecomDeltaAct} positive />
            </div>
          </div>
        )}
      </div>

      {/* RIGHT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Tuesday */}
        <EditBlock title="Martedì — WW Push" onSave={draft => onBlockSave('marketing.tuesday', draft)}>
          {({ editing, draft, setDraft }) => (
            <>
              <Field label="Topic WW"  value={cur.marketing.tuesday.ww}      fieldKey="ww"      editing={editing} draft={draft} setDraft={setDraft} multiline />
              <Field label="Note"      value={cur.marketing.tuesday.note}    fieldKey="note"    editing={editing} draft={draft} setDraft={setDraft} multiline />
              <Field label="SKU Code"  value={cur.marketing.tuesday.skuCode} fieldKey="skuCode" editing={editing} draft={draft} setDraft={setDraft} mono multiline />
              <ReadField label="Immagine" value={cur.marketing.tuesday.image} mono />
            </>
          )}
        </EditBlock>

        {/* Wednesday */}
        <EditBlock title="Mercoledì — Best Performer" onSave={draft => onBlockSave('marketing.wednesday', draft)}>
          {({ editing, draft, setDraft }) => (
            <>
              <Field label="Topic"  value={cur.marketing.wednesday.topic} fieldKey="topic" editing={editing} draft={draft} setDraft={setDraft} />
              <Field label="EMEA" indent value={cur.marketing.wednesday.eu} fieldKey="eu" editing={editing} draft={draft} setDraft={setDraft} mono multiline />
              <Field label="US"   indent value={cur.marketing.wednesday.us} fieldKey="us" editing={editing} draft={draft} setDraft={setDraft} mono multiline />
              <Field label="KR"   indent value={cur.marketing.wednesday.kr} fieldKey="kr" editing={editing} draft={draft} setDraft={setDraft} mono multiline />
            </>
          )}
        </EditBlock>

        {/* Thursday */}
        <EditBlock title="Giovedì" onSave={draft => onBlockSave('marketing.thursday', draft)}>
          {({ editing, draft, setDraft }) => (
            <>
              <Field label="Topic" value={cur.marketing.thursday.topic} fieldKey="topic" editing={editing} draft={draft} setDraft={setDraft} />
              <Field label="EMEA" indent value={cur.marketing.thursday.eu} fieldKey="eu" editing={editing} draft={draft} setDraft={setDraft} multiline />
              <Field label="US"   indent value={cur.marketing.thursday.us} fieldKey="us" editing={editing} draft={draft} setDraft={setDraft} multiline />
              <Field label="KR"   indent value={cur.marketing.thursday.kr} fieldKey="kr" editing={editing} draft={draft} setDraft={setDraft} multiline />
            </>
          )}
        </EditBlock>

        {/* Friday */}
        <EditBlock title="Venerdì — Worst Seller + App" onSave={draft => onBlockSave('marketing.friday', draft)}>
          {({ editing, draft, setDraft }) => (
            <>
              <Field label="Topic WS" value={cur.marketing.friday.topic} fieldKey="topic" editing={editing} draft={draft} setDraft={setDraft} />
              <Field label="EMEA" indent value={cur.marketing.friday.eu} fieldKey="eu" editing={editing} draft={draft} setDraft={setDraft} mono multiline />
              <Field label="US"   indent value={cur.marketing.friday.us} fieldKey="us" editing={editing} draft={draft} setDraft={setDraft} mono multiline />
              <Field label="KR"   indent value={cur.marketing.friday.kr} fieldKey="kr" editing={editing} draft={draft} setDraft={setDraft} mono multiline />
              <div style={{ borderTop: `1px dashed ${T.line}`, margin: '4px 14px' }} />
              <Field label="App Exclusive" value={cur.marketing.friday.appTopic}    fieldKey="appTopic"    editing={editing} draft={draft} setDraft={setDraft} />
              <Field label="Product Code"  value={cur.marketing.friday.productCode} fieldKey="productCode" editing={editing} draft={draft} setDraft={setDraft} mono multiline indent />
            </>
          )}
        </EditBlock>

        {/* Saturday */}
        <EditBlock title="Sabato — Newsletter" onSave={draft => onBlockSave('marketing.saturday', draft)}>
          {({ editing, draft, setDraft }) => (
            <>
              <Field label="Topic"  value={cur.marketing.saturday.topic}   fieldKey="topic"   editing={editing} draft={draft} setDraft={setDraft} multiline />
              <Field label="SKU"    value={cur.marketing.saturday.skuCode} fieldKey="skuCode" editing={editing} draft={draft} setDraft={setDraft} mono multiline />
              <Field label="Note"   value={cur.marketing.saturday.note}    fieldKey="note"    editing={editing} draft={draft} setDraft={setDraft} multiline />
            </>
          )}
        </EditBlock>

      </div>
    </div>
  );
}

// ── Overview mode ──────────────────────────────────────────

function OverviewMode({ weeks, onSelect }) {
  let lastMonth = null;
  const today = new Date(); today.setHours(0,0,0,0);

  return (
    <div style={{ border: `1px solid ${T.line}`, borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '56px 90px 1fr 1fr 1fr', background: T.ink, padding: '8px 14px' }}>
        {['W','Date','Topic 2026','Main Campaign','Commercial'].map(h => (
          <div key={h} style={{ fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>{h}</div>
        ))}
      </div>

      {weeks.map((w, i) => {
        const d = new Date(w.date);
        const m = d.getMonth();
        const monthBreak = m !== lastMonth;
        lastMonth = m;
        const isCur = d <= today && d.getTime() + 7 * 86400000 > today.getTime();

        return (
          <div key={w.week}>
            {monthBreak && (
              <div style={{
                background: T.bg, padding: '5px 14px',
                fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: T.ink, borderTop: `1px solid ${T.line}`,
              }}>
                {MONTHS_SHORT[m]} {w.year}
              </div>
            )}
            <div
              onClick={() => onSelect(i)}
              style={{
                display: 'grid', gridTemplateColumns: '56px 90px 1fr 1fr 1fr',
                padding: '7px 14px', borderTop: `1px solid ${T.line}`,
                cursor: 'pointer', transition: 'background 0.1s',
                background: isCur ? T.goldBg : T.surface,
                borderLeft: isCur ? `3px solid ${T.gold}` : '3px solid transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg}
              onMouseLeave={e => e.currentTarget.style.background = isCur ? T.goldBg : T.surface}
            >
              <span style={{ fontFamily: fontMono, fontSize: 12, color: T.ink, fontWeight: 600 }}>W{w.week}</span>
              <span style={{ fontFamily: fontMono, fontSize: 10, color: T.muted }}>{w.weekdays || ''}</span>
              <OCell text={w.context.weekTopic} />
              <OCell text={w.brand.mainCampaign} gold />
              <OCell text={w.brand.commercial} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OCell({ text, gold }) {
  return (
    <span style={{
      fontFamily: fontBody, fontSize: 11,
      color: text ? (gold ? T.gold : T.ink) : T.muted,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8,
    }}>
      {text || '—'}
    </span>
  );
}

function NavBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: disabled ? T.line : T.bg,
      border: `1px solid ${T.line}`, borderRadius: 2,
      cursor: disabled ? 'not-allowed' : 'pointer',
      color: disabled ? T.muted : T.ink, padding: 0,
    }}>{children}</button>
  );
}

function ExportButton({ plan }) {
  const [exporting, setExporting] = useState(false);
  const [done, setDone]           = useState('');

  async function handleExport() {
    setExporting(true);
    setDone('');
    try {
      const name = exportToExcel(plan);
      setDone(name);
      setTimeout(() => setDone(''), 4000);
    } catch (e) {
      alert('Errore durante l\'export: ' + e.message);
    }
    setExporting(false);
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 14px', borderRadius: 2,
        background: done ? T.greenBg : T.surface,
        color: done ? T.green : T.ink2,
        border: `1px solid ${done ? T.green : T.line}`,
        cursor: exporting ? 'wait' : 'pointer',
        fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
        transition: 'all 0.2s',
      }}
    >
      <Download size={12} />
      {done ? 'Scaricato ✓' : exporting ? 'Generazione…' : 'Esporta Excel'}
    </button>
  );
}
