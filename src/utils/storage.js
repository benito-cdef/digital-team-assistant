const KEYS = {
  curCom: 'dta:cur:com',
  curBra: 'dta:cur:bra',
  preCom: 'dta:pre:com',
  preBra: 'dta:pre:bra',
};

export { KEYS };

function rehydrate(obj) {
  if (!obj || !obj.activities) return obj;
  return {
    ...obj,
    activities: obj.activities.map(a => ({
      ...a,
      date: a.date ? new Date(a.date) : null,
    })),
  };
}

export function loadCalendar(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return rehydrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveCalendar(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function removeCalendar(key) {
  localStorage.removeItem(key);
}

export function loadAll() {
  return {
    curCom: loadCalendar(KEYS.curCom),
    curBra: loadCalendar(KEYS.curBra),
    preCom: loadCalendar(KEYS.preCom),
    preBra: loadCalendar(KEYS.preBra),
  };
}
