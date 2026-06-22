/**
 * Lista delle email che possono caricare/modificare il calendario.
 * Tutti gli altri @goldengoose.com sono in sola lettura.
 * Aggiungi o rimuovi email qui e fai deploy.
 */
export const EDITORS = [
  'b.condemi@goldengoose.com',
  // aggiungi altre email editor qui
];

export function isEditor(email) {
  return EDITORS.includes(email?.trim().toLowerCase());
}
