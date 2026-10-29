/* One line of Markdown for "markdown" tags: **bold**, *italic*, ~~strike~~, {{chip}},
   [title](url), [[7]](url) and bare URLs. Turned into tokens (never into HTML), so a
   shared script cannot inject anything into the page. Lists and multi-line blocks are
   not part of it: the text is one line. */

export type MdTok =
  | { t: 'text'; v: string }
  | { t: 'b' | 'i' | 's'; c: MdTok[] }
  | { t: 'chip'; v: string }
  | { t: 'link'; title: string; u: string; d: string };

function safeUrl(u: string) {
  try {
    const x = new URL(u.trim());
    return x.protocol === 'http:' || x.protocol === 'https:' ? x.href : '';
  } catch { return ''; }
}
function domainOf(u: string) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } }

/* index of the ")" that closes the "(" at `from`, allowing (nested) parentheses in URLs */
function closeParen(s: string, from: number) {
  let d = 0;
  for (let i = from; i < s.length; i++) {
    if (s[i] === '(') d++;
    else if (s[i] === ')') { d--; if (d === 0) return i; }
    else if (s[i] === ' ' && d === 1) return -1;
  }
  return -1;
}
const isWord = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c);

export function parseInlineMd(src: string, reg?: { byNum: Record<string, { t: string }> }, resolveNumRefs = true): MdTok[] {
  const out: MdTok[] = [];
  let text = '';
  const flush = () => { if (text) { out.push({ t: 'text', v: text }); text = ''; } };
  const s = src;
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    const rest = s.slice(i);
    /* \* → a literal star */
    if (ch === '\\' && i + 1 < s.length) { text += s[i + 1]; i += 2; continue; }
    /* backticks already wrap the tag labels (`[SOURCES]:`), so here they mean nothing:
       a stray one is dropped, the same as in prose */
    if (ch === '`') { i++; continue; }
    /* {{chip}} — a clickable chip, copied or searched like a search term */
    if (ch === '{' && s[i + 1] === '{') {
      const end = s.indexOf('}}', i + 2);
      if (end > i + 2) {
        const v = s.slice(i + 2, end).replace(/`/g, '').trim();
        if (v) { flush(); out.push({ t: 'chip', v }); }
        i = end + 2;
        continue;
      }
    }
    /* [[7]](url) — a numbered source, titled from the script's source list */
    if (ch === '[' && s[i + 1] === '[') {
      const m = rest.match(/^\[\[(\d+)\]\]\(/);
      if (m) {
        const open = i + m[0].length - 1, close = closeParen(s, open);
        if (close > 0) {
          const u = safeUrl(s.slice(open + 1, close));
          const r = resolveNumRefs && reg && reg.byNum[m[1]];
          flush();
          if (u) out.push({ t: 'link', title: r ? r.t : 'Source ' + m[1], u, d: domainOf(u) });
          else text += 'Source ' + m[1];
          i = close + 1;
          continue;
        }
      }
    }
    /* [title](url) */
    if (ch === '[') {
      const mid = s.indexOf('](', i);
      const nl = s.indexOf('[', i + 1);
      if (mid > i && (nl < 0 || nl > mid)) {
        const close = closeParen(s, mid + 1);
        if (close > 0) {
          const title = s.slice(i + 1, mid).replace(/\\/g, '').replace(/[*_`~]/g, '').trim();
          const u = safeUrl(s.slice(mid + 2, close));
          flush();
          if (u) out.push({ t: 'link', title: title || domainOf(u) || u, u, d: domainOf(u) });
          else text += title;
          i = close + 1;
          continue;
        }
      }
    }
    /* a bare https:// address */
    if ((ch === 'h' || ch === 'H') && /^https?:\/\//i.test(rest) && !isWord(s[i - 1])) {
      let m = rest.match(/^https?:\/\/[^\s<>"'`]+/i)[0];
      /* trailing punctuation belongs to the sentence, a ")" only if it closes one inside the URL */
      while (/[.,;:!?]$/.test(m) || (m.endsWith(')') && (m.match(/\(/g) || []).length < (m.match(/\)/g) || []).length)) m = m.slice(0, -1);
      const u = safeUrl(m);
      if (u) { flush(); out.push({ t: 'link', title: domainOf(u) || u, u, d: domainOf(u) }); i += m.length; continue; }
    }
    /* **bold** / __bold__ */
    if ((ch === '*' || ch === '_') && s[i + 1] === ch) {
      const mark = ch + ch;
      const end = s.indexOf(mark, i + 2);
      if (end > i + 2 && s[i + 2] !== ' ' && s[end - 1] !== ' ' && (ch === '*' || (!isWord(s[i - 1]) && !isWord(s[end + 2])))) {
        flush();
        out.push({ t: 'b', c: parseInlineMd(s.slice(i + 2, end), reg, resolveNumRefs) });
        i = end + 2;
        continue;
      }
    }
    /* ~~strike~~ */
    if (ch === '~' && s[i + 1] === '~') {
      const end = s.indexOf('~~', i + 2);
      if (end > i + 2) {
        flush();
        out.push({ t: 's', c: parseInlineMd(s.slice(i + 2, end), reg, resolveNumRefs) });
        i = end + 2;
        continue;
      }
    }
    /* *italic* / _italic_ (an underscore only at word edges, so snake_case stays text) */
    if ((ch === '*' || ch === '_') && s[i + 1] && s[i + 1] !== ' ' && s[i + 1] !== ch && (ch === '*' || !isWord(s[i - 1]))) {
      let end = i + 1;
      for (;;) {
        end = s.indexOf(ch, end);
        if (end < 0) break;
        if (s[end - 1] !== ' ' && s[end + 1] !== ch && (ch === '*' || !isWord(s[end + 1]))) break;
        end++;
      }
      if (end > i + 1) {
        flush();
        out.push({ t: 'i', c: parseInlineMd(s.slice(i + 1, end), reg, resolveNumRefs) });
        i = end + 1;
        continue;
      }
    }
    text += ch;
    i++;
  }
  flush();
  return out;
}

/* the words without the marks (search, copy, empty check) */
export function mdText(toks: MdTok[]): string {
  return toks.map((k) => (k.t === 'text' ? k.v : k.t === 'chip' ? k.v : k.t === 'link' ? k.title : mdText(k.c))).join('').replace(/\s{2,}/g, ' ').trim();
}
/* every {{chip}} inside (they also count as search terms) */
export function mdChips(toks: MdTok[], out: string[] = []): string[] {
  toks.forEach((k) => { if (k.t === 'chip') out.push(k.v); else if (k.t === 'b' || k.t === 'i' || k.t === 's') mdChips(k.c, out); });
  return out;
}
export function mdLinks(toks: MdTok[], out: { t: string; u: string }[] = []) {
  toks.forEach((k) => { if (k.t === 'link') out.push({ t: k.title, u: k.u }); else if (k.t === 'b' || k.t === 'i' || k.t === 's') mdLinks(k.c, out); });
  return out;
}
