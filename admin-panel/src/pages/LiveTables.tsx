import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { ago, api, fmt, MODE_NAMES } from '../api';
import { useCanEdit } from '../auth';
import { PageHeader } from '../components/Shell';
import { Avatar, Button, Card, Chips, Empty, Kpi, Label, Pill, SuitCard, Table, Toast, cx, inputCls } from '../components/ui';

export const TableStatus = ({ s }: { s: string }) =>
  s === 'stuck' ? <Pill tone="bad">Stuck</Pill> : s === 'waiting' ? <Pill tone="info">Waiting</Pill> : s === 'ended' ? <Pill>Ended</Pill> : <Pill tone="ok">Playing</Pill>;

type F = 'all' | 'playing' | 'waiting' | 'stuck';

export default function LiveTables() {
  const qc = useQueryClient();
  const canEdit = useCanEdit();
  const [f, setF] = useState<F>('all');
  const [sel, setSel] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const pick = (id: string) => {
    setSel(id); setMsg(null);
    if (window.innerWidth < 768) setTimeout(() => panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const q = useQuery({ queryKey: ['tables'], queryFn: () => api('/api/admin/tables'), refetchInterval: 2_000 });
  const all: any[] = q.data?.tables ?? [];
  const rows = all.filter((t) => f === 'all' || t.status === f);
  const t = all.find((x) => x.id === sel) ?? rows[0];
  const act = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: object }) => api(`/api/admin/tables/${t.id}/${path}`, { body: body ?? {} }),
    onSuccess: (_r, v) => { setMsg({ tone: 'ok', text: v.path === 'cancel' ? 'Deal ended. Every entry was refunded.' : v.path === 'skip' ? 'Turn skipped.' : 'Message sent to the table.' }); setText(''); qc.invalidateQueries({ queryKey: ['tables'] }); },
    onError: (e) => setMsg({ tone: 'bad', text: (e as Error).message }),
  });
  return (
    <>
      <PageHeader title={<>Live tables <Pill tone="ok"><span className="h-2 w-2 rounded-full bg-okbg" />Live</Pill></>} sub="Updates every 2 seconds · open a table to see its seats" />
      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
        <Kpi label="Tables running" value={fmt(q.data?.running)} />
        <Kpi label="Real players seated" value={fmt(q.data?.seated)} />
        <Kpi label="Average wait for a seat" value={`${q.data?.avgWaitSecs ?? 0} s`} />
        <Kpi label="Stuck tables" value={<span className={q.data?.stuck ? 'text-bad' : ''}>{q.data?.stuck ?? 0}</span>} />
      </section>
      <Chips label="Filter tables" value={f} onChange={setF} options={[{ value: 'all', label: 'All tables' }, { value: 'playing', label: 'Playing' }, { value: 'waiting', label: 'Waiting for players' }, { value: 'stuck', label: 'Stuck' }]} />
      <section className="flex flex-wrap items-start gap-4">
        <Card className="flex-[999_1_560px] !p-2">
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 md:hidden">
            {rows.map((x) => (
              <li key={x.id}>
                <button onClick={() => pick(x.id)} className={cx('flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left text-text', x.id === t?.id ? 'border-gold/45 bg-raised' : 'border-transparent bg-transparent')}>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <b className="text-sm">{x.id} · {MODE_NAMES[x.mode]}</b>
                    <span className="text-xs text-mute">{x.seated}/{x.size} seats · {x.entry ? `entry ${fmt(x.entry)}` : 'free'} · {x.turnCount} turns</span>
                  </span>
                  <TableStatus s={x.status} />
                </button>
              </li>
            ))}
            {!rows.length && <Empty>No tables here right now. Tables appear when players sit down in the app.</Empty>}
          </ul>
          <div className="hidden md:block">
          <Table head={['Table', 'Mode', 'Seats', 'Entry', 'Turns', 'Running', 'Status']} empty={!rows.length && <Empty>No tables here right now. Tables appear when players sit down in the app.</Empty>}>
            {rows.map((x) => (
              <tr key={x.id} className={cx(x.id === t?.id && '[&_td]:bg-gold/7')}>
                <td><button onClick={() => pick(x.id)} className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-extrabold text-text underline decoration-line2 underline-offset-[3px] hover:text-gold2" aria-label={`Open table ${x.id}`}>{x.id}</button></td>
                <td>{MODE_NAMES[x.mode]}</td>
                <td><span className="inline-flex items-center gap-2"><span className="inline-block h-1.5 w-[70px] rounded-[3px] bg-track"><span className="block h-full rounded-[3px] bg-gold" style={{ width: `${(x.seated / x.size) * 100}%` }} /></span>{x.seated} / {x.size}</span></td>
                <td className="font-bold text-gold2">{x.entry ? fmt(x.entry) : 'Free'}</td><td>{x.turnCount}</td>
                <td className="text-mute">{x.startedAt ? ago(x.startedAt).replace(' ago', '') : '—'}</td><td><TableStatus s={x.status} /></td>
              </tr>
            ))}
          </Table>
          </div>
        </Card>
        {t && (
          <aside ref={panel} aria-label="Table details" className="scroll-mt-16 flex min-w-0 flex-[1_1_340px] flex-col gap-3.5 rounded-[14px] border border-line bg-panel p-5">
            <div className="flex items-center gap-2.5"><div className="min-w-0 flex-1"><b className="text-xl">Table {t.id}</b><span className="block text-xs text-mute">{MODE_NAMES[t.mode]} · entry {t.entry ? fmt(t.entry) : 'free'} · {t.humans} real player{t.humans === 1 ? '' : 's'}</span></div><TableStatus s={t.status} /></div>
            <div className="flex gap-2.5">
              {[['Wild joker', <SuitCard key="w" c={t.wild} />], ['Open card', <SuitCard key="o" c={t.open} />], ['Deck left', <b key="d" className="text-white">{t.deckCount}</b>]].map(([l, v], i) => (
                <div key={i} className="flex-1 rounded-[10px] border border-[#1E6B45] bg-felt px-3 py-2.5"><Label className="!text-[#CFE3D6]">{l}</Label><span className="mt-0.5 block text-lg">{v}</span></div>
              ))}
            </div>
            <Label>Seats · {t.seated} / {t.size}</Label>
            <div className="flex flex-col gap-1.5">
              {t.seats.map((s: any) => (
                <div key={s.idx} className="flex items-center gap-2.5 rounded-[10px] bg-raised px-2.5 py-2">
                  <Avatar name={s.name} color={s.color} />
                  <span className="min-w-0 flex-1 text-[13px]"><b>{s.name}</b>{s.isBot && <span className="text-mute"> · bot</span>}<span className="block text-[11px] text-mute">{s.cards} cards{s.points != null ? ` · ${s.points} pts` : ''}</span></span>
                  {t.turn === s.idx && t.phase === 'playing' && <Pill tone="gold">Turn</Pill>}
                  {s.status === 'dropped' && <Pill>Dropped</Pill>}
                  {s.status === 'invalid' && <Pill tone="bad">Wrong show</Pill>}
                  {!s.connected && <Pill tone="warn">Disconnected</Pill>}
                </div>
              ))}
            </div>
            {msg && <Toast tone={msg.tone}>{msg.text}</Toast>}
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) act.mutate({ path: 'message', body: { text } }); }}>
              <label htmlFor="tm" className="sr-only">Message to the table</label>
              <input id="tm" value={text} onChange={(e) => setText(e.target.value)} placeholder="Message everyone at this table" className={inputCls} />
              <Button disabled={!text.trim()}>Send</Button>
            </form>
            {canEdit && t.phase === 'playing' && (
              <div className="flex flex-wrap gap-2">
                <Button className="flex-[1_1_130px]" onClick={() => act.mutate({ path: 'skip' })}>Skip current turn</Button>
                <Button variant="danger" className="flex-[1_1_100%]" onClick={() => { if (confirm(`End the deal at ${t.id} and refund every entry?`)) act.mutate({ path: 'cancel' }); }}>End deal and refund entries</Button>
              </div>
            )}
          </aside>
        )}
      </section>
    </>
  );
}
