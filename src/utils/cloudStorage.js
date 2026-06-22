/**
 * Salva e carica i dati del calendario su Supabase Storage.
 * Il file plan.json è pubblico in lettura → condiviso tra tutti gli utenti.
 * La scrittura è permessa a tutti (il controllo editor è nel frontend).
 */

const SUPABASE_URL  = 'https://xnekmhtmapkxzcrdzhoh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuZWttaHRtYXBreHpjcmR6aG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMzU1NTAsImV4cCI6MjA5NzcxMTU1MH0.YY6pXD3Icr_s5HpCDrE-J9466oZdw9jIVqXuj_RluS8';
const BUCKET       = 'calendar-data';
const FILE_NAME    = 'plan.json';

const PUBLIC_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${FILE_NAME}`;
const UPLOAD_URL = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${FILE_NAME}`;

/**
 * Carica il piano dal cloud.
 * Ritorna l'oggetto piano oppure null se non esiste ancora.
 */
export async function loadPlanFromCloud() {
  try {
    const res = await fetch(PUBLIC_URL + '?t=' + Date.now()); // cache-bust
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Salva il piano sul cloud (sovrascrive il file esistente).
 * Richiede che l'utente sia un editor (controllato nel frontend prima di chiamare).
 */
export async function savePlanToCloud(planData) {
  const body = JSON.stringify(planData);

  // Prima proviamo UPDATE (file già esiste), poi INSERT se 404
  for (const method of ['PUT', 'POST']) {
    const res = await fetch(UPLOAD_URL, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'x-upsert': 'true',
      },
      body,
    });
    if (res.ok) return true;
    if (method === 'POST') throw new Error(await res.text());
  }
}
