import { useState, useCallback, useEffect } from 'react';
import { T } from './tokens.js';
import { loadAll, saveCalendar, KEYS } from './utils/storage.js';
import { parseHash, pushHash } from './utils/router.js';
import {
  loadPlanFromCloud, savePlanToCloud,
  loadCalendarsFromCloud, saveCalendarsToCloud,
  listAvailablePlanYears,
} from './utils/cloudStorage.js';
import { logPlanChange } from './utils/db.js';
import { getCurrentISOYear } from './utils/isoWeek.js';
import Header from './components/Header.jsx';
import DashboardView from './views/DashboardView.jsx';
import ReportView from './views/HomeView.jsx';
import CalendarView from './views/CalendarView.jsx';
import YoYView from './views/YoYView.jsx';
import PianoView from './views/PianoView.jsx';
import SettingsView from './views/SettingsView.jsx';

const PLAN_KEY = 'dta:plan';

function planLocalKey(year) { return `${PLAN_KEY}:${year}`; }

function loadPlanLocal(year) {
  try { const r = localStorage.getItem(planLocalKey(year)); return r ? JSON.parse(r) : null; } catch { return null; }
}
function savePlanLocal(year, p) {
  try {
    localStorage.setItem(planLocalKey(year), JSON.stringify(p));
    localStorage.setItem(planLocalKey(year) + ':ts', new Date().toISOString());
  } catch { /* quota */ }
}

function setPath(obj, path, val) {
  const clone = structuredClone(obj);
  const keys = path.split('.');
  let cur = clone;
  for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
  const last = keys[keys.length - 1];
  if (val && typeof val === 'object' && !Array.isArray(val) && typeof cur[last] === 'object' && !Array.isArray(cur[last])) {
    cur[last] = { ...cur[last], ...val };
  } else {
    cur[last] = val;
  }
  return clone;
}

function getPath(obj, path) {
  const keys = path.split('.');
  let cur = obj;
  for (const k of keys) { if (cur == null) return undefined; cur = cur[k]; }
  return cur;
}

// Converte il formato localStorage → oggetto calendars che l'app usa
function calendarsFromCloud(data) {
  if (!data) return {};
  const rehydrate = (cal) => {
    if (!cal) return null;
    return {
      ...cal,
      activities: (cal.activities || []).map(a => ({
        ...a,
        date: a.date ? new Date(a.date) : null,
      })),
    };
  };
  return {
    curCom: rehydrate(data.curCom),
    curBra: rehydrate(data.curBra),
    preCom: rehydrate(data.preCom),
    preBra: rehydrate(data.preBra),
  };
}

export default function App({ userEmail, userRole, isEditor, isSuperAdmin }) {
  const [route, setRoute]         = useState(parseHash());
  const [selectedYear, setSelectedYear] = useState(getCurrentISOYear());
  const [calendars, setCalendars] = useState(loadAll());
  const [plan, setPlan]           = useState(() => loadPlanLocal(getCurrentISOYear()));
  const [availableYears, setAvailableYears] = useState([]);
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudSaving,  setCloudSaving]  = useState(false);

  // ── Carica calendari + lista anni una volta ───────────────────────────────
  useEffect(() => {
    loadCalendarsFromCloud().then(cloudCals => {
      if (cloudCals) {
        const hydrated = calendarsFromCloud(cloudCals);
        if (hydrated.curCom) saveCalendar(KEYS.curCom, hydrated.curCom);
        if (hydrated.curBra) saveCalendar(KEYS.curBra, hydrated.curBra);
        if (hydrated.preCom) saveCalendar(KEYS.preCom, hydrated.preCom);
        if (hydrated.preBra) saveCalendar(KEYS.preBra, hydrated.preBra);
        setCalendars(loadAll());
      }
    }).catch(console.error);

    listAvailablePlanYears().then(years => {
      if (years && years.length) setAvailableYears(years);
      else setAvailableYears([getCurrentISOYear()]);
    }).catch(() => setAvailableYears([getCurrentISOYear()]));
  }, []);

  // ── Carica piano per anno selezionato ─────────────────────────────────────
  useEffect(() => {
    setCloudLoading(true);
    const local = loadPlanLocal(selectedYear);
    if (local) setPlan(local);
    loadPlanFromCloud(selectedYear).then(cloudPlan => {
      if (cloudPlan) {
        setPlan(cloudPlan);
        savePlanLocal(selectedYear, cloudPlan);
      } else if (!local) {
        setPlan(null);
      }
      setCloudLoading(false);
    }).catch(() => setCloudLoading(false));
  }, [selectedYear]);

  // ── Hash routing ──────────────────────────────────────────────────────────
  useEffect(() => {
    function onHashChange() { setRoute(parseHash()); }
    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) pushHash('dashboard');
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function navigate(view, param = null) { pushHash(view, param); }

  function refresh() {
    const updated = loadAll();
    setCalendars(updated);
    if (isEditor) {
      saveCalendarsToCloud(updated).catch(console.error);
    }
  }

  // ── Salva piano — solo editor ─────────────────────────────────────────────
  async function handlePlanReady(p) {
    setPlan(p);
    savePlanLocal(selectedYear, p);
    if (isEditor) {
      setCloudSaving(true);
      try { await savePlanToCloud(selectedYear, p); } catch (e) { console.error('Cloud save plan', e); }
      setCloudSaving(false);
    }
  }

  // ── Modifica inline Piano view + audit trail ──────────────────────────────
  const handlePlanChange = useCallback((weekIdx, path, val) => {
    setPlan(prev => {
      if (!prev) return prev;
      const weeks = [...prev.weeks];
      const week = weeks[weekIdx];

      // Audit log: confronta vecchio vs nuovo
      try {
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          // merge object — confronta ogni sotto-campo
          Object.entries(val).forEach(([k, v]) => {
            const oldV = getPath(week, `${path}.${k}`);
            if (JSON.stringify(oldV ?? null) !== JSON.stringify(v ?? null)) {
              logPlanChange({ weekNumber: week.week, year: prev.year ?? selectedYear, fieldPath: `${path}.${k}`, oldValue: oldV, newValue: v, changedBy: userEmail });
            }
          });
        } else {
          const oldV = getPath(week, path);
          if (JSON.stringify(oldV ?? null) !== JSON.stringify(val ?? null)) {
            logPlanChange({ weekNumber: week.week, year: prev.year ?? selectedYear, fieldPath: path, oldValue: oldV, newValue: val, changedBy: userEmail });
          }
        }
      } catch (e) { console.error('audit', e); }

      weeks[weekIdx] = setPath(week, path, val);
      const next = { ...prev, weeks };
      savePlanLocal(selectedYear, next);
      if (isEditor) savePlanToCloud(selectedYear, next).catch(console.error);
      return next;
    });
  }, [isEditor, selectedYear, userEmail]);

  // Crea un nuovo piano (es. nuovo anno) e aggiorna lista anni
  async function handleCreatePlan(year, newPlan) {
    savePlanLocal(year, newPlan);
    try { await savePlanToCloud(year, newPlan); } catch (e) { console.error(e); }
    setAvailableYears(prev => prev.includes(year) ? prev : [...prev, year].sort((a, b) => a - b));
  }

  const { view, param } = route;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      <Header view={view} onView={v => navigate(v)} hasPlan={!!plan} isSuperAdmin={isSuperAdmin} />

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

        {view === 'dashboard' && (
          <DashboardView
            calendars={calendars}
            plan={plan}
            isSuperAdmin={isSuperAdmin}
            onNav={(v, p) => navigate(v, p)}
          />
        )}

        {(view === 'home' || view === 'upload') && navigate('dashboard')}

        {view === 'report' && (
          <ReportView
            calendars={calendars}
            onCalendarChange={refresh}
            onGo={() => navigate('calendar')}
            onPlanReady={handlePlanReady}
            plan={plan}
            onGoToPiano={() => navigate('piano')}
            isEditor={false}
            cloudLoading={cloudLoading}
          />
        )}

        {view === 'calendar' && <CalendarView calendars={calendars} />}
        {view === 'yoy'      && <YoYView      calendars={calendars} />}

        {view === 'settings' && (
          <SettingsView
            userEmail={userEmail}
            isEditor={isEditor}
            isSuperAdmin={isSuperAdmin}
            calendars={calendars}
            onCalendarChange={refresh}
            onPlanReady={handlePlanReady}
            plan={plan}
            availableYears={availableYears}
            onCreatePlan={handleCreatePlan}
          />
        )}

        {view === 'piano' && plan && (
          <PianoView
            plan={plan}
            onChange={handlePlanChange}
            initialWeekParam={param}
            onWeekChange={weekNum => navigate('piano', `W${weekNum}`)}
            isEditor={isEditor}
            userEmail={userEmail}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            availableYears={availableYears}
          />
        )}
        {view === 'piano' && !plan && !cloudLoading && (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ fontFamily: "'Arial Narrow', Arial", fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9791' }}>
              Nessun piano disponibile per l'anno {selectedYear}
            </p>
            {isEditor && (
              <button onClick={() => navigate('settings')} style={{
                marginTop: 16, padding: '8px 20px', background: T.ink, color: '#fff',
                border: 'none', borderRadius: 2, fontFamily: "'Arial Narrow', Arial",
                fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
              }}>Vai a Settings →</button>
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
        @keyframes fadeIn { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        body { margin: 0; }
        button:focus-visible { outline: 2px solid ${T.gold} !important; outline-offset: 2px; }
      `}</style>
    </div>
  );
}
