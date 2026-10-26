/* The app controller: all state and behaviour lives here (sync, sharing, trash,
   ready marks, search, keyboard). Screens are plain components in ./components that
   read `app.state` and the view model from `derive()`, and call the methods below. */
import { Component } from 'react';
import {
  APP_TITLE, DEFAULT_TAGS, DEFAULTS, FIELDS, NEW_SCRIPT_MD, RANK, ROLE_SHORT, TABS,
  mergeTags, migrateSettings, searchUrl, type TagDef,
} from './lib/constants';
import { dbRef, signInAnon, signInGoogle, signOutUser, watchAuth, auth, type Ref, type User } from './lib/firebase';
import { parseDoc, stripMd, type Doc, type Line } from './lib/parse';
import { ensureFonts, isDark } from './lib/tokens';
import {
  GKEY, KEY, LOCAL_SCHEMA, VKEY, download, ekey, hashOf, legacyCopy, loadGuestChoice, loadLocal, loadViewerPrefs,
  now, readHashToken, safeFileName, tagsForFirebase, tagsFromFirebase, tok, uid,
} from './lib/util';
import { derive, type View } from './view';
import { Layout } from './components/Layout';

export type FlatLine = Line & { id: string; si: number };

export default class App extends Component<object, any> {
  /* caches (never trigger renders) */
  _sig: string | null = null;
  _doc: Doc | null = null;
  _al: FlatLine[] = [];
  _alSig: string | null = null;
  _known: Record<string, 1> = {};
  _vl: FlatLine[] = [];
  _vlSig: string | null = null;
  _hay: Record<string, string> = {};
  _haySig: string | null = null;
  _flow: string[] = [];
  _flowTotal = 0;
  _stamps: Record<string, string> = {};
  _refs: Ref[] = [];
  _doneRef: Ref | null = null;
  _doneId: string | null = null;
  _pubRef: Ref | null = null;
  _cloudParts: Record<string, boolean> | null = null;
  _pushed = false;
  _timers: Record<string, any> = {};
  _growT: any = 0;
  _unsubAuth: (() => void) | null = null;
  _mq: MediaQueryList | null = null;
  _view: View | null = null;
  /* per-render memo used by derive() */
  memo: Record<string, any> = {};

  constructor(p: object) {
    super(p);
    const d = loadLocal();
    const vt = readHashToken();
    this.state = {
      items: d.items, raws: d.raws, doneMap: d.doneMap, activeId: d.activeId,
      settings: d.settings, tags: d.tags, openFolders: d.openFolders,
      mode: 'normal', tab: 'appearance', query: '', treeQuery: '', treeSearchOpen: false, mobileSearch: false,
      filter: 'all', collapsed: {}, filtersOpen: false,
      activeLine: d.activeLine, draft: null, toast: null, newTag: '', mounted: 40, offScreen: false,
      exitingLine: null, promotedLine: null, achievement: null,
      vw: window.innerWidth,
      drawer: false, loginOpen: false, loginBusy: false, loginError: '', loginTries: 0, skippedLogin: loadGuestChoice(),
      sideTab: vt ? 'review' : d.settings.defaultSideTab === 'review' ? 'review' : 'files',
      showTrash: false, menu: null, copyMenu: null, shareFor: null, renameFor: null, renameValue: '', confirmBox: null,
      shares: {}, grants: {}, shareEmail: '', shareRole: d.settings.defaultShareRole || 'viewer',
      user: null, authReady: false, dataReady: false, cloud: false, viewer: null, viewerToken: vt, shareLoadingToken: null,
      viewerPrefs: loadViewerPrefs(),
    };
  }

  /* ------------------------------------------------------------------ lifecycle */

  componentDidMount() {
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('hashchange', this.onHash);
    document.addEventListener('scroll', this.onScroll, true);
    window.addEventListener('resize', this.onResize);
    this._mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    if (this._mq) this._mq.addEventListener('change', this.onSystemTheme);
    this.applyTheme();
    this.syncTitle();
    this._unsubAuth = watchAuth((u) => this.onAuth(u));
    if (this.state.viewerToken && !auth.currentUser) signInAnon().catch(() => {});
  }
  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('hashchange', this.onHash);
    document.removeEventListener('scroll', this.onScroll, true);
    window.removeEventListener('resize', this.onResize);
    if (this._mq) this._mq.removeEventListener('change', this.onSystemTheme);
    Object.values(this._timers).forEach((t) => clearTimeout(t));
    clearTimeout(this._growT);
    if (this._unsubAuth) this._unsubAuth();
    this.detach();
  }
  componentDidUpdate() {
    this.syncTitle();
    this.growMount();
    this.applyTheme();
  }

  later(name: string, fn: () => void, ms: number) {
    clearTimeout(this._timers[name]);
    this._timers[name] = setTimeout(fn, ms);
  }

  onSystemTheme = () => { if (this.effS().theme === 'system') this.forceUpdate(); };
  onHash = () => {
    const vt = readHashToken();
    this.setState({ viewerToken: vt, shareLoadingToken: null, sideTab: vt ? 'review' : this.state.sideTab }, () => this.bootViewer());
  };
  /* scrolling must never trigger a render — only the "Back to line" check, debounced */
  onScroll = () => this.later('scroll', () => this.checkOffScreen(), 180);
  onResize = () => this.later('resize', () => { if (window.innerWidth !== this.state.vw) this.setState({ vw: window.innerWidth }); }, 120);

  /* theme, page tone and app font live on <html> so the whole page follows them */
  _appliedTheme = '';
  applyTheme() {
    const S = this.effS();
    const sig = S.theme + '|' + S.paper + '|' + S.uiFont;
    if (sig === this._appliedTheme) return;
    const first = !this._appliedTheme;
    this._appliedTheme = sig;
    const root = document.documentElement;
    if (!first) {
      root.classList.add('theme-switching');
      setTimeout(() => root.classList.remove('theme-switching'), 400);
    }
    if (S.theme === 'light' || S.theme === 'dark') root.setAttribute('data-theme', S.theme);
    else root.removeAttribute('data-theme');
    root.setAttribute('data-paper', S.paper || 'cool');
    const fam = S.uiFont && S.uiFont !== 'inter' ? (FONT_UI[S.uiFont] || '') : '';
    if (fam) root.style.setProperty('--font', fam); else root.style.removeProperty('--font');
    ensureFonts(S);
  }

  onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    const tag = (t.tagName || '').toLowerCase();
    const formControl = tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button' || tag === 'a';
    const st = this.state;
    const anyOverlay = st.menu || st.copyMenu || st.shareFor || st.loginOpen || st.renameFor || st.confirmBox;
    if (formControl) {
      if (e.key === 'Escape') {
        if (st.copyMenu || st.menu) this.setState({ copyMenu: null, menu: null });
        t.blur();
      }
      return;
    }
    if (e.key === 'Escape') {
      if (anyOverlay || st.drawer) {
        e.preventDefault();
        this.setState({ menu: null, copyMenu: null, shareFor: null, drawer: false, loginOpen: false, renameFor: null, renameValue: '', confirmBox: null });
      }
      return;
    }
    if (st.mode !== 'normal' || anyOverlay) return;
    if (e.key === '/') {
      e.preventDefault();
      const el = document.getElementById('top-search') as HTMLInputElement;
      if (el) el.focus();
      else this.setState({ mobileSearch: true }, () => setTimeout(() => (document.getElementById('top-search') as HTMLInputElement)?.focus(), 30));
      return;
    }
    if (e.key === 'j' || e.key === 'k' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this.step(e.key === 'j' || e.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (e.key === 'f') { this.toggleFocus(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && st.activeLine && !t.closest('[role="button"],[tabindex="0"]')) {
      e.preventDefault();
      this.toggleDone(st.activeLine);
    }
  };

  /* ------------------------------------------------------------------ auth + cloud */

  onAuth(u: User | null) {
    const signedIn = !!u && !u.isAnonymous && this.state.settings.cloudSync !== false;
    this.setState({ user: u, authReady: true, dataReady: !signedIn, cloud: signedIn }, () => {
      this.detach();
      if (signedIn) this.attach(u);
      if (this.state.viewerToken) this.bootViewer();
    });
  }

  detach() {
    this._refs.forEach((r) => { try { r.off(); } catch { /* gone */ } });
    this._refs = [];
    if (this._doneRef) { this._doneRef.off(); this._doneRef = null; }
    if (this._pubRef) { this._pubRef.off(); this._pubRef = null; }
    clearTimeout(this._timers.dataReady);
    this._cloudParts = null;
    this._pushed = false;
    this._doneId = null;
  }
  listen(path: string, cb: (v: any) => void) { this._refs.push(dbRef(path).on(cb)); }

  markCloudPart(part: string) {
    this._cloudParts = { ...(this._cloudParts || {}), [part]: true };
    if (this._cloudParts.items && this._cloudParts.raw) {
      clearTimeout(this._timers.dataReady);
      if (!this.state.dataReady) this.setState({ dataReady: true });
    }
  }

  attach(u: User) {
    this._cloudParts = { items: false, raw: false };
    /* never hang on a flaky connection — local data stays a safe fallback */
    this.later('dataReady', () => { if (!this.state.dataReady) this.setState({ dataReady: true }); }, 8000);
    const base = 'users/' + u.uid;
    dbRef(base + '/profile').update({ email: u.email || '', name: u.displayName || '', photo: u.photoURL || '', seen: now() }).catch(() => {});
    this.listen(base + '/items', (v) => {
      const items = v || {};
      if (!Object.keys(items).length) {
        this.markCloudPart('items');
        if (this._pushed) return;
        this._pushed = true;
        this.pushLocalToCloud(u);
        return;
      }
      const act = this.state.activeId && items[this.state.activeId] ? this.state.activeId : Object.keys(items).find((k) => items[k].type === 'script' && !items[k].trashed);
      this.setState({ items, activeId: act }, () => { this.markCloudPart('items'); this.watchDone(); });
    });
    this.listen(base + '/raw', (v) => this.setState({ raws: v || {} }, () => this.markCloudPart('raw')));
    this.listen(base + '/shares', (v) => this.setState({ shares: v || {} }));
    this.listen(base + '/settings', (v) => {
      if (!v || this.state.settings.syncSettings === false) return;
      this.setState({ settings: migrateSettings(v.settings), tags: mergeTags(tagsFromFirebase(v.tags)) });
    });
    if (u.email) this.listen('grants/' + ekey(u.email), (v) => this.setState({ grants: v || {} }));
    this.watchDone();
  }

  pushLocalToCloud(u: User) {
    const st = this.state;
    dbRef('users/' + u.uid).update({ items: st.items, raw: st.raws, settings: { settings: st.settings, tags: tagsForFirebase(st.tags) } }).catch(() => {});
    Object.keys(st.doneMap || {}).forEach((sid) => {
      if (Object.keys(st.doneMap[sid] || {}).length) dbRef('done/' + sid).update(st.doneMap[sid]).catch(() => {});
    });
    if (Object.keys(st.items || {}).length) this.flash('Local scripts moved to the cloud');
  }

  watchDone() {
    const id = this.state.activeId;
    if (this._doneId === id && this._doneRef) return;
    if (this._doneRef) { this._doneRef.off(); this._doneRef = null; }
    this._doneId = null;
    if (!id || !(this.state.cloud || this.isViewing())) return;
    this._doneId = id;
    this._doneRef = dbRef('done/' + id).on((val) => {
      const v = val || {};
      const cur = (this.state.doneMap || {})[id] || {};
      const keys = Object.keys(v), curKeys = Object.keys(cur);
      if (keys.length === curKeys.length && keys.every((k) => v[k] === cur[k])) return;
      this.setState({ doneMap: { ...this.state.doneMap, [id]: v } });
    });
  }

  bootViewer() {
    const token = this.state.viewerToken;
    if (!token) { if (this.state.viewer) this.setState({ viewer: null }); return; }
    /* pub/<token> is world-readable; anonymous auth only helps the ready tick */
    if (!auth.currentUser) signInAnon().catch(() => {});
    this.watchPub(token, null, null);
  }

  /* live: the owner's edits, new scripts and settings reach the viewer at once */
  watchPub(token: string, role: string | null, wantId: string | null) {
    if (this._pubRef) { this._pubRef.off(); this._pubRef = null; }
    this._pubRef = dbRef('pub/' + token).on(
      (v) => {
        if (!v) { this.setState({ viewer: { missing: true, token }, shareLoadingToken: null }); return; }
        const items = v.items || {};
        const scripts = Object.keys(items).filter((k) => items[k].type === 'script');
        const cur = this.state.activeId;
        const keep = wantId && items[wantId] && items[wantId].type === 'script' ? wantId : items[cur] && items[cur].type === 'script' ? cur : scripts[0];
        const same = this.state.activeId === keep;
        this.setState({
          viewer: { ...v, token, items, raws: v.raw || {}, role: role || v.role, granted: !!role }, shareLoadingToken: null,
          activeId: keep, mode: this.state.mode === 'raw' ? 'raw' : 'normal',
        }, () => { if (!same) this.watchDone(); });
      },
      () => this.setState({ viewer: { missing: true, token }, shareLoadingToken: null }),
    );
  }

  save = () => {
    this.later('save', () => {
      const st = this.state;
      try {
        localStorage.setItem(KEY, JSON.stringify({
          v: LOCAL_SCHEMA, items: st.items, raws: st.raws, doneMap: st.doneMap,
          activeId: st.activeId, openFolders: st.openFolders, settings: st.settings, tags: st.tags,
          activeLine: st.settings.rememberLine ? st.activeLine : null,
        }));
      } catch { /* storage full or blocked */ }
    }, 260);
    if (this.state.cloud && this.state.settings.autoRefreshShare !== false) {
      /* the look travels with the share — refresh public copies after a settings change */
      this.later('pub', () => {
        const sh = this.state.shares || {};
        Object.keys(sh).forEach((id) => { if (sh[id] && sh[id].public && this.state.items[id]) this.writePub(id); });
      }, 900);
    }
    if (this.state.cloud && this.state.settings.syncSettings !== false) {
      this.later('cloudSettings', () => {
        const u = this.state.user;
        if (!u) return;
        dbRef('users/' + u.uid + '/settings').set({ settings: this.state.settings, tags: tagsForFirebase(this.state.tags) }).catch(() => {});
      }, 500);
    }
  };

  flash = (msg: string, tone: 'ok' | 'error' = 'ok') => {
    this.setState({ toast: { msg, tone, key: now() } });
    this.later('toast', () => this.setState({ toast: null }), 2200);
  };
  set = (k: string, v: any) => {
    if (this.isViewing()) return;
    this.setState({ settings: { ...this.state.settings, [k]: v } }, this.save);
  };

  /* ---- data access: cloud when signed in, localStorage otherwise ---- */
  uref(p: string) { const u = this.state.user; return u && this.state.cloud ? dbRef('users/' + u.uid + '/' + p) : null; }
  putItem(id: string, patch: any) {
    this.setState({ items: { ...this.state.items, [id]: { ...(this.state.items[id] || {}), ...patch } } }, this.save);
    const r = this.uref('items/' + id);
    if (r) r.update(patch).catch(() => {});
  }
  dropItems(ids: string[]) {
    const unique = Array.from(new Set(ids || [])).filter((id) => this.state.items[id]);
    if (!unique.length) return;
    const items = { ...this.state.items }, raws = { ...this.state.raws }, doneMap = { ...this.state.doneMap };
    unique.forEach((id) => { delete items[id]; delete raws[id]; delete doneMap[id]; });
    const activeGone = unique.indexOf(this.state.activeId) >= 0;
    const activeId = activeGone ? Object.keys(items).find((k) => items[k].type === 'script' && !items[k].trashed) || '' : this.state.activeId;
    this.setState({ items, raws, doneMap, activeId, activeLine: activeGone ? null : this.state.activeLine }, () => { this.save(); if (activeGone) this.watchDone(); });
    const u = this.state.user;
    if (u && this.state.cloud) {
      const updates: Record<string, null> = {};
      unique.forEach((id) => {
        updates['users/' + u.uid + '/items/' + id] = null;
        updates['users/' + u.uid + '/raw/' + id] = null;
        updates['done/' + id] = null;
      });
      dbRef().update(updates).catch(() => {});
    }
  }
  putRaw(id: string, md: string) {
    this.setState({ raws: { ...this.state.raws, [id]: md } }, this.save);
    const r = this.uref('raw/' + id);
    if (r) r.set(md).catch(() => {});
    this.refreshPubFor(id);
  }
  setDone(sid: string, map: Record<string, boolean>, extra?: any, after?: () => void) {
    if (typeof extra === 'function') { after = extra; extra = null; }
    const prev = (this.state.doneMap || {})[sid] || {};
    this.setState({ doneMap: { ...this.state.doneMap, [sid]: map }, ...(extra || {}) }, () => { this.save(); if (after) after(); });
    if (this.state.cloud || this.state.viewer) {
      const patch: Record<string, true | null> = {};
      Array.from(new Set(Object.keys(prev).concat(Object.keys(map)))).forEach((k) => { if (!!prev[k] !== !!map[k]) patch[k] = map[k] ? true : null; });
      if (Object.keys(patch).length) dbRef('done/' + sid).update(patch).catch(() => {});
    }
  }

  clearCompletionFeedback() {
    clearTimeout(this._timers.achievement);
    if (this.state.achievement) this.setState({ achievement: null });
  }
  completionFeedback(map: Record<string, boolean>, previous: Record<string, boolean>, lineId: string | null, sectionHint?: number | null) {
    const lines = this.allLines();
    if (!lines.length) return;
    const before = previous || {};
    const scriptReady = lines.every((l) => !!map[l.id]);
    const scriptWasReady = lines.every((l) => !!before[l.id]);
    const line = lineId ? lines.find((l) => l.id === lineId) : null;
    const si = sectionHint !== undefined && sectionHint !== null ? +sectionHint : line ? line.si : null;
    const sectionLines = si === null ? [] : lines.filter((l) => l.si === si);
    const sectionReady = sectionLines.length > 0 && sectionLines.every((l) => !!map[l.id]);
    const sectionWasReady = sectionLines.length > 0 && sectionLines.every((l) => !!before[l.id]);
    let achievement = null;
    if (scriptReady && !scriptWasReady) achievement = { level: 'script', lineId: lineId || null, sectionId: si, label: 'Script ready' };
    else if (sectionReady && !sectionWasReady) achievement = { level: 'section', lineId: lineId || null, sectionId: si, label: 'Section ready' };
    else if (lineId && this.state.filter === 'all') achievement = { level: 'line', lineId, sectionId: si, label: 'Line ready' };
    if (!achievement) return;
    this.setState({ achievement });
    if (achievement.level === 'script') this.flash('Script ready — every line has its footage');
    const duration = achievement.level === 'script' ? 2200 : achievement.level === 'section' ? 1600 : 1750;
    this.later('achievement', () => { if (this.state.achievement === achievement) this.setState({ achievement: null }); }, duration);
  }

  /* ------------------------------------------------------------------ who / what is open */

  isViewing() { return !!(this.state.viewer && !this.state.viewer.missing); }

  /* A shared script looks exactly as its owner sees it — their settings and tags travel
     with it. Light or dark belongs to the reader though: their own choice wins. */
  effS(): any {
    if (this.isViewing()) {
      const v = this.state.viewer;
      const own = this.state.settings || {};
      const vp = this.state.viewerPrefs || {};
      const s: any = { ...migrateSettings(v.settings), ...vp };
      s.theme = vp.theme !== undefined ? vp.theme : own.theme !== undefined ? own.theme : DEFAULTS.theme;
      return s;
    }
    return this.state.settings;
  }
  setViewerPref(k: string, val: any) {
    const viewerPrefs = { ...(this.state.viewerPrefs || {}), [k]: val };
    this.setState({ viewerPrefs });
    try { localStorage.setItem(VKEY, JSON.stringify(viewerPrefs)); } catch { /* blocked */ }
  }
  toggleFocus = () => {
    if (this.isViewing()) return this.setViewerPref('focusMode', !this.effS().focusMode);
    return this.set('focusMode', !this.state.settings.focusMode);
  };
  effT(): Record<string, TagDef> {
    const v = this.state.viewer;
    return this.isViewing() && v.tags ? mergeTags(tagsFromFirebase(v.tags)) : this.state.tags;
  }
  role() {
    if (this.isViewing()) return this.state.viewer.role || 'viewer';
    if (this.state.items[this.state.activeId]) return 'owner';
    const g = this.grantFor(this.state.activeId);
    return g ? g.role : 'owner';
  }
  grantFor(id: string) {
    const g = this.state.grants || {};
    if (g[id]) return g[id];
    let hit = null;
    Object.keys(g).forEach((k) => { const e = g[k]; if (e && e.items && e.items[id]) hit = e; });
    return hit;
  }
  can(what: string) {
    const r = RANK[this.role()] || 5;
    if (what === 'done') return true;
    if (what === 'note') return r >= 2;
    if (what === 'edit') return r >= 3;
    if (what === 'share') return r >= 4 && !this.isViewing();
    if (what === 'delete') return r >= 5 && !this.isViewing();
    return false;
  }
  active = () => {
    const id = this.state.activeId;
    if (this.isViewing()) {
      const v = this.state.viewer;
      const it = (v.items || {})[id] || {};
      return { id, name: it.name || v.name || 'Shared script', raw: (v.raws || {})[id] || '', done: (this.state.doneMap || {})[id] || {} };
    }
    const it = this.state.items[id];
    if (!it) {
      const fid = Object.keys(this.state.items).find((k) => this.state.items[k].type === 'script' && !this.state.items[k].trashed);
      return { id: fid || '', name: (this.state.items[fid] || {}).name || 'Untitled', raw: this.state.raws[fid] || '', done: (this.state.doneMap || {})[fid] || {} };
    }
    return { id, name: it.name, raw: this.state.raws[id] || '', done: (this.state.doneMap || {})[id] || {} };
  };

  parseSig() {
    const S = this.effS(), T = this.effT();
    let ts = '';
    Object.keys(T).sort().forEach((k) => { ts += k + ':' + T[k].render + ':' + (T[k].split || '') + ':' + (T[k].color || '') + ';'; });
    return [S.scriptCol, S.visualCol, S.showExtraCols, S.keepBrokenCells, S.resolveNumRefs, S.resolveTitleRefs, S.autoDetect, S.unknownAs, S.defaultSplit].join('|') + '#' + ts;
  }
  doc(): Doc {
    const a = this.active();
    const sig = a.id + '|' + a.raw.length + '|' + hashOf(a.raw) + '|' + this.parseSig();
    if (this._sig !== sig) {
      this._sig = sig;
      this._doc = parseDoc(a.raw, this.effT(), this.effS());
      const learned = this._doc.learned;
      if (learned && Object.keys(learned).length && !this.isViewing() && this.state.settings.autoDetect) {
        setTimeout(() => {
          const add: Record<string, TagDef> = {};
          let any = false;
          Object.keys(learned).forEach((k) => { if (!this.state.tags[k]) { add[k] = { ...learned[k], auto: true }; any = true; } });
          if (any) this.setState({ tags: { ...this.state.tags, ...add } }, this.save);
        }, 0);
      }
    }
    return this._doc;
  }
  allLines(): FlatLine[] {
    const d = this.doc();
    if (this._alSig !== this._sig) {
      const out: FlatLine[] = [];
      d.sections.forEach((s, si) => s.lines.forEach((l, li) => out.push({ ...l, id: 's' + si + 'r' + li, si })));
      this._al = out;
      this._alSig = this._sig;
      const known: Record<string, 1> = {};
      out.forEach((l) => l.items.forEach((it) => { known[it.k] = 1; }));
      this._known = known;
    }
    return this._al;
  }
  flow() { return this._flow && this._flow.length ? this._flow : this.visibleLines().map((l) => l.id); }

  /* The browser tab carries the open script's name; the app name only when nothing is open. */
  openScriptName() {
    const st = this.state;
    const pendingToken = st.viewerToken || st.shareLoadingToken;
    if (pendingToken && (!st.viewer || st.viewer.token !== pendingToken)) return '';
    if (st.viewer && st.viewer.missing) return '';
    if (this.isViewing()) {
      const a = this.active();
      return String((a && a.name) || (st.viewer && st.viewer.name) || '').trim();
    }
    if (!st.authReady) return '';
    if (!st.cloud && !st.skippedLogin && !st.viewerToken) return '';
    if (st.cloud && !st.dataReady) return '';
    const a = this.active();
    if (!a || !a.id) return '';
    const it = st.items[a.id];
    if (!it || it.type !== 'script') return '';
    return String(a.name || '').trim();
  }
  syncTitle() {
    const next = this.openScriptName() || APP_TITLE;
    if (document.title !== next) document.title = next;
  }
  /* progressive mount: the first chunk paints at once, the rest streams in and stays */
  growMount() {
    const total = this._flowTotal || 0, m = this.state.mounted || 40;
    if (m >= total || this._growT || this.state.mode !== 'normal') return;
    this._growT = setTimeout(() => {
      this._growT = 0;
      this.setState({ mounted: Math.min(total, (this.state.mounted || 40) + 25) });
    }, 45);
  }

  /* ------------------------------------------------------------------ moving around */

  step(dir: number) {
    const ids = this.flow();
    if (!ids.length) return;
    const i = ids.indexOf(this.state.activeLine);
    const ni = Math.max(0, Math.min(ids.length - 1, i < 0 ? 0 : i + dir));
    const id = ids[ni];
    this.setState({ activeLine: id }, () => { this.save(); this.scrollTo('line-' + id); });
  }
  scrollTo(domId: string, retry?: boolean) {
    const box = document.getElementById('scrollmain');
    const el = document.getElementById(domId);
    if (!box) return;
    if (!el) {
      if (retry) return;
      /* target sits past the mounted edge — pull it in, then jump */
      const id = domId.indexOf('line-') === 0 ? domId.slice(5) : null;
      const i = id ? (this._flow || []).indexOf(id) : -1;
      if (i >= 0) this.setState({ mounted: i + 70 }, () => setTimeout(() => this.scrollTo(domId, true), 60));
      return;
    }
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 70;
    box.scrollTo({ top, behavior: 'smooth' });
    setTimeout(() => this.checkOffScreen(), 420);
  }
  scrollWhenReady(domId: string, attempt = 0) {
    if (document.getElementById(domId)) return this.scrollTo(domId);
    if (attempt >= 14) { this.checkOffScreen(); return; }
    setTimeout(() => this.scrollWhenReady(domId, attempt + 1), 45);
  }
  keepLineVisible(id: string, attempt = 0) {
    const box = document.getElementById('scrollmain');
    const el = document.getElementById('line-' + id);
    if (!box || !el) {
      if (attempt < 14) setTimeout(() => this.keepLineVisible(id, attempt + 1), 45);
      else this.checkOffScreen();
      return;
    }
    const b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
    let top = box.scrollTop;
    if (r.top < b.top + 60) top += r.top - b.top - 70;
    else if (r.bottom > b.bottom - 24) top += r.bottom - b.bottom + 24;
    if (Math.abs(top - box.scrollTop) > 1) box.scrollTo({ top, behavior: 'smooth' });
    setTimeout(() => this.checkOffScreen(), 420);
  }
  checkOffScreen() {
    const id = this.state.activeLine;
    if (!id || this.state.mode !== 'normal') { if (this.state.offScreen) this.setState({ offScreen: false }); return; }
    const box = document.getElementById('scrollmain'), el = document.getElementById('line-' + id);
    if (!box || !el) { if (!this.state.offScreen) this.setState({ offScreen: true }); return; }
    const b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
    const off = r.bottom < b.top + 40 || r.top > b.bottom - 30;
    if (off !== this.state.offScreen) this.setState({ offScreen: off });
  }
  /* Back to line: if the active row is hidden by a search or filter, reveal it */
  revealLine = (id: string) => {
    if (!id) return;
    const match = /^s(\d+)r/.exec(String(id));
    if (!match) return;
    const all = this.allLines();
    const absoluteIndex = all.findIndex((l) => l.id === id);
    const visible = this.visibleLines().some((l) => l.id === id);
    const patch: any = {
      activeLine: id,
      collapsed: { ...this.state.collapsed, [match[1]]: false },
      mounted: Math.max(this.state.mounted || 40, absoluteIndex >= 0 ? absoluteIndex + 70 : 40),
    };
    if (!visible) { patch.filter = 'all'; patch.query = ''; }
    this.setState(patch, () => { this.save(); setTimeout(() => this.scrollWhenReady('line-' + id), 30); });
  };
  /* a section jump is a viewport detour: the active line stays as it is */
  gotoSection = (si: number) => {
    const section = this.doc().sections[si];
    if (!section) return;
    const key = String(si);
    const collapsed = this.state.collapsed[key] !== undefined ? this.state.collapsed[key] : this.effS().collapseDefault;
    const patch: any = { offScreen: !!this.state.activeLine, drawer: false };
    if (collapsed) {
      patch.collapsed = { ...this.state.collapsed, [key]: false };
      let throughTarget = 0;
      this.visibleLines().forEach((line, i) => { if (line.si <= si) throughTarget = i + 1; });
      patch.mounted = Math.max(this.state.mounted || 40, throughTarget + 40);
    }
    this.setState(patch, () => setTimeout(() => this.scrollWhenReady('sec-' + si), collapsed ? 35 : 0));
  };
  setActiveLine = (id: string) => { if (id !== this.state.activeLine) this.setState({ activeLine: id }, this.save); };
  toggleSection = (si: number) => {
    const k = String(si);
    const cur = this.state.collapsed[k] !== undefined ? this.state.collapsed[k] : this.effS().collapseDefault;
    this.setState({ collapsed: { ...this.state.collapsed, [k]: !cur } }, () => setTimeout(() => this.checkOffScreen(), 30));
  };
  toggleAllSections = () => {
    const def = this.effS().collapseDefault;
    const secs = this.doc().sections;
    const anyOpen = secs.some((_s, i) => !(this.state.collapsed[i] !== undefined ? this.state.collapsed[i] : def));
    const c: Record<string, boolean> = {};
    secs.forEach((_s, i) => { c[i] = anyOpen; });
    this.setState({ collapsed: c }, () => setTimeout(() => this.checkOffScreen(), 30));
  };
  setFilter = (f: string) => this.setState({ filter: f, mounted: 40 });
  setQuery = (q: string) => this.setState({ query: q, mounted: 40 });

  /* ------------------------------------------------------------------ search + filters */

  /* what a search looks through: the script line and (by default) its CONTEXT note */
  haystack(l: FlatLine) {
    const scope = this.effS().searchScope || 'context';
    const haySig = this._sig + '|' + scope;
    if (this._haySig !== haySig) { this._hay = {}; this._haySig = haySig; }
    if (this._hay[l.id] === undefined) {
      let extra = '';
      if (scope === 'context') extra = l.items.filter((it) => it.k === 'CONTEXT').map((it) => it.body || '').join(' ');
      else if (scope === 'guide') extra = l.items.map((it) => it.k + ' ' + (it.body || '') + ' ' + (it.chips || []).join(' ') + ' ' + (it.links || []).map((x) => x.t).join(' ')).join(' ');
      this._hay[l.id] = (l.text + ' ' + extra).toLowerCase();
    }
    return this._hay[l.id];
  }
  /* A bare number opens that line only; a trailing space makes it an ordinary word again. */
  searchSpec() {
    const raw = this.state.query || '';
    const q = raw.trim().toLowerCase();
    if (!q) return null;
    const num = this.effS().searchLineNumber && /^\d+$/.test(q) ? parseInt(q, 10) : null;
    return { q, num, wide: num !== null && /\s$/.test(raw) };
  }
  visibleLines(): FlatLine[] {
    const all = this.allLines(), a = this.active();
    const spec = this.searchSpec();
    let f = this.state.filter;
    if (f !== 'all' && f !== 'pending' && f !== 'done' && !this._known[f]) f = 'all';
    const doneKeys = Object.keys(a.done).sort().join(',');
    const S = this.effS();
    const sig = this._sig + '|' + (this.state.query || '') + '|' + f + '|' + doneKeys + '|' + (S.searchScope || '') + '|' + (S.searchLineNumber ? 1 : 0);
    if (this._vlSig === sig) return this._vl;
    const isLineNo = !!spec && spec.num !== null && all.some((l) => l.n === spec.num);
    const out = all.filter((l) => {
      if (f === 'pending' && a.done[l.id]) return false;
      if (f === 'done' && !a.done[l.id]) return false;
      if (f !== 'all' && f !== 'pending' && f !== 'done' && !l.items.some((it) => it.k === f)) return false;
      if (spec) {
        if (isLineNo && !spec.wide) return l.n === spec.num;
        const hit = this.haystack(l).indexOf(spec.q) >= 0;
        return isLineNo && spec.wide ? l.n === spec.num || hit : hit;
      }
      return true;
    });
    this._vl = out;
    this._vlSig = sig;
    return out;
  }

  /* ------------------------------------------------------------------ ready marks */

  toggleDone = (id: string) => {
    const a = this.active();
    const markingDone = !a.done[id];
    if (!markingDone) this.clearCompletionFeedback();
    /* In "Left", a finished row leaves on purpose; the next pending row takes its place. */
    if (markingDone && this.state.filter === 'pending') {
      if (this.state.exitingLine) return;
      const sid = a.id;
      const pendingIds = this.visibleLines().map((l) => l.id);
      const index = pendingIds.indexOf(id);
      const target = index >= 0 ? pendingIds[index + 1] || pendingIds[index - 1] || null : null;
      const targetIndex = target ? this.allLines().findIndex((l) => l.id === target) : -1;
      const collapsed = { ...this.state.collapsed };
      const targetMatch = target && /^s(\d+)r/.exec(target);
      if (targetMatch) collapsed[targetMatch[1]] = false;
      this.setState({ exitingLine: id }, () => {
        this.later('doneExit', () => {
          const latest = { ...((this.state.doneMap || {})[sid] || {}) };
          latest[id] = true;
          if (this.state.activeId !== sid) { this.setDone(sid, latest, { exitingLine: null, promotedLine: null }); return; }
          this.setDone(sid, latest, {
            activeLine: target, collapsed,
            mounted: Math.max(this.state.mounted || 40, targetIndex >= 0 ? targetIndex + 70 : 40),
            exitingLine: null, promotedLine: target,
          }, () => {
            this.completionFeedback(latest, a.done, id);
            if (target) setTimeout(() => this.keepLineVisible(target), 35);
            this.later('promote', () => { if (this.state.promotedLine === target) this.setState({ promotedLine: null }); }, 360);
          });
        }, 300);
      });
      return;
    }
    const done = { ...a.done };
    if (done[id]) delete done[id]; else done[id] = true;
    if (this.state.cloud || this.state.viewer) {
      this.setState({ doneMap: { ...this.state.doneMap, [a.id]: done } }, () => {
        this.save();
        if (markingDone) this.completionFeedback(done, a.done, id);
      });
      dbRef('done/' + a.id + '/' + id).transaction((v) => (v ? null : true)).catch(() => this.watchDone());
      return;
    }
    this.setDone(a.id, done, () => { if (markingDone) this.completionFeedback(done, a.done, id); });
  };
  markSection = (si: number) => {
    const a = this.active();
    const lines = this.allLines().filter((l) => l.si === si);
    if (!lines.length) return;
    const done = { ...a.done };
    const allDone = lines.every((l) => done[l.id]);
    lines.forEach((l) => { if (allDone) delete done[l.id]; else done[l.id] = true; });
    if (allDone) this.clearCompletionFeedback();
    this.setDone(a.id, done, () => { if (!allDone) this.completionFeedback(done, a.done, null, si); });
  };

  /* ------------------------------------------------------------------ copy */

  copy(txt: string, tag?: string) {
    const s = this.effS();
    let out = txt;
    if (s.copyFormat === 'quoted') out = '"' + txt + '"';
    if (s.copyFormat === 'prefixed') out = '[' + (tag || 'SCRIPT') + '] ' + txt;
    this.copyRaw(out, 'Copied: ' + (out.length > 70 ? out.slice(0, 70) + '…' : out));
  }
  copyRaw(txt: string, msg: string) {
    const fail = () => this.flash('Could not copy — the browser blocked the clipboard', 'error');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(() => this.flash(msg), () => { if (legacyCopy(txt)) this.flash(msg); else fail(); });
      return;
    }
    if (legacyCopy(txt)) this.flash(msg); else fail();
  }
  chipClick = (v: string, tag: string, lineId: string) => {
    const S = this.effS();
    this.setActiveLine(lineId);
    if (S.chipClick !== 'search') this.copy(v, tag);
    if (S.chipClick !== 'copy') window.open(searchUrl(S.searchEngine, v), '_blank', 'noopener');
  };
  copyLine = (id: string) => {
    this.setActiveLine(id);
    const l = this.allLines().find((x) => x.id === id);
    const md = this.tidyMd(this.lineMd(l));
    if (!md) { this.flash('This line has nothing to copy'); return; }
    this.copyRaw(md, 'Line ' + (l ? l.n : '') + ' copied');
  };
  copySection = (si: number) => {
    const s = this.doc().sections[si];
    const md = this.tidyMd(this.sectionMd(s));
    if (!md) { this.flash('This section has nothing to copy'); return; }
    this.copyRaw(md, 'Section copied — ' + s.lines.length + ' lines');
  };
  mdFileName(only: boolean) { return safeFileName(this.active().name, 'script') + (only ? ' - script only' : '') + '.md'; }
  /* one line as markdown, the same shape alone, in its section or in the whole script */
  lineMd(l: Line) {
    if (!l) return [];
    if (l.video) {
      const out = ['**[INSERT VIDEO]** ' + (l.text || '') + (l.range ? ' — ' + l.range : ''), ''];
      if (l.transcript) out.push('> ' + l.transcript, '');
      return out;
    }
    return l.text ? [l.text, ''] : [];
  }
  sectionMd(s: Doc['sections'][number]) {
    if (!s || !s.lines.length) return [];
    const out = ['## ' + ((s.title || 'Untitled') + (s.badge ? ' [' + s.badge + ']' : '')).trim(), ''];
    s.lines.forEach((l) => out.push(...this.lineMd(l)));
    return out;
  }
  tidyMd(parts: string[]) { return parts.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, ''); }
  scriptOnlyMd() {
    const a = this.active(), doc = this.doc();
    const out: string[] = [];
    const name = (a.name || '').trim();
    if (name) out.push('# ' + name, '');
    doc.sections.forEach((s) => out.push(...this.sectionMd(s)));
    return this.tidyMd(out);
  }
  joiner() { const j = this.effS().copyJoin; return j === 'newline' ? '\n' : j === 'pipe' ? ' | ' : ', '; }

  /* ------------------------------------------------------------------ library */

  openRow = (id: string) => {
    if (this.isViewing()) {
      const vit = (this.state.viewer.items || {})[id];
      if (vit) {
        if (vit.type === 'folder') {
          const o = { ...this.state.openFolders };
          if (o[id]) delete o[id]; else o[id] = true;
          this.setState({ openFolders: o, treeQuery: '', treeSearchOpen: false });
          return;
        }
        this.setState({ activeId: id, activeLine: null, draft: null, collapsed: {}, filter: 'all', query: '', treeQuery: '', treeSearchOpen: false, mounted: 40, drawer: false, mode: 'normal' }, () => this.watchDone());
        return;
      }
    }
    const it = this.state.items[id];
    if (!it) {
      const gr = (this.state.grants || {})[id];
      if (gr) this.openGrant(gr, id);
      return;
    }
    if (it.type === 'folder') {
      const o = { ...this.state.openFolders };
      if (this.state.treeQuery) o[id] = true;
      else if (o[id]) delete o[id]; else o[id] = true;
      this.setState({ openFolders: o, treeQuery: '', treeSearchOpen: false }, this.save);
      return;
    }
    if (location.hash) location.hash = '';
    this.setState({
      activeId: id, viewer: null, viewerToken: null, shareLoadingToken: null, activeLine: null, filter: 'all', query: '',
      treeQuery: '', treeSearchOpen: false, draft: null, collapsed: {}, mounted: 40, drawer: false,
      mode: this.state.mode === 'settings' ? 'settings' : 'normal',
    }, () => { this.save(); this.watchDone(); });
  };
  openScript = (id: string) => this.setState({ activeId: id, mode: 'normal', draft: null, activeLine: null, collapsed: {}, mounted: 40 }, () => { this.save(); this.watchDone(); });

  openMenu = (id: string, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const isFolder = (this.state.items[id] || {}).type === 'folder';
    const h = isFolder ? 260 : 330;
    this.setState({ menu: { id, x: Math.max(8, Math.min(r.right - 220, window.innerWidth - 232)), y: Math.max(8, Math.min(r.bottom + 4, window.innerHeight - h)) } });
  };

  descendants(id: string) {
    const out = [id], items = this.state.items;
    let added = true;
    while (added) {
      added = false;
      Object.keys(items).forEach((k) => { if (out.indexOf(k) < 0 && out.indexOf(items[k].parentId) >= 0) { out.push(k); added = true; } });
    }
    return out;
  }
  duplicate = (id: string) => {
    const it = this.state.items[id];
    if (!it) return;
    const map: Record<string, string> = {}, ids = this.descendants(id);
    ids.forEach((k) => { map[k] = uid(); });
    const items = { ...this.state.items }, raws = { ...this.state.raws };
    ids.forEach((k) => {
      const src = this.state.items[k];
      items[map[k]] = { type: src.type, name: k === id ? src.name + ' copy' : src.name, parentId: k === id ? src.parentId || 'root' : map[src.parentId], order: now(), createdAt: now() };
      if (src.type === 'script') raws[map[k]] = this.state.raws[k] || '';
    });
    const next: any = { items, raws };
    if (it.type === 'script') { next.activeId = map[id]; next.draft = null; }
    this.setState(next, () => { this.save(); if (it.type === 'script') this.watchDone(); else this.flash('Folder duplicated'); });
    const u = this.state.user;
    if (u && this.state.cloud) {
      const updates: Record<string, any> = {};
      ids.forEach((k) => {
        updates['items/' + map[k]] = items[map[k]];
        if (this.state.items[k].type === 'script') updates['raw/' + map[k]] = raws[map[k]];
      });
      dbRef('users/' + u.uid).update(updates).catch(() => {});
    }
  };
  menuAct = (a: string) => {
    const m = this.state.menu;
    if (!m) return;
    const id = m.id;
    this.setState({ menu: null });
    if (a === 'open') { this.setState({ activeId: id, viewer: null, mode: 'normal' }, () => { this.save(); this.watchDone(); }); return; }
    if (a === 'rename') return this.rename(id);
    if (a === 'dup') return this.duplicate(id);
    if (a === 'share') return this.openShare(id);
    if (a === 'trash') return this.trash(id);
    if (a === 'restore') return this.restore(id);
    if (a === 'purge') return this.purge(id);
    if (a === 'newIn') return this.create('script', id);
    if (a === 'newFolderIn') return this.create('folder', id);
    if (a === 'export') { const it = this.state.items[id]; return download(safeFileName(it.name, 'script') + '.md', this.state.raws[id] || '', 'text/markdown'); }
    if (a === 'moveRoot') return this.putItem(id, { parentId: 'root' });
    if (a.indexOf('move:') === 0) return this.putItem(id, { parentId: a.slice(5) });
  };
  create = (type: 'script' | 'folder', parentId?: string) => {
    if (this.isViewing()) return;
    const id = uid();
    const pid = parentId && this.state.items[parentId] && this.state.items[parentId].type === 'folder' ? parentId : 'root';
    const name = type === 'folder' ? 'New folder' : 'Untitled script';
    this.putItem(id, { type, name, parentId: pid, order: now(), createdAt: now() });
    if (type === 'script') {
      this.putRaw(id, NEW_SCRIPT_MD);
      this.setState({ treeQuery: '', treeSearchOpen: false, activeId: id, mode: 'raw', draft: NEW_SCRIPT_MD, viewer: null, drawer: false }, () => this.watchDone());
    } else {
      this.setState({ openFolders: { ...this.state.openFolders, [pid]: true, [id]: true }, treeQuery: '', treeSearchOpen: false }, this.save);
      setTimeout(() => this.rename(id), 60);
    }
  };
  setMode = (m: string) => {
    /* Settings never open in a shared view; Raw only with edit rights */
    if (m === 'settings' && this.isViewing()) return;
    if (m === 'raw' && this.isViewing() && !this.can('edit')) return;
    if (m === 'raw') { this.setState({ mode: 'raw', mobileSearch: false, drawer: false, draft: this.state.draft === null ? this.active().raw : this.state.draft }); return; }
    if (this.state.mode === 'raw' && this.state.draft !== null && this.state.draft !== this.active().raw) this.flash('Raw changes are kept — press Save & render to apply them');
    this.setState({ mode: m, mobileSearch: false, drawer: false, mounted: 40 });
  };
  rename = (id: string) => {
    const it = this.state.items[id];
    if (!it) return;
    this.setState({ renameFor: id, renameValue: it.name || '' });
  };
  commitRename = () => {
    const id = this.state.renameFor, n = (this.state.renameValue || '').trim();
    if (!id || !n) return;
    this.putItem(id, { name: n, updatedAt: now() });
    this.refreshPubFor(id);
    this.setState({ renameFor: null, renameValue: '' });
  };
  trash = (id: string, confirmed?: boolean) => {
    const it = this.state.items[id];
    if (!it) return;
    if (this.state.settings.confirmTrash && !confirmed) {
      this.setState({ confirmBox: { kind: 'trash', id, title: 'Move to trash?', text: '“' + it.name + '” and everything inside it will move to the trash.', action: 'Move to trash' } });
      return;
    }
    const ids = this.descendants(id);
    const items = { ...this.state.items };
    ids.forEach((k) => { items[k] = { ...items[k], trashed: true, trashedAt: now() }; });
    this.setState({ items }, this.save);
    ids.forEach((k) => { const r = this.uref('items/' + k); if (r) r.update({ trashed: true, trashedAt: now() }).catch(() => {}); });
    if (ids.indexOf(this.state.activeId) >= 0) {
      const nxt = Object.keys(items).find((k) => items[k].type === 'script' && !items[k].trashed);
      this.setState({ activeId: nxt || '' }, () => this.watchDone());
    }
    this.flash('Moved to trash');
  };
  restore = (id: string) => {
    if (!this.state.items[id]) return;
    const ids = this.descendants(id);
    const items = { ...this.state.items };
    ids.forEach((k) => { items[k] = { ...items[k], trashed: false }; });
    const pid = items[id].parentId || 'root';
    if (pid !== 'root' && (!items[pid] || items[pid].trashed)) items[id] = { ...items[id], parentId: 'root' };
    this.setState({ items }, this.save);
    ids.forEach((k) => { const r = this.uref('items/' + k); if (r) r.update({ trashed: false, parentId: items[k].parentId }).catch(() => {}); });
    this.flash('Restored');
  };
  purge = (id: string, confirmed?: boolean) => {
    const it = this.state.items[id];
    if (!it) return;
    if (!confirmed) {
      this.setState({ confirmBox: { kind: 'purge', id, title: 'Delete forever?', text: '“' + it.name + '” and everything inside it cannot be brought back.', action: 'Delete forever' } });
      return;
    }
    const ids = this.descendants(id);
    this.unshareMany(ids);
    this.dropItems(ids);
  };
  emptyTrash = (confirmed?: boolean) => {
    const ids = Object.keys(this.state.items).filter((x) => this.state.items[x].trashed);
    if (!ids.length) { this.flash('The trash is already empty'); return; }
    if (!confirmed) {
      this.setState({ confirmBox: { kind: 'emptyTrash', title: 'Empty the trash?', text: ids.length + (ids.length === 1 ? ' item' : ' items') + ' will be deleted forever. This cannot be undone.', action: 'Delete forever' } });
      return;
    }
    this.unshareMany(ids);
    this.dropItems(ids);
  };
  confirmDanger = () => {
    const c = this.state.confirmBox;
    if (!c) return;
    this.setState({ confirmBox: null }, () => {
      if (c.kind === 'trash') this.trash(c.id, true);
      else if (c.kind === 'purge') this.purge(c.id, true);
      else if (c.kind === 'emptyTrash') this.emptyTrash(true);
      else if (c.kind === 'resetSettings') this.setState({ settings: migrateSettings({}), tags: { ...DEFAULT_TAGS }, tab: 'appearance' }, () => { this.save(); this.flash('Settings reset'); });
      else if (c.kind === 'clearDone') { this.clearCompletionFeedback(); this.setDone(this.active().id, {}); this.flash('Ready marks cleared'); }
    });
  };
  onUpload = (files: File[]) => {
    if (this.isViewing() || !files.length) return;
    const parent = this.state.items[this.state.activeId] ? this.state.items[this.state.activeId].parentId : 'root';
    files.forEach((f) => {
      const r = new FileReader();
      r.onload = () => {
        const id = uid();
        this.putItem(id, { type: 'script', name: f.name.replace(/\.[^.]+$/, ''), parentId: parent, order: now(), createdAt: now() });
        this.putRaw(id, String(r.result));
        this.setState({ activeId: id, mode: 'normal', viewer: null, drawer: false }, () => this.watchDone());
        this.flash('Loaded ' + f.name);
      };
      r.readAsText(f);
    });
  };

  /* ------------------------------------------------------------------ sharing */

  shareRec(id: string) { return (this.state.shares || {})[id] || null; }
  openShare = (id: string) => this.setState({ shareFor: id, menu: null, shareRole: this.state.settings.defaultShareRole || 'viewer' });
  ensureToken(id: string) {
    const ex = this.shareRec(id);
    if (ex && ex.token) return ex.token;
    const t = tok();
    const rec = { token: t, public: !!this.state.settings.sharePublicByDefault, members: {}, createdAt: now() };
    this.setState({ shares: { ...this.state.shares, [id]: rec } });
    const r = this.uref('shares/' + id);
    if (r) r.set(rec).catch(() => {});
    if (this.state.user) dbRef('shares/' + t).set({ ownerUid: this.state.user.uid, itemId: id, type: (this.state.items[id] || {}).type || 'script', createdAt: now() }).catch(() => {});
    return t;
  }
  pubPayload(id: string) {
    const items: Record<string, any> = {}, raw: Record<string, string> = {};
    this.descendants(id).forEach((k) => {
      const it = this.state.items[k];
      if (!it || it.trashed) return;
      items[k] = { type: it.type, name: it.name, parentId: k === id ? 'root' : it.parentId, order: it.order || 0 };
      if (it.type === 'script') raw[k] = this.state.raws[k] || '';
    });
    const u = this.state.user || {};
    return {
      ownerUid: u.uid || '', shareId: id, ownerName: u.displayName || u.email || '',
      type: (this.state.items[id] || {}).type || 'script', name: (this.state.items[id] || {}).name || '',
      items, raw, settings: this.state.settings, tags: tagsForFirebase(this.state.tags), updatedAt: now(),
    };
  }
  pubHash(id: string) { const p = this.pubPayload(id); return hashOf(JSON.stringify(p.items) + JSON.stringify(p.raw) + JSON.stringify(p.settings) + JSON.stringify(p.tags)); }
  writePub(id: string) {
    if (!this.state.cloud) { this.flash('Sign in to share', 'error'); return null; }
    const t = this.ensureToken(id);
    try {
      dbRef('pub/' + t).set(this.pubPayload(id)).catch((e) => { console.error('Public share publish failed', e); this.flash('The public copy could not be saved', 'error'); });
      this._stamps = { ...this._stamps, [id]: this.pubHash(id) };
      return t;
    } catch (e) {
      console.error('Public share payload invalid', e);
      this.flash('The share holds data that cannot be saved', 'error');
      return null;
    }
  }
  refreshPubFor(id: string) {
    if (!this.state.settings.autoRefreshShare) return;
    const rec = this.shareRec(id);
    const owner = Object.keys(this.state.shares || {}).find((k) => {
      const r = this.state.shares[k];
      return r && r.public && (k === id || this.descendants(k).indexOf(id) >= 0);
    });
    if (rec && rec.public) this.writePub(id);
    else if (owner) this.writePub(owner);
  }
  togglePublic = () => {
    const id = this.state.shareFor;
    const rec = this.shareRec(id) || {};
    const on = !rec.public;
    const t = on ? this.writePub(id) : rec.token || this.ensureToken(id);
    if (!t) return;
    this.setState({ shares: { ...this.state.shares, [id]: { ...rec, token: t, public: on } } });
    const r = this.uref('shares/' + id);
    if (r) r.update({ public: on, token: t }).catch(() => {});
    if (!on) dbRef('pub/' + t).remove().catch(() => {});
    this.flash(on ? 'Public link is on' : 'Public link is off');
  };
  refreshShare = () => { this.writePub(this.state.shareFor); this.flash('Public copy updated'); };
  invite = () => {
    const id = this.state.shareFor, email = this.state.shareEmail, role = this.state.shareRole;
    if (!this.state.cloud) { this.flash('Sign in to share', 'error'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { this.flash('Enter a valid e-mail address', 'error'); return; }
    const t = this.writePub(id);
    const k = ekey(email);
    const rec = this.shareRec(id) || { token: t, public: false, members: {} };
    const members = { ...(rec.members || {}), [k]: { email: email.trim().toLowerCase(), role } };
    this.setState({ shares: { ...this.state.shares, [id]: { ...rec, token: t, members } }, shareEmail: '' });
    const r = this.uref('shares/' + id);
    if (r) r.update({ token: t, members }).catch(() => {});
    dbRef('grants/' + k + '/' + id).set({
      ownerUid: this.state.user.uid, ownerEmail: this.state.user.email || '', recipientEmail: email.trim().toLowerCase(), role, token: t,
      name: (this.state.items[id] || {}).name || '', type: (this.state.items[id] || {}).type || 'script', at: now(),
    }).catch(() => {});
    this.flash('Invited ' + email + ' as ' + ROLE_SHORT[role]);
  };
  setMemberRole = (k: string, role: string) => {
    const id = this.state.shareFor;
    const rec = this.shareRec(id);
    if (!rec) return;
    const members = { ...(rec.members || {}) };
    if (!members[k]) return;
    members[k] = { ...members[k], role };
    this.setState({ shares: { ...this.state.shares, [id]: { ...rec, members } } });
    const r = this.uref('shares/' + id);
    if (r) r.update({ members }).catch(() => {});
    dbRef('grants/' + k + '/' + id).update({ role, recipientEmail: members[k].email || '' }).catch(() => {});
  };
  removeMember = (k: string) => {
    const id = this.state.shareFor;
    const rec = this.shareRec(id);
    if (!rec) return;
    const members = { ...(rec.members || {}) };
    delete members[k];
    this.setState({ shares: { ...this.state.shares, [id]: { ...rec, members } } });
    const r = this.uref('shares/' + id);
    if (r) r.child('members/' + k).remove().catch(() => {});
    dbRef('grants/' + k + '/' + id).remove().catch(() => {});
  };
  unshareMany(ids: string[]) {
    const targets = Array.from(new Set(ids || [])).filter((id) => this.shareRec(id));
    if (!targets.length) return;
    const shares = { ...this.state.shares };
    targets.forEach((id) => {
      const rec = shares[id];
      if (rec.token) { dbRef('pub/' + rec.token).remove().catch(() => {}); dbRef('shares/' + rec.token).remove().catch(() => {}); }
      Object.keys(rec.members || {}).forEach((k) => dbRef('grants/' + k + '/' + id).remove().catch(() => {}));
      const r = this.uref('shares/' + id);
      if (r) r.remove().catch(() => {});
      delete shares[id];
    });
    this.setState({ shares });
  }
  openGrant(g: any, id: string) {
    if (!g || !g.token) { this.flash('The link for this share was not found', 'error'); return; }
    this.setState({ shareLoadingToken: g.token, drawer: false }, () => this.watchPub(g.token, g.role || 'viewer', id));
  }
  exitShare = () => {
    location.hash = '';
    if (this._pubRef) { this._pubRef.off(); this._pubRef = null; }
    this.setState({ viewer: null, viewerToken: null, shareLoadingToken: null, draft: null, activeLine: null, mounted: 40, sideTab: this.state.settings.defaultSideTab === 'review' ? 'review' : 'files' }, () => {
      const s = Object.keys(this.state.items).find((x) => this.state.items[x].type === 'script' && !this.state.items[x].trashed);
      this.setState({ activeId: s }, () => this.watchDone());
    });
  };

  /* ------------------------------------------------------------------ account */

  signIn = () => {
    this.setState({ loginBusy: true, loginError: '' });
    signInGoogle()
      .then(() => { try { localStorage.removeItem(GKEY); } catch { /* blocked */ } this.setState({ loginBusy: false, loginOpen: false, skippedLogin: false, drawer: false }); })
      .catch((e) => {
        const c = (e && e.code) || '';
        const msg = c === 'auth/popup-closed-by-user' ? 'The sign-in window was closed.'
          : c === 'auth/unauthorized-domain' ? 'This domain is not authorised in Firebase. Add it under Authentication → Settings → Authorised domains.'
            : c === 'auth/operation-not-allowed' ? 'Google sign-in is not turned on in Firebase.'
              : c === 'auth/popup-blocked' ? 'The browser blocked the pop-up. Allow pop-ups for this site and try again.'
                : c === 'auth/network-request-failed' ? 'No network. Check the connection and try again.'
                  : 'Sign-in failed: ' + (c || 'unknown error');
        this.setState({ loginBusy: false, loginError: msg, loginTries: this.state.loginTries + 1 });
      });
  };
  skipLogin = () => { try { localStorage.setItem(GKEY, '1'); } catch { /* blocked */ } this.setState({ loginOpen: false, skippedLogin: true }); };
  showLogin = () => this.setState({ loginOpen: true, loginError: '', drawer: false });
  signOut = () => {
    signOutUser().catch(() => {});
    this.detach();
    /* an account's data never lingers after sign-out: wipe memory and local storage */
    clearTimeout(this._timers.save);
    try { localStorage.removeItem(KEY); localStorage.removeItem(GKEY); } catch { /* blocked */ }
    this._stamps = {};
    this._sig = null;
    this.setState({
      menu: null, grants: {}, shares: {}, cloud: false, user: null,
      items: {}, raws: {}, doneMap: {}, activeId: '', activeLine: null,
      openFolders: {}, draft: null, mode: 'normal', showTrash: false, filter: 'all', query: '', treeQuery: '', treeSearchOpen: false,
      viewer: null, viewerToken: null, shareLoadingToken: null, skippedLogin: false, loginOpen: false, drawer: false,
    });
  };
  toggleTheme = () => {
    const cur = isDark(this.effS().theme) ? 'dark' : 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    /* in a shared view the theme is a reader-only choice saved on their device */
    if (this.isViewing()) { this.setViewerPref('theme', next); return; }
    this.set('theme', next);
  };

  /* ------------------------------------------------------------------ raw editor + data actions */

  saveRaw = () => {
    const a = this.active();
    if (this.isViewing()) {
      if (!this.can('edit')) { this.flash('You do not have permission to edit', 'error'); return; }
      const v = this.state.viewer;
      dbRef('pub/' + v.token + '/raw/' + a.id).set(this.state.draft).catch(() => {});
      this.setState({ viewer: { ...v, raws: { ...v.raws, [a.id]: this.state.draft } }, mode: 'normal' }, () => this.flash('Saved to the shared copy'));
      return;
    }
    this.putRaw(a.id, this.state.draft);
    this.setState({ mode: 'normal' }, () => this.flash('Saved and rendered'));
  };
  revertRaw = () => this.setState({ draft: this.active().raw });

  act = (k: string) => {
    const a = this.active();
    if (k === 'copyName') {
      const name = String(a.name || '').trim();
      if (!name) { this.flash('This script has no name'); return; }
      this.copyRaw(name, 'Name copied — ' + name);
      return;
    }
    if (k === 'copyScriptMd' || k === 'copyScriptOnly') {
      const only = k === 'copyScriptOnly';
      const md = only ? this.scriptOnlyMd() : (a.raw || '').replace(/\s+$/, '');
      if (this.state.copyMenu) this.setState({ copyMenu: null });
      if (!md) { this.flash('This script has nothing to copy'); return; }
      const n = this.allLines().length;
      this.copyRaw(md, only ? 'Script only copied — ' + n + ' lines with their sections' : 'Full script copied — ' + n + ' lines with the visual guide');
      return;
    }
    if (k === 'exportTerms') {
      const terms: string[] = [];
      this.allLines().forEach((l) => l.items.forEach((it) => { if (it.render === 'chips') terms.push(...it.chips); }));
      download(safeFileName(a.name, 'script') + ' - search terms.txt', terms.join('\n'));
      return;
    }
    if (k === 'exportMd' || k === 'exportScriptOnly') {
      const only = k === 'exportScriptOnly';
      const md = only ? this.scriptOnlyMd() : (a.raw || '').replace(/\s+$/, '');
      if (this.state.copyMenu) this.setState({ copyMenu: null });
      if (!md.trim()) { this.flash('This script has nothing to download'); return; }
      const file = this.mdFileName(only);
      download(file, md, 'text/markdown');
      this.flash('Download started — ' + file);
      return;
    }
    if (k === 'exportSettings') { download('alamza-settings.json', JSON.stringify({ settings: this.state.settings, tags: this.state.tags }, null, 2), 'application/json'); return; }
    if (k === 'resetSettings') { this.setState({ confirmBox: { kind: 'resetSettings', title: 'Reset every setting?', text: 'Appearance, layout, reading preferences and tag labels go back to their defaults. Your scripts and folders stay.', action: 'Reset settings' } }); return; }
    if (k === 'clearDone') { this.setState({ confirmBox: { kind: 'clearDone', title: 'Clear every ready mark?', text: 'All ready ticks on “' + (a.name || 'this script') + '” are removed, for everyone who shares it.', action: 'Clear marks' } }); return; }
    if (k === 'emptyTrash') return this.emptyTrash(false);
    if (k === 'markAll') {
      const done: Record<string, boolean> = {};
      this.allLines().forEach((l) => { done[l.id] = true; });
      this.setDone(a.id, done, () => this.completionFeedback(done, a.done, null, null));
    }
  };

  /* ------------------------------------------------------------------ tags registry */

  setTag = (name: string, patch: Partial<TagDef>) => this.setState({ tags: { ...this.state.tags, [name]: { ...this.state.tags[name], ...patch, auto: false } } }, this.save);
  deleteTag = (name: string) => { const t = { ...this.state.tags }; delete t[name]; this.setState({ tags: t }, this.save); };
  addTag = () => {
    const n = (this.state.newTag || '').trim().toUpperCase();
    if (!n) return;
    this.setState({ tags: { ...this.state.tags, [n]: { render: 'prose', color: 'slate', split: 'auto' } }, newTag: '' }, this.save);
  };

  openCopyMenu = (el: HTMLElement) => {
    if (this.state.copyMenu) { this.setState({ copyMenu: null }); return; }
    const row = el.closest('[data-copy-split]') || el;
    const r = row.getBoundingClientRect();
    const w = Math.max(260, Math.round(r.width));
    this.setState({ copyMenu: { x: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)), y: Math.max(8, Math.min(r.bottom + 6, window.innerHeight - 270)), w } });
  };

  /* ------------------------------------------------------------------ render */

  render() {
    const v = derive(this);
    this._view = v;
    return <Layout app={this} v={v} />;
  }
}

const FONT_UI: Record<string, string> = {
  sans: "'Instrument Sans',system-ui,sans-serif",
  plex: "'IBM Plex Sans',system-ui,sans-serif",
  manrope: "'Manrope',system-ui,sans-serif",
  system: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
  serif: "'Newsreader',Georgia,serif",
};

/* keep these referenced for readers of the settings screen */
export { FIELDS, TABS, stripMd };
