/*
 * Calm Blue UI kit — the pieces every screen is built from (from the calm-blue-ui skill).
 * Look lives in calm-ui.css; app-specific additions live in app.css.
 */
import type { FluentIcon } from '@fluentui/react-icons';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';

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
  tint?: 'blue' | 'green' | 'purple'; children?: ReactNode; className?: string; style?: CSSProperties;
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
