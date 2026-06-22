/**
 * Minimal hash router — no library needed.
 * URLs: #/upload  #/calendar  #/report  #/yoy  #/piano  #/piano/W24
 */

export function isAuthCallback() {
  // Supabase magic link lands with #access_token=... or #error=...
  const hash = window.location.hash;
  return hash.includes('access_token=') || hash.includes('error_code=') || hash.includes('type=magiclink') || hash.includes('type=recovery');
}

export function parseHash() {
  // If this is a Supabase auth callback, treat as 'upload' and let Supabase SDK handle the tokens
  if (isAuthCallback()) return { view: 'upload', param: null };

  const hash = window.location.hash.replace(/^#\/?/, '') || 'upload';
  const parts = hash.split('/');
  const view  = parts[0] || 'upload';
  const param = parts[1] || null;   // e.g. "W24"
  return { view, param };
}

export function pushHash(view, param = null) {
  const hash = param ? `#/${view}/${param}` : `#/${view}`;
  if (window.location.hash !== hash) {
    window.location.hash = hash;
  }
}

export function replaceHash(view, param = null) {
  const hash = param ? `#/${view}/${param}` : `#/${view}`;
  window.location.replace(hash);
}

export function weekParam(weekNum) {
  return `W${weekNum}`;
}

export function parseWeekParam(param) {
  if (!param) return null;
  const m = String(param).match(/W(\d+)/i);
  return m ? parseInt(m[1]) : null;
}
