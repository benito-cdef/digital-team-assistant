import { T, fontTitle } from '../tokens.js';

export function CommercialPill({ children }) {
  return (
    <span style={{
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
      background: '#111110', color: '#FAFAF8',
      padding: '3px 8px', borderRadius: 0,
      whiteSpace: 'nowrap', display: 'inline-block',
    }}>{children}</span>
  );
}

export function BrandPill({ children }) {
  return (
    <span style={{
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
      background: '#F7F0E2', color: '#7A5A1A',
      border: '1px solid #C09850',
      padding: '2px 8px', borderRadius: 20,
      whiteSpace: 'nowrap', display: 'inline-block',
    }}>{children}</span>
  );
}

export default function Pill({ activity, onClick }) {
  const isCommercial = activity.source === 'commercial';
  return (
    <button
      onClick={() => onClick(activity)}
      title={activity.tema}
      style={{
        display: 'inline-block',
        padding: isCommercial ? '3px 8px' : '2px 8px',
        margin: '2px 2px 2px 0',
        background: isCommercial ? T.ink : T.goldBg,
        color: isCommercial ? T.surface : T.goldDark,
        border: isCommercial ? 'none' : `1px solid ${T.gold}`,
        borderRadius: isCommercial ? 0 : 20,
        fontSize: 11,
        fontFamily: fontTitle,
        fontWeight: 500,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        maxWidth: 200,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        outline: 'none',
        textAlign: 'left',
      }}
      onFocus={e => { e.target.style.outline = `2px solid ${T.gold}`; }}
      onBlur={e => { e.target.style.outline = 'none'; }}
    >
      {activity.tema}
    </button>
  );
}
