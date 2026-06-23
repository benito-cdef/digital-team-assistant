import { useState } from 'react';
import { T, fontTitle, fontBody, fontMono } from '../tokens.js';
import UploadSlot from '../components/UploadSlot.jsx';
import ActivityModal from '../components/ActivityModal.jsx';
import { KEYS, saveCalendar, removeCalendar } from '../utils/storage.js';

function fmt(date) {
  if (!date) return '';
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Sezione upload (solo editor) ──────────────────────────────────────────
function UploadSection({ calendars, onCalendarChange, onPlanReady, plan, onGoToPiano, cloudLoading }) {
  function save(key, filename, activities) {
    saveCalendar(key, { filename, uploadedAt: new Date().toISOString(), activities, rowCount: activities.length });
    onCalendarChange();
  }
  function handleSave(key)    { return ({ filename, activities }) => save(key, filename, activities); }
  function handleSaveBoth({ filename, commercial, brand }) {
    save(KEYS.curCom, filename, commercial);
    save(KEYS.curBra, filename, brand);
  }
  function handleRemove(key)  { removeCalendar(key); onCalendarChange(); }

  const planTs = localStorage.getItem('dta:plan:ts');

  return (
    <div style={{ marginBottom: 48 }}>
      <p style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, margin: '0 0 16px' }}>
        Upload calendario
      </p>

      {/* Piano banner */}
      {plan && (
        <div style={{
          background: T.goldBg, border: `1px solid ${T.gold}`, borderRadius: 4,
          padding: '12px 18px', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <span style={{ fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.gold }}>
              ★ Piano in memoria
            </span>
            <span style={{ fontFamily: fontMono, fontSize: 10, color: T.muted, marginLeft: 12 }}>
              {plan.filename} · {plan.weeks?.length || 0} sett.
              {planTs && ` · salvato il ${new Date(planTs).toLocaleDateString('it-IT', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}`}
            </span>
          </div>
          <button onClick={onGoToPiano} style={{
            background: T.gold, color: T.ink, border: 'none', borderRadius: 2,
            padding: '6px 14px', fontFamily: fontTitle, fontSize: 10,
            letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 700, flexShrink: 0,
          }}>Piano →</button>
        </div>
      )}

      {/* Upload slots 2x2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <UploadSlot label="Calendario Commerciale" accent="ink" storageKey={KEYS.curCom}
          data={calendars.curCom} onSave={handleSave(KEYS.curCom)}
          onSaveBoth={handleSaveBoth} onPlanReady={onPlanReady} onRemove={() => handleRemove(KEYS.curCom)} />
        <UploadSlot label="Calendario Brand" accent="gold" storageKey={KEYS.curBra}
          data={calendars.curBra} onSave={handleSave(KEYS.curBra)}
          onSaveBoth={handleSaveBoth} onRemove={() => handleRemove(KEYS.curBra)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <UploadSlot label="Commerciale anno prec." accent="ink" storageKey={KEYS.preCom} isPrev
          data={calendars.preCom} onSave={handleSave(KEYS.preCom)} onRemove={() => handleRemove(KEYS.preCom)} />
        <UploadSlot label="Brand anno prec." accent="gold" storageKey={KEYS.preBra} isPrev
          data={calendars.preBra} onSave={handleSave(KEYS.preBra)} onRemove={() => handleRemove(KEYS.preBra)} />
      </div>
    </div>
  );
}

// ── Sezione report attività ───────────────────────────────────────────────
function ReportSection({ calendars }) {
  const [modal, setModal] = useState(null);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const all = [
    ...(calendars.curCom?.activities || []),
    ...(calendars.curBra?.activities || []),
  ].sort((a, b) => a.date - b.date);

  const past7  = all.filter(a => { const d = (today - a.date) / 86400000; return d >= 0 && d < 7; });
  const next14 = all.filter(a => { const d = (a.date - today) / 86400000; return d >= 0 && d < 14; });
  const next6w = all.filter(a => { const d = (a.date - today) / 86400000; return d >= 14 && d < 42; });

  if (!all.length) return null;

  const statCards = [
    { label: 'Ultimi 7 giorni',         count: past7.length,  bg: T.ink,     color: '#fff', border: T.ink  },
    { label: 'Live entro 14 giorni',    count: next14.length, bg: T.goldBg,  color: T.gold, border: T.gold },
    { label: 'Da pianificare (6 sett)', count: next6w.length, bg: T.surface, color: T.ink,  border: T.line },
  ];

  const sections = [
    { title: 'Ultimi 7 giorni',                           items: past7.slice().reverse() },
    { title: 'Live entro 14 giorni',                      items: next14 },
    { title: 'Da pianificare — prossime 6 settimane',     items: next6w },
  ];

  return (
    <div>
      <p style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, margin: '0 0 16px' }}>
        Attività in corso
      </p>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 36 }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 4, padding: '18px 16px' }}>
            <div style={{ fontFamily: fontTitle, fontSize: 32, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.count}</div>
            <div style={{ fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: s.color, opacity: 0.7, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Activity lists */}
      {sections.map(sec => sec.items.length > 0 && (
        <div key={sec.title} style={{ marginBottom: 32 }}>
          <h3 style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, margin: '0 0 10px' }}>
            {sec.title}
          </h3>
          <div style={{ border: `1px solid ${T.line}`, borderRadius: 4, overflow: 'hidden' }}>
            {sec.items.map((a, i) => (
              <div key={a.id} onClick={() => setModal(a)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                borderTop: i > 0 ? `1px solid ${T.line}` : 'none',
                background: T.surface, cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg}
              onMouseLeave={e => e.currentTarget.style.background = T.surface}>
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
        </div>
      ))}

      <p style={{ fontFamily: fontMono, fontSize: 10, color: T.muted, marginTop: 8 }}>
        Aggiornato al {fmt(today)}
      </p>

      <ActivityModal activity={modal} onClose={() => setModal(null)} />
    </div>
  );
}

// ── Home View ─────────────────────────────────────────────────────────────
export default function HomeView({ calendars, onCalendarChange, onPlanReady, plan, onGoToPiano, onGo, isEditor, cloudLoading }) {
  const hasCalendar = Object.values(calendars).some(Boolean);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 80px' }}>

      {/* Editor: upload section */}
      {isEditor && (
        <UploadSection
          calendars={calendars}
          onCalendarChange={onCalendarChange}
          onPlanReady={onPlanReady}
          plan={plan}
          onGoToPiano={onGoToPiano}
          cloudLoading={cloudLoading}
        />
      )}

      {/* Reader senza dati: messaggio attesa */}
      {!isEditor && !hasCalendar && (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: T.surface, border: `1px solid ${T.line}`, borderRadius: 4, marginBottom: 40,
        }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>📅</div>
          <p style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, margin: 0 }}>
            {cloudLoading ? 'Caricamento dati in corso…' : 'Nessun calendario caricato dal team ancora'}
          </p>
        </div>
      )}

      {/* Reader con piano disponibile */}
      {!isEditor && plan && !hasCalendar && (
        <div style={{
          background: T.goldBg, border: `1px solid ${T.gold}`, borderRadius: 4,
          padding: '16px 20px', marginBottom: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.gold, margin: '0 0 2px' }}>★ Piano settimanale disponibile</p>
            <p style={{ fontFamily: fontBody, fontSize: 12, color: T.ink2, margin: 0 }}>{plan.filename} · {plan.weeks?.length || 0} settimane</p>
          </div>
          <button onClick={onGoToPiano} style={{
            background: T.gold, color: T.ink, border: 'none', borderRadius: 2,
            padding: '8px 16px', fontFamily: fontTitle, fontSize: 10,
            letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 700,
          }}>Piano →</button>
        </div>
      )}

      {/* Report attività — visibile a tutti se ci sono dati */}
      <ReportSection calendars={calendars} />

      {/* CTA vai al calendario (editor) */}
      {isEditor && hasCalendar && (
        <div style={{
          background: T.green, borderRadius: 4, padding: '16px 22px', marginTop: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', margin: 0 }}>
            Calendario pronto
          </p>
          <button onClick={onGo} style={{
            background: '#fff', color: T.green, border: 'none', borderRadius: 2, padding: '7px 18px',
            fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: 'pointer', fontWeight: 700,
          }}>Vai al calendario →</button>
        </div>
      )}
    </div>
  );
}
