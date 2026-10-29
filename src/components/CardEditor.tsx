/* Card editor: design how every script-line card looks, with a live preview that can be
   switched between desktop, laptop, tablet and phone. Click a part of the preview to jump
   to its controls. Every change saves at once; "Undo changes" goes back to how the card
   looked when the editor was opened. */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { DEFAULTS, FONT_FAMILIES, PALETTE, PKEYS } from '../lib/constants';
import {
  EDITOR_GROUPS, FONT_OPTIONS, PART_GROUP, PRESETS, SAMPLE_MD,
  presetValues, sameCard, type CtlDef, type Preset,
} from '../lib/design';
import { parseDoc } from '../lib/parse';
import { colorOf, ensureFonts, readerVars } from '../lib/tokens';
import { ICONS } from '../ui/icons';
import { Button, Icon, IconTile, Tabs, TabPanel, Toggle, useTabs } from '../ui/kit';
import { dispOf, itemViews, type SectionView } from '../view';
import type { P } from './Layout';
import { readerClass, SectionBlock } from './Reader';

type Device = 'desktop' | 'laptop' | 'tablet' | 'phone';
const DEVICES: { key: Device; label: string; icon: any; width: number }[] = [
  { key: 'desktop', label: 'Desktop', icon: ICONS.desktop, width: 1180 },
  { key: 'laptop', label: 'Laptop', icon: ICONS.laptop, width: 960 },
  { key: 'tablet', label: 'Tablet', icon: ICONS.tablet, width: 740 },
  { key: 'phone', label: 'Phone', icon: ICONS.phone, width: 360 },
];
const GROUP_KEYS = EDITOR_GROUPS.map((g) => g.id);
const GROUP_ICONS: Record<string, any> = { style: ICONS.appearance, script: ICONS.type, guide: ICONS.layout, tags: ICONS.tag, active: ICONS.focus, sizes: ICONS.desktop };

export function CardEditor({ app, v }: P) {
  const S = app.state.settings;
  const tabs = useTabs(GROUP_KEYS, 'style', 'alamza.editor.tab');
  /* start on the size of the screen you are using */
  const [device, setDevice] = useState<Device>(v.mob ? 'phone' : v.compact ? 'tablet' : app.state.vw <= 1500 ? 'laptop' : 'desktop');
  const [focusPart, setFocusPart] = useState<string | null>(null);
  const focusT = useRef(0);
  useEffect(() => { ensureFonts(S, true); }, []); // the font picker shows every font in its own face
  const changed = !sameCard(S, app._designSnap);
  const isDefault = sameCard(S, presetValues(PRESETS[0]));
  const group = EDITOR_GROUPS.find((g) => g.id === tabs.value) || EDITOR_GROUPS[0];

  /* a click in the preview opens the controls for that part and outlines it for a moment */
  const onPick = (part: string) => {
    const g = PART_GROUP[part] || 'style';
    tabs.select(g as any);
    setFocusPart(part);
    window.clearTimeout(focusT.current);
    focusT.current = window.setTimeout(() => setFocusPart(null), 1600);
    document.querySelector('.editor-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="page editor-page">
      <div className="page-head">
        <IconTile icon={ICONS.designTile} tone="orange" size={v.mob ? 40 : 52} radius={v.mob ? 12 : 15} />
        <div style={{ minWidth: 0, flex: '1 1 240px' }}>
          <div className="page-title">Card editor</div>
          <div className="page-sub">Design how every script line looks, on every screen size. Changes save by themselves.</div>
        </div>
        <div className="page-actions">
          <Button icon={ICONS.restore} disabled={!changed} onClick={app.revertDesign} title="Go back to how the card looked when you opened the editor">Undo changes</Button>
          <Button icon={ICONS.save} onClick={app.promptSaveDesign} title="Keep this design so you can pick it again later">Save design</Button>
          <Button variant="primary" icon={ICONS.done} onClick={() => app.setMode('normal')}>Done</Button>
        </div>
      </div>

      <div className="editor-grid">
        <Preview app={app} v={v} device={device} setDevice={setDevice} focusPart={focusPart} onPick={onPick} />

        <section className="card editor-controls">
          <Tabs label="Card parts" idBase="ced" value={tabs.value} onChange={tabs.select}
            items={EDITOR_GROUPS.map((g) => ({ key: g.id, label: g.label, icon: GROUP_ICONS[g.id] }))} />
          <div className="editor-scroll">
            <TabPanel idBase="ced" value={tabs.value} dir={tabs.dir}>
              <p className="editor-hint">{group.hint}</p>
              {group.id === 'style' && <Designs app={app} isDefault={isDefault} />}
              {group.sections.map((sec) => {
                const ctls = sec.controls.filter((c) => !c.when || c.when(S));
                if (!ctls.length) return null;
                return (
                  <div key={sec.title} className="ctl-section">
                    <div className="ctl-section-title">{sec.title}</div>
                    {ctls.map((c) => <Control key={c.key} c={c} app={app} dark={v.dark} />)}
                  </div>
                );
              })}
            </TabPanel>
          </div>
          <div className="editor-foot">
            <span className="muted">{changed ? 'Changed since you opened the editor' : 'No changes yet'}</span>
            <Button size="sm" variant="ghost" icon={ICONS.reset} disabled={isDefault} onClick={app.resetDesign}>Default design</Button>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- designs (presets + saved) */

function Designs({ app, isDefault }: { app: P['app']; isDefault: boolean }) {
  const S = app.state.settings;
  const mine: { id: string; name: string; values: Record<string, any> }[] = S.myDesigns || [];
  return (
    <div className="ctl-section">
      <div className="ctl-section-title">Designs <span className="muted">· one click applies a whole look</span></div>
      <div className="preset-grid">
        {PRESETS.map((p) => <PresetCard key={p.id} p={p} app={app} on={p.id === 'calm' ? isDefault : sameCard(S, presetValues(p))} />)}
        {mine.map((d) => <PresetCard key={d.id} p={{ id: d.id, name: d.name, desc: 'Your design', values: d.values }} app={app} mine on={sameCard(S, presetValues(d))} />)}
      </div>
    </div>
  );
}

function PresetCard({ p, app, on, mine }: { p: Preset; app: P['app']; on: boolean; mine?: boolean }) {
  const val = presetValues(p);
  const acc = colorOf(val.accent, false);
  const style = {
    '--pt-r': (val.viewStyle === 'doc' ? 2 : Math.min(val.radius, 14) / 2 + 2) + 'px',
    '--pt-acc': acc,
    '--pt-font': FONT_FAMILIES[val.scriptFont] || FONT_FAMILIES.inter,
    '--pt-w': String(val.scriptWeight),
  } as CSSProperties;
  return (
    <div className={`preset${on ? ' on' : ''}`} role="button" tabIndex={0} aria-pressed={on}
      onClick={() => app.applyDesign(p.values, p.name)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); app.applyDesign(p.values, p.name); } }}>
      <div className={`pt-thumb${val.viewStyle === 'doc' ? ' doc' : ''}${val.labelStyle === 'plain' ? ' plain' : ''}`} style={style} aria-hidden="true">
        {[0, 1].map((i) => (
          <div key={i} className={`pt-card${i === 1 ? ' act' : ''}`}>
            <div className="pt-line"><span className="pt-num">{i + 1}</span><span className="pt-text">Aa</span><span className="pt-bar" /></div>
            <div className="pt-guide"><span className="pt-lbl" /><span className="pt-chip" /><span className="pt-chip short" /></div>
          </div>
        ))}
      </div>
      <div className="pt-name">
        <b>{p.name}</b>
        {on && <span className="badge blue">In use</span>}
        {mine && (
          <button type="button" className="pt-del" aria-label={'Delete ' + p.name} title="Delete this design"
            onClick={(e) => { e.stopPropagation(); app.deleteDesign(p.id); }}>
            <Icon icon={ICONS.closeSm} size={14} />
          </button>
        )}
      </div>
      <small>{p.desc}</small>
    </div>
  );
}

/* ---------------------------------------------------------------- one control */

function fmt(c: CtlDef, val: number) {
  const n = Math.round(val * 100) / 100;
  return c.unit === '%' ? n + '%' : c.unit ? n + (c.unit === '×' ? '×' : ' ' + c.unit) : String(n);
}

function Control({ c, app, dark }: { c: CtlDef; app: P['app']; dark: boolean }) {
  const S = app.state.settings;
  const val = S[c.key];
  const def = (DEFAULTS as any)[c.key];
  const set = (x: any) => app.set(c.key, x);
  const dirty = val !== def;
  const reset = dirty ? (
    <button type="button" className="ctl-reset" title={'Back to the default (' + (c.type === 'range' ? fmt(c, def) : String(def)) + ')'} aria-label={'Reset ' + c.label} onClick={() => set(def)}>
      <Icon icon={ICONS.resetSm} size={14} />
    </button>
  ) : null;

  if (c.type === 'toggle') {
    return (
      <div className="ctl ctl-toggle" onClick={() => set(!val)}>
        <div className="ctl-text"><span className="ctl-label">{c.label}</span>{c.hint && <span className="ctl-hint">{c.hint}</span>}</div>
        {reset}
        <span onClick={(e) => e.stopPropagation()}><Toggle label={c.label} checked={!!val} onChange={set} /></span>
      </div>
    );
  }
  const head = (extra?: any) => (
    <div className="ctl-head">
      <span className="ctl-label">{c.label}</span>
      {extra}
      {reset}
    </div>
  );
  if (c.type === 'range') {
    const step = c.step || 1;
    const clamp = (x: number) => Math.min(c.max, Math.max(c.min, Math.round(x / step) * step));
    const pct = ((val - c.min) / (c.max - c.min)) * 100;
    return (
      <div className="ctl">
        {head(<span className="ctl-value num">{fmt(c, val)}</span>)}
        <div className="ctl-range">
          <button type="button" className="step-btn" aria-label={'Less ' + c.label} onClick={() => set(clamp(val - step))} disabled={val <= c.min}>−</button>
          <input type="range" className="range" min={c.min} max={c.max} step={step} value={val} aria-label={c.label}
            style={{ '--fill': pct + '%' } as CSSProperties} onChange={(e) => set(parseFloat(e.currentTarget.value))} />
          <button type="button" className="step-btn" aria-label={'More ' + c.label} onClick={() => set(clamp(val + step))} disabled={val >= c.max}>+</button>
        </div>
        {c.hint && <span className="ctl-hint">{c.hint}</span>}
      </div>
    );
  }
  if (c.type === 'choice') {
    return (
      <div className="ctl">
        {head()}
        <div className={`choice${c.options.length > 3 ? ' many' : ''}`} role="radiogroup" aria-label={c.label}>
          {c.options.map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={val === k} className={val === k ? 'on' : ''} onClick={() => set(k)}>{l}</button>
          ))}
        </div>
        {c.hint && <span className="ctl-hint">{c.hint}</span>}
      </div>
    );
  }
  if (c.type === 'swatch') {
    return (
      <div className="ctl">
        {head()}
        <div className="swatches">
          {PKEYS.map((k) => (
            <button key={k} type="button" className={`swatch${val === k ? ' on' : ''}`} style={{ background: (PALETTE[k])[dark ? 0 : 1] }} aria-label={`${c.label}: ${k}`} title={k} onClick={() => set(k)} />
          ))}
        </div>
        {c.hint && <span className="ctl-hint">{c.hint}</span>}
      </div>
    );
  }
  /* font */
  return (
    <div className="ctl">
      {head()}
      <div className="font-grid" role="radiogroup" aria-label={c.label}>
        {FONT_OPTIONS.map(([k, l]) => (
          <button key={k} type="button" role="radio" aria-checked={val === k} className={`font-opt${val === k ? ' on' : ''}`} onClick={() => set(k)} title={l}>
            <span className="font-aa" style={{ fontFamily: FONT_FAMILIES[k] }}>Aa</span>
            <span className="font-name">{l.replace(' (serif)', '')}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- live preview */

function Preview({ app, v, device, setDevice, focusPart, onPick }: P & { device: Device; setDevice(d: Device): void; focusPart: string | null; onPick(part: string): void }) {
  const S = app.state.settings;
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [useSample, setUseSample] = useState(false);
  const dev = DEVICES.find((d) => d.key === device);

  /* lines to show: three of the open script (with a guide), or the built-in sample */
  const hasScript = v.doc.total > 0;
  const showSample = useSample || !hasScript;
  const doc = useMemo(() => (showSample ? parseDoc(SAMPLE_MD, app.effT(), S) : v.doc), [showSample, v.doc, app.state.tags]);
  const section = useMemo<SectionView>(() => {
    const si = Math.max(0, doc.sections.findIndex((s) => s.lines.length));
    const sec = doc.sections[si] || { title: 'Section', badge: '', lines: [], notes: [] };
    const picked = sec.lines.filter((l) => l.items.length).slice(0, 3);
    const lines = (picked.length ? picked : sec.lines.slice(0, 3)).map((l, i) => ({ ...l, id: 'pv' + i, si: 0 }));
    return {
      si: 0, title: sec.title || 'Section', badge: sec.badge, count: String(sec.lines.length), pct: 34, allReady: false, achieved: false,
      open: true, hasLines: true, notes: [],
      lines: lines.map((l, i) => ({ l, items: itemViews(l, S, v.dark), active: i === 1, done: i === 0, motion: '', achieved: false })),
    } as SectionView;
  }, [doc, S, v.dark]);

  const vars = useMemo(() => ({ ...readerVars(S, v.dark, device === 'phone', device === 'phone', device === 'tablet'), '--maxw': '100%' }), [S, v.dark, device]);

  /* fit the chosen screen width into the preview box */
  useLayoutEffect(() => {
    const stage = stageRef.current, frame = frameRef.current;
    if (!stage || !frame) return;
    const measure = () => setBox({ w: stage.clientWidth, h: frame.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    ro.observe(frame);
    return () => ro.disconnect();
  }, []);
  const scale = box.w ? Math.min(1, (box.w - 28) / dev.width) : 1;

  const pick = (e: MouseEvent) => {
    /* the preview is for looking: nothing inside it copies, ticks or opens links */
    e.preventDefault();
    e.stopPropagation();
    const part = (e.target as HTMLElement).closest('[data-part]')?.getAttribute('data-part') || 'card';
    onPick(part);
  };

  return (
    <section className="card editor-preview">
      <div className="card-head">
        <div style={{ minWidth: 0, flex: '1 1 160px' }}>
          <div className="card-title">Live preview</div>
          <div className="card-sub">Click any part of a card to change it.</div>
        </div>
        <div className="card-extra">
          <Tabs variant="pill" label="Screen size" idBase="pvd" value={device} onChange={setDevice}
            items={DEVICES.map((d) => ({ key: d.key, label: <span className="dev-label">{d.label}</span>, icon: d.icon, title: d.label + ' · ' + d.width + ' px' }))} />
        </div>
      </div>
      <div className="pv-stage" ref={stageRef}>
        <div className="pv-sizer" style={{ width: dev.width * scale, height: box.h ? box.h * scale : undefined }}>
          <div ref={frameRef} className={`pv-frame dev-${device}${focusPart ? ' pv-hl pv-hl-' + focusPart : ''}`}
            style={{ width: dev.width, transform: `scale(${scale})` }} onClickCapture={pick}>
            <div className={readerClass(S, true)} style={vars as CSSProperties}>
              <SectionBlock s={section} app={app} disp={dispOf(S)} hlq="" />
            </div>
          </div>
        </div>
      </div>
      <div className="pv-foot">
        <span className="badge"><Icon icon={dev.icon} size={14} /> {dev.label} · {dev.width} px</span>
        {scale < 1 && <span className="muted num">shown at {Math.round(scale * 100)}%</span>}
        <span style={{ flex: 1 }} />
        {hasScript && (
          <button type="button" className="link-btn" onClick={() => setUseSample(!useSample)}>
            {showSample ? 'Show my script' : 'Show the sample'}
          </button>
        )}
      </div>
    </section>
  );
}

