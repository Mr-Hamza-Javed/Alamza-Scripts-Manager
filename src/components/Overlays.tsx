import type { ReactNode } from 'react';
import type { FluentIcon } from '@fluentui/react-icons';
import { ROLES, ROLE_HINT, ROLE_SHORT } from '../lib/constants';
import { shareUrlFor } from '../lib/util';
import { ICONS } from '../ui/icons';
import { Button, Icon, IconButton, Toggle } from '../ui/kit';
import type { P } from './Layout';

type MenuItem = { id?: string; label?: string; hint?: string; icon?: FluentIcon; danger?: boolean; divider?: boolean };

export function Overlays({ app, v }: P) {
  const st = app.state;
  return (
    <>
      {st.menu && <ItemMenu app={app} v={v} />}
      {st.accountMenu && <AccountMenu app={app} v={v} />}
      {st.copyMenu && <CopyMenu app={app} v={v} />}
      {st.renameFor && st.items[st.renameFor] && <RenameDialog app={app} v={v} />}
      {st.confirmBox && <ConfirmDialog app={app} v={v} />}
      {st.shareFor && <ShareDialog app={app} v={v} />}
      {st.promptBox && <PromptDialog app={app} v={v} />}
      {st.shortcuts && <ShortcutsDialog app={app} v={v} />}
      {v.showJump && (
        <button type="button" className="btn primary jump-btn" onClick={() => app.revealLine(st.activeLine)}>
          <Icon icon={ICONS.jump} size={16} /><span className="btn-label">Back to line {v.activeNum}</span>
        </button>
      )}
      {st.achievement && <span role="status" aria-live="polite" className="sr-only">{st.achievement.label}</span>}
      {st.achievement && st.achievement.level === 'script' && <div className="script-complete-wave" aria-hidden="true" />}
      {st.toast && (
        <div key={st.toast.key} className={`toast app-toast ${st.toast.tone}`} role="status" aria-live="polite">
          <Icon icon={st.toast.tone === 'error' ? ICONS.errorSm : ICONS.successSm} size={20} color={st.toast.tone === 'error' ? 'red' : 'green'} />
          <span>{st.toast.msg}</span>
        </div>
      )}
    </>
  );
}

function Backdrop({ onClose, children, z = 400 }: { onClose: () => void; children: ReactNode; z?: number }) {
  return <div className="menu-layer" style={{ zIndex: z }} onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>{children}</div>;
}

function ItemMenu({ app }: P) {
  const st = app.state;
  const id = st.menu.id;
  const it = st.items[id];
  if (!it) return null;
  let items: MenuItem[];
  if (it.trashed) {
    items = [{ id: 'restore', label: 'Restore', icon: ICONS.restore }, { divider: true }, { id: 'purge', label: 'Delete forever', icon: ICONS.purge, danger: true }];
  } else {
    items = it.type === 'folder'
      ? [{ id: 'newIn', label: 'New script inside', icon: ICONS.newScript }, { id: 'newFolderIn', label: 'New folder inside', icon: ICONS.newFolder }, { divider: true },
        { id: 'rename', label: 'Rename', icon: ICONS.rename }, { id: 'dup', label: 'Duplicate', icon: ICONS.duplicate }, { id: 'share', label: 'Share…', icon: ICONS.share }]
      : [{ id: 'open', label: 'Open', icon: ICONS.open }, { id: 'rename', label: 'Rename', icon: ICONS.rename }, { id: 'dup', label: 'Duplicate', icon: ICONS.duplicate },
        { id: 'share', label: 'Share…', icon: ICONS.share }, { id: 'export', label: 'Download .md', icon: ICONS.download }];
    if (!st.cloud) items = items.filter((m) => m.id !== 'share');
    /* the touch / keyboard way to change the order (desktop can also drag) */
    if (app._view && app._view.canDrag) {
      const sibs = app.sortedChildren(it.parentId || 'root');
      const i = sibs.indexOf(id);
      const same = (j: number) => j >= 0 && j < sibs.length && (!st.settings.foldersFirst || (st.items[sibs[j]].type === 'folder') === (it.type === 'folder'));
      const order: MenuItem[] = [];
      if (same(i - 1)) order.push({ id: 'up', label: 'Move up', icon: ICONS.up });
      if (same(i + 1)) order.push({ id: 'down', label: 'Move down', icon: ICONS.down });
      if (order.length) items.push({ divider: true }, ...order);
    }
    const desc = app.descendants(id);
    const folders = Object.keys(st.items).filter((k) => st.items[k].type === 'folder' && !st.items[k].trashed && desc.indexOf(k) < 0 && k !== it.parentId);
    if (folders.length || (it.parentId && it.parentId !== 'root')) {
      items.push({ divider: true });
      if (it.parentId && it.parentId !== 'root') items.push({ id: 'moveRoot', label: 'Move to top level', icon: ICONS.move });
      folders.forEach((f) => items.push({ id: 'move:' + f, label: 'Move to “' + st.items[f].name + '”', icon: ICONS.move }));
    }
    items.push({ divider: true }, { id: 'trash', label: 'Move to trash', icon: ICONS.trash, danger: true });
  }
  return (
    <Backdrop onClose={() => app.setState({ menu: null })}>
      <div className="popup menu item-menu" role="menu" style={{ left: st.menu.x, top: st.menu.y }} onClick={(e) => e.stopPropagation()}>
        <div className="menu-label">{it.name}</div>
        {items.map((m, i) => (m.divider ? <div key={i} className="menu-sep" /> : (
          <div key={m.id} role="menuitem" tabIndex={0} className={`menu-item${m.danger ? ' danger' : ''}`} onClick={() => app.menuAct(m.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); app.menuAct(m.id); } }}>
            <Icon icon={m.icon} size={18} color={m.danger ? 'red' : 'blue'} />
            <span className="menu-text">{m.label}</span>
          </div>
        )))}
      </div>
    </Backdrop>
  );
}

function CopyMenu({ app }: P) {
  const cm = app.state.copyMenu;
  const items: MenuItem[] = [
    { id: 'copyScriptMd', label: 'Copy full script + visual guide', hint: 'The source markdown, with its tables', icon: ICONS.copy },
    { id: 'copyScriptOnly', label: 'Copy script only', hint: 'Only the script lines with their sections', icon: ICONS.copy },
    { divider: true },
    { id: 'exportMd', label: 'Download full script + guide', hint: app.mdFileName(false), icon: ICONS.download },
    { id: 'exportScriptOnly', label: 'Download script only', hint: app.mdFileName(true), icon: ICONS.download },
  ];
  return (
    <Backdrop onClose={() => app.setState({ copyMenu: null })}>
      <div className="popup menu copy-menu" role="menu" aria-label="Copy options" style={{ left: cm.x, top: cm.y, width: cm.w }} onClick={(e) => e.stopPropagation()}>
        <div className="menu-label">This script as Markdown</div>
        {items.map((m, i) => (m.divider ? <div key={i} className="menu-sep" /> : (
          <div key={m.id} role="menuitem" tabIndex={0} className="menu-item tall" onClick={() => app.act(m.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); app.act(m.id); } }}>
            <Icon icon={m.icon} size={18} color="blue" />
            <span className="menu-text"><b>{m.label}</b><small>{m.hint}</small></span>
          </div>
        )))}
      </div>
    </Backdrop>
  );
}

function Dialog({ onClose, children, className, sheet }: { onClose: () => void; children: ReactNode; className?: string; sheet?: boolean }) {
  return (
    <div className={`overlay-bg${sheet ? ' sheet' : ''}`} onClick={onClose}>
      <div className={`dialog${className ? ' ' + className : ''}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function RenameDialog({ app }: P) {
  const st = app.state;
  const it = st.items[st.renameFor];
  const close = () => app.setState({ renameFor: null, renameValue: '' });
  return (
    <Dialog onClose={close}>
      <div className="dialog-head">{it.type === 'folder' ? 'Rename folder' : 'Rename script'}</div>
      <div className="dialog-body col">
        <div className="input">
          <span className="input-ico"><Icon icon={it.type === 'folder' ? ICONS.folderLine : ICONS.script} size={17} /></span>
          <input autoFocus value={st.renameValue} placeholder="Name" aria-label="Name" onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => app.setState({ renameValue: e.currentTarget.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); app.commitRename(); } if (e.key === 'Escape') { e.preventDefault(); close(); } }} />
        </div>
      </div>
      <div className="dialog-foot">
        <Button variant="ghost" onClick={close}>Cancel</Button>
        <Button variant="primary" icon={ICONS.save} onClick={app.commitRename} disabled={!st.renameValue.trim()}>Save</Button>
      </div>
    </Dialog>
  );
}

function ConfirmDialog({ app }: P) {
  const c = app.state.confirmBox;
  const close = () => app.setState({ confirmBox: null });
  return (
    <Dialog onClose={close}>
      <div className="dialog-head">{c.title}</div>
      <div className="dialog-body">
        <span className="msg-icon danger"><Icon icon={ICONS.warning} size={22} /></span>
        <div>{c.text}</div>
      </div>
      <div className="dialog-foot">
        <Button variant="ghost" onClick={close}>Cancel</Button>
        <Button variant="danger-solid" icon={ICONS.trash} onClick={app.confirmDanger}>{c.action}</Button>
      </div>
    </Dialog>
  );
}

function ShareDialog({ app, v }: P) {
  const st = app.state;
  const id = st.shareFor;
  const item = st.items[id] || {};
  const rec = (st.shares || {})[id] || {};
  const url = rec.token ? shareUrlFor(rec.token) : '';
  const stale = !!(rec.public && app._stamps[id] && app._stamps[id] !== app.pubHash(id));
  const members = Object.keys(rec.members || {});
  const close = () => app.setState({ shareFor: null });
  return (
    <Dialog onClose={close} className="share-dialog">
      <div className="share-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="dialog-title">Share “{item.name}”</div>
          <div className="card-sub">{item.type === 'folder' ? 'The whole folder and every script inside it is shared.' : 'This script is shared.'}</div>
        </div>
        <IconButton icon={ICONS.close} label="Close the share dialog" onClick={close} />
      </div>

      <div className="share-sec">
        <div className="menu-label flat">Public link</div>
        <div className="share-pub" onClick={app.togglePublic}>
          <span className="msg-icon blue sm"><Icon icon={ICONS.globe} size={18} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="set-label">Anyone with the link can view</div>
            <div className="set-hint">They can only read it and tick lines as ready — nothing else.</div>
          </div>
          <span onClick={(e) => e.stopPropagation()}><Toggle label="Public link" checked={!!rec.public} onChange={app.togglePublic} /></span>
        </div>
        {rec.public && (
          <>
            <div className="share-link">
              <div className="input readonly" style={{ flex: 1 }}>
                <input value={url} readOnly aria-label="Public share link" className="mono-in" onFocus={(e) => e.currentTarget.select()} />
              </div>
              <Button size="sm" variant="primary" icon={ICONS.copy} onClick={() => app.copyRaw(url, 'Link copied')}>Copy</Button>
              <a className="btn sm" href={url} target="_blank" rel="noopener noreferrer"><Icon icon={ICONS.open} size={16} color="blue" /><span className="btn-label">Open</span></a>
            </div>
            {stale && (
              <div className="note-bar warn">
                <Icon icon={ICONS.sync} size={16} />
                <span style={{ flex: 1 }}>The content changed — the public copy is out of date.</span>
                <Button size="sm" onClick={app.refreshShare}>Update now</Button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="share-sec">
        <div className="menu-label flat">Invite by Google account</div>
        <div className="share-invite">
          <div className="input" style={{ flex: '1 1 200px' }}>
            <span className="input-ico"><Icon icon={ICONS.personAdd} size={17} /></span>
            <input value={st.shareEmail} placeholder="name@gmail.com" aria-label="E-mail address to invite"
              onChange={(e) => app.setState({ shareEmail: e.currentTarget.value })} onKeyDown={(e) => { if (e.key === 'Enter') app.invite(); }} />
          </div>
          <div className="input select" style={{ flex: '0 0 130px' }}>
            <select value={st.shareRole} aria-label="Role" onChange={(e) => app.setState({ shareRole: e.currentTarget.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_SHORT[r]}</option>)}
            </select>
          </div>
          <Button variant="primary" size="sm" icon={ICONS.personAdd} onClick={app.invite} disabled={!st.shareEmail.trim()}>Invite</Button>
        </div>
        <div className="set-hint" style={{ margin: '6px 2px 10px' }}>{ROLE_HINT[st.shareRole] || ''}</div>
        <div className="member-list">
          {members.length === 0 && <div className="muted small-note">Nobody is invited yet.</div>}
          {members.map((k) => {
            const m = rec.members[k];
            return (
              <div key={k} className="member">
                <span className="avatar sm">{String(m.email || '?').charAt(0).toUpperCase()}</span>
                <span className="member-email">{m.email}</span>
                <div className="input select sm" style={{ flex: '0 0 116px' }}>
                  <select value={m.role} aria-label={'Role for ' + m.email} onChange={(e) => app.setMemberRole(k, e.currentTarget.value)}>
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_SHORT[r]}</option>)}
                  </select>
                </div>
                <IconButton icon={ICONS.close} label={'Remove ' + m.email} className="danger-hover" onClick={() => app.removeMember(k)} />
              </div>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}

function PromptDialog({ app }: P) {
  const p = app.state.promptBox;
  const close = () => app.setState({ promptBox: null });
  return (
    <Dialog onClose={close}>
      <div className="dialog-head">{p.title}</div>
      <div className="dialog-body col">
        <label className="label" htmlFor="prompt-input">{p.label}</label>
        <div className="input">
          <input id="prompt-input" autoFocus value={p.value} onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => app.setState({ promptBox: { ...p, value: e.currentTarget.value } })}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); app.commitPrompt(); } if (e.key === 'Escape') { e.preventDefault(); close(); } }} />
        </div>
      </div>
      <div className="dialog-foot">
        <Button variant="ghost" onClick={close}>Cancel</Button>
        <Button variant="primary" icon={ICONS.save} onClick={app.commitPrompt} disabled={!String(p.value || '').trim()}>Save</Button>
      </div>
    </Dialog>
  );
}

const SHORTCUTS: [string[], string][] = [
  [['/'], 'Search the script'],
  [['Enter'], 'Next match while searching'],
  [['Shift', 'Enter'], 'Previous match'],
  [['J', '↓'], 'Next line'],
  [['K', '↑'], 'Previous line'],
  [['Enter', 'Space'], 'Tick the active line as ready'],
  [['F'], 'Focus mode on or off'],
  [['Ctrl', 'S'], 'Save & render in the raw editor'],
  [['Esc'], 'Close a menu, dialog or the drawer'],
  [['?'], 'This list'],
];

function ShortcutsDialog({ app }: P) {
  const close = () => app.setState({ shortcuts: false });
  return (
    <Dialog onClose={close} className="keys-dialog">
      <div className="dialog-head">Keyboard shortcuts</div>
      <div className="dialog-body col">
        <div className="keys-list">
          {SHORTCUTS.map(([keys, what]) => (
            <div key={what} className="keys-row">
              <span className="keys">{keys.map((k, i) => <span key={k}>{i > 0 && <span className="muted"> {keys.length === 2 && (k === 'Space' || k === '↓' || k === '↑') ? 'or' : '+'} </span>}<kbd className="kbd">{k}</kbd></span>)}</span>
              <span>{what}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="dialog-foot">
        <Button variant="primary" onClick={close}>Got it</Button>
      </div>
    </Dialog>
  );
}

/* the profile menu: who is signed in, the app's own screens, and sign out last in red */
function AccountMenu({ app, v }: P) {
  const st = app.state;
  const m = st.accountMenu;
  const u = v.user;
  const close = () => app.setState({ accountMenu: null });
  const go = (fn: () => void) => { close(); app.setState({ drawer: false }); fn(); };
  const items: (MenuItem & { run?: () => void; kbd?: string })[] = [];
  if (!v.signedIn) items.push({ id: 'signin', label: 'Sign in with Google', icon: ICONS.person, run: app.showLogin });
  if (!v.viewing) {
    items.push({ id: 'design', label: 'Card editor', icon: ICONS.design, run: () => app.setMode('design') });
    items.push({ id: 'settings', label: 'Settings', icon: ICONS.settings, run: () => app.setMode('settings') });
  }
  if (!v.mob) items.push({ id: 'keys', label: 'Keyboard shortcuts', icon: ICONS.keyboard, kbd: '?', run: () => app.setState({ shortcuts: true }) });
  if (v.signedIn) items.push({ divider: true }, { id: 'out', label: 'Sign out', icon: ICONS.signOut, danger: true, run: app.signOut });
  return (
    <Backdrop onClose={close}>
      <div className={`popup menu account-menu ${m.from}`} role="menu" aria-label="Profile menu" style={{ left: m.left, bottom: m.bottom, width: m.width }} onClick={(e) => e.stopPropagation()}>
        <div className="acct-head">
          <span className="menu-label flat">{v.signedIn ? 'Signed in as' : 'Not signed in'}</span>
          {v.signedIn
            ? <><b>{u.displayName || u.email}</b>{u.displayName && <small>{u.email}</small>}</>
            : <small>Sign in to sync your scripts and share links.</small>}
        </div>
        <div className="menu-sep" />
        {items.map((it, i) => (it.divider ? <div key={'d' + i} className="menu-sep" /> : (
          <div key={it.id} role="menuitem" tabIndex={0} className={`menu-item${it.danger ? ' danger' : ''}`} onClick={() => go(it.run)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(it.run); } }}>
            <Icon icon={it.icon} size={18} color={it.danger ? 'red' : 'blue'} />
            <span className="menu-text">{it.label}</span>
            {it.kbd && <kbd className="kbd">{it.kbd}</kbd>}
          </div>
        )))}
      </div>
    </Backdrop>
  );
}
