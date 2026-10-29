import { type DragEvent, type KeyboardEvent } from 'react';
import { ICONS } from '../ui/icons';
import { Badge, Button, Icon, IconButton, Tabs, TabPanel, Toggle } from '../ui/kit';
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
        <Tabs label="Sidebar" idBase="side" value={st.sideTab}
          onChange={(t) => app.setState({ sideTab: t, showTrash: t === 'files' ? st.showTrash : false })}
          items={[
            { key: 'files', label: 'Scripts', icon: ICONS.folderLine, iconActive: ICONS.folderOn, count: v.scriptCount || undefined },
            { key: 'review', label: 'Review', icon: ICONS.review, iconActive: ICONS.reviewOn },
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

function Library({ app, v }: P) {
  const st = app.state;
  const parent = st.items[st.activeId] ? st.items[st.activeId].parentId : 'root';
  const toggleSearch = () => {
    const open = !st.treeSearchOpen;
    app.setState({ treeSearchOpen: open, treeQuery: open ? st.treeQuery : '' }, () => {
      if (open) setTimeout(() => document.getElementById('tree-search-input')?.focus(), 30);
    });
  };
  const rows = v.tree.filter((r) => !r.header).length;
  return (
    <>
      {!v.sharedMode && (
        <div className="lib-tools">
          <Button size="sm" variant="primary" icon={ICONS.newScript} title="New script" onClick={() => app.create('script', parent)}>New<span className="w-long"> script</span></Button>
          <span style={{ flex: 1 }} />
          <IconButton icon={ICONS.newFolder} label="New folder" onClick={() => app.create('folder', 'root')} />
          <IconButton icon={ICONS.search} label="Find scripts or folders" active={st.treeSearchOpen} onClick={toggleSearch} />
          <IconButton icon={ICONS.upload} label="Import .md or .txt files (or drop them on the page)" onClick={() => document.getElementById('lib-file-input')?.click()} />
          <IconButton icon={st.showTrash ? ICONS.back : ICONS.trash} label={st.showTrash ? 'Back to scripts' : 'Open the trash'} active={st.showTrash}
            onClick={() => app.setState({ showTrash: !st.showTrash, treeQuery: '', treeSearchOpen: false })}
            badge={!st.showTrash && v.trashCount > 0 ? <span className="count-dot">{v.trashCount}</span> : null} />
        </div>
      )}
      {st.treeSearchOpen && (
        <div className="lib-search">
          <div className="input">
            <span className="input-ico"><Icon icon={ICONS.search} size={16} /></span>
            <input id="tree-search-input" value={st.treeQuery} placeholder={st.showTrash ? 'Search the trash…' : 'Find scripts or folders…'} aria-label="Search scripts and folders"
              onChange={(e) => app.setState({ treeQuery: e.currentTarget.value })}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); app.setState({ treeQuery: '', treeSearchOpen: false }); }
                if (e.key === 'ArrowDown') { const first = document.querySelector<HTMLElement>('[data-row]'); if (first) { e.preventDefault(); first.focus(); } }
              }} />
            {st.treeQuery && <button type="button" className="ts-clear" aria-label="Clear library search" onClick={() => app.setState({ treeQuery: '' })}><Icon icon={ICONS.closeSm} size={14} /></button>}
          </div>
        </div>
      )}
      <div className="side-scroll">
        <div className="side-label"><span>{v.treeHeading}</span><span className="side-count">{rows}</span></div>
        {rows === 0 && (
          <div className="empty small">
            <Icon icon={st.showTrash ? ICONS.trash : ICONS.folderLine} size={22} color="muted" />
            <span>{v.treeEmptyMsg}</span>
            {st.treeQuery && <button type="button" className="btn sm" onClick={() => app.setState({ treeQuery: '' })}>Clear search</button>}
          </div>
        )}
        {v.tree.map((r) => (r.header ? (
          <div key={r.id} className="side-label sub"><span>{r.name}</span></div>
        ) : (
          <TreeRowView key={r.id} r={r} app={app} canDrag={v.canDrag}
            drop={st.dropAt && st.dropAt.id === r.id ? st.dropAt.where : null} dragging={st.dragRow === r.id} moved={st.movedRow === r.id} />
        )))}
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
      <span className={`tree-chev${r.open ? ' open' : ''}`}>{r.folder && <Icon icon={ICONS.chevronRight} size={12} />}</span>
      <span className="tree-ico"><Icon icon={r.folder ? (r.open ? ICONS.folderOpen : ICONS.folder) : ICONS.script} size={18} /></span>
      <span className="tree-name" title={r.name}>{r.name}</span>
      <span className="tree-meta">
        {r.ready && <span className="mini-badge green" title="Ready lines"><Icon icon={ICONS.check} size={10} />{r.ready}</span>}
        {r.tag && <span className={`mini-badge ${r.tagTone || ''}`} title={r.tagTitle}>{r.tag}</span>}
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

function Review({ app, v }: P) {
  const st = app.state;
  const scriptDone = st.achievement && st.achievement.level === 'script';
  const tagOn = v.tagFilters.some((f) => f.id === v.activeFilter);
  return (
    <div className="side-scroll review">
      <div className={`review-card${scriptDone ? ' achieved' : ''}`}>
        <div className="review-top">
          <span className="review-title">Review progress</span>
          <span className="review-pct num" key={v.pct}>{v.pct}%</span>
        </div>
        <div className="meter"><span style={{ width: v.pct + '%' }} /></div>
        <div className="review-stats">
          <div><b className="num ok">{v.doneCount}</b><small>Ready</small></div>
          <div><b className="num accent">{Math.max(0, v.total - v.doneCount)}</b><small>Left</small></div>
          <div><b className="num">{v.total}</b><small>Total</small></div>
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
      <div className="segm full" role="radiogroup" aria-label="Filter script lines">
        {v.primaryFilters.map((f) => (
          <button key={f.id} type="button" role="radio" aria-checked={v.activeFilter === f.id} className={v.activeFilter === f.id ? 'on' : ''} onClick={() => app.setFilter(f.id)}>
            {f.label} <span className="segm-n">{f.n}</span>
          </button>
        ))}
      </div>
      {st.filtersOpen && v.tagFilters.length > 0 && (
        <div className="tag-filters">
          {v.tagFilters.map((f) => (
            <button key={f.id} type="button" aria-pressed={v.activeFilter === f.id} className={`tag-filter${v.activeFilter === f.id ? ' on' : ''}`} onClick={() => app.setFilter(v.activeFilter === f.id ? 'all' : f.id)}>
              {f.label} <span>{f.n}</span>
            </button>
          ))}
        </div>
      )}

      <div className="side-label">
        <span>Sections</span>
        <span className={`side-count${v.readySectionCount === v.sectionCount && v.sectionCount ? ' ok' : ''}`}>{v.readySectionCount}/{v.sectionCount} ready</span>
      </div>
      <div className="outline">
        {v.outline.length === 0 && <div className="muted small-note">No sections yet.</div>}
        {v.outline.map((o) => (
          <button key={o.si} type="button" className={`outline-row${o.active ? ' active' : ''}${o.complete ? ' complete' : ''}`}
            onClick={() => app.gotoSection(o.si)} title={'Jump to ' + o.title} aria-label={`Go to section ${o.num}, ${o.title}, ${o.label} ready`}>
            <span className="o-num num">{o.num}</span>
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
          <span className="tool-text"><b>Focus mode</b><small>Light up only the active line · F</small></span>
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
              <span className="tool-text"><b>Copy full script</b><small>Markdown + visual guide{v.total ? ' · ' + v.total + ' lines' : ''}</small></span>
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
        <button type="button" className={`avatar-btn${st.accountMenu ? ' on' : ''}`} aria-haspopup="menu" aria-expanded={!!st.accountMenu}
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
