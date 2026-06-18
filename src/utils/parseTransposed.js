import * as XLSX from 'xlsx';
import { getISOWeek, getISOYear } from './isoWeek.js';

// Detect and parse transposed calendars (weeks as columns, activities as rows)
// Handles the Golden Goose WEEKLY PLAN format
export function tryParseTransposed(wb, file) {
  // Try common sheet names first, then fall back to first sheet
  const sheetPriority = ['WEEKLY PLAN 2026', 'WEEKLY PLAN', 'WEEKLY CALENDAR', 'PIANO SETTIMANALE', wb.SheetNames[0]];
  const sheetName = sheetPriority.find(n => wb.SheetNames.includes(n)) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });

  // Find the row that has "WEEK" or "SETTIMANA" in any column
  const weekRowIdx = rows.findIndex(r =>
    r.some(c => /^(week|settimana)$/i.test(String(c).trim()))
  );
  if (weekRowIdx === -1) return null;

  const weekRow = rows[weekRowIdx];
  // Find column index where week numbers start
  const weekStartCol = weekRow.findIndex(c => /^(week|settimana)$/i.test(String(c).trim())) + 1;

  // Find date row (WEEKDAYS / DATE / DATA)
  const dateRowIdx = rows.findIndex((r, i) =>
    i > weekRowIdx - 2 && i < weekRowIdx + 3 &&
    r.some(c => /^(weekdays?|date|data|giorni?)$/i.test(String(c).trim()))
  );

  // Find activity rows by label patterns
  const comKeywords  = /commercial|commerciale|push com|ecom push|promo/i;
  const brandKeywords = /brand|editoriale|campagna|editorial/i;

  const activityRows = [];
  for (let i = 0; i < rows.length; i++) {
    const label = String(rows[i][2] || rows[i][1] || rows[i][0] || '').trim();
    if (!label) continue;
    if (comKeywords.test(label))  activityRows.push({ rowIdx: i, source: 'commercial', label });
    if (brandKeywords.test(label)) activityRows.push({ rowIdx: i, source: 'brand', label });
  }

  if (!activityRows.length) return null;

  // Detect year from filename or sheet data
  const yearMatch = (file?.name || sheetName || '').match(/20\d{2}/);
  const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

  const activities = [];
  let idCounter = 0;

  // Iterate columns (each column = one week)
  for (let col = weekStartCol; col < weekRow.length; col++) {
    const weekNum = parseInt(weekRow[col]);
    if (!weekNum || isNaN(weekNum) || weekNum < 1 || weekNum > 53) continue;

    // Parse date from date row or derive from week number
    let date = deriveDate(dateRowIdx >= 0 ? rows[dateRowIdx][col] : null, weekNum, year);
    if (!date) continue;

    for (const { rowIdx, source, label } of activityRows) {
      const tema = String(rows[rowIdx][col] || '').trim();
      if (!tema) continue;

      activities.push({
        id: `${source}-${++idCounter}`,
        source,
        date,
        tema,
        descrizione: '',
        canale: label,
        week: getISOWeek(date),
        month: date.getMonth(),
        year: getISOYear(date),
      });
    }
  }

  return activities.length > 0 ? activities : null;
}

function deriveDate(rawDate, weekNum, year) {
  // Try parsing "DD-MM" or "DD/MM" format
  if (rawDate) {
    const s = String(rawDate).trim();
    const m = s.match(/^(\d{1,2})[-\/](\d{1,2})$/);
    if (m) {
      const d = new Date(year, parseInt(m[2]) - 1, parseInt(m[1]));
      if (!isNaN(d)) return d;
    }
  }

  // Fall back: compute Monday of the ISO week
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dow + 1 + (weekNum - 1) * 7);
  return monday;
}
