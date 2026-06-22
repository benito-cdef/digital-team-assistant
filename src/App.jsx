import { useState, useCallback, useEffect } from 'react';
import { T } from './tokens.js';
import { loadAll } from './utils/storage.js';
import Header from './components/Header.jsx';
import UploadView from './views/UploadView.jsx';
import CalendarView from './views/CalendarView.jsx';
import ReportView from './views/ReportView.jsx';
import YoYView from './views/YoYView.jsx';
import PianoView from './views/PianoView.jsx';

const PLAN_KEY = 'dta:plan';

function loadPlan() {
  try { const r = localStorage.getItem(PLAN_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
export function savePlan(p) {
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(p));
    // also update the saved-at timestamp so UploadView can show it
    localStorage.setItem(PLAN_KEY + ':ts', new Date().toISOString());
    return true;
  } catch (e) {
    console.error('savePlan failed:', e);
    return false;
  }
}

// Deep set by dot-path  e.g. 'marketing.tuesday.ww'
// If val is an object, it merges into the target (for block saves)
function setPath(obj, path, val) {
  const clone = structuredClone(obj);
  const keys = path.split('.');
  let cur = clone;
  for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
  const last = keys[keys.length - 1];
  if (val && typeof val === 'object' && !Array.isArray(val) && typeof cur[last] === 'object') {
    cur[last] = { ...cur[last], ...val };
  } else {
    cur[last] = val;
  }
  return clone;
}

export default function App() {
  const [view, setView]           = useState('upload');
  const [calendars, setCalendars] = useState(loadAll());
  const [plan, setPlan]           = useState(loadPlan());
  const [animKey, setAnimKey]     = useState(0);

  function refresh() {
    setCalendars(loadAll());
    setPlan(loadPlan());
  }

  function changeView(v) {
    setView(v);
    setAnimKey(k => k + 1);
  }

  const handlePlanChange = useCallback((weekIdx, path, val) => {
    setPlan(prev => {
      if (!prev) return prev;
      const weeks = [...prev.weeks];
      weeks[weekIdx] = setPath(weeks[weekIdx], path, val);
      const next = { ...prev, weeks };
      savePlan(next);
      return next;
    });
  }, []);

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      <Header view={view} onView={changeView} hasPlan={!!plan} />
      <main
        key={animKey}
        style={prefersReduced ? {} : { animation: 'fadeIn 280ms ease both' }}
      >
        {view === 'upload'   && <UploadView calendars={calendars} onCalendarChange={refresh} onGo={() => changeView('calendar')} onPlanReady={(p) => { savePlan(p); setPlan(p); }} plan={plan} onGoToPiano={() => changeView('piano')} />}
        {view === 'calendar' && <CalendarView calendars={calendars} />}
        {view === 'report'   && <ReportView calendars={calendars} />}
        {view === 'yoy'      && <YoYView calendars={calendars} />}
        {view === 'piano'    && plan && <PianoView plan={plan} onChange={handlePlanChange} />}
        {view === 'piano'    && !plan && (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ fontFamily: "'Arial Narrow', Arial", fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9791' }}>
              Carica il MASTER CALENDAR per accedere al piano settimanale
            </p>
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; }
        body { margin: 0; }
        button:focus-visible { outline: 2px solid ${T.gold} !important; outline-offset: 2px; }
      `}</style>
    </div>
  );
}
