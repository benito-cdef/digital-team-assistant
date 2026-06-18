import { T, fontBody } from '../tokens.js';

export default function Pill({ activity, onClick }) {
  const isCommercial = activity.source === 'commercial';
  return (
    <button
      onClick={() => onClick(activity)}
      title={activity.tema}
      style={{
        display: 'inline-block',
        padding: '3px 8px',
        margin: '2px 2px 2px 0',
        background: isCommercial ? T.ink : T.gold,
        color: isCommercial ? '#fff' : T.ink,
        borderRadius: isCommercial ? 2 : 999,
        fontSize: 11,
        fontFamily: fontBody,
        fontWeight: 500,
        border: 'none',
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
