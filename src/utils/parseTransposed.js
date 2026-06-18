import * as XLSX from 'xlsx';
import { getISOWeek, getISOYear } from './isoWeek.js';

/**
 * Parser for Golden Goose WEEKLY PLAN format:
 * - Weeks in columns (row 6 = week numbers)
 * - Activities in rows
 * - Dates are day-range labels like "29-04" (NOT DD/MM — they're start-end day ranges)
 *
 * Row map:
 *  4  = Commercial push         → commercial
 *  5  = Brand Push              → brand
 * 16  = LAST YEAR               → commercial (prev year)
 * 17  = WEEK TOPIC              → commercial
 * 18  = 1 MAIN CAMPAIGN        → brand
 * 19  = 2 COMMERCIAL           → commercial
 * 20  = 3 OPPORTUNITY          → brand
 * 21  = 4 CORPORATE            → commercial
 * 22  = 5 REGIONAL TOPIC       → brand
 * 23  = MARKETING ACTIVATIONS  → brand
 */

const ROW_DEFS = [
  { idx: 4,  source: 'commercial', canale: 'Commercial Push',        prevYear: false },
  { idx: 5,  source: 'brand',      canale: 'Brand Push',             prevYear: false },
  { idx: 16, source: 'commercial', canale: 'Last Year (2025)',        prevYear: true  },
  { idx: 17, source: 'commercial', canale: 'Week Topic',              prevYear: false },
  { idx: 18, source: 'brand',      canale: 'Main Campaign',           prevYear: false },
  { idx: 19, source: 'commercial', canale: 'Commercial',              prevYear: false },
  { idx: 20, source: 'brand',      canale: 'Opportunity',             prevYear: false },
  { idx: 21, source: 'commercial', canale: 'Corporate',               prevYear: false },
  { idx: 22, source: 'brand',      canale: 'Regional Topic',          prevYear: false },
  { idx: 23, source: 'brand',      canale: 'Marketing Activations',   prevYear: false },
];

export function tryParseTransposed(wb, file) {
  const sheetName = findBestSheet(wb);
  if (!sheetName) return null;

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });

  // Find the row with week numbers
  const weekRowIdx = rows.findIndex(r =>
    r.some(c => /^(week|settimana)$/i.test(String(c).trim()))
  );
  if (weekRowIdx === -1) return null;

  const weekRow = rows[weekRowIdx];
  const weekColIdx = weekRow.findIndex(c => /^(week|settimana)$/i.test(String(c).trim()));
  const startCol = weekColIdx + 1;

  // Extract year from filename or sheet name
  const yearMatch = (file?.name || sheetName || '').match(/20(\d{2})/);
  const year = yearMatch ? parseInt('20' + yearMatch[1]) : new Date().getFullYear();

  // Build week→column index map
  const weekColMap = {}; // weekNum → colIndex
  for (let col = startCol; col < weekRow.length; col++) {
    const w = parseInt(weekRow[col]);
    if (w >= 1 && w <= 53) weekColMap[w] = col;
  }

  const activities = [];
  let idCounter = 0;

  for (const def of ROW_DEFS) {
    if (def.idx >= rows.length) continue;
    const row = rows[def.idx];

    for (const [weekStr, col] of Object.entries(weekColMap)) {
      const weekNum = parseInt(weekStr);
      const tema = String(row[col] || '').trim();
      if (!tema) continue;

      const actYear = def.prevYear ? year - 1 : year;
      const date = weekToMonday(actYear, weekNum);

      activities.push({
        id: `${def.source}-${def.canale.replace(/\s/g,'')}-${++idCounter}`,
        source: def.source,
        date,
        tema,
        descrizione: '',
        canale: def.canale,
        week: getISOWeek(date),
        month: date.getMonth(),
        year: getISOYear(date),
        isPrevYear: def.prevYear,
      });
    }
  }

  return activities.length > 0 ? activities : null;
}

function findBestSheet(wb) {
  const priority = [
    'WEEKLY PLAN 2026', 'WEEKLY PLAN 2025', 'WEEKLY PLAN 2024',
    'WEEKLY PLAN', 'PIANO SETTIMANALE', 'CALENDAR',
  ];
  const found = priority.find(n => wb.SheetNames.includes(n));
  if (found) return found;
  // Fallback: first sheet with "WEEK" in name
  return wb.SheetNames.find(n => /week|piano|calendar/i.test(n)) || null;
}

function weekToMonday(year, week) {
  // ISO 8601: Week 1 = week containing first Thursday of the year
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7; // Monday=1 … Sunday=7
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
