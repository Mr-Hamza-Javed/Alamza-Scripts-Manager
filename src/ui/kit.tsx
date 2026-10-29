/*
 * Calm Blue UI kit — the pieces every screen is built from (from the calm-blue-ui skill).
 * Look lives in calm-ui.css; app-specific additions live in app.css.
 */
import type { FluentIcon } from '@fluentui/react-icons';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';

export type Tone = 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'red';
export type IconColor = 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'muted' | 'inherit';

export function Icon({ icon: I, color = 'inherit', size = 18 }: { icon: FluentIcon; color?: IconColor; size?: number }) {
  return (
    <span className={`ico ${color}`}>
      <I style={{ width: size, height: size, fontSize: size }} />
    </span>
  );
}

/** Gradient square with a white icon: page header (52), card header (40), small (32). */
export function IconTile({ icon: I, tone = 'blue', size = 40, radius }: { icon: FluentIcon; tone?: Tone; size?: number; radius?: number }) {
  const s = Math.round(size * 0.55);
  return (
    <span className={`tile ${tone}`} style={{ width: size, height: size, borderRadius: radius ?? Math.round(size * 0.29) }}>
      <I style={{ width: s, height: s, fontSize: s }} />
    </span>
  );
}

export function Card({ title, subtitle, icon, tone = 'blue', extra, tint, children, className, style }: {
  title?: ReactNode; subtitle?: ReactNode; icon?: FluentIcon; tone?: Tone; extra?: ReactNode;
  tint?: Tone; children?: ReactNode; className?: string; style?: CSSProperties;
}) {
  return (
    <section className={`card${tint ? ` tint-${tint}` : ''}${className ? ' ' + className : ''}`} style={style}>
      {(title || extra) && (
        <div className="card-head">
          {icon && <IconTile icon={icon} tone={tone} size={40} />}
          <div style={{ minWidth: 0, flex: '1 1 200px' }}>
            {title && <div className="card-title">{title}</div>}
            {subtitle && <div className="card-sub">{subtitle}</div>}
          </div>
          {extra && <div className="card-extra">{extra}</div>}
        </div>
      )}
      {children !== undefined && <div className="card-body">{children}</div>}
    </section>
  );
}

export function Button({ icon, iconColor, children, onClick, disabled, variant = 'default', size = 'md', type = 'button', block, title, className, ariaLabel }: {
  icon?: FluentIcon; iconColor?: IconColor; children?: ReactNode; onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean; variant?: 'default' | 'primary' | 'danger' | 'danger-solid' | 'ghost' | 'toggle-on';
  size?: 'md' | 'sm'; type?: 'button' | 'submit'; block?: boolean; title?: string; className?: string; ariaLabel?: string;
}) {
  const cls = ['btn', variant !== 'default' && variant, size === 'sm' && 'sm', block && 'block', className].filter(Boolean).join(' ');
  const color: IconColor = iconColor ?? (variant === 'primary' || variant === 'danger-solid' ? 'inherit' : variant === 'danger' ? 'red' : 'blue');
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} title={title} aria-label={ariaLabel}>
      {icon && <Icon icon={icon} color={color} size={size === 'sm' ? 16 : 18} />}
      {children != null && children !== false && <span className="btn-label">{children}</span>}
    </button>
  );
}

/** Square icon-only button; always has a tooltip and an aria-label. */
export function IconButton({ icon, label, onClick, active, className, size = 18, badge }: {
  icon: FluentIcon; label: string; onClick?: (e: MouseEvent<HTMLButtonElement>) => void; active?: boolean; className?: string; size?: number; badge?: ReactNode;
}) {
  return (
    <button type="button" className={`icon-btn${active ? ' on' : ''}${className ? ' ' + className : ''}`} onClick={onClick} title={label} aria-label={label} aria-pressed={active || undefined}>
      <Icon icon={icon} size={size} />
      {badge}
    </button>
  );
}

/** Quiet view switch (Normal / Raw / Settings): the chosen one is a white raised chip. */
export function ViewToggle<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: ReactNode; icon?: FluentIcon; title?: string }[]; onChange(v: T): void; label?: string;
}) {
  return (
    <div className="view-toggle" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} className={o.value === value ? 'on' : ''} title={o.title} onClick={() => onChange(o.value)}>
          {o.icon && <Icon icon={o.icon} size={16} />}
          <span className="vt-label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Bare switch track (no label) for rows that bring their own text. */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange(v: boolean): void; label: string }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" aria-label={label} checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} />
    </label>
  );
}

export function Badge({ children, tone, title, onClick }: { children: ReactNode; tone?: 'blue' | 'green' | 'orange' | 'red' | 'purple'; title?: string; onClick?: () => void }) {
  return (
    <span className={`badge${tone ? ` ${tone}` : ''}${onClick ? ' click' : ''}`} title={title} onClick={onClick} role={onClick ? 'button' : undefined}>
      {children}
    </span>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <span className="spinner" style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 9)) }} />;
}

/* ---------------- screen sizes (same lines as calm-ui.css) ---------------- */

export type ScreenSize = 'phone' | 'tablet' | 'laptop' | 'desktop' | 'wide';
/** phone ≤ 760, tablet < 1280, laptop ≤ 1500, wide ≥ 1800 */
export function screenSizeOf(width: number): ScreenSize {
  if (width <= 760) return 'phone';
  if (width < 1280) return 'tablet';
  if (width <= 1500) return 'laptop';
  if (width >= 1800) return 'wide';
  return 'desktop';
}

/* ---------------- tabs (from the calm-blue-ui kit) ---------------- */

export interface TabItem<K extends string = string> {
  key: K;
  label: ReactNode;
  icon?: FluentIcon;
  /** the same icon in Filled, shown while the tab is chosen (optional) */
  iconActive?: FluentIcon;
  /** number bubble (items in that tab) */
  count?: number;
  /** red dot: something new in that tab */
  dot?: boolean;
  /** colour of the tab (tile tabs: tile and wash) */
  tone?: Tone;
  /** second line under the label (tile tabs only) */
  hint?: ReactNode;
  disabled?: boolean;
  /** tooltip (use it when the label can hide on narrow screens) */
  title?: string;
}

/**
 * Which tab is open, and from which side the panel should slide in.
 * `remember` keeps the choice for next time (pass a key such as 'orders.tab').
 */
export function useTabs<K extends string>(keys: readonly K[], initial: K, remember?: string) {
  const [state, setState] = useState<{ value: K; dir: 1 | -1 }>(() => {
    let value = initial;
    if (remember) {
      try {
        const saved = localStorage.getItem(remember) as K | null;
        if (saved && keys.includes(saved)) value = saved;
      } catch {
        /* storage blocked */
      }
    }
    return { value, dir: 1 };
  });
  const select = (next: K) =>
    setState((s) => {
      if (next === s.value) return s;
      if (remember) {
        try {
          localStorage.setItem(remember, next);
        } catch {
          /* storage blocked */
        }
      }
      return { value: next, dir: keys.indexOf(next) < keys.indexOf(s.value) ? -1 : 1 };
    });
  return { value: state.value, dir: state.dir, select };
}

/**
 * Tab row. variant: 'line' (default, thin line under the chosen tab, for page and card
 * sections), 'pill' (white chip in a soft track, for small switches inside a card),
 * 'tiles' (cards with an icon tile and a hint line, for the main areas of a big screen).
 * Arrow keys, Home and End move between tabs.
 */
export function Tabs<K extends string>({ items, value, onChange, variant = 'line', label, idBase }: {
  items: TabItem<K>[];
  value: K;
  onChange(key: K): void;
  variant?: 'line' | 'pill' | 'tiles';
  /** what the tabs are about, for screen readers */
  label: string;
  /** same idBase as the TabPanel, so tab and panel point at each other */
  idBase: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // move the indicator under the chosen tab; mark the edges that have more tabs behind them
  const place = useCallback(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !el) return;
    list.style.setProperty('--x', `${el.offsetLeft}px`);
    list.style.setProperty('--w', `${el.offsetWidth}px`);
    list.classList.toggle('more-left', list.scrollLeft > 2);
    list.classList.toggle('more-right', list.scrollLeft + list.clientWidth < list.scrollWidth - 2);
  }, []);

  useLayoutEffect(place, [value, items, place]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const ro = new ResizeObserver(place);
    ro.observe(list);
    list.querySelectorAll('.tab').forEach((t) => ro.observe(t));
    list.addEventListener('scroll', place, { passive: true });
    document.fonts?.ready.then(place).catch(() => undefined);
    const frame = requestAnimationFrame(() => setReady(true));
    return () => {
      ro.disconnect();
      list.removeEventListener('scroll', place);
      cancelAnimationFrame(frame);
    };
  }, [place, items.length]);

  // keep the chosen tab in view when there are more tabs than room
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [value]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const enabled = items.filter((t) => !t.disabled);
    const i = enabled.findIndex((t) => t.key === value);
    const next =
      e.key === 'ArrowRight' ? enabled[(i + 1) % enabled.length] : e.key === 'ArrowLeft' ? enabled[(i - 1 + enabled.length) % enabled.length] : e.key === 'Home' ? enabled[0] : e.key === 'End' ? enabled[enabled.length - 1] : null;
    if (!next) return;
    e.preventDefault();
    onChange(next.key);
    document.getElementById(`${idBase}-tab-${next.key}`)?.focus();
  };

  const cls = ['tabs', variant !== 'line' && variant, ready && 'ready'].filter(Boolean).join(' ');
  return (
    <div ref={listRef} className={cls} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {items.map((t) => {
        const on = t.key === value;
        const icon = on && t.iconActive ? t.iconActive : t.icon;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`${idBase}-tab-${t.key}`}
            aria-selected={on}
            aria-controls={`${idBase}-panel`}
            tabIndex={on ? 0 : -1}
            disabled={t.disabled}
            className={`tab tone-${t.tone ?? 'blue'}`}
            title={t.title}
            onClick={() => onChange(t.key)}
          >
            {variant === 'tiles' ? (
              <>
                {icon && <IconTile icon={icon} tone={t.tone ?? 'blue'} size={38} radius={11} />}
                <span className="tab-text">
                  <b>{t.label}</b>
                  {t.hint && <small>{t.hint}</small>}
                </span>
              </>
            ) : (
              <>
                {icon && (
                  <span className="tab-ico">
                    <Icon icon={icon} size={variant === 'pill' ? 16 : 18} />
                  </span>
                )}
                <span>{t.label}</span>
              </>
            )}
            {t.count !== undefined && (
              <span className="tab-count">
                {t.count}
              </span>
            )}
            {t.dot && <span className="tab-dot" aria-label="new" />}
          </button>
        );
      })}
      {variant !== 'tiles' && <span className="tab-indicator" aria-hidden="true" />}
    </div>
  );
}

/** The content of the chosen tab. Re-mounts on change, so it fades in with a small shift from the side of the move. */
export function TabPanel({ idBase, value, dir, children, style }: { idBase: string; value: string; dir: 1 | -1; children: ReactNode; style?: CSSProperties }) {
  return (
    <div key={value} role="tabpanel" id={`${idBase}-panel`} aria-labelledby={`${idBase}-tab-${value}`} tabIndex={0} className={`tab-panel${dir < 0 ? ' from-prev' : ''}`} style={style}>
      {children}
    </div>
  );
}

