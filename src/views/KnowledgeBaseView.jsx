import { useState, useEffect } from 'react';
import { T, fontTitle, fontBody, fontMono } from '../tokens.js';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { getWikiEntries, createWikiEntry, updateWikiEntry, deleteWikiEntry } from '../utils/wiki.js';

// ── Minimal markdown renderer (no external deps) ────────────────────────────
function Md({ children, style }) {
  if (!children) return null;
  const lines = String(children).split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} style={{ fontFamily: fontTitle, fontSize: 13, letterSpacing: '0.10em', textTransform: 'uppercase', color: T.ink, margin: '16px 0 6px', fontWeight: 700 }}>{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} style={{ fontFamily: fontTitle, fontSize: 15, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.ink, margin: '20px 0 8px', fontWeight: 700 }}>{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} style={{ fontFamily: fontTitle, fontSize: 18, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.ink, margin: '24px 0 10px', fontWeight: 700 }}>{line.slice(2)}</h1>);
    } else if (line.startsWith('- ')) {
      elements.push(<li key={i} style={{ fontFamily: fontBody, fontSize: 13, color: T.ink, lineHeight: 1.6, marginLeft: 18, marginBottom: 2 }}>{inlineMd(line.slice(2))}</li>);
    } else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 8 }} />);
    } else {
      elements.push(<p key={i} style={{ fontFamily: fontBody, fontSize: 13, color: T.ink, lineHeight: 1.7, margin: '0 0 6px' }}>{inlineMd(line)}</p>);
    }
    i++;
  }
  return <div style={style}>{elements}</div>;
}

function inlineMd(text) {
  const parts = [];
  const re = /\*\*(.+?)\*\*|`(.+?)`/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={m.index}>{m[1]}</strong>);
    if (m[2]) parts.push(<code key={m.index} style={{ fontFamily: fontMono, fontSize: 11, background: T.line, padding: '1px 5px' }}>{m[2]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
}

// ── Design helpers ──────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return <h2 style={{ fontFamily: fontTitle, fontSize: 20, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.ink, margin: '0 0 6px', fontWeight: 700 }}>{children}</h2>;
}
function SubTitle({ children }) {
  return <h3 style={{ fontFamily: fontTitle, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.gold, margin: '32px 0 10px', fontWeight: 700, borderBottom: `1px solid ${T.line}`, paddingBottom: 6 }}>{children}</h3>;
}
function Prose({ children }) {
  return <p style={{ fontFamily: fontBody, fontSize: 14, color: T.ink2, lineHeight: 1.75, margin: '0 0 14px' }}>{children}</p>;
}
function CodeBlock({ children }) {
  return (
    <pre style={{
      background: '#0E0E0E', color: '#FAFAF8',
      fontFamily: fontMono, fontSize: 11.5, lineHeight: 1.65,
      padding: '16px 20px', borderRadius: 0, overflowX: 'auto',
      margin: '8px 0 20px', border: '1px solid #222',
    }}>{children}</pre>
  );
}
function DataTable({ headers, rows }) {
  return (
    <div style={{ overflowX: 'auto', margin: '8px 0 20px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fontBody, fontSize: 13 }}>
        <thead>
          <tr style={{ background: T.ink }}>
            {headers.map(h => (
              <th key={h} style={{ fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', padding: '9px 14px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${T.line}`, background: i % 2 === 0 ? T.surface : T.bg }}>
              {r.map((cell, j) => (
                <td key={j} style={{ padding: '8px 14px', color: T.ink, verticalAlign: 'top', lineHeight: 1.5 }}>
                  {typeof cell === 'string' && cell.startsWith('`')
                    ? <code style={{ fontFamily: fontMono, fontSize: 11, background: T.line, padding: '1px 5px' }}>{cell.slice(1, -1)}</code>
                    : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function WarnBox({ children }) {
  return (
    <div style={{ background: T.goldBg, border: `1px solid ${T.gold}`, borderLeft: `4px solid ${T.gold}`, padding: '12px 16px', margin: '12px 0 20px', fontFamily: fontBody, fontSize: 13, color: T.goldDark, lineHeight: 1.6 }}>
      ⚠️ <strong>Da verificare</strong> — {children}
    </div>
  );
}
function AlertBox({ children }) {
  return (
    <div style={{ background: T.alertBg, border: `1px solid ${T.alert}`, borderLeft: `4px solid ${T.alert}`, padding: '12px 16px', margin: '12px 0 20px', fontFamily: fontBody, fontSize: 13, color: T.alertText, lineHeight: 1.6 }}>
      🔒 <strong>Attenzione sicurezza</strong> — {children}
    </div>
  );
}

// ── Sezione 1 — Panoramica ──────────────────────────────────────────────────
function Section1() {
  return (
    <div>
      <SectionTitle>Panoramica del progetto</SectionTitle>
      <Prose>Una guida accessibile a tutti — non serve avere competenze tecniche per capire questo documento.</Prose>

      <SubTitle>1.1 · Cos'è il Digital Team Assistant</SubTitle>
      <Prose>
        Il Digital Team Assistant (DTA) è uno strumento interno sviluppato per il Digital Team di Golden Goose. Il suo scopo è dare al team un punto di riferimento unico per pianificare, visualizzare e coordinare le attività commerciali e di brand lungo tutto l'anno.
      </Prose>
      <Prose>
        Prima del DTA, queste informazioni erano distribuite tra file Excel, presentazioni PowerPoint e fogli condivisi — spesso non allineati. Il DTA consolida tutto in un'unica interfaccia web, accessibile da browser, senza bisogno di installare nulla.
      </Prose>
      <Prose>
        Il lavoro è organizzato per settimane ISO (da W1 a W52/53): ogni settimana ha un "topic", un piano brand, delle attivazioni marketing per canale e mercato, e dei dati di performance economica. I contenuti vengono caricati dagli editor tramite upload di file Excel e completati con editing manuale direttamente in pagina.
      </Prose>

      <SubTitle>1.2 · Chi può accedere e cosa può fare</SubTitle>
      <Prose>
        L'accesso è riservato a chiunque abbia un'email <strong>@goldengoose.com</strong>. Il ruolo assegnato determina cosa si può fare.
      </Prose>
      <DataTable
        headers={['Ruolo', 'Cosa vede', 'Cosa può modificare', 'Cosa non può fare']}
        rows={[
          ['super_admin', 'Tutto, inclusa la sezione Settings', 'Tutto: carica piani, modifica dati, gestisce utenti, crea calendari, rinomina piani', 'Nulla — accesso totale'],
          ['editor', 'Tutto tranne la gestione utenti', 'Carica piani Excel, modifica contenuti del Piano settimana per settimana, carica calendari', 'Gestione utenti (aggiunta/rimozione/cambio ruolo)'],
          ['user', 'Dashboard, Calendario, Piano (sola lettura), Anno su Anno, Report, Knowledge Base', 'Può aggiungere voci nella sezione Roadmap della Knowledge Base', 'Nessuna modifica ai piani o calendari'],
        ]}
      />
      <Prose>
        Al primo accesso con un'email @goldengoose.com, il sistema crea automaticamente un account con ruolo <em>user</em>. Il ruolo può essere promosso solo da un super_admin dalla pagina Settings.
      </Prose>

      <SubTitle>1.3 · Le pagine dello strumento</SubTitle>
      {[
        {
          name: 'Dashboard',
          desc: 'È la pagina di arrivo dopo il login. Mostra in un colpo d\'occhio la settimana ISO corrente: il topic, la campagna brand attiva, i dati di performance (mostrati come valori indicativi, non reali), le attivazioni marketing previste, le prossime tre settimane e una lista di segnalazioni automatiche (es. settimane senza topic definito, concomitanze tra attività commerciali e brand).'
        },
        {
          name: 'Calendario',
          desc: 'Vista mensile di tutte le attività commerciali e brand caricate. Mostra le attività raggruppate per settimana, con possibilità di filtrare per tipo (commerciale, brand) e di evidenziare le settimane con sovrapposizioni tra le due tipologie. Cliccando su un\'attività si apre un pannello con i dettagli.'
        },
        {
          name: 'Piano',
          desc: 'Il cuore dello strumento. Mostra settimana per settimana tutti i dettagli del piano editoriale: contesto (topic, immagini di riferimento), brand calendar, attivazioni marketing per giorno (Martedì WW Push, Mercoledì Best Performer, Giovedì, Venerdì Worst Seller + App, Sabato Newsletter) con immagini associate, link a documenti di strategia e dati di performance. Gli editor possono modificare ogni campo direttamente in pagina, con salvataggio automatico sul cloud.'
        },
        {
          name: 'Anno su Anno',
          desc: 'Confronto tra i calendari dell\'anno corrente e dell\'anno precedente. Permette di vedere in parallelo cosa è successo nello stesso periodo dell\'anno scorso, utile per la pianificazione e per valutare la performance storica.'
        },
        {
          name: 'Report',
          desc: 'Sezione per caricare nuovi file Excel o PDF con i dati del calendario commerciale e brand. Permette agli editor di aggiornare i calendari pubblicati senza toccare il codice. Include un sistema di mapping delle colonne per gestire file con formati diversi.'
        },
        {
          name: 'Settings',
          desc: 'Visibile solo ai super_admin. Contiene: gestione utenti (aggiunta, rimozione, cambio ruolo), caricamento del Master Calendar (piano annuale), creazione di nuovi calendari per anni futuri, rinomina dei piani esistenti. È da qui che si carica il file Excel con le settimane del Piano.'
        },
        {
          name: 'Knowledge Base',
          desc: 'Questa pagina. Contiene la documentazione del progetto, il changelog degli sviluppi e una sezione roadmap editabile dal team.'
        },
      ].map(({ name, desc }) => (
        <div key={name} style={{ border: `1px solid ${T.line}`, marginBottom: 10, borderRadius: 0 }}>
          <div style={{ padding: '10px 16px', background: T.bg, borderBottom: `1px solid ${T.line}` }}>
            <span style={{ fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.ink, fontWeight: 700 }}>{name}</span>
          </div>
          <div style={{ padding: '10px 16px', fontFamily: fontBody, fontSize: 13, color: T.ink2, lineHeight: 1.65 }}>{desc}</div>
        </div>
      ))}

      <SubTitle>1.4 · I dati che gestisce</SubTitle>
      <Prose>
        Il DTA gestisce due tipi principali di dati: il <strong>Piano</strong> (struttura settimana per settimana, editoriale e marketing) e i <strong>Calendari</strong> (attività commerciali e brand con date precise).
      </Prose>
      <CodeBlock>{`Come entrano i dati nel sistema:

  File Excel (upload manuale da Settings / Report)
       │
       ▼
  Parser frontend (XLSX / PDF / PPTX)
       │
       ├──▶ Piano settimane → Supabase Storage (plan_*.json)
       │
       └──▶ Calendari attività → Supabase Storage (calendars_NNNN.json)
                                              │
                                              ▼
                                   Visualizzazione nel browser
                                   (Dashboard / Calendario / Piano)

Modifiche inline nel Piano:
  Utente modifica campo → salvataggio immediato → Supabase Storage
                                               → Audit trail in Supabase DB (plan_changes)`}</CodeBlock>
      <Prose>
        I dati di performance economica (actual, budget, last year) vengono caricati tramite Excel ma <strong>non sono mai mostrati in chiaro</strong>: vengono sostituiti con valori indicativi generati algoritmicamente dello stesso ordine di grandezza. Questo per proteggere la riservatezza dei dati finanziari nelle schermate condivise.
      </Prose>
      <Prose>
        Non esiste un backend applicativo: tutta la logica risiede nel browser. Supabase viene usato esclusivamente come storage (file JSON) e database (tabelle utenti e audit trail).
      </Prose>
    </div>
  );
}

// ── Sezione 2 — Documentazione tecnica ─────────────────────────────────────
function Section2() {
  return (
    <div>
      <SectionTitle>Documentazione tecnica</SectionTitle>
      <Prose>Per sviluppatori. Ogni affermazione è verificabile nel codice sorgente.</Prose>

      <SubTitle>2.1 · Stack e infrastruttura</SubTitle>
      <DataTable
        headers={['Layer', 'Tecnologia', 'Versione', 'Note']}
        rows={[
          ['Frontend framework', 'React', '19.2.6', 'SPA — Single Page Application, routing hash-based (#/view)'],
          ['Build tool', 'Vite', '8.0.12', 'Dev server + bundling produzione'],
          ['Hosting', 'Vercel', '—', 'Deploy automatico da git push'],
          ['Database + Storage', 'Supabase', '—', 'Progetto: xnekmhtmapkxzcrdzhoh · Region: eu-west-1 (inferita dal URL)'],
          ['Supabase JS client', '@supabase/supabase-js', '2.108.2', 'Usato per query DB (tabelle users, plan_changes, docs_wiki)'],
          ['Storage bucket', 'Supabase Storage', '—', 'Bucket: calendar-data — tutti i JSON del piano e calendari'],
          ['Parsing Excel', 'xlsx', '0.18.5', 'Lettura file .xlsx caricati dall\'utente'],
          ['Parsing PDF', 'pdfjs-dist', '6.0.227', 'Estrazione testo da PDF caricati'],
          ['Parsing PPTX', 'jszip', '3.10.1', 'Decompressione file .pptx (formato ZIP)'],
          ['Icone', 'lucide-react', '1.21.0', 'Set di icone SVG usato ovunque nell\'UI'],
          ['Font', 'Barlow Condensed + Barlow + IBM Plex Mono', '—', 'Caricati da Google Fonts (index.html)'],
        ]}
      />

      <SubTitle>2.2 · Struttura del progetto</SubTitle>
      <CodeBlock>{`digital-team-assistant/
├── public/
│   └── favicon.svg              — Logo DTA (quadrato nero + quadrato gold)
├── src/
│   ├── main.jsx                 — Entry point: monta AuthGate → App
│   ├── App.jsx                  — Root: routing hash, stato globale (plan, calendars, selectedPlan)
│   ├── supabase.js              — Client Supabase (URL + anon key hardcoded)
│   ├── tokens.js                — Design system JS: oggetto T (colori), fontTitle/fontBody/fontMono
│   ├── styles/
│   │   └── tokens.css           — CSS custom properties (:root { --gg-black, --gg-gold, … })
│   ├── config/
│   │   └── editors.js           — [LEGACY] Lista email editor hardcoded. Usato come fallback
│   │                              se la query Supabase fallisce. Da rimuovere quando il DB
│   │                              è l'unica fonte di verità.
│   ├── components/
│   │   ├── AuthGate.jsx         — Wrapper login: verifica dominio @goldengoose.com,
│   │   │                          legge/scrive ruolo da Supabase, salva email in localStorage
│   │   ├── Header.jsx           — Navigazione sticky: logo, menu, switcher calendario, avatar
│   │   ├── ActivityModal.jsx    — Modal dettaglio attività nel CalendarView
│   │   ├── EditableField.jsx    — Campo testo inline con toggle edit/view (usato nel CalendarView)
│   │   ├── MappingSelector.jsx  — UI per mappare colonne Excel → campi interni
│   │   ├── Pill.jsx             — Badge colorato per tipo attività (commerciale/brand)
│   │   └── UploadSlot.jsx       — Drop zone file + pulsante upload
│   ├── views/
│   │   ├── DashboardView.jsx    — Vista default post-login: 5 blocchi settimana corrente
│   │   ├── CalendarView.jsx     — Vista mensile attività commerciali + brand
│   │   ├── PianoView.jsx        — Piano editoriale settimana per settimana (cuore del sistema)
│   │   ├── YoYView.jsx          — Confronto anno su anno tra calendari
│   │   ├── HomeView.jsx         — Vista report / upload calendari (rinominata da ReportView)
│   │   ├── ReportView.jsx       — Alias / vista aggiuntiva report (da chiarire se usata)
│   │   ├── UploadView.jsx       — Vista upload (presente ma routing non verificato)
│   │   ├── SettingsView.jsx     — Gestione utenti, piani, upload Master Calendar
│   │   └── KnowledgeBaseView.jsx — Questa pagina
│   └── utils/
│       ├── cloudStorage.js      — Tutte le operazioni su Supabase Storage (load/save JSON)
│       ├── db.js                — Query Supabase DB: users, plan_changes
│       ├── wiki.js              — Query Supabase DB: docs_wiki (roadmap editabile)
│       ├── storage.js           — localStorage: chiavi dta:cur:com/bra/pre:com/bra (LEGACY,
│       │                          ancora usato come cache locale dei calendari)
│       ├── demo.js              — Generatore valori finanziari fake (LCG con SALT per-sessione)
│       ├── exportCalendar.js    — Export Excel del piano corrente (download lato client)
│       ├── isoWeek.js           — Calcoli settimane ISO: numero settimana, range date, anno ISO
│       ├── parseDate.js         — Parser date flessibile: serial Excel, ISO 8601, DD/MM/YYYY
│       ├── parseFullCalendar.js — Parser calendario completo da Excel (formato Master Calendar)
│       ├── parsePDF.js          — Estrazione testo da file PDF (via pdfjs-dist)
│       ├── parsePPTX.js         — Estrazione testo da file PPTX (via jszip)
│       ├── parseTransposed.js   — Parser Excel con righe/colonne invertite
│       ├── parseXLSX.js         — Wrapper base XLSX: legge un file e restituisce righe + colonne
│       └── router.js            — Hash routing: parseHash(), pushHash(), parseWeekParam()
├── supabase/
│   └── migrations/
│       ├── 001_users.sql        — Tabella public.users + RLS
│       ├── 002_plan_changes.sql — Tabella public.plan_changes + RLS
│       └── 003_docs_wiki.sql    — Tabella public.docs_wiki + RLS
└── package.json`}</CodeBlock>

      <WarnBox>
        I file <code>0001_users.sql</code> / <code>0002_plan_changes.sql</code> (con zero iniziale) sembrano essere duplicati delle migration senza zero. Non è chiaro quale set sia stato applicato al progetto Supabase. Da verificare con <code>supabase db status</code> o guardando l'elenco migration in Supabase Dashboard.
      </WarnBox>
      <WarnBox>
        <code>ReportView.jsx</code> e <code>UploadView.jsx</code> sono presenti nel filesystem ma non è determinabile dall'analisi del codice se siano attivamente raggiungibili via routing, o se siano stati sostituiti da <code>HomeView.jsx</code>.
      </WarnBox>

      <SubTitle>2.3 · Modello dati</SubTitle>
      <p style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted, margin: '8px 0 4px' }}>Tabella public.users</p>
      <CodeBlock>{`-- Ogni utente che ha effettuato almeno un accesso
{
  id:          uuid (PK, generato automaticamente),
  email:       text UNIQUE NOT NULL,
  role:        text NOT NULL DEFAULT 'user'
               CHECK (role IN ('super_admin', 'editor', 'user')),
  created_at:  timestamptz DEFAULT now(),
  created_by:  text (email di chi ha creato la riga, o 'self-register' / 'system'),
  last_login:  timestamptz (aggiornato ad ogni accesso)
}`}</CodeBlock>
      <p style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted, margin: '8px 0 4px' }}>Tabella public.plan_changes (audit trail)</p>
      <CodeBlock>{`-- Una riga per ogni modifica inline al Piano
{
  id:           uuid (PK),
  week_number:  int NOT NULL,
  year:         int NOT NULL,
  field_path:   text NOT NULL,  -- es. "marketing.tuesday.ww", "brand.mainCampaign"
  old_value:    jsonb,          -- valore precedente (null se campo nuovo)
  new_value:    jsonb,          -- valore salvato
  changed_by:   text NOT NULL,  -- email dell'editor
  changed_at:   timestamptz DEFAULT now()
}`}</CodeBlock>
      <p style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted, margin: '8px 0 4px' }}>Tabella public.docs_wiki (roadmap editabile)</p>
      <CodeBlock>{`-- Voci della sezione Roadmap della Knowledge Base
{
  id:          uuid (PK),
  section:     text NOT NULL,   -- 'planned_features' | 'integrations' | 'ideas' | 'open_questions'
  title:       text NOT NULL,
  content:     text NOT NULL,   -- markdown libero
  status:      text,            -- 'todo' | 'in_progress' | 'waiting' (per planned_features)
  priority:    text,            -- 'high' | 'medium' | 'low'
  created_by:  text NOT NULL,
  created_at:  timestamptz DEFAULT now(),
  updated_by:  text,
  updated_at:  timestamptz
}`}</CodeBlock>
      <p style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted, margin: '8px 0 4px' }}>Struttura JSON Piano (Supabase Storage: plan_*.json)</p>
      <CodeBlock>{`{
  "name": "Commercial Calendar 2026",
  "isoYear": 2026,
  "filename": "plan_commercial_calendar_2026.json",
  "description": "",
  "createdAt": "2026-01-10T09:00:00.000Z",
  "weeks": [
    {
      "week": 1,
      "date": "2025-12-29",       // lunedì ISO della settimana
      "weekdays": "29 Dic - 04 Gen",
      "quarter": "Q1",
      "month": "Gennaio",
      "year": 2026,
      "context": {
        "lastYear": "...",         // testo descrittivo anno precedente (read-only)
        "weekTopic": "...",        // topic settimana corrente (editabile)
        "images": [],              // array URL immagini (editabile)
        "weekTopicImageUrl": null  // campo legacy, sostituito da 'images'
      },
      "brand": {
        "mainCampaign": "...",
        "commercial": "...",
        "opportunity": "...",
        "corporate": "...",
        "regional": "..."
      },
      "marketing": {
        "tuesday":   { "ww": "", "note": "", "skuCode": "", "images": [] },
        "wednesday": { "topic": "", "eu": "", "us": "", "kr": "", "images": [] },
        "thursday":  { "topic": "", "eu": "", "us": "", "kr": "", "images": [] },
        "friday":    { "topic": "", "eu": "", "us": "", "kr": "",
                       "appTopic": "", "productCode": "", "images": [] },
        "saturday":  { "topic": "", "skuCode": "", "note": "", "images": [] }
      },
      "strategyLinks": [          // link a documenti di strategia
        { "label": "Brief W1", "url": "https://..." }
      ],
      "performance": {
        "ecomLY": 1234567,        // eCommerce last year (mai mostrato in chiaro)
        "ecomBudget": 2000000,    // budget (mai mostrato in chiaro)
        "ecomActual": 1890000,    // actual (mai mostrato in chiaro)
        "ecomDeltaBdg": 0.05,     // delta vs budget (mai mostrato in chiaro)
        "ecomDeltaAct": 0.12      // delta vs actual (mai mostrato in chiaro)
      }
    }
  ]
}`}</CodeBlock>
      <p style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted, margin: '8px 0 4px' }}>Struttura JSON Calendari (Supabase Storage: calendars_NNNN.json)</p>
      <CodeBlock>{`{
  "curCom": {                     // calendario commerciale anno corrente
    "activities": [
      {
        "date": "2026-01-06T00:00:00.000Z",
        "week": 2,
        "year": 2026,
        "month": 1,
        "source": "commercial",   // 'commercial' | 'brand'
        "label": "...",
        "type": "..."
        // altri campi dipendono dal formato del file Excel caricato
      }
    ]
  },
  "curBra": { "activities": [...] },   // brand anno corrente
  "preCom": { "activities": [...] },   // commerciale anno precedente
  "preBra": { "activities": [...] }    // brand anno precedente
}`}</CodeBlock>
      <p style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted, margin: '8px 0 4px' }}>File manifest (Supabase Storage: plans.json)</p>
      <CodeBlock>{`// Lista di tutti i piani disponibili. Usato per il dropdown "Calendari disponibili" in header.
[
  {
    "id": "commercial_calendar_2026",      // slug generato dal nome
    "name": "Commercial Calendar 2026",
    "filename": "plan_commercial_calendar_2026.json",
    "isoYear": 2026,                       // anno ISO per calcoli settimane
    "description": "",
    "createdAt": "2026-01-10T09:00:00.000Z"
  }
]`}</CodeBlock>

      <SubTitle>2.4 · Autenticazione e sicurezza</SubTitle>
      <Prose>
        Il DTA <strong>non usa Supabase Auth</strong>. Non ci sono magic link, password o sessioni JWT. Il meccanismo di autenticazione è interamente custom, lato client:
      </Prose>
      <CodeBlock>{`Flusso di accesso:
  1. Utente inserisce email nel form di login
  2. AuthGate.jsx verifica che il dominio sia @goldengoose.com
  3. Se ok → chiama getOrCreateUser(email) su Supabase DB
     - Se l'utente esiste: recupera il ruolo, aggiorna last_login
     - Se non esiste: inserisce una nuova riga con role='user'
  4. Email salvata in localStorage con chiave 'dta:auth:email'
  5. Al prossimo caricamento della pagina: legge l'email da localStorage,
     ri-chiama getOrCreateUser() per aggiornare il ruolo corrente

Sessione: non c'è refresh token né scadenza. L'utente rimane loggato
finché non clicca "Esci" (che cancella la chiave localStorage).`}</CodeBlock>
      <AlertBox>
        Le policy RLS su tutte le tabelle sono <code>for all using (true) with check (true)</code>, cioè consentono qualsiasi operazione a chiunque abbia la anon key. La anon key è hardcoded nel sorgente (<code>src/supabase.js</code> e <code>src/utils/cloudStorage.js</code>) ed è quindi visibile nel bundle JavaScript pubblicato. Chiunque la trovi può leggere e scrivere tutte le tabelle e i file di storage senza autenticazione. La protezione dei dati avviene <em>solo nel frontend</em>, che è facilmente aggirabile. Per un deploy interno aziendale questo è accettabile come punto di partenza, ma va presidiato se i dati diventano sensibili.
      </AlertBox>
      <Prose>
        La protezione delle rotte è anch'essa solo frontend: il check <code>isEditor</code> e <code>isSuperAdmin</code> impedisce di vedere pulsanti e form, ma non di chiamare direttamente le API.
      </Prose>
      <Prose>Il file <code>src/config/editors.js</code> contiene una lista hardcoded di email editor, usata come fallback se la query Supabase non riesce. In condizioni normali non viene usato perché il ruolo viene letto dal DB.</Prose>

      <SubTitle>2.5 · Flussi principali</SubTitle>
      <p style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted, margin: '8px 0 4px' }}>Upload Master Calendar (piano settimanale)</p>
      <CodeBlock>{`1. Editor va in Settings
2. Clicca "Carica Master Calendar" → UploadSlot accetta .xlsx / .pdf / .pptx
3. Il file viene passato al parser appropriato (parseXLSX / parsePDF / parsePPTX)
4. MappingSelector mostra le colonne trovate nel file
5. L'editor mappa ogni colonna al campo corrispondente (week, topic, brand, ecc.)
6. Il piano strutturato viene salvato in Supabase Storage come plan_*.json
7. Il manifest plans.json viene aggiornato con il nuovo piano
8. La UI si aggiorna e mostra il piano appena caricato`}</CodeBlock>
      <p style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted, margin: '8px 0 4px' }}>Visualizzazione Piano settimanale</p>
      <CodeBlock>{`1. App.jsx carica il manifest plans.json → imposta selectedPlan (default: anno ISO corrente)
2. Effetto su selectedPlan:
   - svuota calendars in stato (setCalendars({})) → UI non mostra dati del piano precedente
   - carica piano: loadPlanFile(selectedPlan.filename) → setPlan(pianoDati)
   - carica calendari: loadCalendarsFromCloud(selectedPlan.isoYear)
     → cerca calendars_{ANNO}.json, fallback a calendars.json (solo 2026)
   - carica piano confronto (anno precedente): cerca piani con isoYear = anno - 1
3. PianoView riceve plan + comparisonPlan → mostra settimana corrente (match ISO week)
4. Navigazione frecce/mesi → cambia weekIdx in stato locale`}</CodeBlock>
      <p style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted, margin: '8px 0 4px' }}>Modifica inline nel Piano</p>
      <CodeBlock>{`1. Editor clicca "Modifica" su un blocco (EditBlock)
2. I campi diventano input/textarea
3. L'editor modifica e clicca "Salva"
4. handlePlanChange(weekIdx, fieldPath, valore) in App.jsx:
   - Calcola vecchio valore con getPath()
   - Chiama logPlanChange() → inserisce riga in plan_changes (audit trail)
   - Aggiorna lo stato locale con setPath() (strutturale clone)
   - Salva in localStorage (cache locale)
   - Chiama savePlanFile() → PUT su Supabase Storage (immediato, no debounce)`}</CodeBlock>
      <p style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted, margin: '8px 0 4px' }}>Cambio ruolo utente</p>
      <CodeBlock>{`1. Super_admin va in Settings → sezione Utenti
2. Seleziona nuovo ruolo dal dropdown nella riga utente
3. updateUserRole(email, role) → UPDATE su Supabase DB immediato
4. La tabella utenti si ricarica (reload())
5. L'utente interessato vedrà il nuovo ruolo al prossimo caricamento
   della pagina (AuthGate rilegge il ruolo da DB ad ogni mount)`}</CodeBlock>

      <SubTitle>2.6 · Deployment</SubTitle>
      <Prose>URL produzione: <strong>non determinabile dall'analisi del codice</strong> (non trovato in vercel.json o file di configurazione). Da aggiungere qui quando noto.</Prose>
      <Prose>Il progetto viene deployato su Vercel. Ogni push al branch principale attiva un deploy automatico. Non è presente un file <code>vercel.json</code> nel repository — Vercel usa la configurazione automatica per progetti Vite.</Prose>
      <p style={{ fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted, margin: '8px 0 4px' }}>Variabili d'ambiente</p>
      <WarnBox>
        Attualmente <strong>non ci sono variabili d'ambiente</strong>: la URL Supabase e la anon key sono hardcoded in <code>src/supabase.js</code> e <code>src/utils/cloudStorage.js</code>. Se in futuro si vuole spostare su variabili d'ambiente Vercel, i nomi consigliati sono:
      </WarnBox>
      <CodeBlock>{`VITE_SUPABASE_URL=https://xnekmhtmapkxzcrdzhoh.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>

Come aggiungere in Vercel:
  1. Aprire il progetto su vercel.com
  2. Settings → Environment Variables
  3. Aggiungere le due variabili per Production (e Preview se necessario)
  4. Fare un nuovo deploy (Redeploy) per renderle attive`}</CodeBlock>
    </div>
  );
}

// ── Sezione 3 — Changelog ───────────────────────────────────────────────────
function Section3() {
  const entries = [
    {
      date: 'Luglio 2026',
      title: 'Dati finanziari sempre fake — rimozione toggle demo',
      what: 'I dati economici (ecomLY, ecomBudget, ecomActual, delta) non vengono mai mostrati in chiaro. Il valore visualizzato è sempre un valore generato algoritmicamente dello stesso ordine di grandezza del reale. In precedenza c\'era un toggle "Demo mode" — è stato rimosso perché la protezione deve essere permanente, non opzionale.',
      files: ['src/views/DashboardView.jsx', 'src/views/PianoView.jsx', 'src/utils/demo.js'],
      notes: 'Il generatore usa un LCG (Linear Congruential Generator) con un SALT casuale per-sessione: i valori sono diversi da sessione a sessione ma stabili durante la stessa sessione (niente flickering).',
    },
    {
      date: 'Luglio 2026',
      title: 'Knowledge Base — documentazione tecnica integrata',
      what: 'Aggiunta una nuova sezione "Knowledge Base" accessibile da tutte le pagine. Contiene: panoramica non tecnica del progetto, documentazione tecnica completa (stack, modello dati, flussi, sicurezza), changelog, e una sezione roadmap editabile salvata su Supabase.',
      files: ['src/views/KnowledgeBaseView.jsx', 'src/utils/wiki.js', 'src/components/Header.jsx', 'src/App.jsx', 'supabase/migrations/003_docs_wiki.sql'],
      notes: 'Nuova tabella docs_wiki su Supabase. Sezione Roadmap editabile da editor e super_admin.',
    },
    {
      date: 'Giugno–Luglio 2026',
      title: 'Dashboard redesign — 5 blocchi informativi',
      what: 'La Dashboard è stata completamente riscritta con 5 sezioni: "Dove siamo adesso" (settimana corrente in evidenza), "Performance eCom" (dati indicativi), "Questa settimana in sintesi" (brand + attivazioni), "Prossime settimane" (preview W+1/+2/+3), "Da tenere d\'occhio" (alert automatici su concomitanze e vuoti di pianificazione).',
      files: ['src/views/DashboardView.jsx'],
      notes: 'Skeleton loading durante il fetch cloud. Alert generati automaticamente guardando 30 giorni in avanti.',
    },
    {
      date: 'Giugno–Luglio 2026',
      title: 'Design system — token CSS e aggiornamento favicon',
      what: 'Introdotto un file CSS con variabili custom (--gg-black, --gg-gold, ecc.) importato globalmente. Il favicon è stato aggiornato con il logo DTA (quadrato nero + quadrato gold). Tutti i componenti usano i token dal file src/tokens.js.',
      files: ['src/styles/tokens.css', 'src/main.jsx', 'public/favicon.svg'],
      notes: '',
    },
    {
      date: 'Giugno 2026',
      title: 'Isolamento calendari per anno — piani 2026 e 2027 separati',
      what: 'Switching tra un piano 2026 e un piano 2027 ora mostra calendari separati. I calendari dell\'anno 2026 vengono letti da calendars_2026.json (con fallback a calendars.json per retrocompatibilità). I piani di anni nuovi (2027+) partono con calendari vuoti.',
      files: ['src/utils/cloudStorage.js', 'src/App.jsx'],
      notes: 'Quando si cambia piano, i calendari in stato vengono svuotati immediatamente (setCalendars({})) per evitare che l\'UI mostri dati del piano precedente durante il caricamento.',
    },
    {
      date: 'Giugno 2026',
      title: 'Piano — colonna confronto anno precedente collassabile',
      what: 'Nel Piano settimanale è stato aggiunto un pulsante "◧ Confronto anno prec." che mostra una colonna centrale con i dati della stessa settimana dell\'anno precedente. È nascosta di default e attivabile on-demand per ridurre il rumore visivo.',
      files: ['src/views/PianoView.jsx'],
      notes: 'La colonna appare solo se esiste un piano con isoYear = anno corrente - 1. La griglia passa da 2 a 3 colonne quando è attiva.',
    },
    {
      date: 'Giugno 2026',
      title: 'Piano — campo immagini multiplo per giorno della settimana',
      what: 'Ogni giorno del Piano (Martedì, Mercoledì, Giovedì, Venerdì, Sabato) ora ha un campo immagini che supporta più URL. Il componente ImagesBlock gestisce aggiunta, rimozione, anteprima thumbnail e lightbox. Sostituisce il vecchio campo singolo "image".',
      files: ['src/views/PianoView.jsx'],
      notes: 'Retrocompatibilità con il vecchio campo image (stringa singola): se images non è presente, viene usato [image] se esiste.',
    },
    {
      date: 'Giugno 2026',
      title: 'Rinomina piano e anno nel manifesto',
      what: 'Dalla pagina Settings i super_admin possono rinominare un piano esistente e cambiarne l\'anno ISO. Il manifesto plans.json viene aggiornato su Supabase Storage e la UI si aggiorna in tempo reale, incluso il dropdown in header.',
      files: ['src/views/SettingsView.jsx', 'src/App.jsx', 'src/utils/cloudStorage.js'],
      notes: '',
    },
    {
      date: 'Giugno 2026',
      title: 'Header — anno del piano nel dropdown switcher',
      what: 'Il dropdown per cambiare calendario in header mostra ora l\'anno ISO del piano se non è già incluso nel nome (es. "Commercial Calendar · 2027"). Questo evita confusione quando esistono più piani per anni diversi.',
      files: ['src/components/Header.jsx'],
      notes: '',
    },
    {
      date: 'Maggio–Giugno 2026',
      title: 'Multi-piano — manifest plans.json e switcher anno',
      what: 'Il sistema ora supporta più piani per anni diversi. Il manifesto plans.json elenca tutti i piani disponibili. Un dropdown in header permette di switchare tra piani. La creazione di nuovi piani (es. 2027) avviene da Settings.',
      files: ['src/utils/cloudStorage.js', 'src/components/Header.jsx', 'src/App.jsx', 'src/views/SettingsView.jsx'],
      notes: 'Un piano ha: id (slug), name (testo libero), filename, isoYear (usato per calcoli ISO week), description. L\'isoYear è separato dal nome per permettere nomi liberi come "Draft FY27".',
    },
    {
      date: 'Aprile–Maggio 2026',
      title: 'Audit trail modifiche Piano',
      what: 'Ogni modifica inline al Piano viene registrata nella tabella plan_changes su Supabase. La cronologia delle modifiche è visibile nell\'header di ogni settimana cliccando sull\'icona cronologia.',
      files: ['src/utils/db.js', 'src/App.jsx', 'src/views/PianoView.jsx', 'supabase/migrations/002_plan_changes.sql'],
      notes: '',
    },
    {
      date: 'Aprile 2026',
      title: 'Gestione utenti da Settings',
      what: 'I super_admin possono aggiungere, rimuovere e cambiare il ruolo degli utenti direttamente dall\'interfaccia, senza toccare il database manualmente. Ogni utente che accede per la prima volta viene creato automaticamente con ruolo user.',
      files: ['src/views/SettingsView.jsx', 'src/utils/db.js', 'supabase/migrations/001_users.sql'],
      notes: '',
    },
    {
      date: 'Marzo–Aprile 2026',
      title: 'Piano settimanale — editing inline',
      what: 'Il Piano è diventato editabile direttamente nell\'interfaccia. Prima era solo visualizzazione. Gli editor possono modificare topic, brand calendar, attivazioni marketing, aggiungere link e immagini. Le modifiche vengono salvate immediatamente su Supabase Storage.',
      files: ['src/views/PianoView.jsx', 'src/utils/cloudStorage.js'],
      notes: '',
    },
    {
      date: 'Inizio progetto (stima: inizio 2026)',
      title: 'Setup iniziale — SPA React + Vite + Supabase',
      what: 'Creazione del progetto base: React + Vite, configurazione Supabase (Storage bucket calendar-data, tabelle DB), sistema di autenticazione custom con verifica dominio @goldengoose.com, routing hash-based, design system con token colore e font.',
      files: ['src/main.jsx', 'src/App.jsx', 'src/supabase.js', 'src/components/AuthGate.jsx', 'src/tokens.js'],
      notes: 'Il progetto parte da un template Vite standard — il README.md nella root è quello del template e non documenta il progetto specifico.',
    },
  ];

  return (
    <div>
      <SectionTitle>Changelog</SectionTitle>
      <Prose>Cronologia degli sviluppi, dal più recente. Le date approssimative sono ricavate dal codice; dove non determinabile è indicato "stima".</Prose>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
        {entries.map((e, i) => (
          <div key={i} style={{ border: `1px solid ${T.line}`, borderRadius: 0, overflow: 'hidden' }}>
            <div style={{ background: T.bg, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: `1px solid ${T.line}` }}>
              <span style={{ fontFamily: fontMono, fontSize: 10, color: T.muted, flexShrink: 0 }}>{e.date}</span>
              <span style={{ fontFamily: fontTitle, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.ink, fontWeight: 700 }}>{e.title}</span>
            </div>
            <div style={{ padding: '12px 16px', background: T.surface }}>
              <p style={{ fontFamily: fontBody, fontSize: 13, color: T.ink2, lineHeight: 1.65, margin: '0 0 10px' }}>{e.what}</p>
              {e.files.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: e.notes ? 10 : 0 }}>
                  {e.files.map(f => (
                    <code key={f} style={{ fontFamily: fontMono, fontSize: 10, background: T.line, color: T.ink2, padding: '2px 7px' }}>{f}</code>
                  ))}
                </div>
              )}
              {e.notes && <p style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>{e.notes}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sezione 4 — Roadmap (editabile) ────────────────────────────────────────
const SECTIONS = [
  { id: 'planned_features', label: 'Funzionalità pianificate', hasStatus: true, hasPriority: true },
  { id: 'integrations',     label: 'Integrazioni future',      hasStatus: false, hasPriority: true },
  { id: 'ideas',            label: 'Idee e esplorazioni',      hasStatus: false, hasPriority: false },
  { id: 'open_questions',   label: 'Domande aperte',           hasStatus: false, hasPriority: false },
];

const STATUS_LABELS = { todo: 'Da iniziare', in_progress: 'In corso', waiting: 'In attesa' };
const PRIORITY_LABELS = { high: '🔴 Alta', medium: '🟡 Media', low: '🟢 Bassa' };

function EntryCard({ entry, canEdit, onEdit, onDelete }) {
  return (
    <div style={{ border: `1px solid ${T.line}`, borderRadius: 0, overflow: 'hidden', marginBottom: 8 }}>
      <div style={{ background: T.bg, padding: '9px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.line}`, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: fontTitle, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.ink, fontWeight: 700 }}>{entry.title}</span>
          {entry.priority && <span style={{ fontFamily: fontMono, fontSize: 10, color: T.muted }}>{PRIORITY_LABELS[entry.priority] || entry.priority}</span>}
          {entry.status && <span style={{ fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.gold, background: T.goldBg, border: `1px solid ${T.goldLight}`, padding: '1px 7px' }}>{STATUS_LABELS[entry.status] || entry.status}</span>}
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button onClick={() => onEdit(entry)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 0, cursor: 'pointer', color: T.muted, fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              <Pencil size={10} /> Modifica
            </button>
            <button onClick={() => onDelete(entry.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'transparent', border: `1px solid ${T.alert}`, borderRadius: 0, cursor: 'pointer', color: T.alert, fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              <Trash2 size={10} />
            </button>
          </div>
        )}
      </div>
      <div style={{ padding: '12px 16px', background: T.surface }}>
        <Md>{entry.content}</Md>
        <div style={{ marginTop: 10, fontFamily: fontMono, fontSize: 9, color: T.lineS }}>
          {entry.created_by} · {new Date(entry.created_at).toLocaleDateString('it-IT')}
          {entry.updated_at && ` · aggiornato ${new Date(entry.updated_at).toLocaleDateString('it-IT')}`}
        </div>
      </div>
    </div>
  );
}

function EntryForm({ entry, sectionId, sectionDef, onSave, onCancel }) {
  const [title, setTitle]       = useState(entry?.title || '');
  const [content, setContent]   = useState(entry?.content || '');
  const [status, setStatus]     = useState(entry?.status || 'todo');
  const [priority, setPriority] = useState(entry?.priority || 'medium');
  const [saving, setSaving]     = useState(false);

  async function handleSave() {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    await onSave({ title: title.trim(), content: content.trim(), status, priority });
    setSaving(false);
  }

  const inputStyle = { width: '100%', padding: '7px 10px', border: `1px solid ${T.gold}`, borderRadius: 0, fontFamily: fontBody, fontSize: 13, color: T.ink, background: T.surface, outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, display: 'block', marginBottom: 5 };

  return (
    <div style={{ border: `1px solid ${T.gold}`, borderRadius: 0, background: T.goldBg, padding: 16, marginBottom: 12 }}>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Titolo *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titolo della voce" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Contenuto * (markdown supportato: **grassetto**, `codice`, - lista)</label>
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={5} placeholder="Descrizione, specifiche, note..." style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {sectionDef?.hasPriority && (
          <div>
            <label style={labelStyle}>Priorità</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 10px' }}>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Bassa</option>
            </select>
          </div>
        )}
        {sectionDef?.hasStatus && (
          <div>
            <label style={labelStyle}>Stato</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 10px' }}>
              <option value="todo">Da iniziare</option>
              <option value="in_progress">In corso</option>
              <option value="waiting">In attesa di budget</option>
            </select>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={handleSave} disabled={saving || !title.trim() || !content.trim()} style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '6px 16px',
          background: T.ink, color: '#fff', border: 'none', borderRadius: 0, cursor: saving ? 'wait' : 'pointer',
          fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
          opacity: (!title.trim() || !content.trim()) ? 0.5 : 1,
        }}>
          <Check size={12} /> {saving ? 'Salvataggio…' : 'Salva'}
        </button>
        <button onClick={onCancel} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 0, cursor: 'pointer', color: T.muted, fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          <X size={12} /> Annulla
        </button>
      </div>
    </div>
  );
}

function Section4({ canEdit, userEmail, isMobile }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('planned_features');
  const [editingEntry, setEditingEntry] = useState(null); // { entry } or null
  const [showNewForm, setShowNewForm]   = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getWikiEntries()
      .then(setEntries)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(fields) {
    try {
      const created = await createWikiEntry({ ...fields, section: activeSection, createdBy: userEmail });
      setEntries(prev => [...prev, created]);
      setShowNewForm(false);
    } catch (e) { setError(e.message); }
  }

  async function handleUpdate(id, fields) {
    try {
      const updated = await updateWikiEntry(id, { ...fields, updatedBy: userEmail });
      setEntries(prev => prev.map(e => e.id === id ? updated : e));
      setEditingEntry(null);
    } catch (e) { setError(e.message); }
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare questa voce?')) return;
    try {
      await deleteWikiEntry(id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (e) { setError(e.message); }
  }

  const sectionEntries = entries.filter(e => e.section === activeSection);
  const sectionDef = SECTIONS.find(s => s.id === activeSection);

  return (
    <div>
      <SectionTitle>Roadmap futura</SectionTitle>
      <Prose>Area editabile da editor e super_admin. Usa il markdown per formattare: **grassetto**, `codice`, - liste puntate.</Prose>

      {isMobile && canEdit && (
        <div style={{ background: T.goldBg, border: `1px solid ${T.gold}`, padding: '10px 14px', marginBottom: 16, fontFamily: fontBody, fontSize: 12, color: T.goldDark }}>
          L'editing è disponibile solo da desktop.
        </div>
      )}

      {error && <div style={{ background: T.alertBg, border: `1px solid ${T.alert}`, padding: '10px 14px', marginBottom: 14, fontFamily: fontBody, fontSize: 12, color: T.alertText }}>{error}</div>}

      {/* Sottosezioni */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${T.line}`, marginBottom: 20, flexWrap: 'wrap' }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => { setActiveSection(s.id); setShowNewForm(false); setEditingEntry(null); }} style={{
            padding: '9px 16px', background: 'transparent', border: 'none',
            borderBottom: activeSection === s.id ? `2px solid ${T.gold}` : '2px solid transparent',
            marginBottom: -1, cursor: 'pointer',
            fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: activeSection === s.id ? T.ink : T.muted,
            fontWeight: activeSection === s.id ? 700 : 400,
          }}>{s.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ fontFamily: fontBody, fontSize: 13, color: T.muted }}>Caricamento…</div>
      ) : (
        <>
          {sectionEntries.length === 0 && !showNewForm && (
            <div style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, fontStyle: 'italic', padding: '16px 0' }}>
              Nessuna voce in questa sezione. {canEdit && !isMobile && 'Usa "Aggiungi voce" per iniziare.'}
            </div>
          )}

          {sectionEntries.map(entry => (
            editingEntry?.id === entry.id ? (
              <EntryForm
                key={entry.id}
                entry={entry}
                sectionId={activeSection}
                sectionDef={sectionDef}
                onSave={fields => handleUpdate(entry.id, fields)}
                onCancel={() => setEditingEntry(null)}
              />
            ) : (
              <EntryCard
                key={entry.id}
                entry={entry}
                canEdit={canEdit && !isMobile}
                onEdit={e => { setEditingEntry(e); setShowNewForm(false); }}
                onDelete={handleDelete}
              />
            )
          ))}

          {showNewForm && (
            <EntryForm
              sectionId={activeSection}
              sectionDef={sectionDef}
              onSave={handleCreate}
              onCancel={() => setShowNewForm(false)}
            />
          )}

          {canEdit && !isMobile && !showNewForm && (
            <button onClick={() => { setShowNewForm(true); setEditingEntry(null); }} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', marginTop: 8,
              background: 'transparent', border: `1px dashed ${T.line}`, borderRadius: 0,
              cursor: 'pointer', color: T.muted, fontFamily: fontTitle, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
              transition: 'border-color 0.15s, color 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.ink; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.color = T.muted; }}
            >
              <Plus size={12} /> Aggiungi voce
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Main view ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'panoramica',   label: 'Panoramica' },
  { id: 'tecnica',      label: 'Documentazione tecnica' },
  { id: 'changelog',    label: 'Changelog' },
  { id: 'roadmap',      label: 'Roadmap futura' },
];

export default function KnowledgeBaseView({ isEditor, isSuperAdmin, userEmail, embedded = false }) {
  const [tab, setTab] = useState('panoramica');
  const canEdit = isEditor || isSuperAdmin;
  const isMobile = window.innerWidth < 600;

  return (
    <div style={embedded ? {} : { maxWidth: 860, margin: '0 auto', padding: '32px 24px 80px' }}>

      {/* Header — solo se non embedded */}
      {!embedded && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: fontTitle, fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: T.gold, marginBottom: 4 }}>
            Golden Goose Digital
          </div>
          <h1 style={{ fontFamily: fontTitle, fontSize: 28, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: T.ink, margin: '0 0 6px' }}>
            Knowledge Base
          </h1>
          <div style={{ fontFamily: fontBody, fontSize: 13, color: T.muted }}>
            Documentazione tecnica e strategica del Digital Team Assistant
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${T.line}`, marginBottom: 32 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 18px', background: 'transparent', border: 'none',
            borderBottom: tab === t.id ? `2px solid ${T.gold}` : '2px solid transparent',
            marginBottom: -1, cursor: 'pointer',
            fontFamily: fontTitle, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: tab === t.id ? T.ink : T.muted,
            fontWeight: tab === t.id ? 700 : 400,
            transition: 'color 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      {tab === 'panoramica' && <Section1 />}
      {tab === 'tecnica'    && <Section2 />}
      {tab === 'changelog'  && <Section3 />}
      {tab === 'roadmap'    && <Section4 canEdit={canEdit} userEmail={userEmail} isMobile={isMobile} />}
    </div>
  );
}
