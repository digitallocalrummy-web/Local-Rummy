import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, fmt, time } from '../api';
import { useCanEdit } from '../auth';
import { PageHeader } from '../components/Shell';
import { Button, Card, Label, Switch, Toast, cx, inputCls } from '../components/ui';

export type Config = {
  modes: Record<'points' | 'pool' | 'deals', { enabled: boolean; maxPlayers: number; entries: number[] }>;
  turnSeconds: number; autoDropAfter: number; drops: { first: number; middle: number; full: number };
  printedJokers: boolean; quickChat: boolean; maintenance: boolean; minAppVersion: string;
  bonus: { day1: number; multipliers: number[] }; refill: number; welcome: number; botFillSeconds: number;
};

const MODES = [
  ['points', 'POINTS', 'One deal. Lowest points pays the winner.'],
  ['pool', 'POOL 101', 'Plays as a single deal for now. Full pool rules come next.'],
  ['deals', 'DEALS', 'Plays as a single deal for now. Multi-deal rules come next.'],
] as const;

/** Shared by Game setup and Chips: a draft of the config with publish / discard. */
export function useConfigDraft() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['config'], queryFn: () => api('/api/admin/config') });
  const [draft, setDraft] = useState<Config | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  useEffect(() => { if (q.data && !draft) setDraft(structuredClone(q.data.config)); }, [q.data, draft]);
  const save = useMutation({
    mutationFn: (c: Config) => api('/api/admin/config', { method: 'PUT', body: c }),
    onSuccess: (r) => { qc.setQueryData(['config'], r); setDraft(structuredClone(r.config)); setMsg({ tone: 'ok', text: 'Published. Players get the new settings right away.' }); },
    onError: (e) => setMsg({ tone: 'bad', text: (e as Error).message }),
  });
  const dirty = !!draft && !!q.data && JSON.stringify(draft) !== JSON.stringify(q.data.config);
  const edit = (fn: (c: Config) => void) => setDraft((d) => { if (!d) return d; const n = structuredClone(d); fn(n); setMsg(null); return n; });
  return { q, draft, edit, dirty, save, msg, discard: () => { setDraft(structuredClone(q.data.config)); setMsg(null); } };
}

export function PublishBar({ c }: { c: ReturnType<typeof useConfigDraft> }) {
  const canEdit = useCanEdit();
  const meta = c.q.data;
  return (
    <section className="sticky bottom-3 flex flex-wrap items-center gap-3 rounded-[14px] border border-gold/35 bg-raised px-4.5 py-3.5">
      <span className="flex-[1_1_260px] text-[13px]">
        {c.msg ? <span className={c.msg.tone === 'ok' ? 'text-ok' : 'text-bad'}>{c.msg.text}</span>
          : c.dirty ? <><b className="text-gold2">Unsaved changes.</b> Players get them as soon as you publish.</>
          : <span className="text-soft">Everything here is live in the app{meta?.updatedBy ? ` · last published by ${meta.updatedBy} at ${time(meta.updatedAt)}` : ''}.</span>}
      </span>
      {!canEdit && <span className="text-xs text-mute">Your role can view settings only.</span>}
      <Button onClick={c.discard} disabled={!c.dirty}>Discard</Button>
      <Button variant="gold" onClick={() => c.draft && c.save.mutate(c.draft)} disabled={!c.dirty || !canEdit || c.save.isPending}>Publish to app</Button>
    </section>
  );
}

const Stepper = ({ value, onChange, min, max, step = 1, suffix = '', label }: { value: number; onChange: (n: number) => void; min: number; max: number; step?: number; suffix?: string; label: string }) => (
  <div className="flex items-center gap-2" role="group" aria-label={label}>
    <Button className="!h-9 !w-9 !px-0" aria-label={`Less ${label}`} onClick={() => onChange(Math.max(min, value - step))}>−</Button>
    <b className="w-14 text-center text-base text-gold2">{value}{suffix}</b>
    <Button className="!h-9 !w-9 !px-0" aria-label={`More ${label}`} onClick={() => onChange(Math.min(max, value + step))}>+</Button>
  </div>
);

const NumIn = ({ id, value, onChange, label }: { id: string; value: number; onChange: (n: number) => void; label: string }) => (
  <div className="flex min-w-0 flex-[1_1_80px] flex-col gap-1.5">
    <label htmlFor={id} className="text-[11px] font-extrabold tracking-[1px] text-mute">{label}</label>
    <input id={id} inputMode="numeric" value={value} onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)} className={cx(inputCls, 'font-extrabold text-gold2')} />
  </div>
);

export default function GameSetup() {
  const c = useConfigDraft();
  const d = c.draft;
  if (!d) return <PageHeader title="Game setup" sub="Loading settings…" />;
  const rule = (title: string, sub: string, control: React.ReactNode) => (
    <div className="flex flex-wrap items-center gap-3.5 border-b border-[#1B221E] py-3.5 last:border-b-0">
      <div className="min-w-0 flex-[1_1_220px]"><b className="text-sm">{title}</b><span className="block text-xs text-mute">{sub}</span></div>{control}
    </div>
  );
  return (
    <>
      <PageHeader title="Game setup" sub="What players see in the app lobby: game modes, entry amounts, players per table and table rules." />
      {c.q.error && <Toast tone="bad">{(c.q.error as Error).message}</Toast>}
      <section aria-label="Game modes" className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
        {MODES.map(([k, name, desc]) => {
          const m = d.modes[k];
          return (
            <Card key={k} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1"><b className="font-display text-xl tracking-[1.5px] text-gold2">{name}</b><span className="mt-0.5 block text-xs text-mute">{desc}</span></div>
                <Switch on={m.enabled} label={`${name} shown in app`} onChange={(v) => c.edit((x) => { x.modes[k].enabled = v; })} />
              </div>
              {!m.enabled && <div className="rounded-[10px] bg-raised px-3 py-2.5 text-xs text-soft">Hidden from the lobby. Running tables finish normally.</div>}
              <div className="flex flex-col gap-2">
                <Label>Players per table · up to {m.maxPlayers}</Label>
                <div role="group" aria-label={`Maximum players for ${name}`} className="flex flex-wrap gap-1.5">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <button key={n} aria-label={`Up to ${n} players`} aria-pressed={n === m.maxPlayers} onClick={() => c.edit((x) => { x.modes[k].maxPlayers = n; })}
                      className={cx('h-9 w-[34px] cursor-pointer rounded-[9px] border text-[13px] font-extrabold', n <= m.maxPlayers ? 'border-gold/50 bg-gold/16 text-gold2' : 'border-line2 bg-[#0E120F] text-faint')}>{n}</button>
                  ))}
                </div>
                <span className="text-xs text-mute">1 = solo practice · tables of 7 or more use 3 decks</span>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Entry tiers (virtual chips)</Label>
                <div className="flex flex-wrap gap-2">
                  {m.entries.map((e, i) => <NumIn key={i} id={`${k}-t${i}`} label={['LOW', 'MEDIUM', 'HIGH', 'TIER 4', 'TIER 5'][i]} value={e} onChange={(v) => c.edit((x) => { x.modes[k].entries[i] = v; })} />)}
                </div>
                <span className="text-xs text-mute">A loser pays up to the entry: points × entry ÷ 80.</span>
              </div>
            </Card>
          );
        })}
      </section>
      <section className="flex flex-wrap items-start gap-4">
        <Card className="flex-[2_1_520px]" title={<>Table rules <span className="block text-xs font-normal text-mute">Apply to every mode.</span></>}>
          {rule('Turn timer', 'Seconds a player has to draw and discard', <Stepper label="turn time" value={d.turnSeconds} min={10} max={120} step={5} suffix="s" onChange={(v) => c.edit((x) => { x.turnSeconds = v; })} />)}
          {rule('Auto-drop after missed turns', 'Player is dropped after this many timeouts', <Stepper label="missed turns" value={d.autoDropAfter} min={1} max={10} onChange={(v) => c.edit((x) => { x.autoDropAfter = v; })} />)}
          {rule('Drop penalties (points)', 'First drop · middle drop · wrong declaration', (
            <div className="flex flex-[0_1_300px] gap-2">
              <NumIn id="d1" label="FIRST" value={d.drops.first} onChange={(v) => c.edit((x) => { x.drops.first = Math.min(80, v); })} />
              <NumIn id="d2" label="MIDDLE" value={d.drops.middle} onChange={(v) => c.edit((x) => { x.drops.middle = Math.min(80, v); })} />
              <NumIn id="d3" label="FULL" value={d.drops.full} onChange={(v) => c.edit((x) => { x.drops.full = Math.min(80, v); })} />
            </div>
          ))}
          {rule('Bots fill empty seats after', 'Seconds to wait for real players', <Stepper label="bot wait" value={d.botFillSeconds} min={0} max={120} step={1} suffix="s" onChange={(v) => c.edit((x) => { x.botFillSeconds = v; })} />)}
          {rule('Printed jokers in the deck', 'One per deck, used as wild cards', <Switch label="Printed jokers" on={d.printedJokers} onChange={(v) => c.edit((x) => { x.printedJokers = v; })} />)}
          {rule('Quick chat between players', 'Preset messages only, no free text', <Switch label="Quick chat" on={d.quickChat} onChange={(v) => c.edit((x) => { x.quickChat = v; })} />)}
        </Card>
        <Card className="flex flex-[1_1_300px] flex-col gap-3.5" title="Maintenance">
          <div className="flex items-center gap-3"><div className="min-w-0 flex-1"><b className="text-sm">Maintenance mode</b><span className="block text-xs text-mute">Players see a “Back soon” screen. New tables are blocked.</span></div><Switch label="Maintenance mode" on={d.maintenance} onChange={(v) => c.edit((x) => { x.maintenance = v; })} /></div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="minver" className="text-[11px] font-extrabold tracking-[1.4px] text-mute">MINIMUM APP VERSION</label>
            <input id="minver" value={d.minAppVersion} onChange={(e) => c.edit((x) => { x.minAppVersion = e.target.value; })} className={inputCls} />
            <span className="text-xs text-mute">Older versions are asked to install the new APK.</span>
          </div>
          <div className="rounded-[10px] bg-raised p-3 text-xs leading-normal text-soft">Welcome chips {fmt(d.welcome)} · daily bonus from {fmt(d.bonus.day1)}. Change these under Chips &amp; rewards.</div>
        </Card>
      </section>
      <PublishBar c={c} />
    </>
  );
}
