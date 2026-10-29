/* Installing the app (PWA).
   Chrome, Edge and Android offer an install prompt (beforeinstallprompt); we keep it so the
   app can show its own "Install app" button. iPhone and iPad have no prompt: there the
   button explains Share → Add to Home Screen. Firefox on a computer cannot install. */

let deferred: any = null;
let installedNow = false;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

export function initPwa() {
  window.addEventListener('beforeinstallprompt', (e: any) => {
    /* the browser's own install icon / banner still shows; we only keep the event */
    deferred = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installedNow = true;
    notify();
  });
  /* the service worker only in the built app: in development it would cache stale files */
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* not available */ }); });
  }
}

export const isStandalone = () =>
  (typeof matchMedia === 'function' && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: window-controls-overlay)').matches)) ||
  (navigator as any).standalone === true;

export const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** what an "Install app" button can do here: show the browser's prompt, explain the iPhone
    steps, or nothing (already installed, or the browser cannot install) */
export function installMode(): 'prompt' | 'ios' | 'installed' | 'none' {
  if (isStandalone() || installedNow) return 'installed';
  if (deferred) return 'prompt';
  if (isIos()) return 'ios';
  return 'none';
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  const e = deferred;
  deferred = null;
  e.prompt();
  const choice = await e.userChoice.catch(() => ({ outcome: 'dismissed' }));
  notify();
  return choice.outcome;
}

export function onPwaChange(fn: () => void) {
  subs.add(fn);
  return () => { subs.delete(fn); };
}
