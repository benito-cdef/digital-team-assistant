import { useState, useRef } from 'react';
import { Upload, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { T, fontTitle, fontBody, fontMono } from '../tokens.js';
import { parseXLSX } from '../utils/parseXLSX.js';
import { parsePDF, parseWithAI } from '../utils/parsePDF.js';
import { parsePPTX } from '../utils/parsePPTX.js';
import { guessMapping, buildActivities, buildActivitiesFromAI } from '../utils/buildActivities.js';
import { tryParseTransposed } from '../utils/parseTransposed.js';
import { parseFullCalendar } from '../utils/parseFullCalendar.js';
import MappingSelector from './MappingSelector.jsx';

const ACCEPT = '.xlsx,.xls,.csv,.pdf,.pptx';

// Step: 'idle' | 'mapping' | 'preview_text' | 'ai_loading' | 'ai_preview' | 'saved' | 'error'

export default function UploadSlot({ label, accent, storageKey, data, onSave, onSaveBoth, onPlanReady, onRemove, isPrev }) {
  const [step, setStep]         = useState(data ? 'saved' : 'idle');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [rows, setRows]         = useState([]);
  const [columns, setColumns]   = useState([]);
  const [mapping, setMapping]   = useState({});
  const [filename, setFilename] = useState('');
  const [error, setError]       = useState('');
  const [previewText, setPreviewText] = useState('');
  const [previewInfo, setPreviewInfo] = useState('');
  const [aiItems, setAiItems]   = useState([]);
  const [source, setSource]     = useState('commercial');
  const inputRef = useRef();

  const isCommercial = storageKey.includes('com');

  async function handleFile(file) {
    setError('');
    setLoading(true);
    setFilename(file.name);
    const src = isCommercial ? 'commercial' : 'brand';
    setSource(src);

    try {
      const ext = file.name.split('.').pop().toLowerCase();

      if (['xlsx', 'xls', 'csv'].includes(ext)) {
        const { rows: r, columns: c, wb } = await parseXLSX(file);
        if (!r.length) throw new Error('Nessuna riga trovata nel file. Prova a esportare in .csv');

        // 0. Prova parsing completo WEEKLY PLAN (Piano settimanale)
        const fullPlan = parseFullCalendar(wb, file.name);
        if (fullPlan && fullPlan.weeks.length > 0 && onPlanReady) {
          onPlanReady(fullPlan);
        }

        // 1. Prova parser trasposto (formato WEEKLY PLAN con settimane in colonna)
        const transposedActivities = tryParseTransposed(wb, file);
        if (transposedActivities && transposedActivities.length > 0) {
          const comActs = transposedActivities.filter(a => a.source === 'commercial' && !a.isPrevYear);
          const braActs = transposedActivities.filter(a => a.source === 'brand');
          // Salva nello slot corrente
          const toSave = src === 'commercial' ? comActs : braActs;
          onSave({ filename: file.name, activities: toSave.length ? toSave : transposedActivities });
          // Se il file contiene entrambi, offri di salvare anche l'altro slot
          if (comActs.length && braActs.length && onSaveBoth) {
            onSaveBoth({ filename: file.name, commercial: comActs, brand: braActs });
          }
          setStep('saved');
          setLoading(false);
          return;
        }

        // 2. Prova mapping automatico colonne standard
        const guessed = guessMapping(c);
        setRows(r); setColumns(c); setMapping(guessed);
        if (guessed.data && guessed.tema) {
          const activities = buildActivities(r, guessed, src);
          if (activities.length > 0) {
            onSave({ filename: file.name, activities });
            setStep('saved');
            setLoading(false);
            return;
          }
        }

        // 3. Fallback: mostra mapping manuale
        setStep('mapping');

      } else if (ext === 'pdf') {
        const { text, numPages } = await parsePDF(file);
        setPreviewText(text);
        setPreviewInfo(`${numPages} pagine · ${text.length} caratteri estratti`);
        setStep('preview_text');

      } else if (ext === 'pptx') {
        const { text, numSlides, tableResult, lines } = await parsePPTX(file);
        if (tableResult && tableResult.rows.length > 0) {
          const guessed = guessMapping(tableResult.columns);
          if (guessed.data && guessed.tema) {
            const activities = buildActivities(tableResult.rows, guessed, src);
            if (activities.length > 0) {
              onSave({ filename: file.name, activities });
              setStep('saved');
              setLoading(false);
              return;
            }
          }
          setRows(tableResult.rows); setColumns(tableResult.columns); setMapping(guessed);
          setStep('mapping');
        } else {
          setPreviewText(text);
          setPreviewInfo(`${numSlides} slide · ${text.length} caratteri estratti`);
          setStep('preview_text');
        }
      } else {
        throw new Error('Formato non supportato. Usa .xlsx, .csv, .pdf o .pptx');
      }
    } catch (e) {
      setError(e.message || 'Errore durante la lettura del file');
      setStep('error');
    }
    setLoading(false);
  }

  async function handleAIParse() {
    const apiKey = localStorage.getItem('dta:apikey') || '';
    if (!apiKey) {
      const key = prompt('Inserisci la tua Anthropic API Key per usare il parsing AI:');
      if (!key) return;
      localStorage.setItem('dta:apikey', key);
    }
    const key = localStorage.getItem('dta:apikey');
    setStep('ai_loading');
    try {
      const items = await parseWithAI(previewText, key);
      setAiItems(items);
      setStep('ai_preview');
    } catch (e) {
      setError(e.message);
      setStep('error');
    }
  }

  function confirmMapping() {
    const activities = buildActivities(rows, mapping, source);
    if (!activities.length) {
      setError('Nessuna attività trovata con le colonne selezionate. Controlla il mapping.');
      return;
    }
    onSave({ filename, activities });
    setStep('saved');
  }

  function confirmAI() {
    const activities = buildActivitiesFromAI(aiItems, source);
    if (!activities.length) {
      setError('Nessuna attività valida trovata dall\'AI.');
      return;
    }
    onSave({ filename, activities });
    setStep('saved');
  }

  function reset() {
    setStep('idle'); setRows([]); setColumns([]); setMapping({});
    setFilename(''); setError(''); setPreviewText(''); setAiItems([]);
  }

  const accentColor = accent === 'gold' ? T.gold : T.ink;
  const accentBg    = accent === 'gold' ? T.goldBg : '#F5F5F5';

  // Saved state
  if (step === 'saved' && data) {
    return (
      <div style={{
        border: `1px solid ${T.line}`, borderRadius: 4,
        background: T.surface, padding: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.muted, margin: '0 0 4px' }}>
              {label}
            </p>
            <p style={{ fontFamily: fontBody, fontSize: 14, color: T.ink, margin: '0 0 4px', fontWeight: 600 }}>
              {data.filename}
            </p>
            <p style={{ fontFamily: fontMono, fontSize: 11, color: T.muted, margin: 0 }}>
              {data.activities.length} attività · caricato {new Date(data.uploadedAt).toLocaleDateString('it-IT')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={reset} title="Ricarica" style={iconBtn}>
              <RefreshCw size={14} />
            </button>
            <button onClick={() => { onRemove(); setStep('idle'); }} title="Rimuovi" style={{ ...iconBtn, color: T.alert }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        {/* Mini bar */}
        <div style={{ marginTop: 12, height: 3, background: accentBg, borderRadius: 2 }}>
          <div style={{ height: '100%', background: accentColor, borderRadius: 2, width: '100%' }} />
        </div>
      </div>
    );
  }

  // Mapping step
  if (step === 'mapping') {
    return (
      <div style={{ border: `1px solid ${T.line}`, borderRadius: 4, background: T.surface }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.muted }}>
            {label} — {filename}
          </span>
          <button onClick={reset} style={{ ...iconBtn, fontSize: 10 }}>✕</button>
        </div>
        <MappingSelector
          columns={columns} mapping={mapping} onChange={setMapping}
          rows={rows} onConfirm={confirmMapping} onCancel={reset}
        />
        {error && <p style={{ padding: '0 16px 12px', color: T.alert, fontSize: 12, fontFamily: fontBody }}>{error}</p>}
      </div>
    );
  }

  // Preview text (PDF/PPTX before AI)
  if (step === 'preview_text') {
    return (
      <div style={{ border: `1px solid ${T.line}`, borderRadius: 4, background: T.surface }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.muted }}>
            {label} — {filename}
          </span>
          <button onClick={reset} style={iconBtn}>✕</button>
        </div>
        <div style={{ padding: 16 }}>
          <p style={{ fontFamily: fontMono, fontSize: 10, color: T.muted, margin: '0 0 8px' }}>{previewInfo}</p>
          <textarea
            readOnly value={previewText}
            style={{
              width: '100%', height: 120, resize: 'vertical',
              border: `1px solid ${T.line}`, borderRadius: 2,
              fontFamily: fontMono, fontSize: 10, color: T.ink2,
              padding: 8, background: T.bg, boxSizing: 'border-box',
            }}
          />
          <p style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, margin: '8px 0 12px' }}>
            Struttura tabellare non rilevata. Usa il parsing AI per estrarre le attività.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAIParse} style={{
              padding: '7px 18px', background: T.ink, color: '#fff',
              border: 'none', borderRadius: 2,
              fontFamily: fontTitle, fontSize: 11,
              letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
            }}>
              Analizza con AI →
            </button>
            <button onClick={reset} style={{
              padding: '7px 14px', background: 'transparent', color: T.muted,
              border: `1px solid ${T.line}`, borderRadius: 2,
              fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.1em',
              textTransform: 'uppercase', cursor: 'pointer',
            }}>Annulla</button>
          </div>
        </div>
      </div>
    );
  }

  // AI loading
  if (step === 'ai_loading') {
    return (
      <div style={{ border: `1px solid ${T.line}`, borderRadius: 4, background: T.surface, padding: 32, textAlign: 'center' }}>
        <div style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>
          Analisi AI in corso…
        </div>
      </div>
    );
  }

  // AI preview
  if (step === 'ai_preview') {
    return (
      <div style={{ border: `1px solid ${T.line}`, borderRadius: 4, background: T.surface }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.line}` }}>
          <span style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.muted }}>
            {label} — {aiItems.length} attività trovate dall'AI
          </span>
        </div>
        <div style={{ maxHeight: 180, overflowY: 'auto', padding: '8px 16px' }}>
          {aiItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '4px 0', borderBottom: `1px solid ${T.line}`, fontSize: 12, fontFamily: fontBody }}>
              <span style={{ color: T.muted, fontFamily: fontMono, minWidth: 90 }}>{item.data}</span>
              <span style={{ color: T.ink, flex: 1 }}>{item.tema}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: 16, display: 'flex', gap: 8 }}>
          <button onClick={confirmAI} style={{
            padding: '7px 18px', background: T.ink, color: '#fff',
            border: 'none', borderRadius: 2, fontFamily: fontTitle, fontSize: 11,
            letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
          }}>
            Conferma e salva
          </button>
          <button onClick={reset} style={{
            padding: '7px 14px', background: 'transparent', color: T.muted,
            border: `1px solid ${T.line}`, borderRadius: 2, fontFamily: fontTitle,
            fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
          }}>Annulla</button>
        </div>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div style={{ border: `1px solid ${T.alert}`, borderRadius: 4, background: T.alertBg, padding: 20 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
          <AlertCircle size={16} color={T.alert} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.alert, margin: '0 0 4px' }}>
              Errore di lettura
            </p>
            <p style={{ fontFamily: fontBody, fontSize: 13, color: T.ink2, margin: 0 }}>{error}</p>
          </div>
        </div>
        <button onClick={reset} style={{
          padding: '6px 14px', background: T.alert, color: '#fff',
          border: 'none', borderRadius: 2, fontFamily: fontTitle, fontSize: 11,
          letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
        }}>Riprova</button>
      </div>
    );
  }

  // Idle / drop zone
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? accentColor : T.line}`,
        borderRadius: 4,
        background: dragging ? accentBg : T.surface,
        padding: '28px 20px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
        minHeight: isPrev ? 100 : 140,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}
    >
      <input ref={inputRef} type="file" accept={ACCEPT} style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />

      {loading ? (
        <p style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>
          Lettura…
        </p>
      ) : (
        <>
          <Upload size={isPrev ? 16 : 22} color={accentColor} />
          <div>
            <p style={{ fontFamily: fontTitle, fontSize: isPrev ? 10 : 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.ink, margin: '0 0 3px', fontWeight: 700 }}>
              {label}
            </p>
            <p style={{ fontFamily: fontBody, fontSize: 11, color: T.muted, margin: 0 }}>
              Trascina qui oppure clicca · xlsx, csv, pdf, pptx
            </p>
          </div>
        </>
      )}
    </div>
  );
}

const iconBtn = {
  background: 'transparent', border: 'none',
  cursor: 'pointer', color: T.muted, padding: 4,
  display: 'flex', alignItems: 'center', borderRadius: 2,
};
