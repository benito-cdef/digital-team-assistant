// Genera dati fake deterministici per la modalità presentazione.
// SALT cambia a ogni sessione → i valori fake sono diversi da sessione a sessione
// ma costanti per tutta la sessione corrente (niente flickering a ogni re-render).
const SALT = Math.floor(Math.random() * 99999) + 1;

function lcg(seed) {
  return (((seed * 1664525 + 1013904223) ^ SALT) & 0x7fffffff) >>> 0;
}
function r(seed) { return lcg(seed) / 0x7fffffff; } // [0, 1)

// Valore euro fake dello stesso ordine di grandezza del reale
export function fakeEuro(real, seed = 0) {
  if (real === null || real === undefined) return real;
  const abs = Math.abs(real);
  const mag = Math.pow(10, Math.max(4, Math.floor(Math.log10(abs + 1))));
  const fake = Math.round(mag * (3 + r(Math.round(abs / 1000) + seed) * 7));
  return real < 0 ? -fake : fake;
}

// Delta percentuale fake tra -20% e +20%
export function fakeDelta(seed = 0) {
  return r(seed + 777) * 0.4 - 0.2;
}
