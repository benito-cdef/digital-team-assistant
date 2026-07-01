import { T, fontTitle, fontBody, fontMono } from '../tokens.js';

const FIELDS = [
  { key: 'data',        label: 'Data *',        required: true },
  { key: 'tema',        label: 'Tema / Nome *',  required: true },
  { key: 'descrizione', label: 'Descrizione',    required: false },
  { key: 'canale',      label: 'Canale',         required: false },
];

export default function MappingSelector({ columns, mapping, onChange, rows, onConfirm, onCancel }) {
  const previewRows = rows.slice(0, 3);

  return (
    <div style={{ padding: 16 }}>
      <p style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.muted, margin: '0 0 12px' }}>
        Mappa le colonne
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {FIELDS.map(f => (
          <div key={f.key}>
            <label style={{ fontFamily: fontBody, fontSize: 11, color: T.muted, display: 'block', marginBottom: 3 }}>
              {f.label}
            </label>
            <select
              value={mapping[f.key] || ''}
              onChange={e => onChange({ ...mapping, [f.key]: e.target.value || null })}
              style={{
                width: '100%', padding: '5px 8px',
                border: `1px solid ${mapping[f.key] ? T.line : (f.required ? T.alert : T.line)}`,
                borderRadius: 0, fontFamily: fontBody, fontSize: 12,
                background: T.surface, color: T.ink,
                outline: 'none',
              }}
            >
              <option value="">— nessuna —</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Preview */}
      {previewRows.length > 0 && mapping.data && mapping.tema && (
        <div style={{ marginBottom: 14, overflowX: 'auto' }}>
          <p style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.muted, margin: '0 0 6px' }}>
            Anteprima ({previewRows.length} righe)
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: fontMono }}>
            <thead>
              <tr style={{ background: T.bg }}>
                {FIELDS.filter(f => mapping[f.key]).map(f => (
                  <th key={f.key} style={{ padding: '4px 8px', textAlign: 'left', color: T.muted, fontWeight: 600, borderBottom: `1px solid ${T.line}` }}>
                    {f.key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.line}` }}>
                  {FIELDS.filter(f => mapping[f.key]).map(f => (
                    <td key={f.key} style={{ padding: '4px 8px', color: T.ink2, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {String(row[mapping[f.key]] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onConfirm}
          disabled={!mapping.data || !mapping.tema}
          style={{
            padding: '7px 18px',
            background: mapping.data && mapping.tema ? T.ink : T.line,
            color: mapping.data && mapping.tema ? '#fff' : T.muted,
            border: 'none', borderRadius: 0,
            fontFamily: fontTitle, fontSize: 11,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: mapping.data && mapping.tema ? 'pointer' : 'not-allowed',
          }}
        >
          Conferma →
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '7px 18px',
            background: 'transparent',
            color: T.muted,
            border: `1px solid ${T.line}`, borderRadius: 0,
            fontFamily: fontTitle, fontSize: 11,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Annulla
        </button>
      </div>
    </div>
  );
}
