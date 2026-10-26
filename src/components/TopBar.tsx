import { isDark } from '../lib/tokens';
import { ICONS } from '../ui/icons';
import { Badge, Button, Icon, IconButton, ViewToggle } from '../ui/kit';
import type { P } from './Layout';

/* the placeholder names what a search really looks at; shorter when the box is narrow */
function placeholder(scope: string, short: boolean) {
  if (scope === 'script') return short ? 'Search lines…' : 'Search script lines…';
  if (scope === 'guide') return short ? 'Search lines + guide…' : 'Search lines, tags, terms…';
  return short ? 'Search script…' : 'Search script and context…';
}

export function SearchBox({ app, v, autoFocus }: P & { autoFocus?: boolean }) {
  const q = app.state.query;
  return (
    <div className={`input topsearch${q ? ' filled' : ''}`}>
      <span className="input-ico"><Icon icon={ICONS.search} size={17} /></span>
      <input id="top-search" value={q} autoFocus={autoFocus} onChange={(e) => app.setQuery(e.currentTarget.value)} placeholder={placeholder(v.S.searchScope, v.mob || app.state.vw < 1500)} aria-label="Search script" />
      {q ? (
        <button type="button" className="ts-clear" onClick={() => app.setQuery('')} aria-label="Clear search" title="Clear search"><Icon icon={ICONS.closeSm} size={14} /></button>
      ) : (
        !v.mob && <kbd className="kbd ts-kbd" title="Press / to search">/</kbd>
      )}
    </div>
  );
}

export function TopBar({ app, v }: P) {
  const st = app.state;
  const name = v.a.name || 'Untitled';
  const dark = isDark(v.S.theme);
  return (
    <header className="topbar">
      {(v.mob || v.compact) && <IconButton icon={ICONS.menu} label="Open the library" onClick={() => app.setState({ drawer: true })} />}
      {!v.mob && !v.compact && !v.S.showSidebar && (
        <IconButton icon={ICONS.showSide} label="Show the library" onClick={() => app.set('showSidebar', true)} />
      )}
      <button type="button" className="doc-name" onClick={() => app.act('copyName')} title={name + ' — click to copy the name'} aria-label="Copy script name">
        <span className="doc-name-text">{v.empty ? 'No script open' : name}</span>
        {!v.empty && <Icon icon={ICONS.copySm} size={14} />}
      </button>
      {v.viewing ? (
        <Badge tone="blue" title="Leave the shared view" onClick={app.exitShare}>Read-only</Badge>
      ) : (
        v.isPublic && <Badge tone="green" title="This script has a public link">Public</Badge>
      )}
      <div className="topbar-actions">
        {!v.mob && st.mode === 'normal' && <SearchBox app={app} v={v} />}
        {v.mob && st.mode === 'normal' && (
          <IconButton icon={ICONS.search} label="Search script" active={st.mobileSearch} onClick={() => app.setState({ mobileSearch: !st.mobileSearch })} />
        )}
        {!v.mob && v.modes.length > 1 && (
          <ViewToggle label="View mode" value={st.mode} onChange={app.setMode}
            options={v.modes.map((m) => ({ ...m, title: m.label, icon: m.value === 'normal' ? ICONS.read : m.value === 'raw' ? ICONS.raw : ICONS.settings }))} />
        )}
        {!v.mob && v.canShare && <Button size="sm" icon={ICONS.share} className="share-btn" title="Share this script" onClick={() => app.openShare(v.a.id)}>Share</Button>}
        <IconButton icon={dark ? ICONS.light : ICONS.dark} label={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={app.toggleTheme} />
      </div>
    </header>
  );
}

export function MobileSearch({ app, v }: P) {
  return (
    <div className="mobile-search">
      <SearchBox app={app} v={v} autoFocus />
      <button type="button" className="btn ghost sm" onClick={() => app.setState({ mobileSearch: false })}>Done</button>
    </div>
  );
}
