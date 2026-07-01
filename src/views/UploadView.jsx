import { T, fontTitle, fontBody, fontMono } from '../tokens.js';
import UploadSlot from '../components/UploadSlot.jsx';
import { KEYS, saveCalendar, removeCalendar } from '../utils/storage.js';

export default function UploadView({ calendars, onCalendarChange, onGo, onPlanReady, plan, onGoToPiano, isEditor, cloudLoading }) {
  function save(key, filename, activities) {
    const entry = { filename, uploadedAt: new Date().toISOString(), activities, rowCount: activities.length };
    saveCalendar(key, entry);
    onCalendarChange();
  }
  function handleSave(key) { return ({ filename, activities }) => save(key, filename, activities); }
  function handleSaveBoth({ filename, commercial, brand }) {
    save(KEYS.curCom, filename, commercial);
    save(KEYS.curBra, filename, brand);
  }
  function handleRemove(key) { removeCalendar(key); onCalendarChange(); }

  const hasAny = Object.values(calendars).some(Boolean);
  const planTs = localStorage.getItem('dta:plan:ts');

  // ── Utente in sola lettura ─────────────────────────────────────────────
  if (!isEditor) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        {cloudLoading ? (
          <div style={{ textAlign: 'center', padding: 48, color: T.muted, fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Caricamento dati in corso…
          </div>
        ) : plan ? (
          <div style={{
            background: T.goldBg, border: `1px solid ${T.gold}`,
            borderRadius: 0, padding: '20px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          }}>
            <div>
              <p style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.gold, margin: '0 0 4px' }}>
                ★ Piano settimanale disponibile
              </p>
              <p style={{ fontFamily: fontBody, fontSize: 12, color: T.ink2, margin: 0 }}>
                {plan.filename} · {plan.weeks?.length || 0} settimane
                {planTs && <span style={{ color: T.muted, fontFamily: fontMono, fontSize: 10, marginLeft: 8 }}>
                  aggiornato il {new Date(planTs).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>}
              </p>
            </div>
            <button onClick={onGoToPiano} style={{
              background: T.gold, color: T.ink, border: 'none', borderRadius: 0,
              padding: '8px 18px', fontFamily: fontTitle, fontSize: 11,
              letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 700,
            }}>
              Vai al Piano →
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 48, color: T.muted, fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Nessun calendario caricato. Contatta un editor del team.
          </div>
        )}
      </div>
    );
  }

  // ── Utente editor ──────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

      {/* Piano status banner */}
      {plan && (
        <div style={{
          background: T.goldBg, border: `1px solid ${T.gold}`,
          borderRadius: 0, padding: '14px 20px', marginBottom: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <p style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.gold, margin: '0 0 2px' }}>
              ★ Piano settimanale in memoria
            </p>
            <p style={{ fontFamily: fontBody, fontSize: 12, color: T.ink2, margin: 0 }}>
              {plan.filename} · {plan.weeks?.length || 0} settimane
              {planTs && <span style={{ color: T.muted, fontFamily: fontMono, fontSize: 10, marginLeft: 8 }}>
                salvato il {new Date(planTs).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>}
            </p>
          </div>
          <button onClick={onGoToPiano} style={{
            background: T.gold, color: T.ink, border: 'none', borderRadius: 0,
            padding: '8px 18px', fontFamily: fontTitle, fontSize: 11,
            letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 700, flexShrink: 0,
          }}>
            Vai al Piano →
          </button>
        </div>
      )}

      {/* Anno corrente */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, margin: '0 0 16px' }}>
          Anno corrente
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <UploadSlot label="Calendario Commerciale" accent="ink" storageKey={KEYS.curCom}
            data={calendars.curCom} onSave={handleSave(KEYS.curCom)}
            onSaveBoth={handleSaveBoth} onPlanReady={onPlanReady} onRemove={() => handleRemove(KEYS.curCom)} />
          <UploadSlot label="Calendario Brand" accent="gold" storageKey={KEYS.curBra}
            data={calendars.curBra} onSave={handleSave(KEYS.curBra)}
            onSaveBoth={handleSaveBoth} onRemove={() => handleRemove(KEYS.curBra)} />
        </div>
      </div>

      {/* Anno precedente */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, margin: '0 0 4px' }}>
          Anno precedente
        </p>
        <p style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, margin: '0 0 12px' }}>
          Riferimento YoY — non si sovrascrive automaticamente
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <UploadSlot label="Commerciale precedente" accent="ink" storageKey={KEYS.preCom}
            data={calendars.preCom} onSave={handleSave(KEYS.preCom)} onRemove={() => handleRemove(KEYS.preCom)} isPrev />
          <UploadSlot label="Brand precedente" accent="gold" storageKey={KEYS.preBra}
            data={calendars.preBra} onSave={handleSave(KEYS.preBra)} onRemove={() => handleRemove(KEYS.preBra)} isPrev />
        </div>
      </div>

      {/* CTA */}
      {hasAny && (
        <div style={{
          background: T.green, borderRadius: 0, padding: '18px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ fontFamily: fontTitle, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', margin: 0 }}>
            Calendario pronto
          </p>
          <button onClick={onGo} style={{
            background: '#fff', color: T.green, border: 'none', borderRadius: 0, padding: '8px 20px',
            fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: 'pointer', fontWeight: 700,
          }}>
            Vai al calendario →
          </button>
        </div>
      )}
    </div>
  );
}
