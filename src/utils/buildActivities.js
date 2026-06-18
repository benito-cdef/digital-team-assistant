import { parseDate, normalizeStr } from './parseDate.js';
import { getISOWeek, getISOYear } from './isoWeek.js';

export function guessMapping(columns) {
  const mapping = { data: null, tema: null, descrizione: null, canale: null };

  const patterns = {
    data:        ['data', 'date', 'golive', 'go live', 'giorno', 'settimana', 'week', 'inizio', 'start', 'dal', 'from'],
    tema:        ['tema', 'titolo', 'title', 'attivita', 'campagna', 'nome', 'iniziativa', 'name', 'attività', 'evento'],
    descrizione: ['descrizione', 'note', 'dettagl', 'brief', 'descrip'],
    canale:      ['canale', 'reparto', 'owner', 'team', 'bu', 'business unit', 'channel', 'categoria'],
  };

  for (const col of columns) {
    const norm = normalizeStr(col);
    for (const [field, keywords] of Object.entries(patterns)) {
      if (mapping[field]) continue;
      if (keywords.some(k => norm.includes(k))) {
        mapping[field] = col;
      }
    }
  }

  return mapping;
}

let idCounter = 0;

export function buildActivities(rows, mapping, source) {
  const activities = [];

  for (const row of rows) {
    const rawDate = mapping.data ? row[mapping.data] : null;
    const rawTema = mapping.tema ? row[mapping.tema] : null;

    if (!rawTema || String(rawTema).trim() === '') continue;

    const date = parseDate(rawDate);
    if (!date) continue;

    const week = getISOWeek(date);
    const year = getISOYear(date);

    activities.push({
      id: `${source}-${++idCounter}`,
      source,
      date,
      tema: String(rawTema).trim(),
      descrizione: mapping.descrizione && row[mapping.descrizione] ? String(row[mapping.descrizione]).trim() : '',
      canale: mapping.canale && row[mapping.canale] ? String(row[mapping.canale]).trim() : '',
      week,
      month: date.getMonth(),
      year,
    });
  }

  return activities.sort((a, b) => a.date - b.date);
}

export function buildActivitiesFromAI(items, source) {
  return buildActivities(
    items,
    { data: 'data', tema: 'tema', descrizione: 'descrizione', canale: 'canale' },
    source
  );
}
