import type { FluentIcon } from '@fluentui/react-icons';
import { FIELDS, PALETTE, PKEYS, TABS, type FieldDef } from '../lib/constants';
import { PRESETS, presetValues, sameCard } from '../lib/design';
import { colorOf } from '../lib/tokens';
import { ICONS } from '../ui/icons';
import { Badge, Button, Card, Icon, IconButton, IconTile, Tabs, Toggle, type Tone } from '../ui/kit';
import { canVary, deviceLabel, overridesOf, tabCanVary } from '../lib/devices';
import { DeviceScope, DeviceTags } from './DeviceScope';
import { installMode, isIos } from '../lib/pwa';
import type { P } from './Layout';

const TAB_LOOK: Record<string, { icon: FluentIcon; tile: FluentIcon; tone: Tone }> = {
  general: { icon: ICONS.appearance, tile: ICONS.appearanceTile, tone: 'orange' },
  reading: { icon: ICONS.reading, tile: ICONS.readingTile, tone: 'green' },
  search: { icon: ICONS.search, tile: ICONS.searchTile, tone: 'blue' },
  behavior: { icon: ICONS.link, tile: ICONS.linkTile, tone: 'teal' },
  parsing: { icon: ICONS.parsing, tile: ICONS.parsingTile, tone: 'purple' },
  tags: { icon: ICONS.tag, tile: ICONS.tagTile, tone: 'purple' },
  library: { icon: ICONS.library, tile: ICONS.libraryTile, tone: 'teal' },
  account: { icon: ICONS.account, tile: ICONS.accountTile, tone: 'blue' },
  sharing: { icon: ICONS.share, tile: ICONS.shareTile, tone: 'green' },
  data: { icon: ICONS.data, tile: ICONS.dataTile, tone: 'blue' },
  danger: { icon: ICONS.danger, tile: ICONS.dangerTile, tone: 'red' },
};

export function SettingsScreen({ app, v }: P) {
  const tab = TABS.some((t) => t.id === app.state.tab) ? app.state.tab : 'general';
  const def = TABS.find((t) => t.id === tab) || TABS[0];
  const look = TAB_LOOK[def.id];
  const order = TABS.map((t) => t.id);
  const pick = (id: string) => {
    app.setState({ tab: id, tabDir: order.indexOf(id) < order.indexOf(tab) ? -1 : 1 });
    document.querySelector('.settings-page')?.scrollTo({ top: 0 });
    document.querySelector('.settings-body')?.scrollTo({ top: 0 });
  };
  return (
    <div className={`page settings-page${v.wideSettings ? ' wide' : ' stacked'}`}>
      <div className="page-head settings-head wash wash-purple">
        <IconTile icon={ICONS.settingsTile} tone="purple" size={v.mob ? 40 : 52} radius={v.mob ? 12 : 15} />
        <div style={{ minWidth: 0, flex: '1 1 200px' }}>
          <div className="page-title">Settings</div>
          <div className="page-sub"><span className="sync-dot on" /> Every change saves by itself{v.signedIn && v.S.syncSettings ? ' and follows your account' : ''}.</div>
        </div>
        <div className="page-actions">
          <Button icon={ICONS.design} onClick={() => app.setMode('design')} title="Fonts, sizes, colours and spacing of the script cards">Card editor</Button>
        </div>
      </div>
      <DeviceScope app={app} />
      {!v.wideSettings && (
        <div className="settings-tabs">
          <Tabs label="Settings sections" idBase="set" value={tab} onChange={pick}
            items={TABS.map((t) => ({ key: t.id, label: t.label, icon: TAB_LOOK[t.id].icon, tone: t.id === 'danger' ? 'red' : 'blue' }))} />
        </div>
      )}
      <div className="settings-grid">
        {v.wideSettings && (
          <nav className="card settings-nav" aria-label="Settings sections">
            {TABS.map((t) => (
              <div key={t.id}>
                {t.group && <div className="side-label">{t.group}</div>}
                <button type="button" className={`set-nav${tab === t.id ? ' active' : ''}${t.id === 'danger' ? ' danger' : ''}`} onClick={() => pick(t.id)} aria-current={tab === t.id || undefined}>
                  <Icon icon={TAB_LOOK[t.id].icon} size={18} />
                  <span>{t.label}</span>
                </button>
              </div>
            ))}
          </nav>
        )}
        <div className={`settings-body tab-panel${(app.state.tabDir || 1) < 0 ? ' from-prev' : ''}`} key={tab} role="tabpanel">
          {app.state.devScope && app.state.devScope !== 'all' && !tabCanVary(tab) && (
            <div className="note-bar info dev-shared-note">
              <Icon icon={ICONS.allDevices} size={18} />
              <span>These settings are the same on every device, so changes here apply everywhere — not only on {deviceLabel(app.state.devScope)}.</span>
            </div>
          )}
          {tab === 'general' && <DesignCard app={app} v={v} />}
          {tab === 'general' && <InstallCard app={app} v={v} />}
          {tab === 'tags' ? <TagsTab app={app} v={v} look={look} hint={def.hint} />
            : tab === 'library' ? <LibraryTab app={app} v={v} look={look} hint={def.hint} />
              : tab === 'danger' ? <DangerTab app={app} look={look} hint={def.hint} />
                : (
                  <>
                    {tab === 'account' && <AccountCard app={app} v={v} />}
                    <Card title={def.label} subtitle={def.hint} icon={look.tile} tone={look.tone}>
                      <div className="set-list">
                        {(FIELDS[tab] || []).map((f) => <FieldRow key={f.key} f={f} app={app} v={v} />)}
                      </div>
                    </Card>
                  </>
                )}
        </div>
      </div>
    </div>
  );
}

/* the script cards are designed in their own editor; this card points there */
/* install the app: the browser's prompt, the iPhone steps, or where it can be done */
function InstallCard({ app }: P) {
  const m = installMode();
  const sub = m === 'installed' ? 'You are using the installed app.'
    : m === 'prompt' ? 'Open it from your desktop, Start menu or home screen, in its own window.'
      : m === 'ios' ? 'Add it to your Home Screen from Safari.'
        : isIos() ? 'Open this page in Safari to add it to your Home Screen.' : 'Open this page in Chrome or Edge on a computer, or Chrome on Android, to install it.';
  return (
    <Card title="Install the app" subtitle={sub} icon={ICONS.installTile} tone="blue"
      extra={m === 'installed'
        ? <Badge tone="green">Installed</Badge>
        : (m === 'prompt' || m === 'ios') && <Button variant="primary" icon={ICONS.install} onClick={app.installApp}>Install app</Button>} />
  );
}

function DesignCard({ app }: P) {
  const S = app.scopeS();
  const mine = (S.myDesigns || []).find((d: any) => sameCard(S, presetValues(d)));
  const preset = PRESETS.find((p) => sameCard(S, presetValues(p)));
  const name = preset ? preset.name : mine ? mine.name : 'Custom';
  return (
    <Card title="Card design" icon={ICONS.designTile} tone="orange"
      subtitle="Fonts, sizes, colours and spacing of the script cards — with a live preview for every screen size."
      extra={<Button variant="primary" icon={ICONS.design} onClick={() => app.setMode('design')}>Open card editor</Button>}>
      <div className="design-now">
        <span className="muted">In use:</span> <Badge tone="orange">{name}</Badge>
        <span className="muted">· {(S.myDesigns || []).length} saved design{(S.myDesigns || []).length === 1 ? '' : 's'}</span>
      </div>
    </Card>
  );
}

function FieldRow({ f, app, v }: { f: FieldDef } & P) {
  const S = app.scopeS();
  const scope = app.state.devScope || 'all';
  const own = scope !== 'all' && Object.prototype.hasOwnProperty.call(overridesOf(app.state.settings, scope), f.key);
  const val = S[f.key];
  const set = (x: any) => app.set(f.key, x);
  let ctl = null;
  if (f.type === 'toggle') ctl = <Toggle label={f.label} checked={!!val} onChange={set} />;
  else if (f.type === 'select') ctl = (
    <div className="input select">
      <select value={val} onChange={(e) => set(e.currentTarget.value)} aria-label={f.label}>
        {f.options.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}
      </select>
    </div>
  );
  else if (f.type === 'range') ctl = (
    <div className="range-wrap">
      <input type="range" className="range" min={f.min} max={f.max} step={f.step} value={val} aria-label={f.label} onChange={(e) => set(parseFloat(e.currentTarget.value))} />
      <span className="range-val num">{f.unit === '%' ? val + '%' : f.unit ? val + f.unit : String(val)}</span>
    </div>
  );
  else if (f.type === 'swatch') ctl = (
    <div className="swatches">
      {PKEYS.map((k) => (
        <button key={k} type="button" className={`swatch${val === k ? ' on' : ''}`} style={{ background: colorOf(k, v.dark) }} aria-label={`Set ${f.label} to ${k}`} title={k} onClick={() => set(k)} />
      ))}
    </div>
  );
  else if (f.type === 'text') ctl = <div className="input text-in"><input value={val} onChange={(e) => set(e.currentTarget.value)} aria-label={f.label} /></div>;
  else if (f.type === 'action') ctl = <Button size="sm" variant={f.danger ? 'danger' : 'default'} icon={f.danger ? ICONS.trash : ICONS.download} onClick={() => app.act(f.key)}>{f.actionLabel}</Button>;
  return (
    <div className={`set-row t-${f.type}${f.type === 'toggle' ? ' click' : ''}${own ? ' dev-own' : ''}`} onClick={f.type === 'toggle' ? () => set(!val) : undefined}>
      <div className="set-text">
        <div className="set-label">{f.label}{canVary(f.key) && f.type !== 'action' && <DeviceTags app={app} k={f.key} />}</div>
        {f.hint && <div className="set-hint">{f.hint}</div>}
      </div>
      <div className="set-ctl" onClick={(e) => e.stopPropagation()}>{ctl}</div>
    </div>
  );
}

function AccountCard({ app, v }: P) {
  const u = v.user;
  if (!v.signedIn) {
    return (
      <Card title="Google account" subtitle="Sign in so your scripts, folders and settings follow you to every device." icon={ICONS.accountTile} tone="blue"
        extra={<Button variant="primary" icon={ICONS.person} onClick={app.showLogin}>Sign in</Button>} />
    );
  }
  return (
    <Card title={u.displayName || u.email} subtitle={u.email} icon={ICONS.accountTile} tone="blue"
      extra={<><Badge tone={app.state.cloud ? 'green' : undefined}>{app.state.cloud ? 'Synced' : 'Local only'}</Badge><Button size="sm" variant="danger" icon={ICONS.signOut} onClick={app.signOut}>Sign out</Button></>} />
  );
}

type TabP = P & { look: (typeof TAB_LOOK)[string]; hint: string };

function TagsTab({ app, v, look, hint }: TabP) {
  const st = app.state;
  const names = Object.keys(st.tags).sort();
  return (
    <Card title="Tags & labels" subtitle={hint + ' A tag met once is remembered in every later script; new ones are guessed and marked Auto for you to confirm.'} icon={look.tile} tone={look.tone}>
      <div className="tag-tools">
        <label className="switch">
          <input type="checkbox" checked={!!st.settings.autoDetect} onChange={() => app.set('autoDetect', !st.settings.autoDetect)} />
          <span><div className="sw-label">Auto-detect unknown tags</div></span>
        </label>
        <span style={{ flex: 1 }} />
        <div className="input new-tag">
          <span className="input-ico"><Icon icon={ICONS.tag} size={16} /></span>
          <input value={st.newTag} placeholder="New tag name" aria-label="New tag name" className="mono-in"
            onChange={(e) => app.setState({ newTag: e.currentTarget.value })} onKeyDown={(e) => { if (e.key === 'Enter') app.addTag(); }} />
        </div>
        <Button size="sm" variant="primary" icon={ICONS.add} onClick={app.addTag} disabled={!st.newTag.trim()}>Add tag</Button>
      </div>
      <div className="tag-table">
        {!v.mob && <div className="tag-row head"><span>Tag</span><span>Renders as</span><span>Colour</span><span>Splits on</span><span /></div>}
        {names.map((n) => {
          const d = st.tags[n];
          return (
            <div key={n} className="tag-row">
              <span className="tag-name"><span className="tag-dot" style={{ background: colorOf(d.color, v.dark) }} /><b>{n}</b>{d.auto && <Badge tone="blue">Auto</Badge>}</span>
              <div className="input select sm">
                <select value={d.render} aria-label={`Render ${n} as`} onChange={(e) => app.setTag(n, { render: e.currentTarget.value })}>
                  {RENDERS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div className="swatches sm">
                {PKEYS.map((k) => <button key={k} type="button" className={`swatch${d.color === k ? ' on' : ''}`} style={{ background: (PALETTE[k])[v.dark ? 0 : 1] }} aria-label={`Set ${n} colour to ${k}`} title={k} onClick={() => app.setTag(n, { color: k })} />)}
              </div>
              <div className={`input select sm${d.render === 'chips' || d.render === 'overlay' ? '' : ' readonly'}`} title={d.render === 'chips' || d.render === 'overlay' ? '' : 'Only chips and overlays are split'}>
                <select value={d.split || 'auto'} aria-label={`Split ${n} on`} disabled={!(d.render === 'chips' || d.render === 'overlay')} onChange={(e) => app.setTag(n, { split: e.currentTarget.value })}>
                  <option value="none">—</option><option value=";">;</option><option value=",">,</option><option value="auto">auto</option><option value="—">— and —</option>
                </select>
              </div>
              <IconButton icon={ICONS.trash} label={`Delete the ${n} tag`} className="danger-hover" onClick={() => app.deleteTag(n)} />
            </div>
          );
        })}
      </div>
      <div className="render-legend">
        <div className="ctl-section-title">What each type does</div>
        {RENDER_HELP.map(([k, l, t]) => (
          <div key={k} className="legend-row">
            <span className={`badge${k === 'markdown' ? ' blue' : ''}`}>{l}</span>
            <span>{t}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

const RENDERS: [string, string][] = [['prose', 'Prose'], ['chips', 'Chips'], ['overlay', 'Overlay'], ['links', 'Links'], ['markdown', 'Markdown'], ['hidden', 'Hidden']];
const RENDER_HELP: [string, string, string][] = [
  ['prose', 'Prose', 'Plain text; formatting marks are removed.'],
  ['chips', 'Chips', 'Split into chips (search terms) that copy or search on click.'],
  ['overlay', 'Overlay', 'Big dark chips for on-screen text.'],
  ['links', 'Links', 'Sources as link chips with the site icon.'],
  ['markdown', 'Markdown', 'One line with **bold**, *italic*, ~~strike~~, {{chip}} and links with the site icon.'],
  ['hidden', 'Hidden', 'Not shown at all.'],
];

function LibraryTab({ app, v, look, hint }: TabP) {
  const st = app.state;
  const items = st.items;
  const ids = Object.keys(items).filter((k) => items[k].type === 'script' && !items[k].trashed).sort((x, y) => (items[x].name || '').localeCompare(items[y].name || ''));
  const rows = ids.map((k) => {
    const md = st.raws[k] || '';
    const dm = (st.doneMap || {})[k] || {};
    const sh = (st.shares || {})[k] || {};
    const parent = items[k].parentId && items[k].parentId !== 'root' ? items[items[k].parentId] : null;
    return {
      id: k, name: items[k].name, folder: parent ? parent.name : 'Top level', active: k === v.a.id,
      lines: md ? md.split('\n').length : 0, ready: Object.keys(dm).filter((x) => dm[x]).length,
      isPublic: !!sh.public, members: Object.keys(sh.members || {}).length,
    };
  });
  return (
    <>
      <Card title="Library" subtitle={hint} icon={look.tile} tone={look.tone}>
        <div className="stats">
          <div className="stat wash wash-blue"><IconTile icon={ICONS.scriptTile} tone="blue" size={34} /><div><div className="s-label">Scripts</div><div className="s-value">{rows.length}</div></div></div>
          <div className="stat wash wash-green"><IconTile icon={ICONS.success} tone="green" size={34} /><div><div className="s-label">Ready marks</div><div className="s-value">{rows.reduce((s, r) => s + r.ready, 0)}</div></div></div>
          <div className="stat wash wash-purple"><IconTile icon={ICONS.globeTile} tone="purple" size={34} /><div><div className="s-label">Public links</div><div className="s-value">{rows.filter((r) => r.isPublic).length}</div></div></div>
        </div>
      </Card>
      {rows.length === 0 && <div className="empty"><Icon icon={ICONS.script} size={24} color="muted" />No scripts yet. Create your first one from the library.</div>}
      <div className="lib-list stagger">
        {rows.map((r) => (
          <div key={r.id} className={`list-row lib-row${r.active ? ' active' : ''}`}>
            <span className="lib-ico"><Icon icon={ICONS.script} size={20} /></span>
            <div className="lib-main">
              <div className="lib-name"><b>{r.name}</b>{r.active && <Badge tone="blue">Open</Badge>}</div>
              <div className="lib-sub">{r.folder}</div>
              <div className="lib-tags">
                <Badge>{r.lines} lines</Badge><Badge tone={r.ready ? 'green' : undefined}>{r.ready} ready</Badge>
                {r.isPublic && <Badge tone="purple">Public link</Badge>}
                {r.members > 0 && <Badge>{r.members} invited</Badge>}
              </div>
            </div>
            <div className="lib-actions">
              <Button size="sm" variant="primary" icon={ICONS.open} onClick={() => app.openScript(r.id)}>Open</Button>
              <Button size="sm" icon={ICONS.rename} onClick={() => app.rename(r.id)}>Rename</Button>
              <Button size="sm" icon={ICONS.duplicate} onClick={() => app.duplicate(r.id)}>Duplicate</Button>
              <Button size="sm" variant="danger" icon={ICONS.trash} onClick={() => app.trash(r.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function DangerTab({ app, look, hint }: { app: P['app']; look: TabP['look']; hint: string }) {
  return (
    <Card title="Danger zone" subtitle={hint} icon={look.tile} tone={look.tone} className="danger-card">
      <div className="set-row">
        <div className="set-text">
          <div className="set-label">Reset every setting</div>
          <div className="set-hint">Appearance, typography, layout, reading preferences and tag labels go back to their defaults. Your scripts and folders are not deleted. You will be asked to confirm.</div>
        </div>
        <div className="set-ctl"><Button size="sm" variant="danger" icon={ICONS.reset} onClick={() => app.act('resetSettings')}>Reset settings</Button></div>
      </div>
    </Card>
  );
}
