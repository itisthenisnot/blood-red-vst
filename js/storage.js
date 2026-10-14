// Per-device flags (favorite / own / want), kept in localStorage.
const KEY = 'brv.flags.v1';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

let flags = read();

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(flags));
  } catch {
    // Storage blocked (private mode etc.) — keep working in memory.
  }
}

export function getFlags(id) {
  return flags[id] || {};
}

export function toggleFlag(id, flag) {
  const current = { ...getFlags(id) };
  current[flag] = !current[flag];
  if (!current.fav && !current.own && !current.want) delete flags[id];
  else flags[id] = current;
  write();
  return current[flag];
}

export function savedIds() {
  return Object.keys(flags);
}

export function exportJSON() {
  return JSON.stringify({ app: 'blood-red-vst', version: 1, flags }, null, 2);
}

export function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || typeof data.flags !== 'object') throw new Error('Not a Blood Red VST export');
  flags = { ...flags, ...data.flags };
  write();
}
