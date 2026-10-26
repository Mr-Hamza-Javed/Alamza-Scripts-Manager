import type App from '../App';
import type { View } from '../view';
import { ICONS } from '../ui/icons';
import { Icon } from '../ui/kit';
import { Sidebar } from './Sidebar';
import { TopBar, MobileSearch } from './TopBar';
import { Reader } from './Reader';
import { RawEditor } from './RawEditor';
import { SettingsScreen } from './Settings';
import { Overlays } from './Overlays';
import { Loading, Login } from './Login';

export type P = { app: App; v: View };

export function Layout({ app, v }: P) {
  const st = app.state;
  if (v.loading) return <Loading info={v.loading} />;
  if (v.showLogin) return <Login app={app} v={v} />;
  return (
    <>
      <div className={`app${v.mob ? ' is-mobile' : ''}${v.compact ? ' is-compact' : ''}`}>
        {(!v.drawerMode || st.drawer) && (
          <>
            {v.drawerMode && <div className="sidebar-backdrop" onClick={() => app.setState({ drawer: false })} />}
            <Sidebar app={app} v={v} />
          </>
        )}
        <div className="main">
          <TopBar app={app} v={v} />
          {v.mob && st.mobileSearch && st.mode === 'normal' && <MobileSearch app={app} v={v} />}
          {v.broken && (
            <div className="note-bar warn">
              <Icon icon={ICONS.warning} size={18} />
              <span style={{ flex: 1 }}>This link does not work. The share was removed or the link is wrong.</span>
              <button type="button" className="btn sm" onClick={app.exitShare}>My scripts</button>
            </div>
          )}
          {st.mode === 'normal' && <Reader app={app} v={v} />}
          {st.mode === 'raw' && <RawEditor app={app} v={v} />}
          {st.mode === 'settings' && <SettingsScreen app={app} v={v} />}
        </div>
      </div>
      {v.mob && <MobileNav app={app} v={v} />}
      <Overlays app={app} v={v} />
    </>
  );
}

function MobileNav({ app, v }: P) {
  const st = app.state;
  const nav = [
    { id: 'files', label: 'Scripts', icon: ICONS.folderLine },
    { id: 'normal', label: 'Read', icon: ICONS.read },
    { id: 'review', label: 'Review', icon: ICONS.review },
  ]
    .concat(v.canEditRaw ? [{ id: 'raw', label: 'Raw', icon: ICONS.raw }] : [])
    .concat(v.viewing ? [] : [{ id: 'settings', label: 'Settings', icon: ICONS.settings }]);
  const on = (id: string) => (id === 'files' || id === 'review' ? st.drawer && st.sideTab === id : !st.drawer && st.mode === id);
  const go = (id: string) => {
    if (id === 'files' || id === 'review') {
      if (st.mode === 'raw' && st.draft !== null && st.draft !== app.active().raw) app.flash('Raw changes are kept — press Save & render to apply them');
      app.setState({ mode: 'normal', mobileSearch: false, drawer: true, sideTab: id });
      return;
    }
    app.setMode(id);
  };
  return (
    <nav className="bottom-nav" aria-label="Main">
      {nav.map((n) => (
        <button key={n.id} type="button" className={on(n.id) ? 'on' : ''} onClick={() => go(n.id)} aria-current={on(n.id) || undefined}>
          <Icon icon={n.icon} size={20} />
          <span>{n.label}</span>
        </button>
      ))}
    </nav>
  );
}
