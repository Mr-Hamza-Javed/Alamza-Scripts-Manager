import { isDark } from '../lib/tokens';
import { ICONS } from '../ui/icons';
import { Badge, Button, Icon, IconButton, Tabs } from '../ui/kit';
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
      <input id="top-search" value={q} autoFocus={autoFocus} enterKeyHint="search"
        onChange={(e) => app.setQuery(e.currentTarget.value)}
        onKeyDown={(e) => {
          /* Enter / Shift+Enter walk through the matches without leaving the box */
          if (e.key === 'Enter' && q.trim()) { e.preventDefault(); app.step(e.shiftKey ? -1 : 1); }
          if (e.key === 'Escape') { e.preventDefault(); if (q) app.setQuery(''); else e.currentTarget.blur(); }
        }}
        placeholder={placeholder(v.S.searchScope, v.mob || app.state.vw < 1500)} aria-label="Search script" />
      {q ? (
        <>
          <span className={`ts-count num${v.hits ? '' : ' none'}`} title="Enter = next match · Shift+Enter = previous">{v.hits}</span>
          <button type="button" className="ts-clear" onClick={() => app.setQuery('')} aria-label="Clear search" title="Clear search"><Icon icon={ICONS.closeSm} size={14} /></button>
        </>
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
  const reading = st.mode === 'normal' || st.mode === 'raw';
  const title = st.mode === 'settings' ? 'Settings' : st.mode === 'design' ? 'Card editor' : null;
  return (
    <header className="topbar">
      {v.mob && <IconButton icon={ICONS.menu} label="Open the library" onClick={() => app.setState({ drawer: true })} />}
      {title ? (
        <span className="doc-name static"><span className="doc-name-text">{title}</span></span>
      ) : (
        <button type="button" className="doc-name" onClick={() => app.act('copyName')} title={v.empty ? '' : name + ' — click to copy the name'} aria-label="Copy script name" disabled={v.empty}>
          <span className="doc-name-text">{v.empty ? 'No script open' : name}</span>
          {!v.empty && <Icon icon={ICONS.copySm} size={14} />}
        </button>
      )}
      {reading && (v.viewing ? (
        <Badge tone="blue" title="Leave the shared view" onClick={app.exitShare}>Read-only</Badge>
      ) : (
        v.isPublic && <Badge tone="green" title="This script has a public link">Public</Badge>
      ))}
      <div className="topbar-actions">
        {!v.mob && st.mode === 'normal' && !v.empty && <SearchBox app={app} v={v} />}
        {v.mob && st.mode === 'normal' && !v.empty && (
          <IconButton icon={ICONS.search} label="Search script" active={st.mobileSearch} onClick={() => app.setState({ mobileSearch: !st.mobileSearch })} />
        )}
        {!v.mob && reading && v.canEditRaw && !v.empty && (
          <Tabs variant="pill" label="View" idBase="mode" value={st.mode} onChange={app.setMode}
            items={[
              { key: 'normal', label: <span className="vt-label">Read</span>, icon: ICONS.read, iconActive: ICONS.readOn, title: 'Read the script' },
              { key: 'raw', label: <span className="vt-label">Raw</span>, icon: ICONS.raw, iconActive: ICONS.rawOn, title: 'Edit the raw markdown' },
            ]} />
        )}
        {!v.mob && reading && v.canShare && <Button size="sm" icon={ICONS.share} className="share-btn" title="Share this script" onClick={() => app.openShare(v.a.id)}>Share</Button>}
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
