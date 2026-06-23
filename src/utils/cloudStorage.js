/**
 * Salva e carica i dati su Supabase Storage (bucket pubblico).
 * Tutti i file sono public in lettura → condivisi tra tutti gli utenti.
 * La scrittura è permessa tramite anon key (controllo editor nel frontend).
 *
 * Files nel bucket 'calendar-data':
 *   plan.json       → dati Piano (52 settimane)
 *   calendars.json  → attività commerciali e brand (per Calendario, Report, YoY)
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

// ── Piano (52 settimane) ──────────────────────────────────────────────────
export const loadPlanFromCloud       = () => cloudLoad('plan.json');
export const savePlanToCloud         = (data) => cloudSave('plan.json', data);

// ── Calendari (attività per Calendario / Report / YoY) ───────────────────
export const loadCalendarsFromCloud  = () => cloudLoad('calendars.json');
export const saveCalendarsToCloud    = (data) => cloudSave('calendars.json', data);
