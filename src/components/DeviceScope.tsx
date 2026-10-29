/* "Applies to": where a change in Settings or the Card editor goes.
   All devices is the normal case; pick one screen size to give it its own value. */
import { ICONS } from '../ui/icons';
import { Icon, Tabs } from '../ui/kit';
import { DEVICE_LIST, deviceLabel, devicesChanging, overrideCount, overridesOf, type Device, type DevScope } from '../lib/devices';
import type { P } from './Layout';

const DEV_ICON: Record<Device, any> = { desktop: ICONS.desktop, laptop: ICONS.laptop, tablet: ICONS.tablet, phone: ICONS.phone };

export function DeviceScope({ app }: Pick<P, 'app'>) {
  const st = app.state;
  const scope: DevScope = st.devScope || 'all';
  const here = app.device();
  const S = st.settings;
  const n = scope === 'all' ? 0 : overrideCount(S, scope);
  const dev = DEVICE_LIST.find((d) => d.key === scope);
  const items = [
    { key: 'all' as DevScope, label: <span className="ds-label">All devices</span>, icon: ICONS.allDevices, title: 'Changes apply to every screen size' },
    ...DEVICE_LIST.map((d) => ({
      key: d.key as DevScope,
      label: <span className="ds-label">{d.label}{d.key === here && <span className="ds-here" title="The screen you are using now" />}</span>,
      icon: DEV_ICON[d.key],
      count: overrideCount(S, d.key) || undefined,
      title: d.label + ' · ' + d.range + (d.key === here ? ' · this screen' : ''),
    })),
  ];
  return (
    <div className={`dev-scope${scope !== 'all' ? ' on-device' : ''}`}>
      <span className="ds-title">Applies to</span>
      <Tabs variant="pill" label="Which screens a change applies to" idBase="dsc" value={scope} onChange={app.setDevScope} items={items} />
      <p className="ds-note" key={scope}>
        {scope === 'all'
          ? <>Changes go to every screen size. Pick a device to give it its own value — you are on a <b>{deviceLabel(here)}</b> screen now.</>
          : <>
            Changes go to <b>{dev.label}</b> only ({dev.range}). Anything you leave alone follows All devices.
            {n > 0 && (
              <button type="button" className="link-btn ds-reset" onClick={() => app.clearDevice(scope)}>
                <Icon icon={ICONS.resetSm} size={14} /> Reset {n} {dev.label.toLowerCase()} {n === 1 ? 'change' : 'changes'}
              </button>
            )}
          </>}
      </p>
    </div>
  );
}

/* Small tags beside one setting: "Phone only" with a way back, or which devices have
   their own value when you look at All devices. */
export function DeviceTags({ app, k }: Pick<P, 'app'> & { k: string }) {
  const st = app.state;
  const scope: DevScope = st.devScope || 'all';
  const S = st.settings;
  if (scope !== 'all') {
    if (!Object.prototype.hasOwnProperty.call(overridesOf(S, scope), k)) return null;
    return (
      <span className="dev-tag own" onClick={(e) => e.stopPropagation()}>
        {deviceLabel(scope)} only
        <button type="button" className="dev-tag-x" title={'Use the All devices value again (' + show(S[k]) + ')'} aria-label={'Use the All devices value for this setting on ' + deviceLabel(scope)}
          onClick={() => app.clearDevice(scope, [k])}>
          <Icon icon={ICONS.closeSm} size={12} />
        </button>
      </span>
    );
  }
  const devs = devicesChanging(S, k);
  if (!devs.length) return null;
  return (
    <>
      {devs.map((d) => (
        <button key={d} type="button" className="dev-tag" title={deviceLabel(d) + ' uses ' + show(overridesOf(S, d)[k]) + ' — click to edit it'}
          onClick={(e) => { e.stopPropagation(); app.setDevScope(d); }}>
          <Icon icon={DEV_ICON[d]} size={12} />{deviceLabel(d)}
        </button>
      ))}
    </>
  );
}

function show(v: any) {
  if (v === true) return 'On';
  if (v === false) return 'Off';
  return String(v);
}
