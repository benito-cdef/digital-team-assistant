/**
 * Supabase Storage — bucket 'calendar-data'
 *
 * Files:
 *   plans.json          → manifest di tutti i piani (nome libero, isoYear, filename)
 *   plan_*.json         → dati Piano per ogni calendario
 *   calendars.json      → attività commerciali e brand
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
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON}`,
    'x-upsert': 'true',
  };
  const body = JSON.stringify(data);
  let res = await fetch(url, { method: 'PUT', headers, body });
  if (!res.ok) {
    res = await fetch(url, { method: 'POST', headers, body });
    if (!res.ok) throw new Error(await res.text());
  }
  return true;
}

// ── Slug da nome libero ───────────────────────────────────────────────────
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `plan_${Date.now()}`;
}

// Rileva anno ISO da stringa (es. "FY27" → 2027, "Piano 2026 Draft" → 2026)
export function detectISOYear(name) {
  // 4 cifre (2020-2099)
  const m4 = name.match(/\b(20[2-9]\d)\b/);
  if (m4) return parseInt(m4[1]);
  // 2 cifre dopo FY/AY/YY ecc (FY27 → 2027)
  const m2 = name.match(/[A-Za-z]{0,2}(\d{2})\b/);
  if (m2) { const y = parseInt(m2[1]); if (y >= 20 && y <= 99) return 2000 + y; }
  return null;
}

// ── Manifest plans.json ───────────────────────────────────────────────────

export const loadPlansManifest = () => cloudLoad('plans.json');
export const savePlansManifest = (plans) => cloudSave('plans.json', plans);

// Elenca plan_NNNN.json esistenti nel bucket (fallback quando non c'è manifest)
async function detectLegacyPlans() {
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON}` },
      body: JSON.stringify({ prefix: '', limit: 1000, sortBy: { column: 'name', order: 'asc' } }),
    });
    if (!res.ok) return [];
    const files = await res.json();
    return files
      .map(f => { const m = (f.name || '').match(/^plan_(\d{4})\.json$/); return m ? parseInt(m[1]) : null; })
      .filter(Boolean)
      .sort((a, b) => a - b)
      .map(year => ({
        id: `plan_${year}`,
        name: String(year),
        filename: `plan_${year}.json`,
        isoYear: year,
        description: '',
        createdAt: new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

// Carica manifest oppure lo inizializza dai file esistenti
let manifestCache = null;
export async function getOrInitPlansManifest() {
  if (manifestCache) return manifestCache;
  const existing = await loadPlansManifest();
  if (existing && Array.isArray(existing) && existing.length > 0) {
    manifestCache = existing;
    return existing;
  }
  // Crea manifest dai file legacy
  const legacy = await detectLegacyPlans();
  if (legacy.length > 0) {
    await savePlansManifest(legacy);
    manifestCache = legacy;
    return legacy;
  }
  return [];
}

export function clearManifestCache() { manifestCache = null; }

// ── Operazioni sui piani ──────────────────────────────────────────────────

export const loadPlanFile     = (filename) => cloudLoad(filename);
export const savePlanFile     = (filename, data) => cloudSave(filename, data);

// Crea un nuovo piano nel bucket + aggiorna il manifest
export async function createNewPlan({ name, isoYear, description, weeks }) {
  const id  = slugify(name);
  // Evita collisioni: se id esiste già nel manifest, aggiungi suffisso
  const manifest = await getOrInitPlansManifest();
  const exists = manifest.find(p => p.id === id);
  const finalId  = exists ? `${id}_${Date.now()}` : id;
  const filename = `plan_${finalId}.json`;

  const planData = {
    name, isoYear, filename, description: description || '',
    weeks, createdAt: new Date().toISOString(),
  };

  await cloudSave(filename, planData);

  const record = { id: finalId, name, filename, isoYear, description: description || '', createdAt: planData.createdAt };
  const updated = manifest.filter(p => p.id !== finalId).concat(record).sort((a, b) => (a.isoYear || 0) - (b.isoYear || 0));
  await savePlansManifest(updated);
  manifestCache = updated;

  return record;
}

// Aggiorna la voce nel manifest (es. dopo rename futuro)
export async function updatePlanManifestEntry(id, changes) {
  const manifest = await getOrInitPlansManifest();
  const updated = manifest.map(p => p.id === id ? { ...p, ...changes } : p);
  await savePlansManifest(updated);
  manifestCache = updated;
}

// ── Migrazione legacy plan.json → plan_2026.json (one-time) ──────────────
let migrationDone = false;
export async function migrateLegacyPlan() {
  if (migrationDone) return;
  migrationDone = true;
  try {
    const existing = await cloudLoad('plan_2026.json');
    if (existing) return;
    const legacy = await cloudLoad('plan.json');
    if (legacy) await cloudSave('plan_2026.json', legacy);
  } catch { /* non bloccante */ }
}

// ── Backwards compat (usato da vecchi percorsi) ───────────────────────────
export async function loadPlanFromCloud(year) {
  await migrateLegacyPlan();
  return cloudLoad(`plan_${year}.json`);
}
export const savePlanToCloud = (year, data) => cloudSave(`plan_${year}.json`, data);

// ── Calendari (per anno ISO) ───────────────────────────────────────────────
// calendars_NNNN.json per gli anni nuovi; fallback a calendars.json per il 2026 legacy.
export async function loadCalendarsFromCloud(isoYear) {
  if (isoYear) {
    const year = parseInt(isoYear);
    const specific = await cloudLoad(`calendars_${year}.json`);
    if (specific) return specific;
    if (year === 2026) return cloudLoad('calendars.json');
    return null; // piano nuovo → calendari vuoti
  }
  return cloudLoad('calendars.json');
}
export function saveCalendarsToCloud(data, isoYear) {
  const filename = isoYear ? `calendars_${parseInt(isoYear)}.json` : 'calendars.json';
  return cloudSave(filename, data);
}
