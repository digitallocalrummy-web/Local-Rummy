import type { ButtonHTMLAttributes, ReactNode } from 'react';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cx('min-w-0 rounded-[14px] border border-line bg-panel p-4 sm:p-5', className)}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {title && <h2 className="m-0 flex-1 text-base font-extrabold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export const Label = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cx('text-[11px] font-extrabold tracking-[1.4px] text-mute uppercase', className)}>{children}</span>
);

type Tone = 'ok' | 'bad' | 'warn' | 'info' | 'gold' | 'mute';
const tones: Record<Tone, string> = {
  ok: 'bg-okbg/15 text-ok', bad: 'bg-badbg/15 text-bad', warn: 'bg-warn/15 text-warn', info: 'bg-info/15 text-info',
  gold: 'bg-gold/12 text-gold2 border border-gold/35', mute: 'bg-line text-mute',
};
export const Pill = ({ tone = 'mute', children }: { tone?: Tone; children: ReactNode }) => (
  <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11px] font-extrabold whitespace-nowrap uppercase', tones[tone])}>{children}</span>
);

export function Button({ variant = 'line', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'gold' | 'line' | 'danger' | 'warn' }) {
  const v = {
    gold: 'bg-gold text-[#1A1406] border-0 hover:bg-gold2',
    line: 'bg-transparent border border-line2 text-text hover:bg-raised',
    danger: 'bg-badbg/10 border border-badbg/40 text-bad hover:bg-badbg/20',
    warn: 'bg-transparent border border-warn/50 text-warn hover:bg-warn/10',
  }[variant];
  return <button {...p} className={cx('h-10 cursor-pointer rounded-[10px] px-4 text-[13px] font-extrabold disabled:cursor-not-allowed disabled:opacity-50', v, className)} />;
}

export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={cx('flex h-7 w-12 flex-none cursor-pointer rounded-full border-0 p-[3px] disabled:opacity-50', on ? 'justify-end bg-okbg' : 'justify-start bg-switchoff')}>
      <i className="block h-[22px] w-[22px] rounded-full bg-white" />
    </button>
  );
}

/** Player picture: their photo, else their emoji, else initials on their colour. */
export function Avatar({ name, color, size = 30, ring, emoji, photo }: { name: string; color: string; size?: number; ring?: boolean; emoji?: string | null; photo?: string | null }) {
  const ini = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span className={cx('inline-flex flex-none items-center justify-center overflow-hidden rounded-full font-extrabold text-white', ring && 'border-2 border-gold')}
      style={{ width: size, height: size, background: color, fontSize: Math.round(size * (emoji && !photo ? 0.55 : 0.36)) }}>
      {photo ? <img src={(import.meta.env.VITE_API_URL ?? '') + photo} alt="" className="h-full w-full object-cover" /> : emoji ?? ini}
    </span>
  );
}

export function Kpi({ label, value, sub, subTone }: { label: string; value: ReactNode; sub?: ReactNode; subTone?: 'ok' | 'bad' | 'mute' | 'warn' }) {
  return (
    <Card className="flex flex-col gap-2">
      <Label>{label}</Label>
      <b className="text-[22px] font-extrabold sm:text-[28px]">{value}</b>
      {sub && <span className={cx('text-xs font-bold', subTone === 'ok' ? 'text-ok' : subTone === 'bad' ? 'text-bad' : subTone === 'warn' ? 'text-warn' : 'text-mute')}>{sub}</span>}
    </Card>
  );
}

export function Delta({ now, before, label = 'vs yesterday' }: { now: number; before: number; label?: string }) {
  if (!before) return <span className="text-mute">{now ? 'new today' : 'no data yet'}</span>;
  const pct = ((now - before) / before) * 100;
  return <span className={pct >= 0 ? 'text-ok' : 'text-bad'}>{pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}% {label}</span>;
}

export function Chips<T extends string | number>({ options, value, onChange, label }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}
          className={cx('h-[34px] cursor-pointer rounded-full border px-3.5 text-xs font-bold', o.value === value ? 'border-gold/45 bg-gold/14 text-gold2' : 'border-line2 bg-panel text-soft hover:bg-raised')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, id, children, hint }: { label: string; id: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[11px] font-extrabold tracking-[1px] text-mute uppercase">{label}</label>
      {children}
      {hint && <span className="text-xs text-mute">{hint}</span>}
    </div>
  );
}
export const inputCls = 'h-10 w-full min-w-0 rounded-[10px] border border-line2 bg-field px-3 text-sm font-semibold text-text outline-0 focus:border-gold';

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead><tr>{head.map((h, i) => <th key={i} className="border-b border-line px-3 py-2.5 text-left text-[11px] font-extrabold tracking-[1px] whitespace-nowrap text-mute uppercase">{h}</th>)}</tr></thead>
        <tbody className="[&_td]:border-b [&_td]:border-line [&_td]:px-3 [&_td]:py-2.5 [&_td]:whitespace-nowrap">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export const Empty = ({ children }: { children: ReactNode }) => <p className="m-0 px-3 py-8 text-center text-sm text-mute">{children}</p>;

export function Bar({ pct, color = 'var(--color-gold)' }: { pct: number; color?: string }) {
  return <div className="h-2.5 rounded-[5px] bg-track"><div className="h-full rounded-[5px]" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} /></div>;
}

export function Toast({ children, tone = 'ok' }: { children: ReactNode; tone?: 'ok' | 'bad' }) {
  return <div role="status" className={cx('rounded-[10px] border px-3 py-2.5 text-[13px]', tone === 'ok' ? 'border-okbg/40 bg-okbg/12 text-ok' : 'border-badbg/40 bg-badbg/10 text-bad')}>{children}</div>;
}

export const Crown = ({ w = 34 }: { w?: number }) => (
  <svg width={w} height={(w * 30) / 52} viewBox="0 0 52 30" aria-hidden="true"><path d="M3 27 L7 7 L18 17 L26 2 L34 17 L45 7 L49 27 Z" fill="#E8C66A" stroke="#8a6a2a" strokeWidth="1.5" /></svg>
);

export function Icon({ d, size = 18, className }: { d: string; size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}><path d={d} /></svg>;
}

export const SuitCard = ({ c }: { c: { rank: string; suit: string } | null | undefined }) =>
  c ? <b className={c.suit === '♥' || c.suit === '♦' ? 'text-[#FFB3AE]' : c.rank === 'JK' ? 'text-gold2' : 'text-white'}>{c.rank === 'JK' ? 'Joker' : c.rank + c.suit}</b> : <b className="text-mute">—</b>;
