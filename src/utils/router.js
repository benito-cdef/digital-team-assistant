/**
 * Minimal hash router — no library needed.
 * URLs: #/upload  #/calendar  #/report  #/yoy  #/piano  #/piano/W24
 */

export function parseHash() {
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
