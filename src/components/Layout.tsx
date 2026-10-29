import type App from '../App';
import type { View } from '../view';
import { ICONS } from '../ui/icons';
import { Icon, IconTile } from '../ui/kit';
import { Sidebar, Rail, openPanel } from './Sidebar';
import { TopBar, MobileSearch } from './TopBar';
import { Reader } from './Reader';
import { RawEditor } from './RawEditor';
import { SettingsScreen } from './Settings';
import { CardEditor } from './CardEditor';
import { Overlays } from './Overlays';
import { Loading, Login } from './Login';

export type P = { app: App; v: View };

/*
 * The frame follows the skill's screen sizes:
 *   desktop / laptop  full sidebar (Scripts | Review, then Card editor, Settings, account)
 *   tablet            a slim icon rail; Scripts and Review open the panel over the page
 *   phone             top bar + bottom tab bar; the panel opens as a drawer
 */
export function Layout({ app, v }: P) {
  const st = app.state;
  if (v.loading) return <Loading info={v.loading} />;
  if (v.showLogin) return <Login app={app} v={v} />;
  const reading = st.mode === 'normal' || st.mode === 'raw';
  return (
    <>
      <div className={`app frame-${v.frame}${v.mob ? ' is-mobile' : ''}${v.compact ? ' is-compact' : ''}`}>
        {v.frame === 'rail' && <Rail app={app} v={v} />}
        {(v.frame === 'full' || st.drawer) && (
          <>
            {v.drawerMode && <div className="sidebar-backdrop" onClick={() => app.setState({ drawer: false })} />}
            <Sidebar app={app} v={v} />
          </>
        )}
        <div className="main">
          {reading && <TopBar app={app} v={v} />}
          {!reading && v.mob && <TopBar app={app} v={v} />}
          {v.mob && st.mobileSearch && st.mode === 'normal' && <MobileSearch app={app} v={v} />}
          {v.broken && (
            <div className="note-bar warn">
              <Icon icon={ICONS.warning} size={18} />
              <span style={{ flex: 1 }}>This link does not work. The share was removed or the link is wrong.</span>
              <button type="button" className="btn sm" onClick={app.exitShare}>My scripts</button>
            </div>
          )}
          <div className="screen" key={st.mode}>
            {st.mode === 'normal' && <Reader app={app} v={v} />}
            {st.mode === 'raw' && <RawEditor app={app} v={v} />}
            {st.mode === 'settings' && <SettingsScreen app={app} v={v} />}
            {st.mode === 'design' && <CardEditor app={app} v={v} />}
          </div>
        </div>
      </div>
      {v.mob && <MobileNav app={app} v={v} />}
      <input id="lib-file-input" type="file" accept=".md,.txt,.markdown,text/*" multiple hidden
        onChange={(e) => { app.onUpload(Array.from(e.currentTarget.files || [])); e.currentTarget.value = ''; }} />
      {st.dragOver && (
        <div className="drop-layer" aria-hidden="true">
          <div className="drop-card">
            <IconTile icon={ICONS.dropTile} tone="blue" size={52} radius={15} />
            <b>Drop to import</b>
            <span className="muted">.md and .txt files become new scripts</span>
          </div>
        </div>
      )}
      <Overlays app={app} v={v} />
    </>
  );
}

function MobileNav({ app, v }: P) {
  const st = app.state;
  const nav = [
    { id: 'files', label: 'Scripts', icon: ICONS.folderLine, on: ICONS.folderOn },
    { id: 'normal', label: 'Read', icon: ICONS.read, on: ICONS.readOn },
    { id: 'review', label: 'Review', icon: ICONS.review, on: ICONS.reviewOn },
  ]
    .concat(v.canEditRaw ? [{ id: 'raw', label: 'Raw', icon: ICONS.raw, on: ICONS.rawOn }] : [])
    .concat(v.viewing ? [] : [{ id: 'settings', label: 'Settings', icon: ICONS.settings, on: ICONS.settingsOn }]);
  const isOn = (id: string) => (id === 'files' || id === 'review' ? st.drawer && st.sideTab === id : !st.drawer && (st.mode === id || (id === 'settings' && st.mode === 'design')));
  const go = (id: string) => {
    if (id === 'files' || id === 'review') {
      if (st.mode === 'raw' && st.draft !== null && st.draft !== app.active().raw) app.flash('Raw changes are kept — press Save & render to apply them');
      openPanel(app, v, id as 'files' | 'review');
      return;
    }
    app.setState({ drawer: false });
    app.setMode(id);
  };
  return (
    <nav className="bottom-nav" aria-label="Main">
      {nav.map((n) => {
        const on = isOn(n.id);
        return (
          <button key={n.id} type="button" className={on ? 'on' : ''} onClick={() => go(n.id)} aria-current={on || undefined}>
            <Icon icon={on ? n.on : n.icon} size={20} />
            <span>{n.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
