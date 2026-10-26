import { useRef, type KeyboardEvent } from 'react';
import { ICONS } from '../ui/icons';
import { Badge, Button, Icon, IconButton, Toggle, ViewToggle } from '../ui/kit';
import type { TreeRow } from '../view';
import type { P } from './Layout';

export function Sidebar({ app, v }: P) {
  const st = app.state;
  return (
    <aside className={`sidebar lib-side${v.drawerMode ? ' overlay' : ''}`} style={v.drawerMode ? undefined : { width: v.sideW }}>
      <div className="brand">
        <img src="./favicon.svg" alt="" className="brand-logo" />
        <div className="brand-text">
          <div className="brand-title">Alamza Scripts</div>
          <div className="brand-sub">Visual guide reader</div>
        </div>
        {v.drawerMode
          ? <IconButton icon={ICONS.close} label="Close the library" className="brand-close" onClick={() => app.setState({ drawer: false })} />
          : !v.viewing && <IconButton icon={ICONS.hideSide} label="Hide the library" className="brand-close" onClick={() => app.set('showSidebar', false)} />}
      </div>
      <div className="side-tabs">
        <ViewToggle label="Sidebar" value={st.sideTab}
          onChange={(t) => app.setState({ sideTab: t, showTrash: t === 'files' ? st.showTrash : false })}
          options={[
            { value: 'files', icon: ICONS.folderLine, label: <>Scripts <span className="tab-n">{v.scriptCount || ''}</span></> },
            { value: 'review', icon: ICONS.review, label: <>Review <span className="tab-n">{v.total ? v.doneCount + '/' + v.total : ''}</span></> },
          ]} />
      </div>
      {st.sideTab === 'files' ? <Library app={app} v={v} /> : <Review app={app} v={v} />}
      <Account app={app} v={v} />
    </aside>
  );
}

/* ---------------------------------------------------------------- library */

function Library({ app, v }: P) {
  const st = app.state;
  const fileRef = useRef<HTMLInputElement>(null);
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
          <IconButton icon={ICONS.upload} label="Import .md or .txt files" onClick={() => fileRef.current?.click()} />
          <input ref={fileRef} type="file" accept=".md,.txt,.markdown,text/*" multiple hidden
            onChange={(e) => { app.onUpload(Array.from(e.currentTarget.files || [])); e.currentTarget.value = ''; }} />
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
          <TreeRowView key={r.id} r={r} app={app} />
        )))}
      </div>
    </>
  );
}

function TreeRowView({ r, app }: { r: TreeRow; app: P['app'] }) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); app.openRow(r.id); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-row]'));
      const next = rows[rows.indexOf(e.currentTarget) + (e.key === 'ArrowDown' ? 1 : -1)];
      if (next) { e.preventDefault(); next.focus(); }
      return;
    }
    if ((e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) && r.menu) { e.preventDefault(); app.openMenu(r.id, e.currentTarget); }
  };
  return (
    <div data-row={r.id} tabIndex={0} role="button" aria-current={r.current || undefined}
      aria-label={(r.folder ? 'Folder ' : 'Script ') + r.name + (r.current ? ', open' : '')}
      className={`tree-row${r.current ? ' active' : ''}${r.folder ? ' is-folder' : ''}`}
      style={{ paddingLeft: 6 + r.depth * 16 }} onClick={() => app.openRow(r.id)} onKeyDown={onKey}
      onContextMenu={r.menu ? (e) => { e.preventDefault(); app.openMenu(r.id, e.currentTarget); } : undefined}>
      <span className={`tree-chev${r.open ? ' open' : ''}`}>{r.folder && <Icon icon={ICONS.chevronRight} size={12} />}</span>
      <span className="tree-ico"><Icon icon={r.folder ? (r.open ? ICONS.folderOpen : ICONS.folder) : ICONS.script} size={18} /></span>
      <span className="tree-name" title={r.name}>{r.name}</span>
      <span className="tree-meta">
        {r.ready && <span className="mini-badge green" title="Ready lines"><Icon icon={ICONS.check} size={10} />{r.ready}</span>}
        {r.tag && <span className={`mini-badge ${r.tagTone || ''}`} title={r.tagTitle}>{r.tag}</span>}
      </span>
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

function Account({ app, v }: P) {
  const st = app.state;
  const u = v.user;
  if (!v.signedIn) {
    return (
      <div className="side-foot">
        <button type="button" className="avatar-btn" onClick={app.showLogin}>
          <span className="avatar ghost"><Icon icon={ICONS.person} size={16} /></span>
          <span className="avatar-text"><span className="avatar-name">Sign in</span><span className="avatar-role">Sync and sharing</span></span>
          <Icon icon={ICONS.chevronRight} size={12} color="muted" />
        </button>
      </div>
    );
  }
  const disp = u.displayName || u.email || '?';
  return (
    <div className="side-foot">
      <div className="side-foot-row">
        <div className="avatar-btn static">
          <span className="avatar">
            {disp.charAt(0).toUpperCase()}
            {u.photoURL && <img src={u.photoURL} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />}
          </span>
          <span className="avatar-text">
            <span className="avatar-name">{u.displayName || u.email}</span>
            <span className="avatar-role"><span className={`sync-dot${st.cloud ? ' on' : ''}`} />{st.cloud ? 'Synced' : 'Local only'}</span>
          </span>
        </div>
        <IconButton icon={ICONS.signOut} label="Sign out" className="danger-hover" onClick={app.signOut} />
      </div>
    </div>
  );
}

export { Badge };
