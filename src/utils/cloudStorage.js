/**
 * Salva e carica i dati su Supabase Storage (bucket pubblico).
 * Tutti i file sono public in lettura → condivisi tra tutti gli utenti.
 * La scrittura è permessa tramite anon key (controllo editor nel frontend).
 *
 * Files nel bucket 'calendar-data':
 *   plan_{year}.json → dati Piano per anno (es. plan_2026.json)
 *   calendars.json   → attività commerciali e brand (per Calendario, Report, YoY)
 */

const SUPABASE_URL  = 'https://xnekmhtmapkxzcrdzhoh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuZWttaHRtYXBreHpjcmR6aG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMzU1NTAsImV4cCI6MjA5NzcxMTU1MH0.YY6pXD3Icr_s5HpCDrE-J9466oZdw9jIVqXuj_RluS8';
const BUCKET = 'calendar-data';

async function cloudLoad(fileName) {
  try {
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}?t=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function cloudSave(fileName, data) {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON}`,
      'x-upsert': 'true',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    // Se PUT fallisce (file non esiste ancora) prova POST
    const res2 = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'x-upsert': 'true',
      },
      body: JSON.stringify(data),
    });
    if (!res2.ok) throw new Error(await res2.text());
  }
  return true;
}

// ── Migrazione legacy plan.json → plan_2026.json ──────────────────────────
// Se plan_2026.json non esiste ma plan.json sì, copia il contenuto una volta.
let migrationDone = false;
async function migrateLegacyPlan() {
  if (migrationDone) return;
  migrationDone = true;
  try {
    const existing2026 = await cloudLoad('plan_2026.json');
    if (existing2026) return; // già migrato
    const legacy = await cloudLoad('plan.json');
    if (legacy) {
      await cloudSave('plan_2026.json', legacy);
    }
  } catch (e) {
    console.error('Legacy plan migration error:', e);
  }
}

// ── Piano per anno ────────────────────────────────────────────────────────
export async function loadPlanFromCloud(year) {
  await migrateLegacyPlan();
  return cloudLoad(`plan_${year}.json`);
}
export const savePlanToCloud = (year, data) => cloudSave(`plan_${year}.json`, data);

// ── Lista anni con piano disponibile ──────────────────────────────────────
export async function listAvailablePlanYears() {
  try {
    const url = `${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({ prefix: '', limit: 1000, sortBy: { column: 'name', order: 'asc' } }),
    });
    if (!res.ok) return [];
    const files = await res.json();
    const years = [];
    for (const f of files) {
      const m = (f.name || '').match(/^plan_(\d{4})\.json$/);
      if (m) years.push(parseInt(m[1]));
    }
    return years.sort((a, b) => a - b);
  } catch {
    return [];
  }
}

// ── Calendari (attività per Calendario / Report / YoY) ───────────────────
export const loadCalendarsFromCloud  = () => cloudLoad('calendars.json');
export const saveCalendarsToCloud    = (data) => cloudSave('calendars.json', data);
