export function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export function getISOYear(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

export function getCurrentISOWeek() { return getISOWeek(new Date()); }
export function getCurrentISOYear() { return getISOYear(new Date()); }

export function getWeeksInYear(year) {
  const jan1dow = new Date(year, 0, 1).getDay() || 7;
  const dec31dow = new Date(year, 11, 31).getDay() || 7;
  return jan1dow === 4 || dec31dow === 4 ? 53 : 52;
}

export function weekToMonday(year, week) {
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7;
  const mon = new Date(jan4);
  mon.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

export function getWeekRange(year, week) {
  const monday = weekToMonday(year, week);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
}

// Formato breve "d/m – d/m" (usato da CalendarView)
export function formatWeekRange(year, week) {
  const { start, end } = getWeekRange(year, week);
  const fmt = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

// Formato esteso "02 gen – 08 gen" (usato da Dashboard / nuovo calendario)
export function formatWeekRangeLong(year, week) {
  const mon = weekToMonday(year, week);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt = d => d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  return `${fmt(mon)} – ${fmt(sun)}`;
}
