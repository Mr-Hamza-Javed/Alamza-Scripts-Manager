/* Per-device settings.
   Every setting has one value for all screens (the normal case). On top of that, each
   screen size can keep its own changes in `settings.byDevice[device]`; a value there wins
   only on that size. Removing it puts the device back on the shared value. */
import { FIELDS } from './constants';

export type Device = 'desktop' | 'laptop' | 'tablet' | 'phone';
export type DevScope = 'all' | Device;

/* same lines as the rest of the app: phone ≤ 760 · tablet < 1280 · laptop ≤ 1500 · desktop */
export const DEVICE_LIST: { key: Device; label: string; range: string; width: number }[] = [
  { key: 'desktop', label: 'Desktop', range: 'wider than 1500 px', width: 1180 },
  { key: 'laptop', label: 'Laptop', range: '1280–1500 px', width: 960 },
  { key: 'tablet', label: 'Tablet', range: '761–1279 px', width: 740 },
  { key: 'phone', label: 'Phone', range: 'up to 760 px', width: 360 },
];
export const deviceLabel = (d: Device) => (DEVICE_LIST.find((x) => x.key === d) || DEVICE_LIST[0]).label;

export function deviceOf(width: number): Device {
  if (width <= 760) return 'phone';
  if (width < 1280) return 'tablet';
  if (width <= 1500) return 'laptop';
  return 'desktop';
}

/* Settings that must stay the same everywhere: how scripts are read (a different split on
   a phone would move every line), account, sharing and data. */
const SHARED_TABS = ['parsing', 'account', 'sharing', 'data'];
const SHARED_KEYS = new Set<string>(['schema', 'byDevice', 'myDesigns']);
SHARED_TABS.forEach((t) => (FIELDS[t] || []).forEach((f) => SHARED_KEYS.add(f.key)));

export const canVary = (key: string) => !SHARED_KEYS.has(key);
export const tabCanVary = (tab: string) => SHARED_TABS.indexOf(tab) < 0 && tab !== 'tags' && tab !== 'library' && tab !== 'danger';

/** one device's own changes ({} when it has none) */
export function overridesOf(s: any, d: Device): Record<string, any> {
  return (s && s.byDevice && s.byDevice[d]) || {};
}
export function overrideCount(s: any, d: Device) { return Object.keys(overridesOf(s, d)).length; }

/* the settings one device really uses; cached so React memo keys stay stable */
const cache = new WeakMap<object, Partial<Record<Device, any>>>();
export function settingsFor(s: any, d: Device) {
  const o = overridesOf(s, d);
  if (!Object.keys(o).length) return s;
  let byDev = cache.get(s);
  if (!byDev) { byDev = {}; cache.set(s, byDev); }
  if (!byDev[d]) byDev[d] = { ...s, ...o };
  return byDev[d];
}

/** settings with `patch` written for `scope`: the shared values, or one device's own changes */
export function writeSettings(s: any, scope: DevScope, patch: Record<string, any>) {
  if (scope === 'all') return { ...s, ...patch };
  const shared: Record<string, any> = {};
  const by = { ...(s.byDevice || {}) };
  const own = { ...(by[scope] || {}) };
  Object.keys(patch).forEach((k) => {
    if (!canVary(k)) { shared[k] = patch[k]; return; }
    /* the same as everywhere else: no need to keep it as a device change */
    if (JSON.stringify(patch[k]) === JSON.stringify(s[k])) delete own[k];
    else own[k] = patch[k];
  });
  if (Object.keys(own).length) by[scope] = own; else delete by[scope];
  const out = { ...s, ...shared, byDevice: by };
  if (!Object.keys(by).length) delete out.byDevice;
  return out;
}

/** a device without some (or all) of its own changes */
export function clearOverrides(s: any, d: Device, keys?: string[]) {
  const by = { ...(s.byDevice || {}) };
  if (!by[d]) return s;
  if (keys) {
    const own = { ...by[d] };
    keys.forEach((k) => delete own[k]);
    if (Object.keys(own).length) by[d] = own; else delete by[d];
  } else delete by[d];
  const out = { ...s, byDevice: by };
  if (!Object.keys(by).length) delete out.byDevice;
  return out;
}

/** devices that changed this setting for themselves */
export function devicesChanging(s: any, key: string): Device[] {
  return DEVICE_LIST.map((d) => d.key).filter((d) => Object.prototype.hasOwnProperty.call(overridesOf(s, d), key));
}
