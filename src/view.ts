/* State → what every screen shows. Pure reads; caches keep long scripts snappy. */
import type App from './App';
import type { FlatLine } from './App';
import { ROLE_HINT, ROLE_SHORT } from './lib/constants';
import { stripMd } from './lib/parse';
import { colorOf, isDark, readerVars, softOf } from './lib/tokens';
import { markHits } from './lib/util';
import type { MdTok } from './lib/inline';

export type ItemView = {
  label: string; color: string; soft: string; render: string;
  bodyHtml?: { __html: string };
  chips?: { v: string; html: { __html: string } }[];
  links?: { t: string; u: string; d: string; tHtml: { __html: string }; fav: string }[];
  /** markdown tags: inline tokens and the search word to mark inside them */
  md?: MdTok[]; hl?: string;
  /** what a click on the tag label copies: every chip, every link, or the text */
  copyAll: string; count: number;
};
export type LineView = { l: FlatLine; items: ItemView[]; active: boolean; done: boolean; motion: string; achieved: boolean };
export type SectionView = {
  si: number; title: string; badge: string; count: string; pct: number; allReady: boolean; achieved: boolean;
  open: boolean; hasLines: boolean; notes: string[]; lines: LineView[];
};
export type TreeRow = {
  id: string; header?: boolean; name: string; depth: number; folder: boolean; open: boolean; current: boolean;
  tag?: string; tagTone?: 'blue' | 'green' | 'orange' | 'purple' | 'red' | ''; tagTitle?: string; ready?: string; menu: boolean;
  /** place among its siblings (rows rise in one after another) */
  sib?: number;
};

/* Tree order: folders first (if chosen), then the order the user dragged into place
   (`pos`), and anything never dragged by name after that. Used by the tree and by moves. */
export function treeCompare(src: any, foldersFirst: boolean) {
  return (x: string, y: string) => {
    const a = src[x] || {}, b = src[y] || {};
    if (foldersFirst && (a.type === 'folder') !== (b.type === 'folder')) return a.type === 'folder' ? -1 : 1;
    const pa = typeof a.pos === 'number', pb = typeof b.pos === 'number';
    if (pa && pb && a.pos !== b.pos) return a.pos - b.pos;
    if (pa !== pb) return pa ? -1 : 1;
    return (a.name || '').localeCompare(b.name || '');
  };
}
export type View = ReturnType<typeof derive>;

export function derive(app: App) {
  const st = app.state;
  const S = app.effS();
  const dark = isDark(S.theme);
  const vw = st.vw;
  /* the skill's size lines: phone ≤ 760 · tablet 761–1279 · laptop ≤ 1500 · desktop */
  const mob = vw <= 760, narrow = vw < 560, midW = vw > 760 && vw < 1180;
  const compact = !mob && vw < 1280;
  /* sidebar width: a little narrower on small laptops, so the script keeps its room */
  const sideW = vw < 1100 ? Math.min(S.sidebarWidth, 240) : vw <= 1500 ? Math.min(S.sidebarWidth, 256) : S.sidebarWidth;
  /* the open sidebar may stay next to the script as long as the script lines still get a
     readable width; below that it folds into the rail and opens over the page instead */
  const MIN_READER = 600;
  const sideFits = !mob && vw - sideW - 14 - 24 >= MIN_READER;
  /* frame: full sidebar (the user's choice, when it fits), slim icon rail, or phone drawer.
     The card editor folds the sidebar so its preview gets the room. */
  const frame: 'full' | 'rail' | 'phone' = mob ? 'phone' : !S.showSidebar || st.mode === 'design' || !sideFits ? 'rail' : 'full';
  /* the library panel opens over the page whenever there is no full sidebar */
  const drawerMode = frame !== 'full';
  const mainW = vw - (frame === 'full' ? sideW + 14 : frame === 'rail' ? 78 : 0) - (mob ? 16 : 24);
  /* the settings menu gets its own column only when there is room for it */
  const wideSettings = !mob && mainW >= 880;
  const viewing = app.isViewing();
  const a = app.active();
  const doc = app.doc();
  const all = app.allLines();
  const vis = app.visibleLines();
  const visIds: Record<string, 1> = {};
  vis.forEach((l) => { visIds[l.id] = 1; });
  const total = all.length;
  const doneCount = all.filter((l) => a.done[l.id]).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const activeLine = st.activeLine;
  const activeSi = activeLine ? +String(activeLine).replace(/^s(\d+)r.*$/, '$1') : -1;

  /* search highlights only where the query could have matched */
  const spec = app.searchSpec();
  const searching = !!(st.query || '').trim();
  const hlq = S.searchHighlight && spec && !(spec.num !== null && !spec.wide) ? spec.q : '';
  const hlScope = S.searchScope || 'context';
  const hlFor = (k: string) => (hlScope === 'guide' ? hlq : hlScope === 'context' && k === 'CONTEXT' ? hlq : '');

  /* guide items per line, cached until something they show changes */
  const m = app.memo;
  const dispSig = [S.sourcesPosition, dark, S.showFavicons, S.copyJoin, hlq, hlScope, app._sig].join('|');
  if (m.itemSig !== dispSig) { m.items = {}; m.itemSig = dispSig; }
  const itemsFor = (l: FlatLine): ItemView[] => {
    if (m.items[l.id]) return m.items[l.id];
    const res = itemViews(l, S, dark, hlFor);
    m.items[l.id] = res;
    return res;
  };

  /* FLOW = lines that reach the page, in page order (collapsed sections left out) */
  const openOf = (si: number) => (searching && S.searchExpand) || !(st.collapsed[si] !== undefined ? st.collapsed[si] : S.collapseDefault);
  const pruning = searching && S.searchHideEmpty;
  const flowIds: string[] = [];
  doc.sections.forEach((s, si) => {
    if (!openOf(si)) return;
    s.lines.forEach((_l, li) => { const id = 's' + si + 'r' + li; if (visIds[id]) flowIds.push(id); });
  });
  app._flow = flowIds;
  app._flowTotal = flowIds.length;
  const cap = st.mounted || 40;
  let capSet: Record<string, 1> | null = null;
  if (flowIds.length > cap) { capSet = {}; for (let i = 0; i < cap; i++) capSet[flowIds[i]] = 1; }

  const showLogin = st.loginOpen || (st.authReady && !st.cloud && !st.skippedLogin && !st.viewerToken && !viewing);
  const ach = st.achievement;
  const lineById: Record<string, FlatLine> = {};
  all.forEach((l) => { lineById[l.id] = l; });

  const sections: SectionView[] = showLogin ? [] : doc.sections.map((s, si) => {
    const ids = s.lines.map((_l, li) => 's' + si + 'r' + li);
    const dn = ids.filter((id) => a.done[id]).length;
    const visCount = ids.filter((id) => visIds[id]).length;
    const open = openOf(si);
    const lines: LineView[] = !open ? [] : ids.filter((id) => visIds[id] && (!capSet || capSet[id])).map((id) => {
      const l = lineById[id];
      const achieved = !!(ach && ach.lineId === id);
      const motion = id === st.exitingLine ? ' line-exit' : id === st.promotedLine ? ' line-promote' : '';
      return { l, items: itemsFor(l), active: activeLine === id, done: !!a.done[id], motion: motion + (achieved ? ' line-achieved' : ''), achieved };
    });
    return {
      si, title: s.title || 'Untitled', badge: s.badge, visCount,
      count: visCount === s.lines.length ? String(s.lines.length) : visCount + '/' + s.lines.length,
      pct: ids.length ? Math.round((dn / ids.length) * 100) : 0,
      allReady: ids.length > 0 && dn === ids.length,
      achieved: !!(ach && (ach.level === 'section' || ach.level === 'script') && ach.sectionId === si),
      open, hasLines: s.lines.length > 0,
      notes: s.notes.length && !searching ? s.notes.map((x) => stripMd(x)) : [],
      lines,
    };
  }).filter((s: any) => (pruning ? s.visCount > 0 : !s.open || s.lines.length || s.notes.length));

  const allCollapsed = doc.sections.length > 0 && doc.sections.every((_s, i) => (st.collapsed[i] !== undefined ? st.collapsed[i] : S.collapseDefault));
  const readySectionCount = doc.sections.filter((s, si) => s.lines.length > 0 && s.lines.every((_l, li) => !!a.done['s' + si + 'r' + li])).length;

  /* filters: All / Left / Ready, then one per tag */
  const tagCounts: Record<string, number> = {};
  all.forEach((l) => l.items.forEach((it) => { tagCounts[it.k] = (tagCounts[it.k] || 0) + 1; }));
  const primaryFilters = [
    { id: 'all', label: 'All', n: total },
    { id: 'pending', label: 'Left', n: total - doneCount },
    { id: 'done', label: 'Ready', n: doneCount },
  ];
  const tagFilters = Object.keys(tagCounts).sort().map((k) => ({ id: k, label: k, n: tagCounts[k] }));
  const filterIds = primaryFilters.map((f) => f.id).concat(tagFilters.map((f) => f.id));
  const activeFilter = filterIds.indexOf(st.filter) >= 0 ? st.filter : 'all';

  const outline = doc.sections.map((s, si) => {
    const ids = s.lines.map((_l, li) => 's' + si + 'r' + li);
    const dn = ids.filter((id) => a.done[id]).length;
    const hits = ids.filter((id) => visIds[id]).length;
    return {
      si, num: String(si + 1).padStart(2, '0'), title: s.title || 'Untitled',
      label: searching ? hits + ' found' : dn + ' / ' + ids.length,
      pct: ids.length ? Math.round((dn / ids.length) * 100) : 0,
      complete: ids.length > 0 && dn === ids.length, active: activeSi === si, hits,
    };
  }).filter((o) => !pruning || o.hits > 0);

  /* ---------- library tree ---------- */
  const items = st.items, shares = st.shares || {}, grants = st.grants || {};
  const trashIds = Object.keys(items).filter((k) => items[k].trashed);
  const treeQ = String(st.treeQuery || '').trim().toLowerCase();
  const readyOf = (sid: string) => {
    const d = (st.doneMap || {})[sid] || {};
    const n = Object.keys(d).filter((k) => d[k]).length;
    return n ? String(n) : '';
  };
  const rowFor = (src: any, id: string, depth: number, menu: boolean): TreeRow => {
    const it = src[id] || {};
    const sh = shares[id];
    const folder = it.type === 'folder';
    const shared = !!(sh && (sh.public || Object.keys(sh.members || {}).length));
    return {
      id, name: it.name || 'Untitled', depth, folder, open: !!st.openFolders[id] || (!!treeQ && folder), current: st.activeId === id && !folder, menu,
      tag: menu && shared ? (sh.public ? 'Link' : 'Shared') : '', tagTone: 'blue', tagTitle: sh && sh.public ? 'Public link is on' : 'Shared with people',
      ready: menu && !folder && S.showReadyCount ? readyOf(id) : '',
    };
  };
  const branchHas = (src: any, id: string, term: string): boolean => {
    const node = src[id] || {};
    if (String(node.name || '').toLowerCase().indexOf(term) >= 0) return true;
    if (node.type !== 'folder') return false;
    return Object.keys(src).some((k) => !src[k].trashed && (src[k].parentId || 'root') === id && branchHas(src, k, term));
  };
  const walk = (src: any, parent: string, depth: number, out: TreeRow[], term: string, menu: boolean) => {
    Object.keys(src)
      .filter((k) => !src[k].trashed && (src[k].parentId || 'root') === parent && (!term || branchHas(src, k, term)))
      .sort(treeCompare(src, S.foldersFirst))
      .forEach((k, i) => {
        out.push({ ...rowFor(src, k, depth, menu), sib: i });
        if (src[k].type === 'folder' && (term || st.openFolders[k])) walk(src, k, depth + 1, out, term, menu);
      });
    return out;
  };
  const grantRows: TreeRow[] = Object.keys(grants).map((k) => {
    const g = grants[k] || {};
    return {
      id: k, name: g.name || 'Shared item', depth: 0, folder: g.type === 'folder', open: false, current: viewing && st.activeId === k, menu: false,
      tag: ROLE_SHORT[g.role] || 'Viewer', tagTone: 'purple', tagTitle: (g.ownerEmail || '') + ' — ' + (ROLE_HINT[g.role] || ''),
    };
  });
  let tree: TreeRow[] = [], treeEmptyMsg = '', treeHeading = '';
  const sharedMode = viewing || !!st.viewerToken;
  if (sharedMode) {
    /* opened through a share link: only the shared page, never the visitor's own scripts */
    const vi = (st.viewer && st.viewer.items) || {};
    tree = walk(vi, 'root', 0, [], '', false);
    treeEmptyMsg = st.viewer && st.viewer.missing ? 'This share link does not work.' : 'Loading the share…';
    treeHeading = 'Shared with you';
  } else if (st.showTrash) {
    tree = trashIds.filter((k) => !treeQ || String(items[k].name || '').toLowerCase().indexOf(treeQ) >= 0)
      .map((k) => ({ ...rowFor(items, k, 0, true), tag: 'Trash', tagTone: '' as const, tagTitle: 'In trash', ready: '' }));
    treeEmptyMsg = treeQ ? 'Nothing in the trash matches.' : 'The trash is empty.';
    treeHeading = 'Trash';
  } else {
    tree = walk(items, 'root', 0, [], treeQ, true);
    const visibleGrants = treeQ ? grantRows.filter((r) => r.name.toLowerCase().indexOf(treeQ) >= 0) : grantRows;
    if (visibleGrants.length) tree = tree.concat([{ id: '@shared', header: true, name: 'Shared with me', depth: 0, folder: false, open: false, current: false, menu: false }], visibleGrants);
    treeEmptyMsg = treeQ ? 'No script or folder matches.' : 'No scripts yet. Create one or import a .md file.';
    treeHeading = treeQ ? 'Search results' : 'Your library';
  }
  const scriptCount = Object.keys(items).filter((k) => !items[k].trashed && items[k].type === 'script').length + grantRows.length;

  /* ---------- loading / login ---------- */
  const pendingShareToken = st.viewerToken || st.shareLoadingToken;
  const shareLoading = !!(pendingShareToken && (!st.viewer || st.viewer.token !== pendingShareToken));
  const cloudLoading = !!(st.authReady && st.cloud && !st.dataReady && !shareLoading);
  const loading = !st.authReady || shareLoading || cloudLoading
    ? shareLoading
      ? { kicker: 'Shared view', title: 'Opening the shared script', detail: 'Loading the latest script and its viewing settings.' }
      : cloudLoading
        ? { kicker: 'Cloud sync', title: 'Syncing your workspace', detail: 'Getting your scripts, progress and settings ready.' }
        : { kicker: 'Alamza Scripts', title: 'Opening your workspace', detail: 'Getting everything ready.' }
    : null;

  const canEditRaw = viewing ? app.can('edit') : true;
  const modes = [{ value: 'normal', label: 'Read' }]
    .concat(canEditRaw ? [{ value: 'raw', label: 'Raw' }] : [])
    .concat(viewing ? [] : [{ value: 'settings', label: 'Settings' }]);

  const u = st.user;
  const signedIn = !!(u && !u.isAnonymous);
  const activeNum = (() => { const f = lineById[activeLine]; return f ? String(f.n) : ''; })();

  /* reader variables, rebuilt only when the look changes */
  const varSig = JSON.stringify([S, dark, mob, narrow, compact]);
  if (m.varSig !== varSig) { m.vars = readerVars(S, dark, mob, narrow, compact); m.varSig = varSig; }
  const dispSig2 = [S.showLineNumbers, S.showChecks, S.showCopyBtn, S.showTranscript, S.showDomain, S.showFavicons, S.openNewTab, S.chipClick].join('|');
  if (m.dispSig !== dispSig2) { m.disp = dispOf(S); m.dispSig = dispSig2; }

  return {
    S, dark, mob, narrow, midW, compact, frame, drawerMode, sideW, sideFits, wideSettings, viewing, a, doc, total, doneCount, pct, searching, hlq,
    sections, outline, allCollapsed, readySectionCount, sectionCount: doc.sections.length,
    primaryFilters, tagFilters, activeFilter,
    tree, treeEmptyMsg, treeHeading, sharedMode,
    /* scripts can be dragged into a new order only in the plain library view */
    canDrag: !sharedMode && !st.showTrash && !treeQ, trashCount: trashIds.length, scriptCount,
    loading, showLogin, canEditRaw, modes, signedIn, user: u,
    activeNum, showJump: !!activeLine && st.mode === 'normal' && st.offScreen,
    vars: m.vars as Record<string, string>, disp: m.disp as Disp,
    noResults: vis.length === 0 && total > 0,
    hits: vis.length,
    flowIds,
    empty: !a.id,
    canShare: !viewing && !!st.cloud && !!a.id,
    isPublic: !!(shares[a.id] && shares[a.id].public),
    broken: !!(st.viewer && st.viewer.missing),
  };
}

export type Disp = { nums: boolean; checks: boolean; copyBtn: boolean; transcript: boolean; domain: boolean; fav: boolean; target: string; chipHint: string };

/* guide items of one line, ready to draw (also used by the card editor preview) */
export function itemViews(l: { items: any[] }, S: any, dark: boolean, hlFor: (k: string) => string = () => ''): ItemView[] {
  const out: ItemView[] = [], src: ItemView[] = [];
  l.items.forEach((it) => {
    const hl = hlFor(it.k);
    const j = S.copyJoin === 'newline' ? '\n' : S.copyJoin === 'pipe' ? ' | ' : ', ';
    const o: ItemView = { label: it.k, color: colorOf(it.color, dark), soft: softOf(it.color, dark), render: it.render, copyAll: '', count: 0 };
    if (it.render === 'links') {
      o.copyAll = (it.links || []).map((x) => (x.u ? x.t + ' — ' + x.u : x.t)).join('\n');
      o.count = (it.links || []).length;
    } else if (it.render === 'chips' || it.render === 'overlay') {
      o.copyAll = (it.chips || []).join(j);
      o.count = (it.chips || []).length;
    } else {
      o.copyAll = it.body || '';
      o.count = 1;
    }
    if (it.render === 'markdown') {
      o.md = it.md || [];
      o.hl = hl;
    } else if (it.render === 'links') {
      o.links = (it.links || []).map((x) => ({
        t: x.t, u: x.u, d: x.d || '', tHtml: markHits(x.t, hl),
        fav: x.d && S.showFavicons ? 'https://www.google.com/s2/favicons?domain=' + x.d + '&sz=64' : '',
      }));
    } else if (it.render === 'chips' || it.render === 'overlay') {
      o.chips = (it.chips || []).map((v) => ({ v, html: markHits(v, hl) }));
    } else {
      o.bodyHtml = markHits(it.body || '', hl);
    }
    if (it.render === 'links' && S.sourcesPosition === 'bottom') src.push(o); else out.push(o);
  });
  return out.concat(src);
}

/* display flags for line cards */
export function dispOf(S: any): Disp {
  return {
    nums: S.showLineNumbers, checks: S.showChecks, copyBtn: S.showCopyBtn, transcript: S.showTranscript,
    domain: S.showDomain, fav: S.showFavicons, target: S.openNewTab ? '_blank' : '_self',
    chipHint: S.chipClick === 'copy' ? 'Click to copy' : S.chipClick === 'search' ? 'Click to search' : 'Click to copy and search',
  };
}
