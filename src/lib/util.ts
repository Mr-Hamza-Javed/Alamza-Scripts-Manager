import { DEFAULT_TAGS, mergeTags, migrateSettings, type TagDef } from './constants';

export const uid = () => Math.random().toString(36).slice(2, 9);
export const tok = () => Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
export const now = () => Date.now();
/* e-mail → a Firebase-safe key (same rule the database rules check) */
export const ekey = (e: string) => (e || '').trim().toLowerCase().replace(/[.#$/[\]]/g, ',');

export function hashOf(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h);
}

/* Firebase keys may not hold . # $ / [ ] — tag names like IMAGE/B-ROLL can. Encode reversibly. */
export function tagKeyForFirebase(name: string) {
  return encodeURIComponent(String(name || '')).replace(/~/g, '%7E').replace(/\./g, '%2E').replace(/%/g, '~');
}
export function tagKeyFromFirebase(key: string) {
  try { return decodeURIComponent(String(key || '').replace(/~([0-9A-Fa-f]{2})/g, '%$1')); }
  catch { return String(key || ''); }
}
export function tagsForFirebase(tags: Record<string, TagDef>) {
  const out: Record<string, TagDef> = {};
  Object.keys(tags || {}).forEach((k) => { out[tagKeyForFirebase(k)] = tags[k]; });
  return out;
}
export function tagsFromFirebase(tags: Record<string, TagDef>) {
  const out: Record<string, TagDef> = {};
  Object.keys(tags || {}).forEach((k) => { out[tagKeyFromFirebase(k)] = tags[k]; });
  return out;
}

/* a script name can hold characters an OS will not take in a file name */
export function safeFileName(name: string, fallback?: string) {
  const base = String(name || '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .trim();
  return (base || fallback || 'script').slice(0, 120);
}

export function shareUrlFor(token: string) {
  return location.origin + location.pathname + location.search + '#/s/' + token;
}
export function readHashToken() {
  const m = (location.hash || '').match(/^#\/s\/([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

export function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
/* Escaped text with every match of q wrapped in <mark>. Escaping runs on each slice,
   so markup inside a shared script stays inert. */
export function markHits(text: string, q: string) {
  const s = String(text == null ? '' : text);
  if (!q) return { __html: esc(s) };
  const hay = s.toLowerCase(), needle = String(q).toLowerCase();
  let out = '', i = 0;
  for (;;) {
    const at = hay.indexOf(needle, i);
    if (at < 0) { out += esc(s.slice(i)); break; }
    out += esc(s.slice(i, at)) + '<mark class="q-hit">' + esc(s.slice(at, at + needle.length)) + '</mark>';
    i = at + needle.length;
  }
  return { __html: out };
}
/* raw editor syntax colours */
export function highlight(txt: string) {
  return esc(txt)
    .replace(/^(#{1,6} .*)$/gm, '<span class="h">$1</span>')
    .replace(/^(\*\*.*\*\*)$/gm, '<span class="b">$1</span>')
    .replace(/(`?)\[([A-Z][A-Z0-9 &amp;/.\-']{1,30})\]:(`?)/g, '<span class="t">$1[$2]:$3</span>')
    .replace(/(\[[^\]\n]*\])(\((?:https?:)?[^)\n]*\))/g, '<span class="l">$1</span><span class="u">$2</span>')
    .replace(/(https?:\/\/[^\s)\]&]+)/g, '<span class="u">$1</span>')
    /* {{chips}} and **bold** inside a cell (never across a cell edge) */
    .replace(/\{\{([^{}\n<>|]+)\}\}/g, '<span class="c">{{$1}}</span>')
    .replace(/\*\*([^*\n<>|]+)\*\*/g, '<span class="b">**$1**</span>')
    .replace(/\|/g, '<span class="p">|</span>');
}

export function download(name: string, text: string, type?: string) {
  const b = new Blob([text], { type: type || 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function legacyCopy(txt: string) {
  try {
    const ta = document.createElement('textarea');
    ta.value = txt;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, txt.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

/* ---------- local storage (same keys as the old app, so existing data keeps working) ---------- */
export const KEY = 'alamza.scripts.v1';
export const VKEY = 'alamza.viewer.prefs';
export const GKEY = 'alamza.guest.accepted';
export const LOCAL_SCHEMA = 4;

export function loadViewerPrefs() { try { return JSON.parse(localStorage.getItem(VKEY) || '{}') || {}; } catch { return {}; } }
export function loadGuestChoice() { try { return localStorage.getItem(GKEY) === '1'; } catch { return false; } }

export function loadLocal() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      let items = d.items, raws = d.raws, doneMap = d.doneMap;
      if (!items && d.scripts) {
        items = {}; raws = {}; doneMap = {};
        d.scripts.forEach((s: any, i: number) => {
          items[s.id] = { type: 'script', name: s.name, parentId: 'root', order: i };
          raws[s.id] = s.raw;
          doneMap[s.id] = s.done || {};
        });
      }
      if (!items) { items = {}; raws = {}; doneMap = {}; }
      return {
        items, raws: raws || {}, doneMap: doneMap || {},
        activeId: d.activeId && items[d.activeId] ? d.activeId : Object.keys(items).find((k) => items[k].type === 'script') || '',
        settings: migrateSettings(d.settings, d.v || 0), tags: mergeTags(d.tags),
        activeLine: d.activeLine || null, openFolders: d.openFolders || {},
      };
    }
  } catch { /* storage blocked or corrupt */ }
  return { items: {}, raws: {}, doneMap: {}, activeId: '', settings: migrateSettings({}), tags: { ...DEFAULT_TAGS }, activeLine: null, openFolders: {} };
}
