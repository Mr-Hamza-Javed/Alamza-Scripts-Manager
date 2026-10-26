/* Settings → CSS variables for the script view. Colours come from the calm blue
   theme tokens; geometry, fonts and the reading accent come from the user's settings. */
import { FONT_FAMILIES, PALETTE } from './constants';

export function isDark(theme: string) {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export const colorOf = (key: string, dark: boolean) => (PALETTE[key] || PALETTE.slate)[dark ? 0 : 1];
export const softOf = (key: string, dark: boolean) => colorOf(key, dark) + (dark ? '26' : '18');

export function readerVars(s: any, dark: boolean, mobile: boolean, narrow: boolean): Record<string, string> {
  const accent = colorOf(s.accent || 'blue', dark);
  const pad = s.density === 'compact' ? 8 : s.density === 'comfortable' ? 13 : 10;
  const k = (s.scale || 100) / 100;
  const px = (v: number) => Math.round(v * k * 100) / 100 + 'px';
  const ls = s.labelStyle || 'pill';
  /* Document view: same markup, different geometry — rows lose radius, gap and shadow
     and their borders collapse into one continuous table */
  const doc = s.viewStyle === 'doc';
  const dt = doc ? s.docTight || 0.82 : 1;
  const phx = (s.autoPad ? s.scriptSize * s.padRatio * 1.15 : pad) * dt;
  const pgd = (s.autoPad ? s.bodySize * s.padRatio * 1.35 : s.padGuide) * dt;
  const panelBd = s.panelBorder ? 'var(--rule)' : 'transparent';
  const numInk: Record<string, string> = { faint: 'var(--faint)', muted: 'var(--muted)', prose: 'var(--text-2)', ink: 'var(--text)', accent };
  return {
    '--accent': accent,
    '--accent-soft': accent + (dark ? '24' : '17'),
    '--accent-ring': accent + (dark ? '30' : '22'),
    '--row-r': doc ? '0px' : px(s.radius),
    '--row-mt': doc ? '-1px' : '0px',
    '--guide-r': doc ? '0px' : 'max(0px, calc(' + px(s.radius) + ' - 4px))',
    '--guide-bd-t': doc ? '1px solid var(--rule)' : '1px solid ' + panelBd,
    '--guide-bd-x': doc ? '0px solid transparent' : '1px solid ' + panelBd,
    '--sec-r': doc ? '0px' : px(s.radius),
    '--sec-mb': doc ? '0px' : px(s.cardGap),
    '--sec-bg': doc && s.docHeadTint ? 'var(--surface-2)' : 'var(--surface)',
    '--sec-pad': doc ? px(7 * dt) + ' ' + px(12 * dt) : px(9) + ' ' + px(12),
    '--pad-guide-x': px(doc && s.docGuideIndent ? phx : pgd),
    '--pad': px(pad),
    '--gap': doc ? '0px' : px(s.cardGap),
    '--pad-head-t': px((s.autoPad ? s.scriptSize * s.padTopRatio : s.padTopRatio * 14) * dt),
    '--pad-head-b': px((s.autoPad ? s.scriptSize * s.padBottomRatio : s.padBottomRatio * 14) * dt),
    '--pad-head-x': px(phx),
    '--gap-head': px(s.autoPad ? s.scriptSize * 0.5 : 9),
    '--sz-num': px(s.numSize),
    '--w-num': String(s.numWeight),
    '--num-ink': numInk[s.numColor] || 'var(--faint)',
    '--num-bg': s.numStyle === 'plain' ? 'transparent' : s.numStyle === 'pill' ? accent + (dark ? '26' : '16') : 'var(--surface-2)',
    '--num-bd': s.numStyle === 'boxed' ? '1px solid var(--border)' : '0 solid transparent',
    '--num-r': s.numStyle === 'pill' ? '20px' : px(5),
    '--num-pad': s.numStyle === 'plain' ? '0px' : px(1) + ' ' + px(5.5),
    '--num-w': s.numStyle === 'plain' ? px(Math.max(15, s.numSize * 2)) : 'auto',
    '--num-lh': s.numStyle === 'plain' ? px(s.scriptSize * s.scriptLeading) : px(s.numSize * 1.5),
    '--num-mt': s.numStyle === 'plain' ? '0px' : px(Math.max(1, (s.scriptSize * s.scriptLeading - s.numSize * 1.5 - 2) / 2)),
    '--item-gap': px(s.itemGap),
    '--sec-gap': px(s.sectionGap),
    '--pad-guide': px(pgd),
    '--col-gap': px(s.colGap),
    '--panel-bg': s.panelInset ? 'var(--surface-2)' : 'transparent',
    '--lh-body': String(s.lhBody),
    '--lh-chip': String(s.lhChip),
    '--pill-px': ls === 'plain' ? '0px' : px(7),
    '--pill-py': ls === 'plain' ? '0px' : px(2.5),
    '--pill-r': ls === 'plain' ? '0px' : px(6),
    '--f-script': FONT_FAMILIES[s.scriptFont] || FONT_FAMILIES.inter,
    '--f-guide': FONT_FAMILIES[s.bodyFont] || FONT_FAMILIES.inter,
    '--sz-script': px(s.scriptSize),
    '--lh-script': String(s.scriptLeading),
    '--w-script': String(s.scriptWeight),
    '--sz-body': px(s.bodySize),
    '--sz-label': px(s.labelSize),
    '--cols': narrow ? '1' : mobile ? 'auto' : s.guideColumns === 'auto' ? 'auto' : s.guideColumns,
    '--colw': narrow ? 'auto' : mobile ? '260px' : s.guideColumns === 'auto' ? '250px' : 'auto',
    '--col-rule': s.columnRule ? '1px solid var(--rule)' : 'none',
    '--chip-r': s.chipShape === 'pill' ? '20px' : s.chipShape === 'square' ? '3px' : '7px',
    '--maxw': mobile ? '100%' : s.maxWidth + 'px',
    '--dim': String(1 - s.dimAmount / 100),
  };
}

/* Fonts other than Inter come from Google Fonts — loaded only once one is picked. */
let extraFontsLoaded = false;
export function ensureFonts(s: any) {
  if (extraFontsLoaded) return;
  const used = [s.scriptFont, s.bodyFont, s.uiFont];
  if (used.every((f) => !f || f === 'inter' || f === 'system' || f === 'mono')) return;
  extraFontsLoaded = true;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=Manrope:wght@300..800&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,300..600&family=Literata:ital,opsz,wght@0,7..72,300..700;1,7..72,300..600&family=Source+Serif+4:ital,opsz,wght@0,8..60,300..700;1,8..60,300..600&family=Lora:ital,wght@0,400..700;1,400..700&display=swap';
  document.head.appendChild(l);
}
