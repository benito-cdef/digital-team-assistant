import { useState } from 'react';
import { T } from './tokens.js';
import { loadAll } from './utils/storage.js';
import Header from './components/Header.jsx';
import UploadView from './views/UploadView.jsx';
import CalendarView from './views/CalendarView.jsx';
import ReportView from './views/ReportView.jsx';
import YoYView from './views/YoYView.jsx';

export default function App() {
  const [view, setView]           = useState('upload');
  const [calendars, setCalendars] = useState(loadAll());
  const [animKey, setAnimKey]     = useState(0);

  function refresh() {
    setCalendars(loadAll());
  }

  function changeView(v) {
    setView(v);
    setAnimKey(k => k + 1);
  }

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      <Header view={view} onView={changeView} />
      <main
        key={animKey}
        style={prefersReduced ? {} : { animation: 'fadeIn 280ms ease both' }}
      >
        {view === 'upload'   && <UploadView calendars={calendars} onCalendarChange={refresh} onGo={() => changeView('calendar')} />}
        {view === 'calendar' && <CalendarView calendars={calendars} />}
        {view === 'report'   && <ReportView calendars={calendars} />}
        {view === 'yoy'      && <YoYView calendars={calendars} />}
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
