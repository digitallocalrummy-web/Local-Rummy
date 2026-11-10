import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api, fmt, MODE_NAMES, signed, ago } from '../api';
import { useAuth } from '../auth';
import { PageHeader } from '../components/Shell';
import { Avatar, Bar, Card, Delta, Empty, Kpi, Label, Pill, Table } from '../components/ui';
import { TableStatus } from './LiveTables';

const TX: Record<string, string> = { welcome: 'got welcome chips', daily_bonus: 'collected daily bonus', refill: 'got a free refill', entry: 'joined a table', refund: 'got chips back', win: 'won chips', admin_grant: 'received chips from admin', admin_remove: 'had chips removed by admin' };

export default function Overview() {
  const { admin } = useAuth();
  const q = useQuery({ queryKey: ['overview'], queryFn: () => api('/api/admin/overview'), refetchInterval: 10_000 });
  const d = q.data;
  const max = Math.max(1, ...(d?.series ?? []).map((s: any) => s.players));
  const totalModes = (d?.modes ?? []).reduce((s: number, m: any) => s + m.n, 0) || 1;
  const hour = new Date().getHours();
  return (
    <>
      <PageHeader title={`Good ${hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}, ${admin?.name.split(' ')[0]}`} sub={`Here is what is happening on Local Rummy today · ${new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`} />
      {q.error && <Card><span className="text-bad">{(q.error as Error).message}</span></Card>}
      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-[repeat(auto-fit,minmax(210px,1fr))]">
        <Kpi label="Players online now" value={fmt(d?.online)} sub={<span className="inline-flex items-center gap-1.5 text-ok"><span className="h-2 w-2 rounded-full bg-okbg" />Live</span>} />
        <Kpi label="Daily active players" value={fmt(d?.dau)} sub={d && <Delta now={d.dau} before={d.dauYesterday} />} />
        <Kpi label="Games played today" value={fmt(d?.gamesToday)} sub={d && <Delta now={d.gamesToday} before={d.gamesYesterday} />} />
        <Kpi label="New sign-ups" value={fmt(d?.signups)} sub={d && <Delta now={d.signups} before={d.signupsYesterday} />} />
      </section>
      <section className="flex flex-wrap gap-4">
        <Card className="flex flex-[2_1_520px] flex-col gap-3.5" title={<>Daily active players <span className="block text-xs font-normal text-mute">Last 14 days · players who finished a game</span></>} action={<Link to="/reports" className="text-xs font-extrabold no-underline">Open reports →</Link>}>
          <div role="img" aria-label="Bar chart of daily active players over the last 14 days" className="flex h-[200px] items-end gap-2 border-b border-line pt-2.5">
            {(d?.series ?? []).map((s: any, i: number, arr: any[]) => (
              <div key={s.day} title={`${s.day}: ${s.players}`} className="flex-1 rounded-t-md" style={{ height: `${Math.max(2, (s.players / max) * 100)}%`, background: i === arr.length - 1 ? '#E8C66A' : '#1F6B4A' }} />
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-faint"><span>{d?.series?.[0]?.day}</span><span>Today · {fmt(d?.series?.at(-1)?.players)}</span></div>
        </Card>
        <Card className="flex flex-[1_1_300px] flex-col gap-4" title="Games by mode · today">
          {(['points', 'pool', 'deals'] as const).map((m, i) => {
            const row = d?.modes?.find((x: any) => x.mode === m);
            const pct = Math.round(((row?.n ?? 0) / totalModes) * 100);
            return (
              <div key={m} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[13px]"><b>{MODE_NAMES[m]}</b><span className="text-soft">{fmt(row?.n)} · {pct}%</span></div>
                <Bar pct={pct} color={['#E8C66A', '#2FA36B', '#7FB2F0'][i]} />
              </div>
            );
          })}
          <div className="mt-auto grid grid-cols-2 gap-2.5 border-t border-line pt-3">
            <div><Label>Avg players / table</Label><b className="mt-1 block text-xl">{d?.modes?.length ? (d.modes.reduce((s: number, m: any) => s + m.avgPlayers * m.n, 0) / totalModes).toFixed(1) : '—'}</b></div>
            <div><Label>Avg game time</Label><b className="mt-1 block text-xl">{d?.modes?.length ? `${Math.round(d.modes.reduce((s: number, m: any) => s + m.avgSecs * m.n, 0) / totalModes / 60)} min` : '—'}</b></div>
          </div>
        </Card>
      </section>
      <section className="flex flex-wrap gap-4">
        <Card className="flex-[2_1_520px]" title="Live tables" action={<><Pill tone="ok">{d?.tables?.running ?? 0} running</Pill><Link to="/tables" className="text-xs font-extrabold no-underline">View all →</Link></>}>
          <Table head={['Table', 'Mode', 'Players', 'Entry', 'Running', 'Status']} empty={!d?.tables?.top?.length && <Empty>No tables running right now.</Empty>}>
            {(d?.tables?.top ?? []).map((t: any) => (
              <tr key={t.id}><td><b>{t.id}</b></td><td>{MODE_NAMES[t.mode]}</td><td>{t.seated} / {t.size}</td><td>{t.entry ? fmt(t.entry) : 'Free'}</td><td>{t.startedAt ? ago(t.startedAt).replace(' ago', '') : '—'}</td><td><TableStatus s={t.status} /></td></tr>
            ))}
          </Table>
        </Card>
        <Card className="flex flex-[1_1_300px] flex-col gap-3" title="Needs attention">
          <Link to="/support" className="flex items-center gap-3 rounded-[10px] border border-badbg/30 bg-badbg/8 p-3 text-text no-underline"><span className="flex-1"><b className="block text-[13px]">{d?.alerts?.reports ?? 0} cheating reports</b><span className="text-xs text-soft">Open and waiting for review</span></span></Link>
          <Link to="/tables" className="flex items-center gap-3 rounded-[10px] border border-warn/30 bg-warn/8 p-3 text-text no-underline"><span className="flex-1"><b className="block text-[13px]">{d?.tables?.stuck ?? 0} stuck tables</b><span className="text-xs text-soft">No move for over 5 minutes</span></span></Link>
          <Link to="/support" className="flex items-center gap-3 rounded-[10px] border border-line bg-raised p-3 text-text no-underline"><span className="flex-1"><b className="block text-[13px]">{d?.alerts?.tickets ?? 0} open support tickets</b><span className="text-xs text-soft">{d?.alerts?.urgent ?? 0} marked urgent</span></span></Link>
          <Label className="mt-1.5">Recent activity</Label>
          <div className="flex flex-col gap-2.5 text-[13px]">
            {(d?.activity ?? []).map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-2.5"><Avatar name={a.name} color={a.color} size={28} /><span className="min-w-0 flex-1"><b>{a.name}</b> {TX[a.type] ?? a.type} <span className={a.amount >= 0 ? 'text-ok' : 'text-bad'}>{signed(a.amount)}</span></span><span className="text-[11px] text-faint">{ago(a.at)}</span></div>
            ))}
            {!d?.activity?.length && <span className="text-mute">Nothing yet.</span>}
          </div>
        </Card>
      </section>
    </>
  );
}
