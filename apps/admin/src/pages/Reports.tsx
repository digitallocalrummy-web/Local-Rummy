import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, fmt, MODE_NAMES, signed } from '../api';
import { PageHeader } from '../components/Shell';
import { Button, Card, Chips, Empty, Kpi, Table } from '../components/ui';

export default function Reports() {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const q = useQuery({ queryKey: ['reports', range], queryFn: () => api(`/api/admin/reports?range=${range}`) });
  const d = q.data;
  const series: any[] = d?.series ?? [];
  const avg = (k: string) => (series.length ? Math.round(series.reduce((s, x) => s + x[k], 0) / series.length) : 0);
  const max = Math.max(1, ...series.map((s) => s.players));
  const points = series.map((s, i) => `${(i / Math.max(1, series.length - 1)) * 600},${210 - (s.players / max) * 190}`).join(' ');
  const hours: number[] = Array.from({ length: 24 }, (_, h) => d?.hours?.find((x: any) => x.hour === h)?.games ?? 0);
  const hmax = Math.max(1, ...hours);
  const exportCsv = () => {
    const rows = ['Day,Active players,Sign-ups,Games', ...series.map((s) => `${s.day},${s.players},${s.signups},${s.games}`)];
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `local-rummy-report-${range}d.csv`; a.click(); URL.revokeObjectURL(url);
  };
  const cell = (v: number | null, age: number, need: number) => {
    if (age < need || v == null) return <span className="block h-[34px] rounded-md bg-raised text-center text-xs leading-[34px] font-extrabold text-faint">—</span>;
    const a = Math.max(0.15, Math.min(1, v / 50));
    return <span className="block h-[34px] rounded-md text-center text-xs leading-[34px] font-extrabold" style={{ background: `rgba(232,198,106,${a})`, color: a > 0.5 ? '#1A1406' : "var(--color-gold2)" }}>{v}%</span>;
  };
  return (
    <>
      <PageHeader title="Reports" sub="How players find, play and come back to Local Rummy">
        <Chips label="Date range" value={range} onChange={setRange} options={[{ value: 7, label: '7 days' }, { value: 30, label: '30 days' }, { value: 90, label: '90 days' }]} />
        <Button onClick={exportCsv} disabled={!series.length}>Export CSV</Button>
      </PageHeader>
      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
        <Kpi label="Daily active (avg)" value={fmt(avg('players'))} />
        <Kpi label="New players" value={fmt(series.reduce((s, x) => s + x.signups, 0))} />
        <Kpi label="Games played" value={fmt(series.reduce((s, x) => s + x.games, 0))} />
        <Kpi label="Avg game time" value={`${Math.round((d?.sessions?.avg_secs ?? 0) / 60)} min`} />
        <Kpi label="Games per player" value={(d?.sessions?.games_per_player ?? 0).toFixed(1)} />
      </section>
      <section className="flex flex-wrap gap-4">
        <Card className="flex flex-[2_1_520px] flex-col gap-3" title={<>Daily active players <span className="block text-xs font-normal text-mute">Last {range} days</span></>}>
          <svg viewBox="0 0 600 220" preserveAspectRatio="none" role="img" aria-label="Line chart of daily active players" className="h-[220px] w-full">
            {[55, 110, 165].map((y) => <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="var(--color-line)" />)}
            <line x1="0" y1="219" x2="600" y2="219" stroke="var(--color-line2)" />
            {series.length > 1 && <polyline points={points} fill="none" stroke="#E8C66A" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
          </svg>
          <div className="flex justify-between text-[11px] text-faint"><span>{series[0]?.day}</span><span>Today</span></div>
        </Card>
        <Card className="flex flex-[1_1_300px] flex-col gap-2.5" title={<>Busiest hours <span className="block text-xs font-normal text-mute">Games finished by hour (IST)</span></>}>
          <div role="img" aria-label="Bar chart of games by hour of day" className="flex h-[170px] items-end gap-[3px] border-b border-line">
            {hours.map((v, h) => <div key={h} title={`${h}:00 · ${v} games`} className="flex-1 rounded-t-[3px]" style={{ height: `${Math.max(2, (v / hmax) * 100)}%`, background: v >= hmax * 0.8 && v > 0 ? '#E8C66A' : '#1F6B4A' }} />)}
          </div>
          <div className="flex justify-between text-[11px] text-faint"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span></div>
        </Card>
      </section>
      <section className="flex flex-wrap gap-4">
        <Card className="flex-[1_1_420px]" title={<>Players coming back <span className="block text-xs font-normal text-mute">Share of each week’s new players who played again after 1, 7, 14 and 30 days</span></>}>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1 text-[13px]">
              <thead><tr>{['Joined', 'Players', 'Day 1', 'Day 7', 'Day 14', 'Day 30'].map((h) => <th key={h} className="text-left text-[11px] font-extrabold tracking-[1px] text-mute uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {(d?.retention ?? []).map((r: any) => (
                  <tr key={r.week}><td className="pr-2.5 whitespace-nowrap">{r.week}</td><td>{r.size}</td><td>{cell(r.d1, r.age, 1)}</td><td>{cell(r.d7, r.age, 7)}</td><td>{cell(r.d14, r.age, 14)}</td><td>{cell(r.d30, r.age, 30)}</td></tr>
                ))}
              </tbody>
            </table>
            {!d?.retention?.length && <Empty>Not enough sign-ups yet.</Empty>}
          </div>
        </Card>
        <Card className="flex-[1_1_420px] !p-2" title={<span className="px-3">Top players · last {range} days</span>}>
          <Table head={['#', 'Player', 'Games', 'Wins', 'Chips won', 'Favourite mode']} empty={!d?.top?.length && <Empty>No games yet.</Empty>}>
            {(d?.top ?? []).map((p: any, i: number) => (
              <tr key={p.code}><td className={i < 3 ? 'font-extrabold text-gold2' : ''}>{i + 1}</td><td><b>{p.name}</b> <span className="text-mute">{p.code}</span></td><td>{p.games}</td><td>{p.wins}</td><td className={p.chips >= 0 ? 'font-extrabold text-ok' : 'font-extrabold text-bad'}>{signed(p.chips)}</td><td>{MODE_NAMES[p.fav] ?? p.fav}</td></tr>
            ))}
          </Table>
        </Card>
      </section>
    </>
  );
}
