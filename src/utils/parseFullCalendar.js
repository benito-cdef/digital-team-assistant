import * as XLSX from 'xlsx';

// ── Row maps (0-based) ─────────────────────────────────────────────────────
//
// 2026 format:
//   R0  QUARTER  R1  MONTH
//   R4  Commercial  R5  Brand Push
//   R6  WEEK  R7  WEEKDAYS
//   R8  ECOM LY  R9  ECOM BDG  R10 ΔLY  R11 ECOM ACT  R12 ΔACT
//   R13 RTL LY  R14 RTL BDG
//   R16 LAST YEAR  R17 WEEK TOPIC
//   R18 MAIN CAMPAIGN  R19 COMMERCIAL  R20 OPPORTUNITY  R21 CORPORATE  R22 REGIONAL
//   R23 TUE WW  R24 TUE SKU  R25 TUE NOTE  R26 TUE IMAGE
//   R27 WED TOPIC  R28 WED EU  R29 WED US  R30 WED KR
//   R31 THU TOPIC  R32 THU EU  R33 THU US  R34 THU KR
//   R35 FRI TOPIC  R36 FRI EU  R37 FRI US  R38 FRI KR
//   R39 FRI APP  R40 FRI PRODUCT  R41 FRI IMAGE
//   R42 SAT TOPIC  R43 SAT SKU  R44 SATURDAY
//
// 2025 format: 2 extra rows (Monthly Budget + Actual) at R2-R3,
//   and 2 extra rows in performance (Forecast R10, FCT3 R13).
//   No RTL rows. No TUE_WW separate row. No SAT_TOPIC/SAT_SKU.
//   Everything from LAST_YEAR onwards shifted -1 vs 2026.

const R2026 = {
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
  // 2026: R42-43 vuote, i dati Saturday sono a R44
  SAT_TOPIC:     null,
  SAT_SKU:       null,
  SATURDAY:      44,
};

const R2025 = {
  QUARTER:       0,
  MONTH:         1,
  // R2 = Monthly Budget, R3 = Monthly Actual (skipped)
  COMMERCIAL:    4,
  BRAND_PUSH:    5,
  WEEK:          6,
  WEEKDAYS:      7,
  ECOM_LY:       8,
  ECOM_BDG:      9,
  // R10 = Forecast (skipped), R13 = FCT3 (skipped)
  ECOM_DELTA_LY: 11,
  ECOM_ACT:      12,
  ECOM_DELTA_ACT:14,
  // No RTL_LY / RTL_BDG
  RTL_LY:        null,
  RTL_BDG:       null,
  LAST_YEAR:     15,
  WEEK_TOPIC:    16,
  MAIN_CAMPAIGN: 17,
  COMMERCIAL2:   18,
  OPPORTUNITY:   19,
  CORPORATE:     20,
  REGIONAL:      21,
  // 2025: Tuesday col B="TUESDAY - WW", col C="NOTE" at R22
  TUE_WW:        null,   // no separate WW row
  TUE_NOTE:      22,
  TUE_SKU:       23,
  // R24 = extra collection name row (skipped)
  TUE_IMAGE:     25,
  WED_TOPIC:     26,     // "REGIONAL BEST SELLER" type header
  WED_EU:        27,
  WED_US:        28,
  WED_KR:        29,
  THU_TOPIC:     null,   // no separate topic row
  THU_EU:        30,
  THU_US:        31,
  THU_KR:        32,
  // R33 = extra Thursday topic row (skipped)
  FRI_TOPIC:     null,
  FRI_EU:        34,
  FRI_US:        35,
  FRI_KR:        36,
  FRI_APP:       37,
  FRI_PRODUCT:   38,
  FRI_APP_IMG:   39,
  // R40-41 empty
  SAT_TOPIC:     null,
  SAT_SKU:       null,
  SATURDAY:      42,
};

// ── Fill merged cells ──────────────────────────────────────────────────────
// SheetJS sheet_to_json lascia vuote le celle all'interno di un merge.
// Questa funzione propaga il valore della prima cella a tutte le altre
// così le attività multi-settimana appaiono in ogni settimana che coprono.
function fillMerges(ws) {
  const merges = ws['!merges'] || [];
  for (const { s, e } of merges) {
    const srcAddr = XLSX.utils.encode_cell({ r: s.r, c: s.c });
    const srcCell = ws[srcAddr];
    if (!srcCell) continue;                          // cella sorgente vuota
    for (let r = s.r; r <= e.r; r++) {
      for (let c = s.c; c <= e.c; c++) {
        if (r === s.r && c === s.c) continue;        // skip origine
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!ws[addr]) {
          ws[addr] = { ...srcCell };                 // copia valore e tipo
        }
      }
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function v(rows, rowIdx, col) {
  if (rowIdx === null || rowIdx === undefined || rowIdx >= rows.length) return '';
  const val = rows[rowIdx]?.[col];
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function num(rows, rowIdx, col) {
  if (rowIdx === null || rowIdx === undefined || rowIdx >= rows.length) return null;
  const val = rows[rowIdx]?.[col];
  if (val === '' || val === undefined || val === null) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function weekToMonday(year, week) {
  const jan4 = new Date(year, 0, 4);
  const dow  = jan4.getDay() || 7;
  const mon  = new Date(jan4);
  mon.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

// Detect 2025 vs 2026 format by inspecting the sheet content.
// In 2025, row 10 col 2 contains "Forecast"; in 2026 it's a delta number.
function detectFormat(rows) {
  const row10c2 = String(rows[10]?.[2] ?? '').toLowerCase();
  if (row10c2.includes('forecast') || row10c2.includes('previsione')) return '2025';
  // Also check row 2 for "Monthly Budget"
  const row2c2 = String(rows[2]?.[2] ?? '').toLowerCase();
  if (row2c2.includes('budget') || row2c2.includes('monthly')) return '2025';
  return '2026';
}

// ── Main export ────────────────────────────────────────────────────────────

export function parseFullCalendar(wb, filename) {
  const sheetPriority = ['WEEKLY PLAN 2026', 'WEEKLY PLAN 2025', 'WEEKLY PLAN 2024', 'WEEKLY PLAN'];
  const sheetName = sheetPriority.find(n => wb.SheetNames.includes(n))
    || wb.SheetNames.find(n => /weekly.?plan/i.test(n));
  if (!sheetName) return null;

  const ws   = wb.Sheets[sheetName];
  fillMerges(ws);   // propaga valori celle unite → attività multi-settimana
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });

  // Detect format: prefer sheet name hint, fallback to content
  const sheetYearMatch = sheetName.match(/20(\d{2})/);
  const fileYearMatch  = (filename || '').match(/20(\d{2})/);
  const hintYear       = sheetYearMatch?.[0] || fileYearMatch?.[0];

  let format;
  if (hintYear === '2025') format = '2025';
  else if (hintYear === '2026') format = '2026';
  else format = detectFormat(rows);

  const R = format === '2025' ? R2025 : R2026;
  const year = hintYear ? parseInt(hintYear) : new Date().getFullYear();

  const weekRow    = rows[R.WEEK];
  const weekColIdx = weekRow.findIndex(c => /^(week|settimana)$/i.test(String(c).trim()));
  if (weekColIdx === -1) return null;
  const startCol = weekColIdx + 1;

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

      commercial: v(rows, R.COMMERCIAL, col),
      brandPush:  v(rows, R.BRAND_PUSH, col),

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
          topic:   v(rows, R.SAT_TOPIC, col),
          skuCode: v(rows, R.SAT_SKU,   col),
          note:    v(rows, R.SATURDAY,  col),
        },
      },
    });
  }

  return { weeks, sheetName, year, format, filename };
}
