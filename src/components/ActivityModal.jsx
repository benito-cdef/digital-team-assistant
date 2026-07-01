import { T, fontTitle, fontBody, fontMono } from '../tokens.js';

function fmt(date) {
  if (!date) return '—';
  return date.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ActivityModal({ activity, onClose }) {
  if (!activity) return null;
  const isCommercial = activity.source === 'commercial';

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(14,14,14,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: T.surface, borderRadius: 0,
          padding: 32, maxWidth: 480, width: '100%',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        }}
      >
        {/* Badge source */}
        <div style={{ marginBottom: 16 }}>
          <span style={{
            display: 'inline-block',
            padding: '3px 10px',
            background: isCommercial ? T.ink : T.gold,
            color: isCommercial ? '#fff' : T.ink,
            borderRadius: isCommercial ? 2 : 999,
            fontSize: 11,
            fontFamily: fontTitle,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {isCommercial ? 'Commerciale' : 'Brand'}
          </span>
        </div>

        <h2 style={{ margin: '0 0 8px', fontFamily: fontTitle, fontSize: 20, letterSpacing: '0.04em', color: T.ink }}>
          {activity.tema}
        </h2>

        <p style={{ fontFamily: fontMono, fontSize: 13, color: T.muted, margin: '0 0 16px' }}>
          {fmt(activity.date)} · W{activity.week}
        </p>

        {activity.descrizione && (
          <p style={{ fontFamily: fontBody, fontSize: 14, color: T.ink2, margin: '0 0 12px', lineHeight: 1.5 }}>
            {activity.descrizione}
          </p>
        )}

        {activity.canale && (
          <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: 0 }}>
            Canale: <strong style={{ color: T.ink2 }}>{activity.canale}</strong>
          </p>
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: 24, padding: '8px 20px',
            background: T.ink, color: '#fff',
            border: 'none', borderRadius: 0,
            fontFamily: fontTitle, fontSize: 11,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
