/**
 * Componentes base do Design System MIÚDA.
 */
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ChevronLeft, Loader2, X } from 'lucide-react';
import { fmt, mmss } from '../lib/format';
import { DiamondGem, HeartIcon, MiudaCoin, PointsSeal, ThemeIcon } from './Icon';
import { CLUB_COLORS } from '../../../shared/catalog';
import { sfx } from '../lib/sound';

type Variant = 'primary' | 'ember' | 'iron' | 'ghost' | 'danger' | 'default';

export function Button({
  variant = 'default',
  size,
  block,
  loading,
  icon,
  pulse,
  children,
  className = '',
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'lg' | 'xl'; block?: boolean; loading?: boolean; icon?: ReactNode; pulse?: boolean }) {
  const cls = ['btn', variant !== 'default' && `btn--${variant}`, size && `btn--${size}`, block && 'btn--block', pulse && 'btn--pulse', !children && 'btn--icon', className].filter(Boolean).join(' ');
  return (
    <button
      className={cls}
      disabled={loading || rest.disabled}
      onClick={(e) => {
        sfx.click();
        onClick?.(e);
      }}
      {...rest}
    >
      {loading ? <Loader2 size={18} className="spin" /> : icon}
      {children}
    </button>
  );
}

export function Panel({
  children,
  className = '',
  variant,
  rivets,
  glow,
  tight,
  as: As = 'section',
  ...rest
}: { children: ReactNode; className?: string; variant?: 'wood' | 'leather' | 'stone' | 'parchment'; rivets?: boolean; glow?: boolean; tight?: boolean; as?: any } & Record<string, any>) {
  const cls = ['panel', variant && `panel--${variant}`, rivets && 'panel--rivets', glow && 'panel--glow', tight && 'panel--tight', className].filter(Boolean).join(' ');
  return (
    <As className={cls} {...rest}>
      {children}
    </As>
  );
}

export function PanelTitle({ children, action, icon }: { children: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="panel-title">
      <h2 className="row gap-2">
        {icon}
        {children}
      </h2>
      {action}
    </div>
  );
}

export function SectionTitle({ children, left }: { children: ReactNode; left?: boolean }) {
  return (
    <div className={`section-title ${left ? 'section-title--left' : ''}`}>
      <span className="deco" />
      <span>{children}</span>
    </div>
  );
}

export function PageHead({ kicker, title, subtitle, actions, back }: { kicker?: string; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: { to: string; label: string } }) {
  return (
    <header className="page-head">
      <div>
        {back && (
          <Link to={back.to} className="back-link">
            <ChevronLeft size={14} /> {back.label}
          </Link>
        )}
        {kicker && <span className="kicker">{kicker}</span>}
        <h1 className="t-gold">{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="row row-wrap">{actions}</div>}
    </header>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        {title && (
          <div className="modal-header">
            <h2>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Fechar">
              <X size={18} />
            </button>
          </div>
        )}
        {children}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Confirm({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  danger,
  onConfirm,
  onClose,
  loading,
}: { open: boolean; title: string; message: ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onClose: () => void; loading?: boolean }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="t-muted">{message}</div>
    </Modal>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: ReactNode; count?: number; icon?: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" className="tab" aria-selected={t.id === value} onClick={() => onChange(t.id)}>
          {t.icon}
          {t.label}
          {!!t.count && <span className="count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange, block }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; block?: boolean }) {
  return (
    <div className={`segmented ${block ? 'segmented--block' : ''}`} role="group">
      {options.map((o) => (
        <button
          type="button"
          key={String(o.value)}
          aria-pressed={o.value === value}
          onClick={() => {
            sfx.select();
            onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, error, children, htmlFor }: { label?: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="field">
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? <div className="field-error">{error}</div> : hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className ?? ''}`} />;
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; description?: ReactNode }) {
  return (
    <label className="toggle row-between" style={{ width: '100%' }}>
      <span className="grow">
        {label && <span style={{ display: 'block', fontWeight: 700 }}>{label}</span>}
        {description && <span className="t-dim t-small">{description}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" aria-hidden="true" />
    </label>
  );
}

export function Slider({ value, min, max, step = 1, onChange, label }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; label?: string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return <input type="range" className="slider" aria-label={label} min={min} max={max} step={step} value={value} style={{ ['--fill' as any]: `${pct}%` }} onChange={(e) => onChange(Number(e.target.value))} />;
}

export function Stat({ label, value, sub, icon, accent }: { label: ReactNode; value: ReactNode; sub?: ReactNode; icon?: ReactNode; accent?: string }) {
  return (
    <div className="stat">
      <span className="stat-label">
        {icon}
        {label}
      </span>
      <span className="stat-value" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export function Progress({ value, gold, label }: { value: number; gold?: boolean; label?: string }) {
  return (
    <div className={`progress ${gold ? 'progress--gold' : ''}`} role="progressbar" aria-label={label} aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${Math.max(2, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

export function Badge({ children, tone, live }: { children: ReactNode; tone?: 'gold' | 'ember' | 'green' | 'blue' | 'muted'; live?: boolean }) {
  return <span className={`badge ${tone ? `badge--${tone}` : ''} ${live ? 'badge--live' : ''}`}>{children}</span>;
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      <h3>{title}</h3>
      {children && <p className="t-small">{children}</p>}
      {action}
    </div>
  );
}

export function Loader({ label = 'Acendendo as velas…' }: { label?: string }) {
  return (
    <div className="loader" role="status">
      <div className="loader-flame" />
      {label}
    </div>
  );
}

export function Skeleton({ h = 80, w = '100%' }: { h?: number; w?: number | string }) {
  return <div className="skeleton" style={{ height: h, width: w }} />;
}

export function Miudas({ value, size = 18, signed, className = '' }: { value: number; size?: number; signed?: boolean; className?: string }) {
  return (
    <span className={`coin ${className}`}>
      <MiudaCoin size={size} />
      {signed && value > 0 ? '+' : ''}
      {fmt(value)}
    </span>
  );
}

export function Diamonds({ value, size = 18, signed }: { value: number; size?: number; signed?: boolean }) {
  return (
    <span className="coin" style={{ color: 'var(--c-diamond)' }}>
      <DiamondGem size={size} />
      {signed && value > 0 ? '+' : ''}
      {fmt(value)}
    </span>
  );
}

export function Points({ value, size = 18, signed }: { value: number; size?: number; signed?: boolean }) {
  return (
    <span className="coin">
      <PointsSeal size={size} />
      {signed && value > 0 ? '+' : ''}
      {fmt(value)}
    </span>
  );
}

export function Lives({ lives, max = 3, size = 20 }: { lives: number; max?: number; size?: number }) {
  return (
    <span className="lives" aria-label={`${lives} de ${max} vidas`}>
      {Array.from({ length: max }).map((_, i) => (
        <HeartIcon key={i} size={size} empty={i >= lives} />
      ))}
    </span>
  );
}

export function Emblem({ icon, color, size = 48 }: { icon: string; color: string; size?: number }) {
  const hex = CLUB_COLORS.find((c) => c.id === color)?.value ?? color ?? '#b07a3c';
  return (
    <div className="emblem" style={{ width: size, height: size * 1.1, ['--emblem-color' as any]: hex }}>
      <ThemeIcon name={icon} size={size * 0.5} strokeWidth={1.8} />
    </div>
  );
}

/** Contagem regressiva sincronizada com o relógio do servidor. */
export function Countdown({ to, serverOffset = 0, onDone, format = 'mmss' }: { to: string | number; serverOffset?: number; onDone?: () => void; format?: 'mmss' | 's' }) {
  const target = typeof to === 'string' ? new Date(to).getTime() : to;
  const [now, setNow] = useState(Date.now());
  const done = useRef(false);
  useEffect(() => {
    done.current = false;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [target]);
  const left = target - (now + serverOffset);
  useEffect(() => {
    if (left <= 0 && !done.current) {
      done.current = true;
      onDone?.();
    }
  }, [left, onDone]);
  return <span className="t-num">{format === 's' ? Math.max(0, Math.ceil(left / 1000)) : mmss(left)}</span>;
}

/** Valor que "sobe" animado (moedas, pontos). */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(a + (value - a) * e));
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{fmt(shown)}</>;
}
