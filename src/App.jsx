import { useState, useCallback, useEffect } from 'react';
import { T } from './tokens.js';
import { loadAll } from './utils/storage.js';
import { parseHash, pushHash } from './utils/router.js';
import { loadPlanFromCloud, savePlanToCloud } from './utils/cloudStorage.js';
import Header from './components/Header.jsx';
import HomeView from './views/HomeView.jsx';
import CalendarView from './views/CalendarView.jsx';
import YoYView from './views/YoYView.jsx';
import PianoView from './views/PianoView.jsx';

const PLAN_KEY = 'dta:plan';

function loadPlanLocal() {
  try { const r = localStorage.getItem(PLAN_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function savePlanLocal(p) {
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(p));
    localStorage.setItem(PLAN_KEY + ':ts', new Date().toISOString());
  } catch { /* quota exceeded — ignora */ }
}

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

export default function App({ userEmail, isEditor }) {
  const [route, setRoute]         = useState(parseHash());
  const [calendars, setCalendars] = useState(loadAll());
  const [plan, setPlan]           = useState(loadPlanLocal());
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudSaving,  setCloudSaving]  = useState(false);

  // ── Al mount: carica il piano dal cloud ──────────────────────────────────
  useEffect(() => {
    loadPlanFromCloud().then(cloudPlan => {
      if (cloudPlan) {
        setPlan(cloudPlan);
        savePlanLocal(cloudPlan); // cache locale per offline
      }
      setCloudLoading(false);
    }).catch(() => setCloudLoading(false));
  }, []);

  // ── Hash routing ─────────────────────────────────────────────────────────
  useEffect(() => {
    function onHashChange() { setRoute(parseHash()); }
    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) pushHash('home');
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function navigate(view, param = null) { pushHash(view, param); }
  function refresh() { setCalendars(loadAll()); }

  // ── Salva piano (cloud + locale) — solo editor ───────────────────────────
  async function handlePlanReady(p) {
    setPlan(p);
    savePlanLocal(p);
    if (isEditor) {
      setCloudSaving(true);
      try { await savePlanToCloud(p); } catch (e) { console.error('Cloud save error', e); }
      setCloudSaving(false);
    }
  }

  // ── Modifica inline dal Piano view ───────────────────────────────────────
  const handlePlanChange = useCallback((weekIdx, path, val) => {
    setPlan(prev => {
      if (!prev) return prev;
      const weeks = [...prev.weeks];
      weeks[weekIdx] = setPath(weeks[weekIdx], path, val);
      const next = { ...prev, weeks };
      savePlanLocal(next);
      if (isEditor) savePlanToCloud(next).catch(console.error);
      return next;
    });
  }, [isEditor]);

  const { view, param } = route;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      <Header view={view} onView={v => navigate(v)} hasPlan={!!plan} />

      {/* Banner salvataggio cloud */}
      {cloudSaving && (
        <div style={{
          position: 'fixed', top: 56, left: 0, right: 0, zIndex: 99,
          background: T.gold, color: T.ink, padding: '6px 24px',
          fontFamily: "'Arial Narrow', Arial", fontSize: 11,
          letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center',
        }}>
          Salvataggio in corso…
        </div>
      )}

      <main key={view} style={prefersReduced ? {} : { animation: 'fadeIn 280ms ease both' }}>

        {view === 'home' && (
          <HomeView
            calendars={calendars}
            onCalendarChange={refresh}
            onGo={() => navigate('calendar')}
            onPlanReady={handlePlanReady}
            plan={plan}
            onGoToPiano={() => navigate('piano')}
            isEditor={isEditor}
            cloudLoading={cloudLoading}
          />
        )}
        {/* Retrocompatibilità vecchi link */}
        {(view === 'upload' || view === 'report') && navigate('home')}
        {view === 'calendar' && <CalendarView calendars={calendars} />}
        {view === 'yoy'      && <YoYView      calendars={calendars} />}

        {view === 'piano' && plan && (
          <PianoView
            plan={plan}
            onChange={handlePlanChange}
            initialWeekParam={param}
            onWeekChange={(weekNum) => navigate('piano', `W${weekNum}`)}
            isEditor={isEditor}
          />
        )}
        {view === 'piano' && !plan && !cloudLoading && (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ fontFamily: "'Arial Narrow', Arial", fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9791' }}>
              Carica il MASTER CALENDAR per accedere al piano settimanale
            </p>
            {isEditor && (
              <button onClick={() => navigate('upload')} style={{
                marginTop: 16, padding: '8px 20px', background: T.ink, color: '#fff',
                border: 'none', borderRadius: 2, fontFamily: "'Arial Narrow', Arial",
                fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
              }}>Vai all'upload →</button>
            )}
          </div>
        )}
        {view === 'piano' && !plan && cloudLoading && (
          <div style={{ padding: 48, textAlign: 'center', color: '#9A9791', fontFamily: "'Arial Narrow', Arial", fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Caricamento dati…
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
