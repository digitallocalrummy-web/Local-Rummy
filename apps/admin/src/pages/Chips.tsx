import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api, fmt, signed, time } from '../api';
import { PageHeader } from '../components/Shell';
import { Button, Card, Empty, Field, Kpi, Label, Table, inputCls } from '../components/ui';
import { PublishBar, useConfigDraft } from './GameSetup';

const TYPES: Record<string, string> = { welcome: 'Welcome chips', daily_bonus: 'Daily bonus', refill: 'Free refill', entry: 'Table entry', refund: 'Entry returned', win: 'Won', admin_grant: 'Given by admin', admin_remove: 'Removed by admin' };
const short = (n: number) => (n >= 1e7 ? (n / 1e7).toFixed(1) + ' Cr' : n >= 1e5 ? (n / 1e5).toFixed(1) + ' L' : fmt(n));

export default function Chips() {
  const q = useQuery({ queryKey: ['chips'], queryFn: () => api('/api/admin/chips'), refetchInterval: 15_000 });
  const c = useConfigDraft();
  const d = c.draft;
  return (
    <>
      <PageHeader title="Chips & rewards" sub="Virtual chips only · no cash value · cannot be bought back or withdrawn" />
      <section className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Kpi label="Chips in player wallets" value={short(q.data?.inWallets ?? 0)} />
        <Kpi label="Given free today" value={<span className="text-ok">+{short(q.data?.bonusToday ?? 0)}</span>} sub="Welcome, daily bonus and refills" />
        <Kpi label="Spent on table entries today" value={short(q.data?.entriesToday ?? 0)} />
        <Kpi label="Players under 50 chips" value={<span className="text-warn">{fmt(q.data?.zeroChips)}</span>} />
      </section>
      {d && (
        <section className="flex flex-wrap items-start gap-4">
          <Card className="flex flex-[2_1_520px] flex-col gap-4" title={<>Daily bonus <span className="block text-xs font-normal text-mute">Shown on the + button in the app lobby. The streak resets if a day is missed.</span></>}
            action={<div className="flex items-center gap-2"><Label>Day 1 amount</Label><Button className="!h-9 !w-9 !px-0" aria-label="Lower bonus" onClick={() => c.edit((x) => { x.bonus.day1 = Math.max(0, x.bonus.day1 - 100); })}>−</Button><b className="min-w-[70px] text-center text-lg text-gold2">{fmt(d.bonus.day1)}</b><Button className="!h-9 !w-9 !px-0" aria-label="Raise bonus" onClick={() => c.edit((x) => { x.bonus.day1 += 100; })}>+</Button></div>}>
            <div className="flex flex-wrap gap-2">
              {d.bonus.multipliers.map((m, i) => (
                <div key={i} className="flex min-w-0 flex-[1_1_80px] flex-col items-center gap-1 rounded-xl border border-line bg-raised px-2 py-3 text-center">
                  <Label>Day {i + 1}</Label>
                  <b className="text-[15px] text-gold2">{fmt(Math.round(d.bonus.day1 * m))}</b>
                  <label className="flex items-center gap-1 text-[11px] text-mute">×<input aria-label={`Day ${i + 1} multiplier`} inputMode="decimal" value={m} onChange={(e) => c.edit((x) => { x.bonus.multipliers[i] = Number(e.target.value) || 0; })} className="w-10 rounded border border-line2 bg-field px-1 text-center text-[11px] text-text" /></label>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 border-t border-line pt-3.5">
              <div className="flex-[1_1_200px]"><Field id="refill" label="Free refill when a player is out of chips" hint="Once a day, under 50 chips"><input id="refill" inputMode="numeric" value={d.refill} onChange={(e) => c.edit((x) => { x.refill = Number(e.target.value.replace(/\D/g, '')) || 0; })} className={inputCls} /></Field></div>
              <div className="flex-[1_1_200px]"><Field id="welcome" label="Welcome chips for new players"><input id="welcome" inputMode="numeric" value={d.welcome} onChange={(e) => c.edit((x) => { x.welcome = Number(e.target.value.replace(/\D/g, '')) || 0; })} className={inputCls} /></Field></div>
            </div>
          </Card>
          <Card className="flex-[1_1_300px]" title="Give or remove chips">
            <p className="m-0 text-[13px] leading-relaxed text-soft">Open the player on the <Link to="/players">Players</Link> page and use “Give or remove chips”. Every change needs a reason and is saved in the chip log below. Changes over 50,000 chips need a super admin.</p>
          </Card>
        </section>
      )}
      <Card className="!p-2" title={<span className="px-3">Chip log</span>}>
        <Table head={['Time', 'Player', 'Type', 'Amount', 'Note', 'By']} empty={!q.data?.log?.length && <Empty>No chip movements yet.</Empty>}>
          {(q.data?.log ?? []).map((l: any) => (
            <tr key={l.id}><td className="text-mute">{time(l.at)}</td><td><b>{l.player}</b> <span className="text-mute">{l.code}</span></td><td>{TYPES[l.type] ?? l.type}{l.table ? ` · ${l.table}` : ''}</td><td className={l.amount >= 0 ? 'font-extrabold text-ok' : 'font-extrabold text-bad'}>{signed(l.amount)}</td><td className="max-w-[240px] truncate text-mute">{l.note ?? ''}</td><td className="text-mute">{l.by}</td></tr>
          ))}
        </Table>
      </Card>
      {d && <PublishBar c={c} />}
    </>
  );
}
