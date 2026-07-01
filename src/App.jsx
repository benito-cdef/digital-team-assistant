import { useState, useCallback, useEffect } from 'react';
import { T, fontTitle } from './tokens.js';
import { loadAll, saveCalendar, KEYS } from './utils/storage.js';
import { parseHash, pushHash } from './utils/router.js';
import {
  getOrInitPlansManifest, clearManifestCache,
  loadPlanFile, savePlanFile,
  loadCalendarsFromCloud, saveCalendarsToCloud,
  createNewPlan, updatePlanManifestEntry,
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

const PLAN_LS = 'dta:plan';

function planLocalKey(id) { return `${PLAN_LS}:${id}`; }
function loadPlanLocal(id) {
  try { const r = localStorage.getItem(planLocalKey(id)); return r ? JSON.parse(r) : null; } catch { return null; }
}
function savePlanLocal(id, p) {
  try {
    localStorage.setItem(planLocalKey(id), JSON.stringify(p));
    localStorage.setItem(planLocalKey(id) + ':ts', new Date().toISOString());
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
  const [route, setRoute]           = useState(parseHash());
  const [calendars, setCalendars]   = useState(loadAll());
  const [plan, setPlan]             = useState(null);
  const [comparisonPlan, setComparisonPlan] = useState(null); // piano anno precedente per confronto
  const [availablePlans, setAvailablePlans] = useState([]);   // manifest
  const [selectedPlan, setSelectedPlan]     = useState(null); // record dal manifest
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudSaving,  setCloudSaving]  = useState(false);

  // ── Carica manifest + calendari al mount ──────────────────────────────────
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

    getOrInitPlansManifest().then(plans => {
      setAvailablePlans(plans);
      // Seleziona il piano dell'anno corrente di default; altrimenti il più recente
      const currentYear = getCurrentISOYear();
      const defaultPlan = plans.find(p => p.isoYear === currentYear) || plans[plans.length - 1] || null;
      setSelectedPlan(defaultPlan);
    }).catch(() => {});
  }, []);

  // ── Carica piano selezionato + piano confronto (anno precedente) ──────────
  useEffect(() => {
    if (!selectedPlan) return;
    setCloudLoading(true);
    setComparisonPlan(null);

    const local = loadPlanLocal(selectedPlan.id);
    if (local) setPlan(local);

    loadPlanFile(selectedPlan.filename).then(cloudPlan => {
      if (cloudPlan) {
        setPlan(cloudPlan);
        savePlanLocal(selectedPlan.id, cloudPlan);
      } else if (!local) {
        setPlan(null);
      }
      setCloudLoading(false);
    }).catch(() => setCloudLoading(false));

    // Piano confronto: cerca piano con isoYear = selectedPlan.isoYear - 1
    if (selectedPlan.isoYear) {
      const prevYear = selectedPlan.isoYear - 1;
      const prevRecord = availablePlans.find(p => p.isoYear === prevYear);
      if (prevRecord) {
        loadPlanFile(prevRecord.filename).then(setComparisonPlan).catch(() => {});
      }
    }
  }, [selectedPlan]);  // eslint-disable-line react-hooks/exhaustive-deps

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
    if (isEditor) saveCalendarsToCloud(updated).catch(console.error);
  }

  // ── Salva piano da upload ─────────────────────────────────────────────────
  async function handlePlanReady(p) {
    if (!selectedPlan) return;
    setPlan(p);
    savePlanLocal(selectedPlan.id, p);
    if (isEditor) {
      setCloudSaving(true);
      try { await savePlanFile(selectedPlan.filename, p); } catch (e) { console.error(e); }
      setCloudSaving(false);
    }
  }

  // ── Modifica inline + audit trail ─────────────────────────────────────────
  const handlePlanChange = useCallback((weekIdx, path, val) => {
    if (!selectedPlan) return;
    setPlan(prev => {
      if (!prev) return prev;
      const weeks = [...prev.weeks];
      const week = weeks[weekIdx];
      const planYear = selectedPlan.isoYear ?? prev.year ?? getCurrentISOYear();

      try {
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          Object.entries(val).forEach(([k, v]) => {
            const oldV = getPath(week, `${path}.${k}`);
            if (JSON.stringify(oldV ?? null) !== JSON.stringify(v ?? null))
              logPlanChange({ weekNumber: week.week, year: planYear, fieldPath: `${path}.${k}`, oldValue: oldV, newValue: v, changedBy: userEmail });
          });
        } else {
          const oldV = getPath(week, path);
          if (JSON.stringify(oldV ?? null) !== JSON.stringify(val ?? null))
            logPlanChange({ weekNumber: week.week, year: planYear, fieldPath: path, oldValue: oldV, newValue: val, changedBy: userEmail });
        }
      } catch (e) { console.error('audit', e); }

      weeks[weekIdx] = setPath(week, path, val);
      const next = { ...prev, weeks };
      savePlanLocal(selectedPlan.id, next);
      if (isEditor) savePlanFile(selectedPlan.filename, next).catch(console.error);
      return next;
    });
  }, [isEditor, selectedPlan, userEmail]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Rinomina piano esistente
  async function handleRenamePlan(id, newName, newIsoYear) {
    const changes = { name: newName };
    if (newIsoYear) changes.isoYear = newIsoYear;
    await updatePlanManifestEntry(id, changes);
    clearManifestCache();
    const updated = await getOrInitPlansManifest();
    setAvailablePlans(updated);
    if (selectedPlan?.id === id) setSelectedPlan(updated.find(p => p.id === id) ?? selectedPlan);
  }

  // Crea nuovo piano (da Settings modal) e aggiorna manifest
  async function handleCreatePlan({ name, isoYear, description, weeks }) {
    const record = await createNewPlan({ name, isoYear, description, weeks });
    clearManifestCache();
    const updatedManifest = await getOrInitPlansManifest();
    setAvailablePlans(updatedManifest);
    setSelectedPlan(record);
    return record;
  }

  const { view, param } = route;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const planYear = selectedPlan?.isoYear ?? getCurrentISOYear();

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      <Header
        view={view} onView={v => navigate(v)} hasPlan={!!plan} isSuperAdmin={isSuperAdmin} userEmail={userEmail}
        availablePlans={availablePlans} selectedPlan={selectedPlan}
        onSelectPlan={p => { setSelectedPlan(p); navigate('piano'); }}
      />

      {cloudSaving && (
        <div style={{
          position: 'fixed', top: 56, left: 0, right: 0, zIndex: 99,
          background: T.gold, color: T.ink, padding: '6px 24px',
          fontFamily: fontTitle, fontSize: 11,
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
            availablePlans={availablePlans}
            onCreatePlan={handleCreatePlan}
            onRenamePlan={handleRenamePlan}
          />
        )}

        {view === 'piano' && plan && (
          <PianoView
            plan={plan}
            comparisonPlan={comparisonPlan}
            onChange={handlePlanChange}
            initialWeekParam={param}
            onWeekChange={weekNum => navigate('piano', `W${weekNum}`)}
            isEditor={isEditor}
            userEmail={userEmail}
            planYear={planYear}
          />
        )}
        {view === 'piano' && !plan && !cloudLoading && (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ fontFamily: fontTitle, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9791' }}>
              {selectedPlan ? `Nessun dato per "${selectedPlan.name}"` : 'Nessun piano selezionato'}
            </p>
            {isEditor && (
              <button onClick={() => navigate('settings')} style={{
                marginTop: 16, padding: '8px 20px', background: T.ink, color: '#fff',
                border: 'none', borderRadius: 0, fontFamily: fontTitle,
                fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
              }}>Vai a Settings →</button>
            )}
          </div>
        )}
        {view === 'piano' && !plan && cloudLoading && (
          <div style={{ padding: 48, textAlign: 'center', color: '#9A9791', fontFamily: fontTitle, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
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
