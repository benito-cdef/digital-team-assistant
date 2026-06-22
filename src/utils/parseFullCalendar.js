import * as XLSX from 'xlsx';

// Row indices (0-based) in WEEKLY PLAN sheet
const R = {
  QUARTER:       0,
  MONTH:         1,
  COMMERCIAL:    4,
  BRAND_PUSH:    5,
  WEEK:          6,
  WEEKDAYS:      7,
  ECOM_LY:       8,
  ECOM_BDG:      9,
  ECOM_DELTA_LY: 10,
  ECOM_ACT:      11,
  ECOM_DELTA_ACT:12,
  RTL_LY:        13,
  RTL_BDG:       14,
  LAST_YEAR:     16,
  WEEK_TOPIC:    17,
  MAIN_CAMPAIGN: 18,
  COMMERCIAL2:   19,
  OPPORTUNITY:   20,
  CORPORATE:     21,
  REGIONAL:      22,
  TUE_WW:        23,
  TUE_SKU:       24,
  TUE_NOTE:      25,
  TUE_IMAGE:     26,
  WED_TOPIC:     27,
  WED_EU:        28,
  WED_US:        29,
  WED_KR:        30,
  THU_TOPIC:     31,
  THU_EU:        32,
  THU_US:        33,
  THU_KR:        34,
  FRI_TOPIC:     35,
  FRI_EU:        36,
  FRI_US:        37,
  FRI_KR:        38,
  FRI_APP:       39,
  FRI_PRODUCT:   40,
  FRI_APP_IMG:   41,
  SAT_TOPIC:     42,
  SAT_SKU:       43,
  SATURDAY:      44,
};

function v(rows, rowIdx, col) {
  if (rowIdx >= rows.length) return '';
  const val = rows[rowIdx]?.[col];
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function num(rows, rowIdx, col) {
  if (rowIdx >= rows.length) return null;
  const val = rows[rowIdx]?.[col];
  if (val === '' || val === undefined || val === null) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function weekToMonday(year, week) {
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7;
  const mon = new Date(jan4);
  mon.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

export function parseFullCalendar(wb, filename) {
  const sheetPriority = ['WEEKLY PLAN 2026', 'WEEKLY PLAN 2025', 'WEEKLY PLAN 2024', 'WEEKLY PLAN'];
  const sheetName = sheetPriority.find(n => wb.SheetNames.includes(n))
    || wb.SheetNames.find(n => /weekly.?plan/i.test(n));
  if (!sheetName) return null;

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });

  const weekRow = rows[R.WEEK];
  const weekColIdx = weekRow.findIndex(c => /^(week|settimana)$/i.test(String(c).trim()));
  if (weekColIdx === -1) return null;
  const startCol = weekColIdx + 1;

  const yearMatch = (filename || sheetName || '').match(/20(\d{2})/);
  const year = yearMatch ? parseInt('20' + yearMatch[1]) : new Date().getFullYear();

  const weeks = [];

  for (let col = startCol; col < weekRow.length; col++) {
    const weekNum = parseInt(weekRow[col]);
    if (!weekNum || isNaN(weekNum) || weekNum < 1 || weekNum > 53) continue;

    const date = weekToMonday(year, weekNum);

    weeks.push({
      week:     weekNum,
      year,
      date:     date.toISOString(),
      quarter:  v(rows, R.QUARTER,  col),
      month:    v(rows, R.MONTH,    col),
      weekdays: v(rows, R.WEEKDAYS, col),

      performance: {
        ecomLY:       num(rows, R.ECOM_LY,       col),
        ecomBudget:   num(rows, R.ECOM_BDG,       col),
        ecomDeltaBdg: num(rows, R.ECOM_DELTA_LY,  col),
        ecomActual:   num(rows, R.ECOM_ACT,        col),
        ecomDeltaAct: num(rows, R.ECOM_DELTA_ACT,  col),
        rtlLY:        num(rows, R.RTL_LY,          col),
        rtlBudget:    num(rows, R.RTL_BDG,         col),
      },

      context: {
        lastYear:  v(rows, R.LAST_YEAR,  col),
        weekTopic: v(rows, R.WEEK_TOPIC, col),
      },

      brand: {
        mainCampaign: v(rows, R.MAIN_CAMPAIGN, col),
        commercial:   v(rows, R.COMMERCIAL2,   col),
        opportunity:  v(rows, R.OPPORTUNITY,   col),
        corporate:    v(rows, R.CORPORATE,     col),
        regional:     v(rows, R.REGIONAL,      col),
      },

      marketing: {
        tuesday: {
          ww:       v(rows, R.TUE_WW,    col),
          note:     v(rows, R.TUE_NOTE,  col),
          skuCode:  v(rows, R.TUE_SKU,   col),
          image:    v(rows, R.TUE_IMAGE, col),
        },
        wednesday: {
          topic: v(rows, R.WED_TOPIC, col),
          eu:    v(rows, R.WED_EU,    col),
          us:    v(rows, R.WED_US,    col),
          kr:    v(rows, R.WED_KR,    col),
        },
        thursday: {
          topic: v(rows, R.THU_TOPIC, col),
          eu:    v(rows, R.THU_EU,    col),
          us:    v(rows, R.THU_US,    col),
          kr:    v(rows, R.THU_KR,    col),
        },
        friday: {
          topic:       v(rows, R.FRI_TOPIC,   col),
          eu:          v(rows, R.FRI_EU,       col),
          us:          v(rows, R.FRI_US,       col),
          kr:          v(rows, R.FRI_KR,       col),
          appTopic:    v(rows, R.FRI_APP,      col),
          productCode: v(rows, R.FRI_PRODUCT,  col),
          appImage:    v(rows, R.FRI_APP_IMG,  col),
        },
        saturday: {
          topic:  v(rows, R.SAT_TOPIC, col),
          skuCode: v(rows, R.SAT_SKU,  col),
          note:    v(rows, R.SATURDAY, col),
        },
      },
    });
  }

  return { weeks, sheetName, year, filename };
}
