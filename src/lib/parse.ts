/* Markdown → sections and lines. The research writer never produces the same shape
   twice, so every rule here exists because a real script needed it. */
import { PKEYS, type TagDef } from './constants';
import { mdChips, mdText, parseInlineMd, type MdTok } from './inline';

export type GuideItem = {
  k: string; render: string; color?: string; body?: string;
  chips?: string[]; links?: { t: string; u: string; d?: string }[];
  /** markdown tags: the line as inline tokens (bold, italic, chips, links) */
  md?: MdTok[];
};
export type Line = { n: number; text: string; video: boolean; range?: string; transcript?: string; items: GuideItem[] };
export type Section = { title: string; badge: string; lines: Line[]; notes: string[] };
export type Doc = { sections: Section[]; reg: any; learned: Record<string, TagDef>; total: number };

export function splitCells(row: string, repair: boolean) {
  let s = row.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  const out: string[] = [];
  let cur = '', depth = 0, tick = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\') { cur += ch + (s[i + 1] || ''); i++; continue; }
    if (ch === '`') { tick = !tick; cur += ch; continue; }
    if (repair && !tick && ch === '[') { depth++; cur += ch; continue; }
    if (repair && !tick && ch === ']') { if (depth > 0) depth--; cur += ch; continue; }
    if (ch === '|' && !tick && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}
const isSep = (r: string) => /^\|?[\s:|-]*-{2,}[\s:|-]*\|?$/.test(r.trim()) && r.includes('-');

function collectSources(text: string) {
  const byNum: Record<string, any> = {}, byTitle: any[] = [];
  text.split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    const m = line.match(/^\[(\d+)\]\s*(.+?)\s*[—–-]{1,2}\s*(?:\[[^\]]*\]\()?(https?:\/\/[^\s)\]]+)/);
    if (m) {
      const rec = { n: m[1], t: m[2].replace(/\s*[—–-]\s*$/, '').trim(), u: m[3].replace(/[).,]+$/, '') };
      byNum[m[1]] = rec;
      byTitle.push(rec);
    }
  });
  return { byNum, byTitle };
}
const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function findByTitle(reg: any, title: string) {
  const n = norm(title);
  if (!n) return null;
  let best = null;
  reg.byTitle.forEach((r: any) => {
    const rn = norm(r.t);
    if (rn === n) best = best || r;
    else if (!best && (rn.includes(n) || n.includes(rn)) && Math.min(rn.length, n.length) > 12) best = r;
  });
  return best;
}
function scanBalanced(str: string, from: number) {
  let d = 0;
  for (let i = from; i < str.length; i++) {
    if (str[i] === '(') d++;
    else if (str[i] === ')') { d--; if (d === 0) return i; }
  }
  return -1;
}
export function domainOf(u: string) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } }
function safeHttpUrl(u: string) {
  try {
    const x = new URL(String(u || '').trim());
    return x.protocol === 'http:' || x.protocol === 'https:' ? x.href : '';
  } catch { return ''; }
}

function parseLinks(body: string, reg: any, st: any) {
  const links: { t: string; u: string }[] = [];
  let rest = body;
  rest = rest.replace(/\[\[(\d+)\]\]\(([^)]+)\)/g, (_m, n, u) => {
    const r = st.resolveNumRefs && reg.byNum[n];
    links.push({ t: r ? r.t : 'Source ' + n, u: safeHttpUrl(u) });
    return ' ';
  });
  rest = rest.replace(/\[([^\][]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, t, u) => {
    links.push({ t: t.replace(/\\/g, '').trim(), u });
    return ' ';
  });
  let idx;
  while ((idx = rest.indexOf('▶️(')) !== -1) {
    const close = scanBalanced(rest, idx + 2);
    const inner = close === -1 ? rest.slice(idx + 3) : rest.slice(idx + 3, close);
    const clean = inner.replace(/^\[+/, '').replace(/\]+$/, '').trim();
    const hit: any = st.resolveTitleRefs ? findByTitle(reg, clean) : null;
    if (clean) links.push({ t: hit ? hit.t : clean, u: hit ? hit.u : '' });
    rest = rest.slice(0, idx) + ' ' + (close === -1 ? '' : rest.slice(close + 1));
  }
  rest.replace(/\[(\d+)\](?!\()/g, (_m, n) => {
    const r = st.resolveNumRefs && reg.byNum[n];
    if (r) links.push({ t: r.t, u: r.u });
    return '';
  });
  const bare = rest.match(/https?:\/\/[^\s)\]]+/g) || [];
  bare.forEach((u) => { if (!links.some((l) => l.u === u)) links.push({ t: domainOf(u) || u, u }); });
  const seen: Record<string, 1> = {};
  return links
    .filter((l) => { const k = l.u || l.t; if (seen[k]) return false; seen[k] = 1; return true; })
    .map((l) => ({ ...l, d: domainOf(l.u) }));
}

export function stripMd(s: string) {
  return s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|\s)\*(\S[^*]*?)\*/g, '$1$2')
    .replace(/`+/g, '').replace(/\{\{\s*([^{}]*?)\s*\}\}/g, '$1').replace(/\\([|*_[\]])/g, '$1')
    .replace(/\[([^\]]*)\]\(([^)]+)\)/g, '$1').replace(/\s{2,}/g, ' ').trim();
}
function cleanBody(s: string) {
  return s.replace(/^[\s—–\-·]+/, '').replace(/[\s—–\-·]+$/, '').replace(/\s*\n\s*/g, ' ').trim();
}
function guessRender(name: string, body: string) {
  const n = name.toUpperCase();
  if (/SOURCE|LINK|REF/.test(n)) return 'links';
  if (/OVERLAY|TITLE CARD|LOWER THIRD/.test(n)) return 'overlay';
  if (/TERM|KEYWORD|SHOT LIST|QUERY|SEARCH/.test(n)) return 'chips';
  /* {{chips}} or **bold** in running text: keep the formatting */
  if (/\{\{[^{}\n]+\}\}/.test(body) || /\*\*[^*\n]+\*\*/.test(body)) return 'markdown';
  if ((body.match(/;/g) || []).length >= 2) return 'chips';
  if (/https?:\/\//.test(body) && body.length < 400) return 'links';
  return 'prose';
}
/* a markdown tag keeps its raw text: one line, its marks turned into tokens */
function mdItem(item: GuideItem, raw: string, reg: any, st: any) {
  const line = cleanBody(raw.replace(/<br\s*\/?>/gi, ' '));
  if (!line) return false;
  item.md = parseInlineMd(line, reg, st.resolveNumRefs);
  item.body = mdText(item.md);
  item.chips = mdChips(item.md);
  return !!(item.body || item.chips.length);
}
function splitChips(body: string, mode: string, def: string) {
  const m = mode === 'auto' || !mode ? (def === 'auto' ? (body.includes(';') ? ';' : ',') : def) : mode;
  if (m === 'none') return [body];
  if (m === '—') return body.split(/\s+—\s+and\s+—\s+|\s+—\s+/).map((x) => x.trim()).filter(Boolean);
  return body.split(m).map((x) => x.trim()).filter(Boolean);
}

const TAG_RE = /`?\[([A-Z][A-Z0-9 &/.\-']{1,30})\]:`?/g;

function parseGuide(cell: string, tags: Record<string, TagDef>, reg: any, st: any, learned: Record<string, TagDef>) {
  const src = cell.replace(/<br\s*\/?>/gi, '\n');
  const marks: { name: string; s: number; e: number }[] = [];
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(src)) !== null) marks.push({ name: m[1].trim().toUpperCase(), s: m.index, e: m.index + m[0].length });
  const items: GuideItem[] = [];
  if (!marks.length) {
    const b = cleanBody(stripMd(src));
    if (b) items.push({ k: 'NOTE', body: b, render: 'prose' });
    return items;
  }
  if (marks[0].s > 0) {
    const b = cleanBody(stripMd(src.slice(0, marks[0].s)));
    if (b) items.push({ k: 'NOTE', body: b, render: 'prose' });
  }
  marks.forEach((mk, i) => {
    const raw = src.slice(mk.e, i + 1 < marks.length ? marks[i + 1].s : src.length);
    let def = tags[mk.name];
    if (!def) {
      const g = st.unknownAs === 'auto' ? guessRender(mk.name, raw) : st.unknownAs;
      def = { render: g, color: PKEYS[(mk.name.charCodeAt(0) + mk.name.length) % PKEYS.length], split: 'auto', auto: true };
      if (st.autoDetect) learned[mk.name] = def;
    }
    if (def.render === 'hidden') return;
    const item: GuideItem = { k: mk.name, render: def.render, color: def.color };
    if (def.render === 'links') item.links = parseLinks(raw, reg, st);
    else if (def.render === 'markdown') { if (!mdItem(item, raw, reg, st)) return; }
    else {
      const body = cleanBody(stripMd(raw));
      if (!body) return;
      if (def.render === 'chips' || def.render === 'overlay') item.chips = splitChips(body, def.split, st.defaultSplit);
      item.body = body;
    }
    if (item.render === 'links' && !item.links.length) return;
    items.push(item);
  });
  return items;
}

/* Case-insensitive tag-registry lookup. */
function findTag(tags: Record<string, TagDef>, name: string) {
  if (!name) return null;
  if (tags[name]) return tags[name];
  const up = String(name).toUpperCase();
  if (tags[up]) return tags[up];
  const k = Object.keys(tags).find((t) => t.toUpperCase() === up);
  return k ? tags[k] : null;
}

/* An extra table column becomes its own guide item, labelled with its header. */
function extraColItem(colName: string, content: string, tags: Record<string, TagDef>, reg: any, st: any) {
  const label = String(colName || '').trim().toUpperCase();
  if (!label) return null;
  const def = findTag(tags, label);
  const render = def ? def.render : 'prose';
  if (render === 'hidden') return null;
  const item: GuideItem = { k: label, render, color: def ? def.color : 'slate' };
  if (render === 'links') {
    item.links = parseLinks(content, reg, st);
    if (!item.links.length) return null;
  } else if (render === 'markdown') {
    if (!mdItem(item, content, reg, st)) return null;
  } else {
    const body = cleanBody(stripMd(content));
    if (!body) return null;
    if (render === 'chips' || render === 'overlay') item.chips = splitChips(body, def ? def.split : 'auto', st.defaultSplit);
    item.body = body;
  }
  return item;
}

function parseScriptCell(cell: string) {
  const t = cell.trim();
  const vid = t.match(/^`{1,3}\s*insert video:\s*([\s\S]*)$/i);
  if (!vid) return { text: stripMd(t), video: false };
  let rest = vid[1].replace(/`+$/, '');
  let transcript = '';
  const tm = rest.split(/\*\*transcript:?\*\*/i);
  if (tm.length > 1) { rest = tm[0]; transcript = stripMd(tm.slice(1).join(' ')).trim(); }
  let range = '';
  const parts = rest.split(/\\?\|/);
  let title = parts[0];
  if (parts.length > 1) {
    const cand = parts.slice(1).join('|').trim();
    const rm = cand.match(/\d{1,2}:\d{2}\s*[–\-—]\s*\d{1,2}:\d{2}|clip/i);
    if (rm) range = rm[0];
    if (cand && !rm) title = title + ' — ' + cand;
  }
  return { text: stripMd(title).replace(/^["“]|["”]$/g, '').trim(), video: true, range, transcript };
}

export function parseDoc(md: string, tags: Record<string, TagDef>, st: any): Doc {
  const reg = collectSources(md);
  const learned: Record<string, TagDef> = {};
  const lines = md.split(/\r?\n/);
  const sections: Section[] = [];
  let cur: Section = null;
  let i = 0, lineNo = 0;
  const push = (title: string, badge: string) => { cur = { title, badge, lines: [], notes: [] }; sections.push(cur); };
  while (i < lines.length) {
    const raw = lines[i];
    const h = raw.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      let title = h[2].trim(), badge = '';
      const bm = title.match(/`?\[([A-Z][A-Z0-9 -]{2,24})\]`?\s*$/);
      if (bm) { badge = bm[1]; title = title.slice(0, bm.index).trim(); }
      push(stripMd(title), badge);
      i++;
      continue;
    }
    if (raw.trim().startsWith('|')) {
      const header = splitCells(raw, st.keepBrokenCells);
      let j = i + 1;
      const hasSep = j < lines.length && isSep(lines[j]);
      if (hasSep) j++;
      const lower = header.map((x) => x.toLowerCase());
      let sIdx = lower.findIndex((x) => x && x.includes(st.scriptCol.split(' ')[0]));
      let vIdx = lower.findIndex((x) => x && x.includes(st.visualCol.split(' ')[0]));
      if (sIdx < 0) sIdx = 0;
      if (vIdx < 0) vIdx = 1;
      if (!cur) push('Script', '');
      const startRow = hasSep ? j : i;
      for (let r = startRow; r < lines.length; r++) {
        if (!lines[r].trim().startsWith('|')) { j = r; break; }
        if (isSep(lines[r])) { j = r + 1; continue; }
        const cells = splitCells(lines[r], st.keepBrokenCells);
        const sc = cells[sIdx] || '', vc = cells[vIdx] || '';
        if (!sc && !vc) { j = r + 1; continue; }
        const parsed = parseScriptCell(sc);
        lineNo++;
        /* columns before the visual guide render before its items, columns after it at the end */
        const before: GuideItem[] = [], after: GuideItem[] = [];
        if (st.showExtraCols) {
          for (let ci = 0; ci < cells.length; ci++) {
            if (ci === sIdx || ci === vIdx) continue;
            const content = cells[ci];
            if (!content || !content.trim()) continue;
            const xi = extraColItem(header[ci] || 'Column ' + (ci + 1), content, tags, reg, st);
            if (xi) (ci < vIdx ? before : after).push(xi);
          }
        }
        const items = before.concat(parseGuide(vc, tags, reg, st, learned), after);
        cur.lines.push({ n: lineNo, text: parsed.text, video: parsed.video, range: (parsed as any).range, transcript: (parsed as any).transcript, items });
        j = r + 1;
      }
      i = j;
      continue;
    }
    const t = raw.trim();
    if (t && cur && !/^\[\d+\]/.test(t) && !/^\*\*.*sources\*\*$/i.test(t) && t !== '---' && !/^-{3,}$/.test(t)) cur.notes.push(t);
    i++;
  }
  return { sections: sections.filter((s) => s.lines.length || s.notes.length), reg, learned, total: lineNo };
}
