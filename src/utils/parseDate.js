// Excel serial date base
const EXCEL_BASE = new Date(1899, 11, 30);

function fromExcelSerial(serial) {
  // Excel bug: treats 1900 as leap year, so offset by 1 for dates > 59
  const days = serial > 59 ? serial - 1 : serial;
  const d = new Date(EXCEL_BASE);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function stripTime(d) {
  if (!(d instanceof Date) || isNaN(d)) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Normalize accented chars for matching
export function normalizeStr(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim();
}

export function parseDate(val) {
  if (val === null || val === undefined || val === '') return null;

  // Already a Date
  if (val instanceof Date) return stripTime(val);

  // Excel serial number
  if (typeof val === 'number') {
    if (val > 1 && val < 100000) return stripTime(fromExcelSerial(val));
    return null;
  }

  const s = String(val).trim();
  if (!s) return null;

  // ISO 8601: 2026-06-18
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return stripTime(new Date(+iso[1], +iso[2] - 1, +iso[3]));

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmy) return stripTime(new Date(+dmy[3], +dmy[2] - 1, +dmy[1]));

  // MM/DD/YYYY (US)
  const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (mdy) {
    const d = new Date(+mdy[3], +mdy[1] - 1, +mdy[2]);
    if (!isNaN(d)) return stripTime(d);
  }

  // "W24 2026" or "W24"
  const week = s.match(/[Ww](\d{1,2})\s*(\d{4})?/);
  if (week) {
    const y = week[2] ? +week[2] : new Date().getFullYear();
    return stripTime(weekToDate(y, +week[1]));
  }

  // Month names (Italian + English)
  const monthsIT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  const monthsEN = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const norm = normalizeStr(s);
  for (let i = 0; i < 12; i++) {
    if (norm.startsWith(monthsIT[i]) || norm.startsWith(monthsEN[i])) {
      const yearMatch = s.match(/\d{4}/);
      const y = yearMatch ? +yearMatch[0] : new Date().getFullYear();
      return stripTime(new Date(y, i, 1));
    }
  }

  // Fallback: try native Date parse
  const native = new Date(s);
  if (!isNaN(native)) return stripTime(native);

  return null;
}

// Get Monday of ISO week
export function weekToDate(year, week) {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}
