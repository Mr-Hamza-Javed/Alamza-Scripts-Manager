import { type DragEvent, type KeyboardEvent, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ICONS } from '../ui/icons';
import { Badge, Icon, IconButton, Tabs, TabPanel, Toggle } from '../ui/kit';
import type { TreeRow } from '../view';
import type { P } from './Layout';

/* Opens the Scripts or Review panel: in the full sidebar, or over the page from the rail. */
export function openPanel(app: P['app'], v: P['v'], tab: 'files' | 'review') {
  /* there is room for the open sidebar: open it and keep it open (the choice is saved) */
  if (v.frame === 'rail' && v.sideFits && !v.viewing && app.state.mode !== 'design') { app.setSidebar(true); app.setState({ sideTab: tab }); return; }
  if (v.frame === 'full') { app.setState({ sideTab: tab }); return; }
  const st = app.state;
  if (st.drawer && st.sideTab === tab) { app.setState({ drawer: false }); return; }
  app.setState({ drawer: true, sideTab: tab, showTrash: tab === 'files' ? st.showTrash : false });
}

export function Sidebar({ app, v }: P) {
  const st = app.state;
  return (
    <aside className={`sidebar lib-side${v.drawerMode ? ' overlay' : ''}${st.sideAnim === 'open' && !v.drawerMode ? ' anim-open' : ''}`}
      style={v.drawerMode ? undefined : ({ width: v.sideW, '--side-w': v.sideW + 'px' } as any)} aria-label="Library">
      <div className="brand">
        <img src="./favicon.svg" alt="" className="brand-logo" />
        <div className="brand-text">
          <div className="brand-title">Alamza Scripts</div>
          <div className="brand-sub">Visual guide reader</div>
        </div>
      </div>
      <div className="side-tabs">
        <Tabs variant="pill" label="Sidebar" idBase="side" value={st.sideTab}
          onChange={(t) => app.setState({ sideTab: t, showTrash: t === 'files' ? st.showTrash : false })}
          items={[
            { key: 'files', label: 'Scripts', icon: ICONS.folderLine, iconActive: ICONS.folderOn, count: v.scriptCount || undefined },
            { key: 'review', label: <>Review{v.total > 0 && <span className={`tab-pct num${v.pct === 100 ? ' ok' : ''}`}>{v.pct}%</span>}</>, icon: ICONS.review, iconActive: ICONS.reviewOn },
          ]} />
      </div>
      <TabPanel idBase="side" value={st.sideTab} dir={st.sideTab === 'review' ? 1 : -1} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {st.sideTab === 'files' ? <Library app={app} v={v} /> : <Review app={app} v={v} />}
      </TabPanel>
      <Account app={app} v={v} />
    </aside>
  );
}

/* tablets, or a folded sidebar: a slim column of icons; Scripts and Review open the panel */
export function Rail({ app, v }: P) {
  const st = app.state;
  const u = v.user;
  const item = (key: string, label: string, icon: any, on: boolean, onClick: () => void, badge?: any) => (
    <button key={key} type="button" className={`nav-item rail-item${on ? ' active' : ''}`} onClick={onClick} title={label} aria-label={label} aria-pressed={on || undefined}>
      <span className="nav-ico"><Icon icon={icon} size={20} /></span>
      {badge}
    </button>
  );
  const panelOn = (t: string) => st.drawer && st.sideTab === t;
  return (
    <aside className={`sidebar collapsed rail${st.sideAnim === 'close' ? ' anim-close' : ''}`} aria-label="Menu">
      <div className="brand"><img src="./favicon.svg" alt="" className="brand-logo" title="Alamza Scripts" /></div>
      <nav className="nav">
        {item('files', 'Scripts', panelOn('files') ? ICONS.folderOn : ICONS.folderLine, panelOn('files'), () => openPanel(app, v, 'files'),
          v.scriptCount ? <span className="rail-badge">{v.scriptCount}</span> : null)}
        {item('review', 'Review · ' + v.pct + '% ready', panelOn('review') ? ICONS.reviewOn : ICONS.review, panelOn('review'), () => openPanel(app, v, 'review'),
          v.total ? <span className="rail-ring" style={{ '--p': v.pct } as any} /> : null)}
        <div className="rail-sep" />
        {item('normal', 'Read', st.mode === 'normal' ? ICONS.readOn : ICONS.read, st.mode === 'normal' && !st.drawer, () => app.setMode('normal'))}
        {v.canEditRaw && item('raw', 'Raw markdown', st.mode === 'raw' ? ICONS.rawOn : ICONS.raw, st.mode === 'raw', () => app.setMode('raw'))}
      </nav>
      <div className="side-foot">
        <div className="side-foot-row">
          <button type="button" className={`avatar-btn rail-avatar${st.accountMenu ? ' on' : ''}`} aria-haspopup="menu" aria-expanded={!!st.accountMenu}
            title={v.signedIn ? (u.displayName || u.email) + ' — profile menu' : 'Profile menu: sign in, card editor, settings'} onClick={(e) => app.openAccountMenu(e.currentTarget, true)}>
            <Avatar v={v} />
          </button>
          {v.sideFits && !v.viewing && st.mode !== 'design' && <IconButton icon={ICONS.showSide} label="Keep the sidebar open" onClick={() => app.setSidebar(true)} />}
        </div>
      </div>
    </aside>
  );
}

/* ---------------------------------------------------------------- library */

/* the list fades in under the heading once it scrolls */
const onSideScroll = (e: { currentTarget: HTMLElement }) => { e.currentTarget.classList.toggle('scrolled', e.currentTarget.scrollTop > 2); };

/* One soft highlight behind the open script. It slides from row to row instead of
   each row lighting up on its own. */
function useActiveHighlight() {
  const listRef = useRef<HTMLDivElement>(null);
  const hlRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const list = listRef.current, hl = hlRef.current;
    if (!list || !hl) return;
    const row = list.querySelector<HTMLElement>('.tree-row.active');
    if (!row) { hl.classList.remove('on'); return; }
    const y = row.offsetTop, h = row.offsetHeight;
    if (hl.dataset.y === String(y) && hl.dataset.h === String(h) && hl.classList.contains('on')) return;
    const jump = !hl.classList.contains('on');
    if (jump) hl.classList.add('instant');
    hl.style.transform = `translateY(${y}px)`;
    hl.style.height = h + 'px';
    hl.dataset.y = String(y);
    hl.dataset.h = String(h);
    hl.classList.add('on');
    if (jump) requestAnimationFrame(() => requestAnimationFrame(() => hl.classList.remove('instant')));
  });
  return { listRef, hlRef };
}

function Library({ app, v }: P) {
  const st = app.state;
  const { listRef, hlRef } = useActiveHighlight();
  const parent = st.items[st.activeId] ? st.items[st.activeId].parentId : 'root';
  const rows = v.tree.filter((r) => !r.header).length;
  return (
    <>
      <div className="lib-head">
        <div className={`input lib-find${st.treeQuery ? ' has-q' : ''}`}>
          <span className="input-ico"><Icon icon={ICONS.search} size={16} /></span>
          <input id="tree-search-input" value={st.treeQuery} placeholder={st.showTrash ? 'Search the trash' : 'Find a script'} aria-label="Search scripts and folders"
            autoComplete="off" spellCheck={false}
            onChange={(e) => app.setState({ treeQuery: e.currentTarget.value })}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); app.setState({ treeQuery: '' }); e.currentTarget.blur(); }
              if (e.key === 'ArrowDown' || e.key === 'Enter') { const first = document.querySelector<HTMLElement>('.lib-side [data-row]'); if (first) { e.preventDefault(); first.focus(); } }
            }} />
          {st.treeQuery && <button type="button" className="ts-clear" aria-label="Clear library search" onClick={() => { app.setState({ treeQuery: '' }); document.getElementById('tree-search-input')?.focus(); }}><Icon icon={ICONS.closeSm} size={14} /></button>}
        </div>
        {!v.sharedMode && !st.showTrash && (
          <button type="button" className="btn primary lib-new" title="New script" aria-label="New script" onClick={() => app.create('script', parent)}>
            <Icon icon={ICONS.add} size={18} color="inherit" />
          </button>
        )}
      </div>
      <div className="side-scroll" onScroll={onSideScroll}>
        <div className="side-label lib-label">
          <span className="side-label-main">
            {st.showTrash && <button type="button" className="mini-btn back" title="Back to scripts" aria-label="Back to scripts" onClick={() => app.setState({ showTrash: false, treeQuery: '' })}><Icon icon={ICONS.back} size={14} /></button>}
            <span>{v.treeHeading}</span><span className="side-count">{rows}</span>
          </span>
          {!v.sharedMode && !st.showTrash && (
            <span className="side-label-acts">
              <button type="button" className="mini-btn" title="New folder" aria-label="New folder" onClick={() => app.create('folder', 'root')}><Icon icon={ICONS.newFolder} size={16} /></button>
              <button type="button" className="mini-btn" title="Import .md or .txt files (or drop them on the page)" aria-label="Import files" onClick={() => document.getElementById('lib-file-input')?.click()}><Icon icon={ICONS.upload} size={16} /></button>
              <button type="button" className="mini-btn" title={v.trashCount ? 'Trash · ' + v.trashCount + (v.trashCount === 1 ? ' item' : ' items') : 'Trash'}
                aria-label={'Open the trash' + (v.trashCount ? ', ' + v.trashCount + ' items' : '')}
                onClick={() => app.setState({ showTrash: true, treeQuery: '' })}>
                <Icon icon={ICONS.trash} size={16} />
              </button>
            </span>
          )}
        </div>
        {rows === 0 && (
          <div className="side-empty">
            <span className="side-empty-tile"><Icon icon={st.treeQuery ? ICONS.search : st.showTrash ? ICONS.trash : ICONS.folderLine} size={22} /></span>
            <span>{v.treeEmptyMsg}</span>
            {st.treeQuery && <button type="button" className="btn sm" onClick={() => app.setState({ treeQuery: '' })}>Clear search</button>}
            {!st.treeQuery && !st.showTrash && !v.sharedMode && <button type="button" className="btn sm" onClick={() => app.create('script', parent)}><Icon icon={ICONS.add} size={16} color="blue" /><span className="btn-label">New script</span></button>}
          </div>
        )}
        <div className="tree-list" ref={listRef}>
          <div className="tree-hl" ref={hlRef} aria-hidden="true" />
          {v.tree.map((r) => (r.header ? (
            <div key={r.id} className="side-label sub"><span>{r.name}</span></div>
          ) : (
            <TreeRowView key={r.id} r={r} app={app} canDrag={v.canDrag}
              drop={st.dropAt && st.dropAt.id === r.id ? st.dropAt.where : null} dragging={st.dragRow === r.id} moved={st.movedRow === r.id} />
          )))}
        </div>
        {st.dragRow && (
          /* while dragging: a place to drop at the end of the top level */
          <div className={`tree-end-drop${st.dropAt && st.dropAt.id === '@root' ? ' on' : ''}`}
            onDragOver={(e) => { if (!app._dragId) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (!st.dropAt || st.dropAt.id !== '@root') app.setState({ dropAt: { id: '@root', where: 'inside' } }); }}
            onDrop={(e) => { const id = app._dragId; if (!id) return; e.preventDefault(); app._dragId = null; app.setState({ dragRow: null, dropAt: null }); app.moveItem(id, '@root', 'inside'); }}>
            <Icon icon={ICONS.move} size={16} /> Drop here for the top level
          </div>
        )}
      </div>
    </>
  );
}

/* drag a row: before / after another row reorders, the middle of a folder moves it inside */
function dropWhere(e: DragEvent<HTMLElement>, folder: boolean): 'before' | 'after' | 'inside' {
  const r = e.currentTarget.getBoundingClientRect();
  const y = (e.clientY - r.top) / Math.max(1, r.height);
  if (folder) return y < 0.28 ? 'before' : y > 0.72 ? 'after' : 'inside';
  return y < 0.5 ? 'before' : 'after';
}

function TreeRowView({ r, app, canDrag, drop, dragging, moved }: { r: TreeRow; app: P['app']; canDrag: boolean; drop: string | null; dragging: boolean; moved: boolean }) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    /* Alt + ↑ / ↓ moves the row itself: the keyboard way to reorder */
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && canDrag && r.menu) {
      e.preventDefault();
      app.nudgeItem(r.id, e.key === 'ArrowUp' ? -1 : 1);
      setTimeout(() => document.querySelector<HTMLElement>(`[data-row="${r.id}"]`)?.focus(), 30);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); app.openRow(r.id); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-row]'));
      const next = rows[rows.indexOf(e.currentTarget) + (e.key === 'ArrowDown' ? 1 : -1)];
      if (next) { e.preventDefault(); next.focus(); }
      return;
    }
    if ((e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) && r.menu) { e.preventDefault(); app.openMenu(r.id, e.currentTarget); }
  };
  const draggable = canDrag && r.menu;
  const dnd = draggable ? {
    draggable: true,
    onDragStart: (e: DragEvent<HTMLDivElement>) => {
      app._dragId = r.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/x-alamza-row', r.id);
      /* the row itself is the drag picture; it fades in place while it moves */
      setTimeout(() => app.setState({ dragRow: r.id }), 0);
    },
    onDragEnd: () => { app._dragId = null; app.setState({ dragRow: null, dropAt: null }); },
  } : {};
  const target = canDrag && r.menu ? {
    onDragOver: (e: DragEvent<HTMLDivElement>) => {
      const id = app._dragId;
      if (!id) return;
      if (id === r.id || app.descendants(id).indexOf(r.id) >= 0) { e.dataTransfer.dropEffect = 'none'; return; }
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      const where = dropWhere(e, r.folder);
      const cur = app.state.dropAt;
      if (!cur || cur.id !== r.id || cur.where !== where) app.setState({ dropAt: { id: r.id, where } });
      /* hovering over a closed folder for a moment opens it */
      if (where === 'inside' && r.folder && !r.open) app.later('dragOpen', () => { if (app.state.dropAt && app.state.dropAt.id === r.id) app.setState({ openFolders: { ...app.state.openFolders, [r.id]: true } }); }, 650);
    },
    onDrop: (e: DragEvent<HTMLDivElement>) => {
      const id = app._dragId;
      if (!id) return;
      e.preventDefault();
      e.stopPropagation();
      const where = dropWhere(e, r.folder);
      app._dragId = null;
      app.setState({ dragRow: null, dropAt: null });
      app.moveItem(id, r.id, where);
    },
  } : {};
  return (
    <div data-row={r.id} tabIndex={0} role="button" aria-current={r.current || undefined}
      aria-label={(r.folder ? 'Folder ' : 'Script ') + r.name + (r.current ? ', open' : '') + (draggable ? '. Drag, or Alt + arrow keys, to move it' : '')}
      className={`tree-row${r.current ? ' active' : ''}${r.folder ? ' is-folder' : ''}${draggable ? ' can-drag' : ''}${dragging ? ' dragging' : ''}${drop ? ' drop-' + drop : ''}${moved ? ' just-moved' : ''}`}
      style={{ paddingLeft: 6 + r.depth * 16, '--i': Math.min(r.sib || 0, 10) } as any} onClick={() => app.openRow(r.id)} onKeyDown={onKey}
      onContextMenu={r.menu ? (e) => { e.preventDefault(); app.openMenu(r.id, e.currentTarget); } : undefined}
      {...dnd} {...target}>
      {r.depth > 0 && Array.from({ length: r.depth }, (_, i) => <span key={i} className="tree-guide" style={{ left: 13 + i * 16 }} aria-hidden="true" />)}
      <span className={`tree-chev${r.open ? ' open' : ''}`}>{r.folder && <Icon icon={ICONS.chevronRight} size={12} />}</span>
      <span className="tree-ico"><Icon icon={r.folder ? (r.open ? ICONS.folderOpenLine : ICONS.folderLine) : r.current ? ICONS.scriptOn : ICONS.script} size={18} /></span>
      <span className="tree-name" title={r.name}>{r.name}</span>
      <span className="tree-meta">
        {r.tag && r.tagTone === 'blue'
          ? <span className="tree-flag" title={r.tagTitle} aria-label={r.tagTitle}><Icon icon={r.tag === 'Link' ? ICONS.link : ICONS.people} size={14} /></span>
          : r.tag && <span className={`mini-badge ${r.tagTone || ''}`} title={r.tagTitle}>{r.tag}</span>}
        {r.ready && <span className="tree-ready num" title={r.ready + ' ready ' + (r.ready === '1' ? 'line' : 'lines')}><Icon icon={ICONS.check} size={10} />{r.ready}</span>}
        {r.folder && <span className="tree-kids num" title={r.kids + (r.kids === 1 ? ' item' : ' items')}>{r.kids}</span>}
      </span>
      {draggable && <span className="tree-grip" aria-hidden="true"><Icon icon={ICONS.grip} size={16} /></span>}
      {r.menu && (
        <button type="button" className="tree-more" aria-label={'More options for ' + r.name} title="More options"
          onClick={(e) => { e.stopPropagation(); app.openMenu(r.id, e.currentTarget); }}>
          <Icon icon={ICONS.more} size={18} />
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- review */

const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* A number that eases to its new value (ease-out cubic). It starts from 0 when the
   panel opens, so the totals count up once; later changes glide from the old value. */
function useCountUp(value: number, ms = 750) {
  const [shown, setShown] = useState(() => (reduceMotion() ? value : 0));
  const from = useRef(shown);
  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    if (reduceMotion()) { from.current = value; setShown(value); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const n = Math.round(start + (value - start) * (1 - Math.pow(1 - k, 3)));
      from.current = n;
      setShown(n);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    /* a hidden tab pauses animation frames: land on the real value anyway */
    const land = setTimeout(() => { from.current = value; setShown(value); }, ms + 150);
    return () => { cancelAnimationFrame(raf); clearTimeout(land); };
  }, [value, ms]);
  return shown;
}

/* Puts a sliding chip under the chosen button of a segmented control. */
function useGlide<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const place = () => {
      const on = box.querySelector<HTMLElement>('[aria-checked="true"]');
      if (!on) { box.style.setProperty('--gw', '0px'); return; }
      box.style.setProperty('--gx', on.offsetLeft + 'px');
      box.style.setProperty('--gw', on.offsetWidth + 'px');
      if (!box.classList.contains('ready')) requestAnimationFrame(() => box.classList.add('ready'));
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(box);
    return () => ro.disconnect();
  });
  return ref;
}

function Review({ app, v }: P) {
  const st = app.state;
  const scriptDone = st.achievement && st.achievement.level === 'script';
  const tagOn = v.tagFilters.some((f) => f.id === v.activeFilter);
  const left = Math.max(0, v.total - v.doneCount);
  const allDone = v.total > 0 && v.doneCount >= v.total;
  const nReady = useCountUp(v.doneCount), nLeft = useCountUp(left), nTotal = useCountUp(v.total);
  const segRef = useGlide<HTMLDivElement>();
  const allSections = v.sectionCount > 0 && v.readySectionCount === v.sectionCount;
  return (
    <div className="side-scroll review" onScroll={onSideScroll}>
      <div className={`review-card${allDone ? ' done' : ''}${scriptDone ? ' achieved' : ''}`}>
        <div className="review-hero">
          <Ring pct={v.total ? v.pct : 0} done={allDone} />
          <div className="review-copy">
            <span className="review-title" key={allDone ? 'd' : v.total ? 'p' : 'e'}>{v.total === 0 ? 'Nothing to review yet' : allDone ? 'Every line is ready' : 'Review progress'}</span>
            <span className="review-sub">
              {v.total === 0 ? 'Lines show up here once the script has some'
                : allDone ? 'All ' + v.total + (v.total === 1 ? ' line has' : ' lines have') + ' footage'
                : left + (left === 1 ? ' line' : ' lines') + ' still to check'}
            </span>
          </div>
        </div>
        <div className="review-stats">
          <div className="st-ready"><b className="num">{nReady}</b><small>Ready</small></div>
          <div className="st-left"><b className="num">{nLeft}</b><small>Left</small></div>
          <div><b className="num">{nTotal}</b><small>Total</small></div>
        </div>
      </div>

      <div className="side-label">
        <span>Filter lines</span>
        {v.tagFilters.length > 0 && (
          <button type="button" className={`link-btn${st.filtersOpen ? ' open' : ''}`} aria-expanded={st.filtersOpen} onClick={() => app.setState({ filtersOpen: !st.filtersOpen })}>
            <Icon icon={ICONS.filter} size={14} /> Tags {v.tagFilters.length}{tagOn && <span className="dot" />}
            <Icon icon={ICONS.chevronDown} size={10} />
          </button>
        )}
      </div>
      <div className="segm full glide" role="radiogroup" aria-label="Filter script lines" ref={segRef}>
        <span className="segm-chip" aria-hidden="true" />
        {v.primaryFilters.map((f) => (
          <button key={f.id} type="button" role="radio" aria-checked={v.activeFilter === f.id} className={v.activeFilter === f.id ? 'on' : ''} onClick={() => app.setFilter(f.id)}>
            {f.label} <span className="segm-n num">{f.n}</span>
          </button>
        ))}
      </div>
      {st.filtersOpen && v.tagFilters.length > 0 && (
        <div className="tag-filters">
          {v.tagFilters.map((f, i) => (
            <button key={f.id} type="button" aria-pressed={v.activeFilter === f.id} className={`tag-filter${v.activeFilter === f.id ? ' on' : ''}`} style={{ '--i': Math.min(i, 12) } as any}
              onClick={() => app.setFilter(v.activeFilter === f.id ? 'all' : f.id)}>
              {f.label} <span>{f.n}</span>
            </button>
          ))}
        </div>
      )}

      <div className="side-label">
        <span>Sections</span>
        <span className={`side-count${allSections ? ' ok' : ''}`}>{v.readySectionCount}/{v.sectionCount} ready</span>
      </div>
      <div className="outline">
        {v.outline.length === 0 && <div className="muted small-note">No sections yet.</div>}
        {v.outline.map((o, i) => (
          <button key={o.si} type="button" className={`outline-row${o.active ? ' active' : ''}${o.complete ? ' complete' : ''}`} style={{ '--i': Math.min(i, 12) } as any}
            onClick={() => app.gotoSection(o.si)} title={'Jump to ' + o.title} aria-label={`Go to section ${o.num}, ${o.title}, ${o.label} ready`}>
            <span className="o-num num">{o.complete ? <Icon icon={ICONS.check} size={10} /> : o.num}</span>
            <span className="o-title">{o.title}</span>
            <span className="o-label num">{o.label}</span>
            <span className="o-bar"><span style={{ width: o.pct + '%' }} /></span>
          </button>
        ))}
      </div>

      <div className="side-label"><span>View</span></div>
      <div className="tool-list">
        <div className={`tool-row click${v.S.focusMode ? ' on' : ''}`} onClick={app.toggleFocus}>
          <span className="tool-ico"><Icon icon={ICONS.focus} size={16} /></span>
          <span className="tool-text"><b>Focus mode</b><small title="Dims every line except the active one · F">Dim the other lines · F</small></span>
          <span onClick={(e) => e.stopPropagation()}><Toggle label="Focus mode" checked={!!v.S.focusMode} onChange={() => app.toggleFocus()} /></span>
        </div>
        <button type="button" className="tool-row" onClick={app.toggleAllSections}>
          <span className="tool-ico"><Icon icon={v.allCollapsed ? ICONS.expandAll : ICONS.collapseAll} size={16} /></span>
          <span className="tool-text"><b>{v.allCollapsed ? 'Expand all sections' : 'Collapse all sections'}</b><small>{v.allCollapsed ? 'Show every line' : 'Keep only the section outline'}</small></span>
        </button>
        {!!(v.a.raw || '').trim() && (
          <div className="tool-row split" data-copy-split>
            <button type="button" className="split-main" onClick={() => app.act('copyScriptMd')} title="Copy the whole script with its visual guide as Markdown">
              <span className="tool-ico"><Icon icon={ICONS.copy} size={16} /></span>
              <span className="tool-text"><b>Copy full script</b><small>Markdown + visual guide{v.total ? ' · ' + v.total + (v.total === 1 ? ' line' : ' lines') : ''}</small></span>
            </button>
            <button type="button" className={`split-caret${st.copyMenu ? ' on' : ''}`} aria-haspopup="menu" aria-expanded={!!st.copyMenu} aria-label="More copy options" title="More copy options"
              onClick={(e) => app.openCopyMenu(e.currentTarget)}>
              <Icon icon={ICONS.chevronDown16} size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* Review progress as a ring. The arc and the number move together; when every line
   is ready the arc turns green and a check fades in at the centre. */
function Ring({ pct, done }: { pct: number; done: boolean }) {
  const gid = 'ring-' + useId().replace(/:/g, '');
  const val = Math.max(0, Math.min(100, pct));
  const shown = useCountUp(val);
  return (
    <span className={`ring${done ? ' done' : ''}`} role="img" aria-label={done ? 'Every line is ready' : val + '% ready'}>
      <svg className="ring-svg" viewBox="0 0 48 48" aria-hidden="true">
        <defs>
          <linearGradient id={gid + '-p'} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#60a5fa" /><stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id={gid + '-d'} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor="#16a34a" />
          </linearGradient>
        </defs>
        <circle className="ring-track" cx="24" cy="24" r="20" />
        <circle className={`ring-fill${val > 0 ? '' : ' empty'}`} cx="24" cy="24" r="20" pathLength={100}
          strokeDasharray={`${val} 100`} stroke={`url(#${gid}-${done ? 'd' : 'p'})`} />
      </svg>
      {done
        ? <span className="ring-check" key="done"><Icon icon={ICONS.doneBold} size={20} /></span>
        : <b className="ring-num num" key="num">{shown}<small>%</small></b>}
    </span>
  );
}

/* ---------------------------------------------------------------- account footer */

function Avatar({ v }: { v: P['v'] }) {
  const u = v.user;
  if (!v.signedIn) return <span className="avatar ghost"><Icon icon={ICONS.person} size={16} /></span>;
  const disp = u.displayName || u.email || '?';
  return (
    <span className="avatar">
      {disp.charAt(0).toUpperCase()}
      {u.photoURL && <img src={u.photoURL} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />}
    </span>
  );
}

/* the footer: your profile (opens the profile menu) and, beside it, fold / close */
function Account({ app, v }: P) {
  const st = app.state;
  const u = v.user;
  return (
    <div className="side-foot">
      <div className="side-foot-row">
        <button type="button" className={`avatar-btn profile-card${st.accountMenu ? ' on' : ''}`} aria-haspopup="menu" aria-expanded={!!st.accountMenu}
          title="Profile menu" onClick={(e) => app.openAccountMenu(e.currentTarget)}>
          <Avatar v={v} />
          <span className="avatar-text">
            <span className="avatar-name">{v.signedIn ? u.displayName || u.email : 'Not signed in'}</span>
            <span className="avatar-role"><span className={`sync-dot${st.cloud ? ' on' : ''}`} />{v.signedIn ? (st.cloud ? 'Synced' : 'Local only') : 'Scripts stay in this browser'}</span>
          </span>
          <span className={`avatar-chev${st.accountMenu ? ' open' : ''}`}><Icon icon={ICONS.chevronDown} size={12} /></span>
        </button>
        {v.drawerMode
          ? <IconButton icon={ICONS.close} label="Close the library" onClick={() => app.setState({ drawer: false })} />
          : !v.viewing && <IconButton icon={ICONS.hideSide} label="Collapse the sidebar" onClick={() => app.setSidebar(false)} />}
      </div>
    </div>
  );
}

export { Badge };
