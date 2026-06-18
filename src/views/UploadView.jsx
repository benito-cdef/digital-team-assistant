import { T, fontTitle, fontBody } from '../tokens.js';
import UploadSlot from '../components/UploadSlot.jsx';
import { KEYS, saveCalendar, removeCalendar } from '../utils/storage.js';

export default function UploadView({ calendars, onCalendarChange, onGo }) {
  function save(key, filename, activities) {
    const entry = { filename, uploadedAt: new Date().toISOString(), activities, rowCount: activities.length };
    saveCalendar(key, entry);
    onCalendarChange();
  }

  function handleSave(key) {
    return ({ filename, activities }) => save(key, filename, activities);
  }

  // Called when a single file contains both commercial and brand data
  function handleSaveBoth({ filename, commercial, brand }) {
    save(KEYS.curCom, filename, commercial);
    save(KEYS.curBra, filename, brand);
  }

  function handleRemove(key) {
    removeCalendar(key);
    onCalendarChange();
  }

  const hasAny = Object.values(calendars).some(Boolean);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
      {/* Anno corrente */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, margin: '0 0 16px' }}>
          Anno corrente
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <UploadSlot
            label="Calendario Commerciale"
            accent="ink"
            storageKey={KEYS.curCom}
            data={calendars.curCom}
            onSave={handleSave(KEYS.curCom)}
            onSaveBoth={handleSaveBoth}
            onRemove={() => handleRemove(KEYS.curCom)}
          />
          <UploadSlot
            label="Calendario Brand"
            accent="gold"
            storageKey={KEYS.curBra}
            data={calendars.curBra}
            onSave={handleSave(KEYS.curBra)}
            onSaveBoth={handleSaveBoth}
            onRemove={() => handleRemove(KEYS.curBra)}
          />
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
          <UploadSlot
            label="Commerciale precedente"
            accent="ink"
            storageKey={KEYS.preCom}
            data={calendars.preCom}
            onSave={handleSave(KEYS.preCom)}
            onRemove={() => handleRemove(KEYS.preCom)}
            isPrev
          />
          <UploadSlot
            label="Brand precedente"
            accent="gold"
            storageKey={KEYS.preBra}
            data={calendars.preBra}
            onSave={handleSave(KEYS.preBra)}
            onRemove={() => handleRemove(KEYS.preBra)}
            isPrev
          />
        </div>
      </div>

      {/* CTA Banner */}
      {hasAny && (
        <div style={{
          background: T.green, borderRadius: 4,
          padding: '18px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ fontFamily: fontTitle, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', margin: 0 }}>
            Calendario pronto
          </p>
          <button
            onClick={onGo}
            style={{
              background: '#fff', color: T.green,
              border: 'none', borderRadius: 2, padding: '8px 20px',
              fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.1em',
              textTransform: 'uppercase', cursor: 'pointer', fontWeight: 700,
            }}
          >
            Vai al calendario →
          </button>
        </div>
      )}
    </div>
  );
}
